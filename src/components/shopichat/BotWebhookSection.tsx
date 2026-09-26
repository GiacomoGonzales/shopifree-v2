/**
 * Configuración → "Conectar tu propio bot" (fase 3C).
 *
 * Webhooks salientes a cualquier herramienta (n8n, Make, Zapier, Dialogflow,
 * código propio) + la API pública /api/v1/whatsapp para responder.
 *
 *  - URL (https), eventos y modo: 'notify' (solo avisa) o 'bot' (el bot
 *    responde y REEMPLAZA al piloto automático; si los dos están prendidos,
 *    gana el bot). Se guarda en stores/{id}/waSettings/automations.botWebhook.
 *  - Secreto de firma: lo genera el servidor (api/whatsapp
 *    'bot-webhook-secret') en stores/{id}/private/botWebhook; se ve UNA vez y
 *    después solo "sfwhsec_…abcd".
 *  - "Enviar prueba" (api/whatsapp 'bot-webhook-test') y el último envío
 *    (automations.botWebhookStatus, lo escribe el servidor).
 */
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import { useLanguage } from '../../hooks/useLanguage'
import {
  BOT_EVENTS, BOT_URL_MAX, ShopiChatApiError, isValidBotUrl, rotateBotSecret, saveBotWebhook, testBotWebhook, toDate,
  type BotTestResult,
} from '../../lib/shopichatService'
import type { WaBotEvent, WaBotMode, WaBotWebhook, WaBotWebhookStatus } from '../../types/shopichat'
import { useToast } from '../ui/Toast'
import { IconAlert, IconBot, IconCopy, IconLink } from './icons'

interface Props {
  storeId: string
  value: WaBotWebhook
  status?: WaBotWebhookStatus | null
  /** El piloto automático de Shopifree está prendido (para avisar la precedencia). */
  autopilotOn: boolean
}

const KNOWN_ERRORS = [
  'INVALID_URL', 'HTTPS_REQUIRED', 'PRIVATE_ADDRESS', 'DNS_ERROR', 'TIMEOUT', 'CONNECTION_ERROR', 'TLS_ERROR',
  'MISSING_URL', 'NO_SECRET', 'PLAN_REQUIRED', 'NETWORK',
]

const EXAMPLE_PAYLOAD = `{
  "id": "evt_9f2c…",
  "type": "message.received",
  "storeId": "abc123",
  "createdAt": "2026-09-25T15:04:05.000Z",
  "mode": "bot",
  "expectsReply": true,
  "conversation": {
    "waId": "51987654321", "phone": "51987654321", "name": "Ana",
    "status": "open", "labels": [], "aiPaused": false
  },
  "message": {
    "id": "wamid.HBg…", "direction": "in", "from": "customer",
    "type": "text", "text": "¿Tienen talla M?", "timestamp": "2026-09-25T15:04:03.000Z"
  },
  "customer": { "orders": { "count": 2, "lastOrderNumber": "1042", "lastStatus": "delivered" } }
}`

const EXAMPLE_REPLY = `{
  "reply": { "text": "¡Sí! Te paso el producto 👇", "productIds": ["prod_123"] }
}
// o para pasarle el chat a una persona:
{ "handoff": { "reason": "Pide factura" } }`

