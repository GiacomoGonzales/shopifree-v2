import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import {
  type User as FirebaseUser,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  GoogleAuthProvider,
  signInWithRedirect,
  getRedirectResult
} from 'firebase/auth'
import { auth } from '../lib/firebase'
import { userService, storeService } from '../lib/firebase'
import type { User, Store } from '../types'

interface AuthContextType {
  firebaseUser: FirebaseUser | null
  user: User | null
  store: Store | null
  loading: boolean
  login: (email: string, password: string) => Promise<void>
  register: (email: string, password: string) => Promise<FirebaseUser>
  loginWithGoogle: () => Promise<void>
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
      // Load user data
      const userData = await userService.get(fbUser.uid)
      setUser(userData)

      // Load store data
      const storeData = await storeService.getByOwner(fbUser.uid)
      setStore(storeData)
    } catch (error) {
      console.error('Error loading user data:', error)
    }
  }

  useEffect(() => {
    // Handle redirect result from Google login
    getRedirectResult(auth).catch((error) => {
      console.error('Redirect result error:', error)
    })

    const unsubscribe = onAuthStateChanged(auth, async (fbUser) => {
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

  const loginWithGoogle = async (): Promise<void> => {
    const provider = new GoogleAuthProvider()
    await signInWithRedirect(auth, provider)
  }

  const logout = async () => {
    await signOut(auth)
    setUser(null)
    setStore(null)
  }

  const refreshStore = async () => {
    if (firebaseUser) {
      const storeData = await storeService.getByOwner(firebaseUser.uid)
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
