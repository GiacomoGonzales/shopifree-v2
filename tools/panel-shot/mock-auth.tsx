/**
 * Sustituto de src/hooks/useAuth.tsx para las capturas del panel.
 *
 * Mismas exportaciones que el original (AuthProvider, useAuth). No toca el login
 * de Firebase Auth: siempre hay una sesion iniciada y loading es false desde el
 * inicio.
 *   - Rutas /admin (se mira al cargar el modulo): admin@shopifree.app con el
 *     email verificado (isAdminUser de src/lib/adminAccess), sin tienda. Ademas
 *     se simulan las llamadas a /api/admin-* (mock-admin-api.ts) y
 *     auth.currentUser apunta a ese usuario, porque varias pantallas piden el
 *     token con auth.currentUser.getIdToken().
 *   - Cualquier otra ruta: la duena de la tienda de ejemplo AURELIA (plan
 *     Business, sin muros de pago).
 *
 * El valor es una constante de modulo a proposito: las paginas hacen
 * useEffect(..., [store]) y un objeto nuevo en cada render las haria recargar.
 */
import type { ReactNode } from 'react'
import type { User as FirebaseUser } from 'firebase/auth'
import type { User, Store } from '../../src/types'
import { auth } from '../../src/lib/firebase'
import { DEMO_FIREBASE_USER, DEMO_STORE, DEMO_USER } from './demo-data'
import { esRutaAdmin } from './demo-admin'
import './mock-admin-api'

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

const ADMIN = esRutaAdmin()

const ADMIN_UID = 'admin-shopifree'
const ADMIN_FIREBASE_USER = {
  ...DEMO_FIREBASE_USER,
  uid: ADMIN_UID,
  email: 'admin@shopifree.app',
  emailVerified: true,
  displayName: 'Admin Shopifree',
  getIdToken: async () => 'demo-admin-token',
  getIdTokenResult: async () => ({ token: 'demo-admin-token', claims: {} }),
  toJSON: () => ({ uid: ADMIN_UID }),
  // Lo llama Firebase Auth por dentro al cambiar de usuario (ver abajo).
  _startProactiveRefresh: () => {},
  _stopProactiveRefresh: () => {},
}
const ADMIN_USER = {
  id: ADMIN_UID,
  email: 'admin@shopifree.app',
  firstName: 'Admin',
  lastName: 'Shopifree',
  role: 'admin',
  createdAt: new Date('2025-01-01T00:00:00Z'),
  updatedAt: new Date('2025-01-01T00:00:00Z'),
} as User

// auth.currentUser es un campo comun del objeto de Firebase Auth: se fija con un
// getter que siempre devuelve el admin de ejemplo (el setter ignora lo que
// Firebase intente poner, que sin sesion guardada seria null). Solo en /admin.
if (ADMIN && auth) {
  try {
    Object.defineProperty(auth, 'currentUser', {
      configurable: true,
      get: () => ADMIN_FIREBASE_USER,
      set: () => {},
    })
  } catch (e) {
    console.warn('[panel-shot] no pude fijar auth.currentUser', e)
  }
}

const fbUser = (ADMIN ? ADMIN_FIREBASE_USER : DEMO_FIREBASE_USER) as unknown as FirebaseUser

const VALUE: AuthContextType = {
  firebaseUser: fbUser,
  user: ADMIN ? ADMIN_USER : DEMO_USER,
  store: ADMIN ? null : DEMO_STORE,
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
