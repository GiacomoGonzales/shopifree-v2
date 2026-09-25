/**
 * Configuración → "Avisos automáticos": un interruptor por evento del pedido
 * (recibido, confirmado, en camino, listo para recoger, entregado y
 * recordatorio de pago con su espera), el estado en Meta de la plantilla de
 * cada uno y el botón que crea las que falten (acción
 * 'setup-order-templates').
 *
 * Se guarda en stores/{id}/waSettings/automations.orderNotifications; lo leen
 * la Cloud Function onOrderWriteWhatsapp y api/whatsapp-notify, que es quien
 * manda (y nunca dos veces el mismo aviso por pedido).
 */
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  REMINDER_DELAYS, ShopiChatApiError, saveOrderNotifications, setupOrderTemplates,
} from '../../lib/shopichatService'
import type { WaOrderEvent, WaOrderNotifications, WaTemplate, WaTemplatesDoc } from '../../types/shopichat'
import { useToast } from '../ui/Toast'
import { IconRefresh } from './icons'

/** Nombre de la plantilla de cada evento (mismo que api/_shared/whatsappOrderNotify.ts). */
const EVENT_TEMPLATE: Record<WaOrderEvent, string> = {
  received: 'pedido_recibido',
  confirmed: 'pedido_confirmado',
  shipped: 'pedido_en_camino',
  readyForPickup: 'pedido_listo_para_recoger',
  delivered: 'pedido_entregado',
  paymentReminder: 'recordatorio_pago',
}
const EVENTS: WaOrderEvent[] = ['received', 'confirmed', 'shipped', 'readyForPickup', 'delivered', 'paymentReminder']

const langOf = (l?: string | null) => (String(l || '').toLowerCase().startsWith('en') ? 'en' : 'es')

/** Igual que pickEventTemplate del servidor: la del idioma de la tienda, si no una aprobada. */
function templateFor(items: WaTemplate[], event: WaOrderEvent, storeLang: string): WaTemplate | null {
  const same = items.filter(t => t.name === EVENT_TEMPLATE[event])
  return same.find(t => langOf(t.language) === storeLang && t.status === 'APPROVED')
    || same.find(t => t.status === 'APPROVED')
    || same.find(t => langOf(t.language) === storeLang)
    || same[0]
    || null
}

const STATUS_STYLE: Record<string, string> = {
  APPROVED: 'bg-[#DCFCE7] text-[#15803D]',
  PENDING: 'bg-[#FEF3C7] text-[#B45309]',
  REJECTED: 'bg-red-50 text-red-600',
}

interface Props {
  storeId: string
  storeLanguage?: string | null
  templates: WaTemplatesDoc
  value: WaOrderNotifications
}

