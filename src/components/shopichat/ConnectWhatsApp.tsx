/**
 * "Conectar mi WhatsApp" — Embedded Signup v4 de Meta.
 * ====================================================
 * Flujo (docs de Meta, Embedded Signup → Implementation):
 *  1. Se carga el SDK de Facebook (connect.facebook.net/en_US/sdk.js) y se
 *     llama FB.init con VITE_META_APP_ID y una versión de Graph actual.
 *  2. FB.login con `config_id` (VITE_META_ES_CONFIG_ID), `response_type:
 *     'code'` y `override_default_response_type: true` abre el popup de Meta.
 *     El callback devuelve un `code` de un solo uso (vive ~30 s) que el
 *     backend canjea por el token del negocio.
 *  3. Mientras tanto el popup manda `postMessage` desde facebook.com con
 *     `{ type: 'WA_EMBEDDED_SIGNUP', event, data: { waba_id, phone_number_id } }`.
 *     `event` es FINISH (número nuevo), FINISH_WHATSAPP_BUSINESS_APP_ONBOARDING
 *     (coexistencia: el número de la app WhatsApp Business del celular, que
 *     puede no traer phone_number_id), CANCEL o ERROR.
 *  4. Con el code y el waba_id se llama a la acción 'connect' de /api/whatsapp.
 *
 * Coexistencia: con `featureType: 'whatsapp_business_app_onboarding'` Meta
 * ofrece usar el número que ya está en la app WhatsApp Business; el
 * comerciante sigue usando la app en su celular y los mensajes se ven en los
 * dos lados.
 *
 * Sin las variables de entorno se muestra "próximamente" en vez de romper. En
 * la app nativa el popup del SDK no funciona en el WebView: se pide conectar
 * desde la computadora.
 */
import { useTranslation } from 'react-i18next'
import type { WaAccount } from '../../types/shopichat'
import { useEmbeddedSignup } from './useEmbeddedSignup'
import { IconAlert, IconCheck, IconChevronDown, IconPhoneDevice, IconWhatsApp } from './icons'

// Guia oficial de WhatsApp para pasar del WhatsApp normal a WhatsApp Business
// conservando los chats (requisito de la coexistencia).
const WA_BUSINESS_SWITCH_URL = 'https://faq.whatsapp.com/663543925287107'

/**
 * Guia corta antes del boton: que se necesita, los 3 pasos del popup de Meta,
 * que cuesta y preguntas frecuentes (plegables). Ojo con la FAQ de chats: el
 * historial de la app NO se importa (fase 1, ver api/whatsapp.ts); solo los
 * contactos. No prometer que los mensajes viejos aparecen en ShopiChat.
 */