export default function BotWebhookSection({ storeId, value, status, autopilotOn }: Props) {
  const { t, i18n } = useTranslation('dashboard')
  const { localePath } = useLanguage()
  const { showToast } = useToast()
  // null = sin cambios: se muestra lo guardado.
  const [draft, setDraft] = useState<WaBotWebhook | null>(null)
  const [saving, setSaving] = useState(false)
  const [secret, setSecret] = useState<string | null>(null)
  const [secretBusy, setSecretBusy] = useState(false)
  const [testing, setTesting] = useState(false)
  const [test, setTest] = useState<BotTestResult | { error: string } | null>(null)
  const form = draft || value
  const urlOk = !form.url || isValidBotUrl(form.url)
  const botMode = form.mode === 'bot'
  const hasSecret = Boolean(status?.secretHint)

  const errorText = (code: string | null | undefined) => {
    if (!code) return ''
    if (/^HTTP_\d+$/.test(code)) return t('shopichat.bot.errors.HTTP', { status: code.slice(5) })
    return t(`shopichat.bot.errors.${KNOWN_ERRORS.includes(code) ? code : 'generic'}`)
  }

  const persist = async (next: WaBotWebhook) => {
    setSaving(true)
    try {
      await saveBotWebhook(storeId, next)
      showToast(t('shopichat.bot.saved'), 'success')
      return true
    } catch {
      showToast(t('shopichat.bot.saveError'), 'error')
      return false
    } finally {
      setSaving(false)
    }
  }

  const toggle = async () => {
    const enabled = !value.enabled
    if (enabled && (!value.url || !isValidBotUrl(value.url))) {
      showToast(t('shopichat.bot.needUrl'), 'error')
      return
    }
    if (enabled && !hasSecret) {
      showToast(t('shopichat.bot.needSecret'), 'error')
      return
    }
    if (await persist({ ...value, enabled })) setDraft(d => (d ? { ...d, enabled } : d))
  }

  const edit = (patch: Partial<WaBotWebhook>) => setDraft({ ...form, ...patch })

  const toggleEvent = (e: WaBotEvent) =>
    edit({ events: form.events.includes(e) ? form.events.filter(x => x !== e) : [...form.events, e] })

  const save = async () => {
    if (!draft || !urlOk) return
    // Sin URL no puede quedar prendido.
    const next = draft.url ? draft : { ...draft, enabled: false }
    if (await persist(next)) setDraft(null)
  }

  const generateSecret = async () => {
    if (secretBusy) return
    if (hasSecret && !window.confirm(t('shopichat.bot.rotateConfirm'))) return
    setSecretBusy(true)
    try {
      const r = await rotateBotSecret(storeId)
      setSecret(r.secret)
    } catch (e) {
      showToast(errorText((e as ShopiChatApiError)?.code) || t('shopichat.bot.errors.generic'), 'error')
    } finally {
      setSecretBusy(false)
    }
  }

  const copy = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text)
      showToast(t('shopichat.bot.copied'), 'success')
    } catch {
      /* el portapapeles puede estar bloqueado: queda seleccionable */
    }
  }

  const sendTest = async () => {
    if (testing) return
    setTesting(true)
    setTest(null)
    try {
      setTest(await testBotWebhook(storeId))
    } catch (e) {
      setTest({ error: (e as ShopiChatApiError)?.code || 'generic' })
    } finally {
      setTesting(false)
    }
  }

  const last = status?.lastDelivery || null
  const lastAt = toDate(last?.at)
  const autoDisabled = !value.enabled && Boolean(status?.autoDisabledAt)
  const failures = Number(status?.consecutiveFailures) || 0
  const apiKeysPath = `${localePath('/dashboard/integrations')}?tab=api`
  const curl = `curl -X POST https://shopifree.app/api/v1/whatsapp/messages \\
  -H "Authorization: Bearer sfk_..." \\
  -H "Content-Type: application/json" \\
  -d '{"waId":"51987654321","text":"¡Hola! ¿En qué te ayudo?"}'`

  const card = 'bg-white rounded-[14px] border border-[#E6EBF1] p-4 sm:p-5'
  const label = 'block text-[12px] font-semibold text-[#425466] mb-1'
  const input = 'w-full px-3 py-2 text-[13px] bg-white border border-[#E6EBF1] rounded-lg outline-none focus:border-[#38bdf8]'
  const btn = 'px-3 py-1.5 rounded-lg border border-[#E6EBF1] text-[12.5px] font-semibold text-[#1e3a5f] hover:bg-[#F6F9FC] disabled:opacity-40'
  const pre = 'bg-[#0F172A] text-[#E2E8F0] rounded-lg p-3 overflow-x-auto text-[11.5px] leading-relaxed font-mono'

  return (
    <section className={card}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[0.66rem] font-semibold uppercase tracking-[0.07em] text-[#8898AA] flex items-center gap-1.5">
            <IconBot className="w-3.5 h-3.5 text-[#0284C7]" />
            {t('shopichat.bot.title')}
          </p>
          <p className="mt-1.5 text-[12px] text-[#8898AA]">{t('shopichat.bot.help')}</p>
        </div>
        <button
          type="button"
          role="switch"
          aria-checked={value.enabled}
          aria-label={t('shopichat.bot.enable')}
          onClick={toggle}
          disabled={saving}
          className={`relative w-10 h-6 rounded-full flex-none transition-colors disabled:opacity-50 ${value.enabled ? 'bg-[#1B6E4A]' : 'bg-[#CBD5E1]'}`}
        >
          <span className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${value.enabled ? 'translate-x-4' : ''}`} />
        </button>
      </div>

      {autoDisabled && (
        <div className="mt-3 flex gap-2 rounded-lg bg-red-50 border border-red-200 px-3 py-2 text-[11.5px] text-red-700">
          <IconAlert className="w-4 h-4 flex-none mt-px" />
          <span>{t('shopichat.bot.autoDisabled')}</span>
        </div>
      )}

      <div className={`mt-4 space-y-4 ${value.enabled ? '' : 'opacity-80'}`}>
        {/* URL */}
        <label className="block">
          <span className={label}>{t('shopichat.bot.url')}</span>
          <input
            type="url"
            inputMode="url"
            spellCheck={false}
            value={form.url}
            onChange={e => edit({ url: e.target.value.slice(0, BOT_URL_MAX) })}
            placeholder="https://tu-n8n.com/webhook/shopichat"
            className={`${input} font-mono ${urlOk ? '' : 'border-red-300'}`}
          />
          <span className={`mt-0.5 block text-[11px] ${urlOk ? 'text-[#A9B6C6]' : 'text-red-600'}`}>
            {urlOk ? t('shopichat.bot.urlHelp') : t('shopichat.bot.urlInvalid')}
          </span>
        </label>

        {/* Modo */}
        <div>
          <span className={label}>{t('shopichat.bot.mode')}</span>
          <div className="grid sm:grid-cols-2 gap-2">
            {(['notify', 'bot'] as WaBotMode[]).map(m => (
              <button
                key={m}
                type="button"
                onClick={() => edit({ mode: m })}
                className={`text-left rounded-xl border p-3 ${form.mode === m ? 'border-[#38bdf8] bg-[#F0F9FF]' : 'border-[#E6EBF1] hover:bg-[#F6F9FC]'}`}
              >
                <span className="block text-[13px] font-semibold text-[#1e3a5f]">{t(`shopichat.bot.modes.${m}`)}</span>
                <span className="block mt-0.5 text-[11.5px] text-[#8898AA]">{t(`shopichat.bot.modes.${m}Help`)}</span>
              </button>
            ))}
          </div>
          {botMode && autopilotOn && (
            <div className="mt-2 flex gap-2 rounded-lg bg-amber-50 border border-amber-200 px-3 py-2 text-[11.5px] text-amber-800">
              <IconAlert className="w-4 h-4 flex-none mt-px" />
              <span>{t('shopichat.bot.precedence')}</span>
            </div>
          )}
        </div>

        {/* Eventos */}
        <div>
          <span className={label}>{t('shopichat.bot.events')}</span>
          <div className="space-y-1.5">
            {BOT_EVENTS.map(e => {
              const forced = botMode && e === 'message.received'
              return (
                <label key={e} className="flex items-start gap-2 text-[12.5px] text-[#425466]">
                  <input
                    type="checkbox"
                    checked={forced || form.events.includes(e)}
                    disabled={forced}
                    onChange={() => toggleEvent(e)}
                    className="mt-0.5 accent-[#1B6E4A]"
                  />
                  <span>
                    <code className="font-mono text-[12px] text-[#1e3a5f]">{e}</code>
                    <span className="block text-[11px] text-[#A9B6C6]">{t(`shopichat.bot.eventHelp.${e.replace('.', '_')}`)}</span>
                  </span>
                </label>
              )
            })}
          </div>
        </div>

        {draft && (
          <div className="flex justify-end gap-2">
            <button type="button" onClick={() => setDraft(null)} className="px-3 py-1.5 text-[12.5px] font-medium text-[#425466] hover:bg-[#F6F9FC] rounded-lg">
              {t('shopichat.common.cancel')}
            </button>
            <button type="button" onClick={save} disabled={saving || !urlOk} className="px-3 py-1.5 text-[12.5px] font-semibold bg-[#1e3a5f] text-white rounded-lg disabled:opacity-40">
              {saving ? t('shopichat.common.loading') : t('shopichat.common.save')}
            </button>
          </div>
        )}

        {/* Secreto de firma */}
        <div className="rounded-lg border border-[#E6EBF1] p-3 space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[12px] font-semibold text-[#425466]">{t('shopichat.bot.secret')}</span>
            <span className="font-mono text-[12px] text-[#8898AA]">{status?.secretHint || t('shopichat.bot.noSecret')}</span>
            <button type="button" onClick={generateSecret} disabled={secretBusy} className={`${btn} ml-auto`}>
              {secretBusy ? t('shopichat.common.loading') : t(hasSecret ? 'shopichat.bot.rotateSecret' : 'shopichat.bot.generateSecret')}
            </button>
          </div>
          {secret && (
            <div className="rounded-lg bg-amber-50 border border-amber-200 p-2.5 space-y-1.5">
              <p className="text-[11.5px] font-semibold text-amber-800">{t('shopichat.bot.secretOnce')}</p>
              <div className="flex items-center gap-2">
                <code className="flex-1 min-w-0 break-all font-mono text-[11.5px] text-[#1e3a5f] select-all">{secret}</code>
                <button type="button" onClick={() => copy(secret)} className="p-1.5 rounded-md text-[#425466] hover:bg-white flex-none" aria-label={t('shopichat.bot.copy')}>
                  <IconCopy className="w-4 h-4" />
                </button>
              </div>
              <button type="button" onClick={() => setSecret(null)} className="text-[11.5px] font-semibold text-amber-800 hover:underline">
                {t('shopichat.bot.secretSaved')}
              </button>
            </div>
          )}
          <p className="text-[11px] text-[#A9B6C6]">{t('shopichat.bot.secretHelp')}</p>
        </div>

        {/* Prueba y último envío */}
        <div className="rounded-lg border border-[#E6EBF1] p-3 space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={sendTest}
              disabled={testing || !value.url || !hasSecret || Boolean(draft)}
              className={btn}
            >
              {testing ? t('shopichat.bot.testing') : t('shopichat.bot.test')}
            </button>
            {test && 'status' in test && (
              <span className={`text-[12px] font-semibold ${test.delivered ? 'text-[#15803D]' : 'text-red-600'}`}>
                {test.status ? `HTTP ${test.status}` : errorText(test.error)} · {test.durationMs} ms
              </span>
            )}
            {test && !('status' in test) && <span className="text-[12px] font-semibold text-red-600">{errorText(test.error)}</span>}
          </div>
          {draft && <p className="text-[11px] text-[#A9B6C6]">{t('shopichat.bot.saveFirst')}</p>}
          {test && 'status' in test && test.response && (
            <pre className={`${pre} max-h-28`}>{test.response}</pre>
          )}
          <p className="text-[11.5px] text-[#425466]">
            <span className="font-semibold">{t('shopichat.bot.lastDelivery')}</span>{' '}
            {last && lastAt ? (
              <>
                {lastAt.toLocaleString(i18n.language)} · <code className="font-mono">{last.event}</code> ·{' '}
                <span className={last.ok ? 'text-[#15803D]' : 'text-red-600'}>
                  {last.ok ? `HTTP ${last.status}` : errorText(last.error)}
                </span>
              </>
            ) : (
              <span className="text-[#A9B6C6]">{t('shopichat.bot.never')}</span>
            )}
          </p>
          {value.enabled && failures > 0 && (
            <p className="text-[11.5px] text-amber-700">{t('shopichat.bot.failing', { count: failures })}</p>
          )}
        </div>

        {/* Ayuda: payload, respuesta y API */}
        <details className="rounded-lg border border-[#E6EBF1] p-3 group">
          <summary className="cursor-pointer text-[12.5px] font-semibold text-[#1e3a5f]">{t('shopichat.bot.howTitle')}</summary>
          <div className="mt-3 space-y-3 text-[12px] text-[#425466]">
            <p>{t('shopichat.bot.howPayload')}</p>
            <pre className={pre}>{EXAMPLE_PAYLOAD}</pre>
            <p>{t('shopichat.bot.howSignature')}</p>
            <p>{t('shopichat.bot.howReply')}</p>
            <pre className={pre}>{EXAMPLE_REPLY}</pre>
            <p>{t('shopichat.bot.howApi')}</p>
            <pre className={pre}>{curl}</pre>
            <div className="flex flex-wrap gap-3">
              <Link to={apiKeysPath} className="inline-flex items-center gap-1 font-semibold text-[#0284C7] hover:underline">
                <IconLink className="w-3.5 h-3.5" />{t('shopichat.bot.apiKeysLink')}
              </Link>
              <a href="/api-docs#whatsapp" target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 font-semibold text-[#0284C7] hover:underline">
                <IconLink className="w-3.5 h-3.5" />{t('shopichat.bot.docsLink')}
              </a>
            </div>
          </div>
        </details>
      </div>
    </section>
  )
}
