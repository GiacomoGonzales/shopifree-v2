/**
 * Configuración → "Asistente IA" (fases 3A/3B).
 *
 *  - Modo: Copiloto (propone respuestas en el chat, el comerciante envía) o
 *    Piloto automático (responde solo a los clientes; ver
 *    api/_shared/shopichatAutopilot.ts).
 *  - Proveedor: la IA incluida de Shopifree o la clave propia del comerciante
 *    (ChatGPT, Gemini o Claude). La clave va directo al servidor
 *    (api/shopichat-ai 'save-key', que la prueba y la guarda en
 *    stores/{id}/private/ai); acá solo se ve "…abcd".
 *  - Horario de atención + mensaje de ausencia y nota de derivación (piloto).
 *
 * Se guarda en stores/{id}/waSettings/automations.ai. El interruptor se
 * guarda al tocarlo; el resto con "Guardar". El proveedor BYO lo fija el
 * servidor al guardar la clave (para no quedar apuntando a una clave que no hay).
 */
import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  AI_ANTHROPIC_MODELS, AI_AWAY_MAX, AI_DEFAULT_MODELS, AI_HANDOFF_MAX, AI_KNOWLEDGE_MAX, AI_OUTSIDE_HOURS, AI_PROVIDERS,
  AI_SIGNATURE_MAX, AI_TONES, ShopiChatApiError, aiDeleteKey, aiKeyStatus, aiSaveKey, saveAiSettings,
} from '../../lib/shopichatService'
import type { WaAiKeyStatus, WaAiMode, WaAiProvider, WaAiSettings, WaAiStatus } from '../../types/shopichat'
import { useToast } from '../ui/Toast'
import { IconAlert, IconBot, IconSparkles } from './icons'

interface Props {
  storeId: string
  value: WaAiSettings
  status?: WaAiStatus | null
}

type ByoProvider = Exclude<WaAiProvider, 'shopifree'>
const DAYS = [1, 2, 3, 4, 5, 6, 0]
const KEY_ERRORS = ['INVALID_KEY', 'QUOTA', 'MODEL_NOT_FOUND', 'PROVIDER_ERROR', 'INVALID_MODEL', 'MISSING_KEY', 'NETWORK', 'NOT_DEPLOYED', 'PLAN_REQUIRED']

