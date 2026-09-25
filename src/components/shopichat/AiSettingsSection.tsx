/**
 * Configuración → "Asistente IA" (fase 3A): el copiloto que propone
 * respuestas en el chat (botón ✨ del cuadro de escribir). Nunca manda nada
 * solo: el comerciante elige, edita y envía.
 *
 * Se guarda en stores/{id}/waSettings/automations.ai; lo lee
 * api/shopichat-ai.ts (sin `enabled` no sugiere). El interruptor se guarda al
 * tocarlo; el resto (tono, firma, conocimiento, derivación) con "Guardar".
 */
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  AI_HANDOFF_MAX, AI_KNOWLEDGE_MAX, AI_SIGNATURE_MAX, AI_TONES, saveAiSettings,
} from '../../lib/shopichatService'
import type { WaAiSettings } from '../../types/shopichat'
import { useToast } from '../ui/Toast'
import { IconSparkles } from './icons'

interface Props {
  storeId: string
  value: WaAiSettings
}

export default function AiSettingsSection({ storeId, value }: Props) {
  const { t } = useTranslation('dashboard')
  const { showToast } = useToast()
  // null = sin cambios: se muestra lo guardado (y lo que llegue de otro dispositivo).
  const [draft, setDraft] = useState<WaAiSettings | null>(null)
  const [saving, setSaving] = useState(false)
  const form = draft || value

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

  const save = async () => {
    if (!draft) return
    if (await persist(draft)) setDraft(null)
  }

  const card = 'bg-white rounded-[14px] border border-[#E6EBF1] p-4 sm:p-5'
  const label = 'block text-[12px] font-semibold text-[#425466] mb-1'
  const input = 'w-full px-3 py-2 text-[13px] bg-white border border-[#E6EBF1] rounded-lg outline-none focus:border-[#38bdf8]'

  return (
    <section className={card}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[0.66rem] font-semibold uppercase tracking-[0.07em] text-[#8898AA] flex items-center gap-1.5">
            <IconSparkles className="w-3.5 h-3.5 text-[#7C3AED]" />
            {t('shopichat.ai.settings.title')}
          </p>
          <p className="mt-1.5 text-[12px] text-[#8898AA]">{t('shopichat.ai.settings.help')}</p>
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

      <div className={`mt-4 space-y-3 ${value.enabled ? '' : 'opacity-60'}`}>
        <div>
          <span className={label}>{t('shopichat.ai.settings.tone')}</span>
          <div className="flex flex-wrap gap-1.5">
            {AI_TONES.map(tone => (
              <button
                key={tone}
                type="button"
                onClick={() => edit({ tone })}
                className={`px-3 py-1.5 rounded-lg text-[12.5px] font-medium border ${form.tone === tone ? 'border-[#38bdf8] bg-[#F0F9FF] text-[#0284C7]' : 'border-[#E6EBF1] text-[#425466] hover:bg-[#F6F9FC]'}`}
              >
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

        <p className="text-[11.5px] text-[#A9B6C6]">{t('shopichat.ai.settings.privacy')}</p>

        {draft && (
          <div className="flex justify-end gap-2">
            <button type="button" onClick={() => setDraft(null)} className="px-3 py-1.5 text-[12.5px] font-medium text-[#425466] hover:bg-[#F6F9FC] rounded-lg">
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
