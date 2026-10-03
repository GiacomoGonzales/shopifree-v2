/**
 * ShopiChat se lanza por etapas: mientras Meta no aprueba la app (Tech
 * Provider + revisión), la sección solo se muestra a los administradores.
 * Para abrirla a todas las tiendas Business: VITE_SHOPICHAT_PUBLIC=true.
 * Con el flag tambien aparecen: la seccion de la landing, ShopiChat en el plan
 * Business (Plan.tsx + landing) y la pregunta en Ayuda. Sofia (api) no ve las
 * variables VITE_*: usa SHOPICHAT_PUBLIC=true (servidor). Poner las dos juntas.
 */
import { isAdminEmail } from './adminAccess'

export const SHOPICHAT_PUBLIC = import.meta.env.VITE_SHOPICHAT_PUBLIC === 'true'

export function canSeeShopiChat(email?: string | null): boolean {
  return SHOPICHAT_PUBLIC || isAdminEmail(email)
}
