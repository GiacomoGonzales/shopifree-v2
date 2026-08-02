import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import {
  type User as FirebaseUser,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  GoogleAuthProvider,
  OAuthProvider,
  signInWithPopup,
  signInWithCredential
} from 'firebase/auth'
import { Capacitor } from '@capacitor/core'
import { auth } from '../lib/firebase'
import { userService, storeService } from '../lib/firebase'
import type { User, Store } from '../types'

// ── Google / Apple OAuth client IDs ─────────────────────────────────────
// iOS-specific Google client ID — matches the REVERSED_CLIENT_ID URL
// scheme registered in ios/App/App/Info.plist and GoogleService-Info.plist.
const GOOGLE_IOS_CLIENT_ID =
  '610784604338-79a7qucapsm5bddqg1u2ndbkvaeutif7.apps.googleusercontent.com'
// Server (web) client ID — Firebase Auth uses this to verify the idToken.
const GOOGLE_SERVER_CLIENT_ID =
  '610784604338-jn860v33lmt7urrlfd0gge96ihufra51.apps.googleusercontent.com'
// Apple Services ID (bundle id used as audience on iOS).
const APPLE_CLIENT_ID = 'app.shopifree.mobile'

// ── Inicialización del plugin de login social ──────────────────────────
// Se guarda la promesa a nivel de módulo por dos motivos:
//  1) `login()` la espera, así un toque rápido en el botón no llega antes de
//     que el proveedor esté registrado.
//  2) Si falla, se limpia para que el siguiente intento reintente en vez de
//     quedar roto para toda la sesión.
let socialLoginInit: Promise<void> | null = null

async function doInitSocialLogin(): Promise<void> {
  const { SocialLogin } = await import('@capgo/capacitor-social-login')
  const platform = Capacitor.getPlatform()

  // CUIDADO al tocar esto. En Android el plugin procesa `apple` ANTES que
  // `google` dentro de initialize(), y ante cualquier problema con Apple hace
  // `return` — abortando el resto. Como en iOS mandamos `redirectUrl: ''` a
  // propósito (indica flujo nativo, sin redirect), en Android ese string vacío
  // disparaba "apple.android.redirectUrl is null or empty" y Google nunca
  // quedaba registrado: el login fallaba con "Cannot find provider 'google'".
  // Apple Sign-In solo se ofrece en iOS, así que en Android no se manda.
  await SocialLogin.initialize({
    google: platform === 'ios'
      ? {
          iOSClientId: GOOGLE_IOS_CLIENT_ID,
          iOSServerClientId: GOOGLE_SERVER_CLIENT_ID,
          webClientId: GOOGLE_SERVER_CLIENT_ID,
          mode: 'online',
        }
      : {
          // Android solo necesita el client ID web (el de servidor).
          webClientId: GOOGLE_SERVER_CLIENT_ID,
          mode: 'online',
        },
    ...(platform === 'ios'
      ? { apple: { clientId: APPLE_CLIENT_ID, redirectUrl: '' } }
      : {}),
  })
}

/** Inicializa el plugin una sola vez. Reintenta si la vez anterior falló. */
function ensureSocialLogin(): Promise<void> {
  if (!socialLoginInit) {
    socialLoginInit = doInitSocialLogin().catch((err) => {
      socialLoginInit = null
      throw err
    })
  }
  return socialLoginInit
}

interface AuthContextType {
  firebaseUser: FirebaseUser | null
  user: User | null
  store: Store | null
  loading: boolean
  login: (email: string, password: string) => Promise<void>
  register: (email: string, password: string) => Promise<FirebaseUser>
  loginWithGoogle: () => Promise<FirebaseUser>
  loginWithApple: () => Promise<FirebaseUser>
  logout: () => Promise<void>
  refreshStore: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

// ── Apple Sign-In nonce helpers ────────────────────────────────────────
// Firebase's Apple provider signs the SHA-256 hash of a random nonce
// into the identity token. We pass the hashed nonce to Apple, then send
// the RAW nonce alongside the token so Firebase can verify the match.

function generateRawNonce(): string {
  const bytes = new Uint8Array(32)
  crypto.getRandomValues(bytes)
  return Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('')
}

async function sha256Hex(input: string): Promise<string> {
  const data = new TextEncoder().encode(input)
  const digest = await crypto.subtle.digest('SHA-256', data)
  return Array.from(new Uint8Array(digest))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('')
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null)
  const [user, setUser] = useState<User | null>(null)
  const [store, setStore] = useState<Store | null>(null)
  const [loading, setLoading] = useState(true)

  const loadUserData = async (fbUser: FirebaseUser) => {
    try {
      console.log('loadUserData called for:', fbUser.uid, fbUser.email)
      // Load user data
      const userData = await userService.get(fbUser.uid)
      console.log('userData loaded:', userData ? 'found' : 'null')
      setUser(userData)

      // Load store data
      let storeData = await storeService.getByOwner(fbUser.uid)
      console.log('storeData loaded:', storeData ? 'found' : 'null')

      // NOTE: Trial expiration is enforced server-side by the scheduled
      // `expireTrials` Cloud Function (functions/src/index.ts). We used to
      // duplicate that check here and downgrade on every login, but the
      // client-side logic ignored `planExpiresAt` and clobbered admin-comped
      // stores. For the UI, `getEffectivePlan()` already computes the correct
      // effective plan from the Firestore data without mutating it.

      setStore(storeData)
    } catch (error) {
      console.error('Error loading user data:', error)
    }
  }

