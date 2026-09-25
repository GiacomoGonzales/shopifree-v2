/**
 * Botón "Abrir en ShopiChat" para Pedidos y Clientes.
 *
 * Solo aparece si el usuario puede ver ShopiChat (lanzamiento por etapas) y la
 * tienda tiene un número conectado; si no, no pinta nada y queda el wa.me de
 * siempre. Lleva a /dashboard/shopichat?c=<dígitos con código de país>: si la
 * conversación existe se abre, y si no la bandeja ofrece empezarla con una
 * plantilla.
 */
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useAuth } from '../../hooks/useAuth'
import { useLanguage } from '../../hooks/useLanguage'
import { canSeeShopiChat } from '../../lib/shopichatAccess'
import { useShopiChatConnected } from '../../lib/shopichatService'
import { toWhatsAppDigits } from '../../lib/customerKey'
import { IconWhatsApp } from './icons'

interface Props {
  phone?: string | null
  name?: string | null
  className?: string
}

export default function OpenInShopiChat({ phone, name, className }: Props) {
  const { t } = useTranslation('dashboard')
  const { store, firebaseUser } = useAuth()
  const { localePath } = useLanguage()
  const allowed = canSeeShopiChat(firebaseUser?.email)
  const connected = useShopiChatConnected(store?.id, allowed)
  const digits = toWhatsAppDigits(phone, store?.location?.country)

  if (!allowed || !connected || digits.length < 8) return null

  const params = new URLSearchParams({ c: digits })
  if (name && name.trim() && name !== '-') params.set('n', name.trim().slice(0, 60))

  return (
    <Link
      to={`${localePath('/dashboard/shopichat')}?${params.toString()}`}
      className={className || 'flex items-center justify-center gap-2 w-full py-2.5 bg-[#1e3a5f] text-white rounded-xl text-sm font-medium hover:bg-[#2a4d7a] transition-all'}
    >
      <IconWhatsApp className="w-4 h-4" />
      {t('shopichat.openIn')}
    </Link>
  )
}
