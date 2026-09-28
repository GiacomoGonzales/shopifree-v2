/**
 * Sustituto de src/hooks/useAuth.tsx para las capturas del panel.
 *
 * Mismas exportaciones que el original (AuthProvider, useAuth). No toca Firebase
 * Auth: siempre hay una sesion iniciada con la duena de la tienda de ejemplo
 * AURELIA (plan Business, sin muros de pago), y loading es false desde el inicio.
 *
 * El valor es una constante de modulo a proposito: las paginas hacen
 * useEffect(..., [store]) y un objeto nuevo en cada render las haria recargar.
 */
import type { ReactNode } from 'react'
import type { User as FirebaseUser } from 'firebase/auth'
import type { User, Store } from '../../src/types'
import { DEMO_FIREBASE_USER, DEMO_STORE, DEMO_USER } from './demo-data'

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

const fbUser = DEMO_FIREBASE_USER as unknown as FirebaseUser

const VALUE: AuthContextType = {
  firebaseUser: fbUser,
  user: DEMO_USER,
  store: DEMO_STORE,
  loading: false,
  login: async () => {},
  register: async () => fbUser,
  loginWithGoogle: async () => fbUser,
  loginWithApple: async () => fbUser,
  logout: async () => {},
  refreshStore: async () => {},
}

export function AuthProvider({ children }: { children: ReactNode }) {
  return <>{children}</>
}

// Mismo par de exportaciones que el hook real (que tampoco separa el proveedor del hook).
// eslint-disable-next-line react-refresh/only-export-components
export function useAuth() {
  return VALUE
}
