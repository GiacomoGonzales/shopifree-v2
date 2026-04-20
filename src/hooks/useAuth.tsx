import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import {
  type User as FirebaseUser,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  GoogleAuthProvider,
  signInWithPopup,
  signInWithCredential
} from 'firebase/auth'
import { Capacitor } from '@capacitor/core'
import { auth, db } from '../lib/firebase'
import { doc, updateDoc } from 'firebase/firestore'
import { userService, storeService } from '../lib/firebase'
import type { User, Store } from '../types'

interface AuthContextType {
  firebaseUser: FirebaseUser | null
  user: User | null
  store: Store | null
  loading: boolean
  login: (email: string, password: string) => Promise<void>
  register: (email: string, password: string) => Promise<FirebaseUser>
  loginWithGoogle: () => Promise<FirebaseUser>
  logout: () => Promise<void>
  refreshStore: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

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

      // Check if free Pro trial has expired (no Stripe subscription).
      // Respect `planExpiresAt` — the admin-comp override. See Catalog.tsx for
      // the same semantics:
      //   - null        → indefinite admin comp, never downgrade
      //   - future Date → comp still valid
      //   - past Date   → comp expired, fall through
      //   - undefined   → never touched by admin, normal trial rules apply
      if (storeData && storeData.trialEndsAt && !storeData.subscription) {
        const toDate = (d: any): Date =>
          d instanceof Date ? d
            : (typeof d === 'object' && d && 'toDate' in d) ? d.toDate()
            : new Date(d as string)

        const compIsIndefinite = storeData.planExpiresAt === null
        const compIsActive = storeData.planExpiresAt != null &&
          toDate(storeData.planExpiresAt).getTime() > Date.now()

        if (!compIsIndefinite && !compIsActive) {
          const trialEnd = toDate(storeData.trialEndsAt)
          if (trialEnd.getTime() < Date.now() && (storeData.plan === 'pro' || storeData.plan === 'business')) {
            console.log('Free Pro trial expired, downgrading to free')
            await updateDoc(doc(db, 'stores', storeData.id), {
              plan: 'free',
              updatedAt: new Date()
            })
            storeData = { ...storeData, plan: 'free' }
          }
        }
      }

      setStore(storeData)
    } catch (error) {
      console.error('Error loading user data:', error)
    }
  }

  // Initialize Google Auth plugin on native platforms
  useEffect(() => {
    if (Capacitor.isNativePlatform()) {
      import('@codetrix-studio/capacitor-google-auth').then(({ GoogleAuth }) => {
        GoogleAuth.initialize({
          clientId: '610784604338-79a7qucapsm5bddqg1u2ndbkvaeutif7.apps.googleusercontent.com',
          scopes: ['profile', 'email'],
          grantOfflineAccess: true
        })
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
      // Native iOS/Android: use Capacitor Google Auth plugin
      const { GoogleAuth } = await import('@codetrix-studio/capacitor-google-auth')
      const googleUser = await GoogleAuth.signIn()
      console.log('Google Sign-In result keys:', Object.keys(googleUser))
      const idToken = googleUser.authentication?.idToken || (googleUser as any).idToken
      const accessToken = googleUser.authentication?.accessToken
      if (!idToken) {
        throw new Error('No idToken received from Google Sign-In')
      }
      console.log('Tokens found, signing into Firebase...')
      // Use both idToken and accessToken to avoid nonce verification hang
      const credential = GoogleAuthProvider.credential(idToken, accessToken)
      console.log('Credential created, calling signInWithCredential...')
      const result = await signInWithCredential(auth, credential)
      console.log('Firebase sign-in success:', result.user.uid, result.user.email)
      return result.user
    } else {
      // Web: use Firebase popup
      const provider = new GoogleAuthProvider()
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

      // Check if free Pro trial has expired (no Stripe subscription).
      // Respect admin-set `planExpiresAt` override — see loadUserData above for the rules.
      if (storeData && storeData.trialEndsAt && !storeData.subscription) {
        const toDate = (d: any): Date =>
          d instanceof Date ? d
            : (typeof d === 'object' && d && 'toDate' in d) ? d.toDate()
            : new Date(d as string)

        const compIsIndefinite = storeData.planExpiresAt === null
        const compIsActive = storeData.planExpiresAt != null &&
          toDate(storeData.planExpiresAt).getTime() > Date.now()

        if (!compIsIndefinite && !compIsActive) {
          const trialEnd = toDate(storeData.trialEndsAt)
          if (trialEnd.getTime() < Date.now() && (storeData.plan === 'pro' || storeData.plan === 'business')) {
            await updateDoc(doc(db, 'stores', storeData.id), {
              plan: 'free',
              updatedAt: new Date()
            })
            storeData = { ...storeData, plan: 'free' }
          }
        }
      }

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
