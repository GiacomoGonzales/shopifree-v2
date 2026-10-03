import { Navigate } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'
import { useLanguage } from '../../hooks/useLanguage'
import { isAdminUser } from '../../lib/adminAccess'

/**
 * La bandeja de chats de soporte se mudó al panel admin (Soporte > Chats,
 * components/admin/soporte). Esta ruta (/dashboard/support-chats y
 * /finance/support-chats) queda solo para que los enlaces y marcadores
 * viejos sigan funcionando. Un dueño que llegue aquí (p. ej. desde Ayuda) no
 * puede entrar al admin: va a su panel, donde está su propio chat con Sofía.
 */
export default function SupportChats() {
  const { firebaseUser, loading } = useAuth()
  const { localePath } = useLanguage()
  if (loading) return null
  return <Navigate to={localePath(isAdminUser(firebaseUser) ? '/admin/soporte' : '/dashboard')} replace />
}
