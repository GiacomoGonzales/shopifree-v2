/**
 * ShopiChat se lanza por etapas: mientras Meta no aprueba la app (Tech
 * Provider + revisión), la sección solo se muestra a los administradores.
 * Para abrirla a todas las tiendas Business: VITE_SHOPICHAT_PUBLIC=true.
 */
const ADMIN_EMAILS = ['giiacomo@gmail.com', 'admin@shopifree.app']

export const SHOPICHAT_PUBLIC = import.meta.env.VITE_SHOPICHAT_PUBLIC === 'true'

export function canSeeShopiChat(email?: string | null): boolean {
  return SHOPICHAT_PUBLIC || ADMIN_EMAILS.includes(email || '')
}
