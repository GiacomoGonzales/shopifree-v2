/**
 * Chequeo de admin compartido para todos los endpoints de api/.
 *
 * Un email en ADMIN_EMAILS NO basta: cualquiera puede registrar una cuenta
 * email/password con una direccion que no le pertenece (queda sin verificar).
 * Por eso exigimos email_verified === true, igual que firestore.rules isAdmin().
 */

export const ADMIN_EMAILS = ['giiacomo@gmail.com', 'admin@shopifree.app']

interface AdminTokenLike {
  email?: string | null
  email_verified?: boolean
}

export function isAdminToken(decoded: AdminTokenLike | null | undefined): boolean {
  if (!decoded || decoded.email_verified !== true) return false
  const email = (decoded.email || '').toLowerCase()
  return !!email && ADMIN_EMAILS.includes(email)
}
