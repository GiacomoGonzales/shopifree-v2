/**
 * Quién es administrador de Shopifree, en UN solo lugar del frontend.
 *
 * Antes había cinco copias de la lista (panel, menús, ShopiChat) y no
 * coincidían con firestore.rules ni con api/_shared/admin.ts: el panel dejaba
 * entrar a admin@shopifree.app pero la base lo rechazaba. Las tres listas
 * (esta, firestore.rules isAdmin() y api/_shared/admin.ts) deben ser iguales,
 * y las tres exigen el email verificado.
 */
export const ADMIN_EMAILS = ['giiacomo@gmail.com', 'admin@shopifree.app']

export function isAdminEmail(email?: string | null): boolean {
  return !!email && ADMIN_EMAILS.includes(email.toLowerCase())
}

/** Para un usuario de Firebase Auth: email de la lista Y verificado (como las reglas). */
export function isAdminUser(user?: { email?: string | null; emailVerified?: boolean } | null): boolean {
  return !!user && user.emailVerified === true && isAdminEmail(user.email)
}