function ConnectGuide() {
  const { t } = useTranslation('dashboard')
  const faq = t('shopichat.connect.guide.faq', { returnObjects: true }) as { q: string; a: string }[]
  const steps = [t('shopichat.connect.guide.step1'), t('shopichat.connect.guide.step2'), t('shopichat.connect.guide.step3')]

  return (
    <div className="px-5 sm:px-8 mt-5 space-y-4">
      {/* Lo que necesitas */}
      <div>
        <p className="text-[0.72rem] font-semibold uppercase tracking-wide text-[#8898AA]">{t('shopichat.connect.guide.needTitle')}</p>
        <ul className="mt-2 space-y-1.5 text-[0.82rem] text-[#425466]">
          <li className="flex items-start gap-2"><span className="mt-[0.45rem] w-1.5 h-1.5 rounded-full bg-[#0284C7] flex-none" />{t('shopichat.connect.guide.needFacebook')}</li>
          <li className="flex items-start gap-2">
            <span className="mt-[0.45rem] w-1.5 h-1.5 rounded-full bg-[#0284C7] flex-none" />
            <span>
              {t('shopichat.connect.guide.needApp')}{' '}
              <a href={WA_BUSINESS_SWITCH_URL} target="_blank" rel="noopener noreferrer" className="text-[#0284C7] underline underline-offset-2 hover:text-[#1e3a5f]">
                {t('shopichat.connect.guide.needAppLink')}
              </a>
            </span>
          </li>
          <li className="flex items-start gap-2"><span className="mt-[0.45rem] w-1.5 h-1.5 rounded-full bg-[#0284C7] flex-none" />{t('shopichat.connect.guide.needPlan')}</li>
        </ul>
      </div>

      {/* Los 3 pasos del popup de Meta */}
      <div>
        <p className="text-[0.72rem] font-semibold uppercase tracking-wide text-[#8898AA]">{t('shopichat.connect.guide.stepsTitle')}</p>
        <ol className="mt-2 grid sm:grid-cols-3 gap-2">
          {steps.map((step, i) => (
            <li key={i} className="rounded-xl border border-[#E6EBF1] px-3 py-2.5 flex sm:flex-col items-start gap-2.5 sm:gap-1.5">
              <span className="w-6 h-6 rounded-full bg-[#1e3a5f] text-white text-[0.72rem] font-semibold grid place-items-center flex-none">{i + 1}</span>
              <span className="text-[0.8rem] text-[#425466] leading-snug">{step}</span>
            </li>
          ))}
        </ol>
      </div>

      {/* Costos */}
      <div className="rounded-xl bg-[#F6F9FC] border border-[#E6EBF1] px-4 py-3">
        <p className="text-[0.82rem] font-semibold text-[#1e3a5f]">{t('shopichat.connect.guide.costTitle')}</p>
        <p className="text-[0.78rem] text-[#8898AA] mt-0.5">{t('shopichat.connect.guide.costBody')}</p>
      </div>

      {/* Preguntas frecuentes (plegables) */}
      <div>
        <p className="text-[0.72rem] font-semibold uppercase tracking-wide text-[#8898AA]">{t('shopichat.connect.guide.faqTitle')}</p>
        <div className="mt-2 rounded-xl border border-[#E6EBF1] divide-y divide-[#E6EBF1] overflow-hidden">
          {faq.map(item => (
            <details key={item.q} className="group">
              <summary className="cursor-pointer list-none px-4 py-2.5 flex items-center justify-between gap-3 text-[0.82rem] font-medium text-[#1e3a5f] hover:bg-[#F6F9FC]">
                {item.q}
                <IconChevronDown className="w-4 h-4 text-[#A9B6C6] flex-none transition-transform group-open:rotate-180" />
              </summary>
              <p className="px-4 pb-3 text-[0.8rem] text-[#425466]">{item.a}</p>
            </details>
          ))}
        </div>
      </div>
    </div>
  )
}