export default function OrderNotificationsSection({ storeId, storeLanguage, templates, value }: Props) {
  const { t } = useTranslation('dashboard')
  const { showToast } = useToast()
  const [saving, setSaving] = useState(false)
  const [settingUp, setSettingUp] = useState(false)
  const storeLang = langOf(storeLanguage)

  const save = async (next: WaOrderNotifications) => {
    setSaving(true)
    try {
      await saveOrderNotifications(storeId, next)
      showToast(t('shopichat.orderNotifications.saved'), 'success')
    } catch {
      showToast(t('shopichat.orderNotifications.saveError'), 'error')
    } finally {
      setSaving(false)
    }
  }

  const toggle = (event: WaOrderEvent) => {
    if (event === 'paymentReminder') {
      void save({ ...value, paymentReminder: { ...value.paymentReminder, enabled: !value.paymentReminder.enabled } })
    } else {
      void save({ ...value, [event]: !value[event] })
    }
  }

  const setup = async () => {
    setSettingUp(true)
    try {
      const r = await setupOrderTemplates(storeId)
      if (r.errors.length) {
        const detail = r.errors.map(e => `${e.name} (${e.message})`).join('; ')
        showToast(t('shopichat.orderNotifications.setupErrors', { count: r.errors.length, detail }), 'error')
      } else if (r.created.length) {
        showToast(t('shopichat.orderNotifications.setupCreated', { count: r.created.length }), 'success')
      } else {
        showToast(t('shopichat.orderNotifications.setupDone'), 'success')
      }
    } catch (e) {
      const msg = e instanceof ShopiChatApiError && e.code !== 'INTERNAL' ? e.message : ''
      showToast(msg || t('shopichat.orderNotifications.setupError'), 'error')
    } finally {
      setSettingUp(false)
    }
  }

  const isOn = (event: WaOrderEvent) => (event === 'paymentReminder' ? value.paymentReminder.enabled : value[event])

  return (
    <section className="bg-white rounded-[14px] border border-[#E6EBF1] p-4 sm:p-5">
      <div className="flex items-center justify-between gap-2">
        <p className="text-[0.66rem] font-semibold uppercase tracking-[0.07em] text-[#8898AA]">{t('shopichat.orderNotifications.title')}</p>
        <button
          type="button"
          onClick={setup}
          disabled={settingUp}
          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border border-[#E6EBF1] text-[12px] font-medium text-[#1e3a5f] hover:bg-[#F6F9FC] disabled:opacity-50"
        >
          <IconRefresh className={`w-3.5 h-3.5 ${settingUp ? 'animate-spin' : ''}`} />
          {settingUp ? t('shopichat.orderNotifications.setupRunning') : t('shopichat.orderNotifications.setup')}
        </button>
      </div>
      <p className="mt-1.5 text-[12px] text-[#8898AA]">{t('shopichat.orderNotifications.help')}</p>
      <p className="mt-1 text-[11.5px] text-[#B45309]">{t('shopichat.orderNotifications.cost')}</p>

      <div className="mt-3 divide-y divide-[#F1F5F9]">
        {EVENTS.map(event => {
          const tpl = templateFor(templates.items, event, storeLang)
          const status = tpl?.status || 'missing'
          const on = isOn(event)
          return (
            <div key={event} className="py-3 flex items-start gap-3">
              <div className="flex-1 min-w-0">
                <div className="flex flex-wrap items-center gap-1.5">
                  <p className="text-[13px] font-semibold text-[#1e3a5f]">{t(`shopichat.orderNotifications.events.${event}`)}</p>
                  <span className={`px-1.5 py-0.5 rounded-full text-[10.5px] font-semibold ${STATUS_STYLE[status] || 'bg-[#F1F5F9] text-[#8898AA]'}`}>
                    {t(`shopichat.orderNotifications.status.${status}`, { defaultValue: status })}
                  </span>
                </div>
                <p className="mt-0.5 text-[12px] text-[#8898AA]">{t(`shopichat.orderNotifications.eventsHelp.${event}`)}</p>
                {on && status !== 'APPROVED' && (
                  <p className="mt-0.5 text-[11.5px] text-[#B45309]">{t('shopichat.orderNotifications.notApprovedHint')}</p>
                )}
                {event === 'paymentReminder' && on && (
                  <label className="mt-2 flex items-center gap-2 text-[12px] text-[#425466]">
                    {t('shopichat.orderNotifications.delay')}
                    <select
                      value={value.paymentReminder.delayHours}
                      disabled={saving}
                      onChange={e => void save({ ...value, paymentReminder: { enabled: true, delayHours: Number(e.target.value) } })}
                      className="px-2 py-1 text-[12px] bg-white border border-[#E6EBF1] rounded-lg outline-none focus:border-[#38bdf8]"
                    >
                      {REMINDER_DELAYS.map(h => (
                        <option key={h} value={h}>{t('shopichat.orderNotifications.hours', { count: h })}</option>
                      ))}
                    </select>
                  </label>
                )}
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={on}
                aria-label={t(`shopichat.orderNotifications.events.${event}`)}
                disabled={saving}
                onClick={() => toggle(event)}
                className={`relative flex-none mt-0.5 w-10 h-6 rounded-full transition-colors disabled:opacity-60 ${on ? 'bg-[#25D366]' : 'bg-[#E6EBF1]'}`}
              >
                <span className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${on ? 'translate-x-4' : ''}`} />
              </button>
            </div>
          )
        })}
      </div>
    </section>
  )
}