  // Initialize the Capgo Social Login plugin on native platforms.
  // We replaced the abandoned @codetrix-studio plugin (last release May 2024)
  // because it crashed on iPhone 17 Pro Max + iOS 26 during Apple review.
  useEffect(() => {
    if (Capacitor.isNativePlatform()) {
      // Adelanta el trabajo; si falla, el login lo reintenta y ahí sí el error
      // llega al usuario en vez de quedar solo en consola.
      ensureSocialLogin().catch((err) => {
        console.error('[useAuth] SocialLogin.initialize failed:', err)
      })
    }
  }, [])

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (fbUser) => {
      // Set loading true while we process auth change
      setLoading(true)
      setFirebaseUser(fbUser)

      if (fbUser) {
        await loadUserData(fbUser)
      } else {
        setUser(null)
        setStore(null)
      }

      setLoading(false)
    })
    return unsubscribe
  }, [])

  const login = async (email: string, password: string) => {
    await signInWithEmailAndPassword(auth, email, password)
  }

  const register = async (email: string, password: string): Promise<FirebaseUser> => {
    const result = await createUserWithEmailAndPassword(auth, email, password)
    return result.user
  }

  const loginWithGoogle = async (): Promise<FirebaseUser> => {
    if (Capacitor.isNativePlatform()) {
      // Native iOS/Android: use the Capgo Social Login plugin.
      await ensureSocialLogin()
      const { SocialLogin } = await import('@capgo/capacitor-social-login')

      // En Android NO se mandan scopes. El plugin ya agrega por su cuenta
      // userinfo.email, userinfo.profile y openid — justo lo que pedíamos —, y
      // pasar cualquier array de scopes lo obliga a exigir que MainActivity
      // implemente ModifiedMainActivityForSocialLoginPlugin, si no rechaza con
      // "You CANNOT use scopes without modifying the main activity".
      // En iOS se dejan como estaban: ahí funciona y pasó la revisión de Apple.
      const response = await SocialLogin.login({
        provider: 'google',
        options: Capacitor.getPlatform() === 'android'
          ? {}
          : { scopes: ['email', 'profile'] },
      })

      if (response.provider !== 'google' || response.result.responseType !== 'online') {
        throw new Error('Unexpected Google Sign-In response')
      }

      const idToken = response.result.idToken
      const accessToken = response.result.accessToken?.token
      if (!idToken) {
        throw new Error('No idToken received from Google Sign-In')
      }

      // Pass both tokens to Firebase to avoid the nonce verification hang
      // some Firebase versions exhibit with id-token-only credentials.
      const credential = GoogleAuthProvider.credential(idToken, accessToken)
      const result = await signInWithCredential(auth, credential)
      return result.user
    } else {
      // Web: use Firebase popup
      const provider = new GoogleAuthProvider()
      const result = await signInWithPopup(auth, provider)
      return result.user
    }
  }

  const loginWithApple = async (): Promise<FirebaseUser> => {
    if (Capacitor.isNativePlatform()) {
      // Native iOS: Apple Sign-In via Capgo Social Login.
      // Firebase requires a rawNonce + its SHA-256 hash: Apple signs the
      // hashed nonce into the identity token, and Firebase validates the
      // raw nonce against the hash when exchanging the credential.
      const rawNonce = generateRawNonce()
      const hashedNonce = await sha256Hex(rawNonce)

      await ensureSocialLogin()
      const { SocialLogin } = await import('@capgo/capacitor-social-login')
      const response = await SocialLogin.login({
        provider: 'apple',
        options: {
          scopes: ['email', 'name'],
          nonce: hashedNonce,
        },
      })

      if (response.provider !== 'apple') {
        throw new Error('Unexpected Apple Sign-In response')
      }

      const identityToken = response.result.idToken
      if (!identityToken) {
        throw new Error('No identity token received from Apple Sign-In')
      }

      const provider = new OAuthProvider('apple.com')
      const credential = provider.credential({
        idToken: identityToken,
        rawNonce,
      })
      const firebaseResult = await signInWithCredential(auth, credential)
      return firebaseResult.user
    } else {
      // Web: Firebase popup with Apple provider (requires Apple Services ID
      // configured in Firebase Console → Auth → Apple).
      const provider = new OAuthProvider('apple.com')
      provider.addScope('email')
      provider.addScope('name')
      const result = await signInWithPopup(auth, provider)
      return result.user
    }
  }

  const logout = async () => {
    await signOut(auth)
    setUser(null)
    setStore(null)
  }

  const refreshStore = async () => {
    if (firebaseUser) {
      // Reload both user and store data
      const userData = await userService.get(firebaseUser.uid)
      setUser(userData)
      let storeData = await storeService.getByOwner(firebaseUser.uid)

      // Trial expiration is enforced server-side by the scheduled
      // `expireTrials` Cloud Function — see loadUserData above.
      setStore(storeData)
    }
  }

  return (
    <AuthContext.Provider value={{
      firebaseUser,
      user,
      store,
      loading,
      login,
      register,
      loginWithGoogle,
      loginWithApple,
      logout,
      refreshStore
    }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