export default function ConnectWhatsApp({ storeId, account }: { storeId: string; account: WaAccount | null }) {
  const { t } = useTranslation('dashboard')
  const { configured, isNative, sdkReady, sdkFailed, phase, error, launch } = useEmbeddedSignup(storeId)

  const benefits = [
    t('shopichat.connect.benefit1'),
    t('shopichat.connect.benefit2'),
    t('shopichat.connect.benefit3'),
    t('shopichat.connect.benefit4'),
  ]

  return (
    <div className="max-w-2xl mx-auto py-2 sm:py-6">
      <div className="bg-white rounded-[14px] border border-[#E6EBF1] overflow-hidden" style={{ boxShadow: '0 10px 28px -22px rgba(30,58,95,.4)' }}>
        <div className="px-5 sm:px-8 pt-7 pb-6 text-center">
          <div className="w-14 h-14 mx-auto rounded-2xl bg-[#25D366] text-white grid place-items-center">
            <IconWhatsApp className="w-8 h-8" />
          </div>
          <h1 className="mt-4 text-lg sm:text-xl font-semibold tracking-tight text-[#1e3a5f]">{t('shopichat.connect.title')}</h1>
          <p className="mt-1.5 text-[0.85rem] text-[#8898AA] max-w-md mx-auto">{t('shopichat.connect.subtitle')}</p>
        </div>

        <ul className="px-5 sm:px-8 space-y-2.5">
          {benefits.map(b => (
            <li key={b} className="flex items-start gap-2.5 text-[0.85rem] text-[#425466]">
              <span className="mt-0.5 w-5 h-5 rounded-full bg-[#F0F9FF] text-[#0284C7] grid place-items-center flex-none">
                <IconCheck className="w-3 h-3" />
              </span>
              {b}
            </li>
          ))}
        </ul>

        <div className="mx-5 sm:mx-8 mt-5 rounded-xl bg-[#F6F9FC] border border-[#E6EBF1] px-4 py-3 flex items-start gap-3">
          <IconPhoneDevice className="w-5 h-5 text-[#1e3a5f] flex-none mt-0.5" />
          <div>
            <p className="text-[0.82rem] font-semibold text-[#1e3a5f]">{t('shopichat.connect.coexistTitle')}</p>
            <p className="text-[0.78rem] text-[#8898AA] mt-0.5">{t('shopichat.connect.coexistBody')}</p>
          </div>
        </div>

        <ConnectGuide />

        {account?.status === 'error' && account.lastError && (
          <div className="mx-5 sm:mx-8 mt-4 rounded-xl bg-red-50 border border-red-100 px-4 py-3 flex items-start gap-2.5">
            <IconAlert className="w-4 h-4 text-red-500 flex-none mt-0.5" />
            <p className="text-[0.8rem] text-red-700">{t('shopichat.connect.lastError', { error: account.lastError })}</p>
          </div>
        )}

        <div className="px-5 sm:px-8 py-6">
          {!configured ? (
            <div className="rounded-xl bg-[#FEF3C7] border border-[#FDE68A] px-4 py-3 text-center">
              <p className="text-[0.85rem] font-semibold text-[#B45309]">{t('shopichat.connect.comingSoonTitle')}</p>
              <p className="text-[0.78rem] text-[#B45309]/80 mt-0.5">{t('shopichat.connect.comingSoonBody')}</p>
            </div>
          ) : isNative ? (
            <div className="rounded-xl bg-[#F0F9FF] border border-[#38bdf8]/30 px-4 py-3 text-center">
              <p className="text-[0.85rem] font-semibold text-[#1e3a5f]">{t('shopichat.connect.desktopTitle')}</p>
              <p className="text-[0.78rem] text-[#8898AA] mt-0.5">{t('shopichat.connect.desktopBody')}</p>
            </div>
          ) : (
            <div className="space-y-2.5">
              <button
                type="button"
                onClick={() => launch(true)}
                disabled={!sdkReady || phase === 'popup' || phase === 'connecting'}
                className="w-full inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-[#1e3a5f] text-white text-[0.9rem] font-semibold hover:bg-[#2a4d7a] disabled:opacity-60 transition-colors"
              >
                <IconWhatsApp className="w-5 h-5" />
                {phase === 'connecting' ? t('shopichat.connect.connecting') : t('shopichat.connect.cta')}
              </button>
              <button
                type="button"
                onClick={() => launch(false)}
                disabled={!sdkReady || phase === 'popup' || phase === 'connecting'}
                className="w-full px-5 py-2.5 rounded-xl border border-[#E6EBF1] text-[#425466] text-[0.82rem] font-medium hover:bg-[#F6F9FC] disabled:opacity-60"
              >
                {t('shopichat.connect.ctaNewNumber')}
              </button>
              {!sdkReady && !sdkFailed && <p className="text-center text-[0.75rem] text-[#A9B6C6]">{t('shopichat.connect.loadingSdk')}</p>}
              {sdkFailed && <p className="text-center text-[0.78rem] text-red-600">{t('shopichat.connect.sdkError')}</p>}
              {phase === 'popup' && <p className="text-center text-[0.78rem] text-[#8898AA]">{t('shopichat.connect.followPopup')}</p>}
              {phase === 'done' && <p className="text-center text-[0.78rem] text-[#0284C7]">{t('shopichat.connect.almost')}</p>}
              {error && <p className="text-center text-[0.78rem] text-red-600">{error}</p>}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