export default function AiSettingsSection({ storeId, value, status }: Props) {
  const { t } = useTranslation('dashboard')
  const { showToast } = useToast()
  // null = sin cambios: se muestra lo guardado (y lo que llegue de otro dispositivo).
  const [draft, setDraft] = useState<WaAiSettings | null>(null)
  const [saving, setSaving] = useState(false)
  const form = draft || value

  // ---- clave propia
  const [keyStatus, setKeyStatus] = useState<WaAiKeyStatus | null>(null)
  // Proveedor que se está mirando (puede no tener clave todavía).
  const [picked, setPicked] = useState<WaAiProvider>(value.provider)
  const [apiKey, setApiKey] = useState('')
  const [model, setModel] = useState('')
  const [editingKey, setEditingKey] = useState(false)
  const [keyBusy, setKeyBusy] = useState(false)
  const [keyError, setKeyError] = useState<string | null>(null)

  useEffect(() => { setPicked(value.provider) }, [value.provider])
  useEffect(() => {
    let alive = true
    aiKeyStatus(storeId).then(r => { if (alive) setKeyStatus(r.status) }).catch(() => { /* API sin desplegar o sin red */ })
    return () => { alive = false }
  }, [storeId])

  const byo: ByoProvider | null = picked === 'shopifree' ? null : picked
  const hasKeyFor = (p: ByoProvider) => Boolean(keyStatus?.configured && keyStatus.provider === p)
  const showKeyForm = byo && (!hasKeyFor(byo) || editingKey)

  useEffect(() => {
    // Modelo inicial del formulario: el guardado (si es de este proveedor) o el default.
    if (!byo) return
    setModel(hasKeyFor(byo) ? keyStatus?.model || AI_DEFAULT_MODELS[byo] : AI_DEFAULT_MODELS[byo])
    setApiKey('')
    setKeyError(null)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [byo, keyStatus?.provider, keyStatus?.model])

  const persist = async (next: WaAiSettings) => {
    setSaving(true)
    try {
      await saveAiSettings(storeId, next)
      showToast(t('shopichat.ai.settings.saved'), 'success')
      return true
    } catch {
      showToast(t('shopichat.ai.settings.saveError'), 'error')
      return false
    } finally {
      setSaving(false)
    }
  }

  const toggle = async () => {
    const enabled = !value.enabled
    // Solo el interruptor: lo que se esté editando queda como borrador.
    if (await persist({ ...value, enabled })) setDraft(d => (d ? { ...d, enabled } : d))
  }

  const edit = (patch: Partial<WaAiSettings>) => setDraft({ ...form, ...patch })
  const editHours = (patch: Partial<WaAiSettings['hours']>) => edit({ hours: { ...form.hours, ...patch } })

  const save = async () => {
    if (!draft) return
    if (await persist(draft)) setDraft(null)
  }

  const pickProvider = (p: WaAiProvider) => {
    setPicked(p)
    setEditingKey(false)
    // Solo se apunta a un proveedor que puede usarse: el incluido o uno con clave guardada.
    if (p === 'shopifree' || hasKeyFor(p)) {
      if (form.provider !== p) edit({ provider: p })
    }
  }

  const saveKey = async () => {
    if (!byo || keyBusy) return
    setKeyBusy(true)
    setKeyError(null)
    try {
      const r = await aiSaveKey(storeId, byo, apiKey, model)
      setKeyStatus(r.status)
      setApiKey('')
      setEditingKey(false)
      // El servidor ya dejó automations.ai.provider en este proveedor.
      setDraft(d => (d ? { ...d, provider: byo } : d))
      showToast(t('shopichat.ai.provider.keySaved'), 'success')
    } catch (e) {
      const code = (e as ShopiChatApiError)?.code || ''
      setKeyError(t(`shopichat.ai.provider.errors.${KEY_ERRORS.includes(code) ? code : 'generic'}`))
    } finally {
      setKeyBusy(false)
    }
  }

  const deleteKey = async () => {
    if (keyBusy || !window.confirm(t('shopichat.ai.provider.deleteConfirm'))) return
    setKeyBusy(true)
    try {
      const r = await aiDeleteKey(storeId)
      setKeyStatus(r.status)
      setPicked('shopifree')
      setDraft(d => (d ? { ...d, provider: 'shopifree' } : d))
      showToast(t('shopichat.ai.provider.keyDeleted'), 'success')
    } catch {
      showToast(t('shopichat.ai.provider.errors.generic'), 'error')
    } finally {
      setKeyBusy(false)
    }
  }

  const card = 'bg-white rounded-[14px] border border-[#E6EBF1] p-4 sm:p-5'
  const label = 'block text-[12px] font-semibold text-[#425466] mb-1'
  const input = 'w-full px-3 py-2 text-[13px] bg-white border border-[#E6EBF1] rounded-lg outline-none focus:border-[#38bdf8]'
  const chip = (on: boolean) => `px-3 py-1.5 rounded-lg text-[12.5px] font-medium border ${on ? 'border-[#38bdf8] bg-[#F0F9FF] text-[#0284C7]' : 'border-[#E6EBF1] text-[#425466] hover:bg-[#F6F9FC]'}`
  const autopilot = form.mode === 'autopilot'

  return (
    <section className={card}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[0.66rem] font-semibold uppercase tracking-[0.07em] text-[#8898AA] flex items-center gap-1.5">
            <IconSparkles className="w-3.5 h-3.5 text-[#7C3AED]" />
            {t('shopichat.ai.settings.title')}
          </p>
          <p className="mt-1.5 text-[12px] text-[#8898AA]">{t(autopilot ? 'shopichat.ai.settings.helpAutopilot' : 'shopichat.ai.settings.help')}</p>
        </div>
        <button
          type="button"
          role="switch"
          aria-checked={value.enabled}
          aria-label={t('shopichat.ai.settings.enable')}
          onClick={toggle}
          disabled={saving}
          className={`relative w-10 h-6 rounded-full flex-none transition-colors disabled:opacity-50 ${value.enabled ? 'bg-[#1B6E4A]' : 'bg-[#CBD5E1]'}`}
        >
          <span className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${value.enabled ? 'translate-x-4' : ''}`} />
        </button>
      </div>

      <div className={`mt-4 space-y-4 ${value.enabled ? '' : 'opacity-60'}`}>
        {/* Modo */}
        <div>
          <span className={label}>{t('shopichat.ai.mode.title')}</span>
          <div className="grid sm:grid-cols-2 gap-2">
            {(['copilot', 'autopilot'] as WaAiMode[]).map(m => (
              <button
                key={m}
                type="button"
                onClick={() => edit({ mode: m })}
                className={`text-left rounded-xl border p-3 ${form.mode === m ? 'border-[#38bdf8] bg-[#F0F9FF]' : 'border-[#E6EBF1] hover:bg-[#F6F9FC]'}`}
              >
                <span className="flex items-center gap-1.5 text-[13px] font-semibold text-[#1e3a5f]">
                  {m === 'autopilot' ? <IconBot className="w-4 h-4 text-[#7C3AED]" /> : <IconSparkles className="w-4 h-4 text-[#7C3AED]" />}
                  {t(`shopichat.ai.mode.${m}`)}
                </span>
                <span className="block mt-0.5 text-[11.5px] text-[#8898AA]">{t(`shopichat.ai.mode.${m}Help`)}</span>
              </button>
            ))}
          </div>
          {autopilot && (
            <div className="mt-2 flex gap-2 rounded-lg bg-amber-50 border border-amber-200 px-3 py-2 text-[11.5px] text-amber-800">
              <IconAlert className="w-4 h-4 flex-none mt-px" />
              <span>{t('shopichat.ai.mode.autopilotWarning')}</span>
            </div>
          )}
          {autopilot && value.mode === 'autopilot' && status?.lastError && (
            <p className="mt-2 text-[11.5px] text-red-600">
              {t('shopichat.ai.autopilot.lastError', { error: t(`shopichat.ai.autopilot.errors.${status.lastError}`, { defaultValue: status.lastError }) })}
            </p>
          )}
        </div>

        {/* Proveedor */}
        <div>
          <span className={label}>{t('shopichat.ai.provider.title')}</span>
          <div className="flex flex-wrap gap-1.5">
            {AI_PROVIDERS.map(p => (
              <button key={p} type="button" onClick={() => pickProvider(p)} className={chip(picked === p)}>
                {t(`shopichat.ai.provider.names.${p}`)}
                {p !== 'shopifree' && hasKeyFor(p) && <span className="ml-1 text-[#1B6E4A]">●</span>}
              </button>
            ))}
          </div>
          <p className="mt-1 text-[11.5px] text-[#A9B6C6]">
            {byo ? t('shopichat.ai.provider.byoHelp') : t('shopichat.ai.provider.shopifreeHelp')}
          </p>

          {byo && hasKeyFor(byo) && !editingKey && (
            <div className="mt-2 flex flex-wrap items-center gap-2 rounded-lg border border-[#E6EBF1] px-3 py-2 text-[12px] text-[#425466]">
              <span className="font-mono">{keyStatus?.masked}</span>
              <span className="text-[#8898AA]">· {keyStatus?.model}</span>
              {form.provider !== byo && <span className="text-amber-600">· {t('shopichat.ai.provider.notActive')}</span>}
              <span className="ml-auto flex gap-2">
                <button type="button" onClick={() => setEditingKey(true)} className="font-semibold text-[#0284C7] hover:underline">{t('shopichat.ai.provider.change')}</button>
                <button type="button" onClick={deleteKey} disabled={keyBusy} className="font-semibold text-red-600 hover:underline disabled:opacity-50">{t('shopichat.ai.provider.delete')}</button>
              </span>
            </div>
          )}

          {showKeyForm && (
            <div className="mt-2 space-y-2 rounded-lg border border-[#E6EBF1] p-3">
              <label className="block">
                <span className={label}>{t('shopichat.ai.provider.apiKey')}</span>
                <input
                  type="password"
                  autoComplete="off"
                  spellCheck={false}
                  value={apiKey}
                  onChange={e => setApiKey(e.target.value.slice(0, 400))}
                  placeholder={hasKeyFor(byo) ? t('shopichat.ai.provider.keepKey') : t(`shopichat.ai.provider.keyPlaceholder.${byo}`)}
                  className={`${input} font-mono`}
                />
              </label>
              <label className="block">
                <span className={label}>{t('shopichat.ai.provider.model')}</span>
                {byo === 'anthropic' ? (
                  <select value={model} onChange={e => setModel(e.target.value)} className={input}>
                    {AI_ANTHROPIC_MODELS.map(m => <option key={m} value={m}>{m}</option>)}
                  </select>
                ) : (
                  <input value={model} onChange={e => setModel(e.target.value.slice(0, 80))} placeholder={AI_DEFAULT_MODELS[byo]} className={`${input} font-mono`} />
                )}
                <span className="mt-0.5 block text-[11px] text-[#A9B6C6]">{t('shopichat.ai.provider.modelHelp', { model: AI_DEFAULT_MODELS[byo] })}</span>
              </label>
              {keyError && <p className="text-[11.5px] text-red-600">{keyError}</p>}
              <div className="flex justify-end gap-2">
                {editingKey && (
                  <button type="button" onClick={() => setEditingKey(false)} className="px-3 py-1.5 text-[12.5px] font-medium text-[#425466] hover:bg-[#F6F9FC] rounded-lg">
                    {t('shopichat.common.cancel')}
                  </button>
                )}
                <button
                  type="button"
                  onClick={saveKey}
                  disabled={keyBusy || (!apiKey.trim() && !hasKeyFor(byo))}
                  className="px-3 py-1.5 text-[12.5px] font-semibold bg-[#1e3a5f] text-white rounded-lg disabled:opacity-40"
                >
                  {keyBusy ? t('shopichat.ai.provider.testing') : t('shopichat.ai.provider.saveAndTest')}
                </button>
              </div>
              <p className="text-[11px] text-[#A9B6C6]">{t('shopichat.ai.provider.keyPrivacy')}</p>
            </div>
          )}
        </div>

        <div>
          <span className={label}>{t('shopichat.ai.settings.tone')}</span>
          <div className="flex flex-wrap gap-1.5">
            {AI_TONES.map(tone => (
              <button key={tone} type="button" onClick={() => edit({ tone })} className={chip(form.tone === tone)}>
                {t(`shopichat.ai.tones.${tone}`)}
              </button>
            ))}
          </div>
        </div>

        <label className="block">
          <span className={label}>{t('shopichat.ai.settings.knowledge')}</span>
          <textarea
            value={form.knowledge}
            onChange={e => edit({ knowledge: e.target.value.slice(0, AI_KNOWLEDGE_MAX) })}
            rows={7}
            placeholder={t('shopichat.ai.settings.knowledgePlaceholder')}
            className={`${input} resize-y`}
          />
          <span className="mt-0.5 flex justify-between gap-2 text-[11px] text-[#A9B6C6]">
            <span>{t('shopichat.ai.settings.knowledgeHelp')}</span>
            <span className="tabular-nums flex-none">{form.knowledge.length}/{AI_KNOWLEDGE_MAX}</span>
          </span>
        </label>

        <label className="block">
          <span className={label}>{t('shopichat.ai.settings.handoff')}</span>
          <input
            value={form.handoffNote || ''}
            onChange={e => edit({ handoffNote: e.target.value.slice(0, AI_HANDOFF_MAX) })}
            placeholder={t('shopichat.ai.settings.handoffPlaceholder')}
            className={input}
          />
          {autopilot && <span className="mt-0.5 block text-[11px] text-[#A9B6C6]">{t('shopichat.ai.settings.handoffAutopilotHelp')}</span>}
        </label>

        <label className="block">
          <span className={label}>{t('shopichat.ai.settings.signature')}</span>
          <input
            value={form.signature || ''}
            onChange={e => edit({ signature: e.target.value.slice(0, AI_SIGNATURE_MAX) })}
            placeholder={t('shopichat.ai.settings.signaturePlaceholder')}
            className={input}
          />
        </label>

        {/* Horario (piloto automático) */}
        {autopilot && (
          <div className="rounded-lg border border-[#E6EBF1] p-3 space-y-2.5">
            <label className="flex items-center gap-2 text-[12.5px] font-semibold text-[#425466]">
              <input type="checkbox" checked={form.hours.enabled} onChange={e => editHours({ enabled: e.target.checked })} className="accent-[#1B6E4A]" />
              {t('shopichat.ai.hours.enable')}
            </label>
            {form.hours.enabled && (
              <>
                <div className="flex flex-wrap gap-1">
                  {DAYS.map(d => {
                    const on = form.hours.days.includes(d)
                    return (
                      <button
                        key={d}
                        type="button"
                        onClick={() => editHours({ days: on ? form.hours.days.filter(x => x !== d) : [...form.hours.days, d].sort() })}
                        className={`w-10 py-1 rounded-md text-[11.5px] font-semibold border ${on ? 'border-[#38bdf8] bg-[#F0F9FF] text-[#0284C7]' : 'border-[#E6EBF1] text-[#8898AA]'}`}
                      >
                        {t(`shopichat.ai.hours.days.${d}`)}
                      </button>
                    )
                  })}
                </div>
                <div className="flex flex-wrap items-center gap-2 text-[12px] text-[#425466]">
                  <span>{t('shopichat.ai.hours.from')}</span>
                  <input type="time" value={form.hours.from} onChange={e => editHours({ from: e.target.value })} className={`${input} w-auto`} />
                  <span>{t('shopichat.ai.hours.to')}</span>
                  <input type="time" value={form.hours.to} onChange={e => editHours({ to: e.target.value })} className={`${input} w-auto`} />
                </div>
                <label className="block">
                  <span className={label}>{t('shopichat.ai.hours.tz')}</span>
                  <input value={form.hours.tz} onChange={e => editHours({ tz: e.target.value.slice(0, 64) })} placeholder="America/Lima" className={`${input} font-mono`} />
                </label>
                <div>
                  <span className={label}>{t('shopichat.ai.hours.outside')}</span>
                  <div className="flex flex-wrap gap-1.5">
                    {AI_OUTSIDE_HOURS.map(o => (
                      <button key={o} type="button" onClick={() => edit({ outsideHours: o })} className={chip(form.outsideHours === o)}>
                        {t(`shopichat.ai.hours.outsideOptions.${o}`)}
                      </button>
                    ))}
                  </div>
                </div>
                {form.outsideHours === 'away' && (
                  <label className="block">
                    <span className={label}>{t('shopichat.ai.hours.awayMessage')}</span>
                    <textarea
                      value={form.awayMessage}
                      onChange={e => edit({ awayMessage: e.target.value.slice(0, AI_AWAY_MAX) })}
                      rows={3}
                      placeholder={t('shopichat.ai.hours.awayPlaceholder')}
                      className={`${input} resize-y`}
                    />
                  </label>
                )}
              </>
            )}
          </div>
        )}

        <p className="text-[11.5px] text-[#A9B6C6]">{t(byo ? 'shopichat.ai.settings.privacyByo' : 'shopichat.ai.settings.privacy')}</p>
        <p className="text-[11.5px] text-[#A9B6C6]">{t('shopichat.ai.settings.metaPolicy')}</p>

        {draft && (
          <div className="flex justify-end gap-2">
            <button type="button" onClick={() => { setDraft(null); setPicked(value.provider) }} className="px-3 py-1.5 text-[12.5px] font-medium text-[#425466] hover:bg-[#F6F9FC] rounded-lg">
              {t('shopichat.common.cancel')}
            </button>
            <button type="button" onClick={save} disabled={saving} className="px-3 py-1.5 text-[12.5px] font-semibold bg-[#1e3a5f] text-white rounded-lg disabled:opacity-40">
              {saving ? t('shopichat.common.loading') : t('shopichat.common.save')}
            </button>
          </div>
        )}
      </div>
    </section>
  )
}
