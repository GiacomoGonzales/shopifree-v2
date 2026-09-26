/**
 * Banner "Reconectar WhatsApp" de la bandeja.
 * ============================================
 * El token de Meta de la tienda vence (o ya venció) y el servidor no pudo
 * renovarlo solo: waSettings/account.tokenStatus = 'expiring' | 'expired'
 * (api/_shared/whatsappTokenHealth.ts). El botón vuelve a abrir Embedded Signup;
 * el backend reconoce el mismo número y solo cambia el token, así que las
 * conversaciones quedan intactas. Al terminar, el servidor escribe
 * tokenStatus 'ok' y el banner desaparece solo.
 */
import { useTranslation } from 'react-i18next'
import type { WaAccount } from '../../types/shopichat'
import { toDate } from '../../lib/shopichatService'
import { useEmbeddedSignup } from './useEmbeddedSignup'
import { IconAlert, IconWhatsApp } from './icons'

export default function ReconnectWhatsAppBanner({ storeId, account }: { storeId: string; account: WaAccount }) {
  if (account.tokenStatus !== 'expiring' && account.tokenStatus !== 'expired') return null
  return <Banner storeId={storeId} account={account} expired={account.tokenStatus === 'expired'} />
}

function Banner({ storeId, account, expired }: { storeId: string; account: WaAccount; expired: boolean }) {
  const { t, i18n } = useTranslation('dashboard')
  const { configured, isNative, sdkReady, phase, error, launch } = useEmbeddedSignup(storeId)

  const expiresAt = toDate(account.tokenExpiresAt ?? null)
  const date = expiresAt
    ? expiresAt.toLocaleDateString(i18n.language === 'en' ? 'en-US' : 'es', { day: 'numeric', month: 'long' })
    : null
  const title = expired
    ? t('shopichat.reconnect.expiredTitle')
    : date ? t('shopichat.reconnect.expiringTitle', { date }) : t('shopichat.reconnect.expiringSoonTitle')

  const tone = expired
    ? 'bg-red-50 border-red-100 text-red-800'
    : 'bg-[#FFFBEB] border-[#FDE68A] text-[#92400E]'

  return (
    <div className={`border-b px-4 py-2.5 flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3 ${tone}`} role="alert">
      <div className="flex items-start gap-2.5 min-w-0 flex-1">
        <IconAlert className={`w-4 h-4 flex-none mt-0.5 ${expired ? 'text-red-500' : 'text-[#D97706]'}`} />
        <div className="min-w-0">
          <p className="text-[0.82rem] font-semibold">{title}</p>
          <p className="text-[0.76rem] opacity-80">
            {isNative ? t('shopichat.reconnect.desktopBody') : t('shopichat.reconnect.body')}
          </p>
          {phase === 'popup' && <p className="text-[0.76rem] mt-0.5">{t('shopichat.connect.followPopup')}</p>}
          {phase === 'done' && <p className="text-[0.76rem] mt-0.5">{t('shopichat.reconnect.done')}</p>}
          {error && <p className="text-[0.76rem] mt-0.5 text-red-700">{error}</p>}
        </div>
      </div>
      {configured && !isNative && (
        <button
          type="button"
          // Coexistencia: el número vive en la app WhatsApp Business del celular.
          onClick={() => launch(account.coexistence === true)}
          disabled={!sdkReady || phase === 'popup' || phase === 'connecting'}
          className="inline-flex items-center justify-center gap-2 px-3.5 py-2 rounded-lg bg-[#1e3a5f] text-white text-[0.8rem] font-semibold hover:bg-[#2a4d7a] disabled:opacity-60 transition-colors flex-none"
        >
          <IconWhatsApp className="w-4 h-4" />
          {phase === 'connecting' ? t('shopichat.connect.connecting') : t('shopichat.reconnect.cta')}
        </button>
      )}
    </div>
  )
}
