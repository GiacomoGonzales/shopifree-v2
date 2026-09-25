/**
 * Elegir una plantilla aprobada, completar sus variables y enviarla (portado
 * de Cobrify, components/chat/SelectorPlantilla.jsx, sin el modo campaña).
 *
 * Sirve para reabrir una conversación con la ventana de 24 h cerrada. Solo se
 * pueden elegir las APROBADAS; las pendientes o rechazadas se listan aparte,
 * apagadas, para que se sepa que existen y por qué no se pueden usar.
 */
import { useEffect, useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import type { WaTemplate, WaTemplatesDoc } from '../../types/shopichat'
import {
  previewTemplate,
  syncTemplates,
  templateBodyVars,
  templateHeader,
  toDate,
  type TemplateValues,
} from '../../lib/shopichatService'
import { useToast } from '../ui/Toast'
import { IconImage, IconRefresh, IconSend, IconX } from './icons'

interface Props {
  storeId: string
  templates: WaTemplatesDoc
  title: string
  onSend: (t: WaTemplate, values: TemplateValues) => Promise<void>
  onClose: () => void
}

const keyOf = (t: WaTemplate) => `${t.name}::${t.language}`

export default function TemplatePicker({ storeId, templates, title, onSend, onClose }: Props) {
  const { t, i18n } = useTranslation('dashboard')
  const { showToast } = useToast()
  const [syncing, setSyncing] = useState(false)
  const [selected, setSelected] = useState<WaTemplate | null>(null)
  const [body, setBody] = useState<string[]>([])
  const [headerText, setHeaderText] = useState('')
  const [headerImageUrl, setHeaderImageUrl] = useState('')
  const [sending, setSending] = useState(false)

  const sync = async (silent = false) => {
    setSyncing(true)
    try {
      const r = await syncTemplates(storeId)
      if (!silent) showToast(t('shopichat.templates.synced', { count: r.total ?? r.count ?? 0 }), 'success')
    } catch (e) {
      showToast((e as Error).message || t('shopichat.templates.syncError'), 'error')
    } finally {
      setSyncing(false)
    }
  }

  // Sin catálogo todavía: traerlo solo la primera vez que se abre.
  const autoSynced = useRef(false)
  useEffect(() => {
    if (autoSynced.current || templates.items.length > 0 || templates.syncedAt) return undefined
    autoSynced.current = true
    const timer = setTimeout(() => { void sync(true) }, 400)
    return () => clearTimeout(timer)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [templates.items.length, templates.syncedAt])

  const approved = useMemo(() => templates.items.filter(x => x.status === 'APPROVED'), [templates.items])
  const others = useMemo(() => templates.items.filter(x => x.status !== 'APPROVED'), [templates.items])

  const choose = (tpl: WaTemplate) => {
    setSelected(tpl)
    setBody(Array.from({ length: templateBodyVars(tpl) }, () => ''))
    setHeaderText('')
    setHeaderImageUrl('')
  }

  const header = selected ? templateHeader(selected) : null
  const values: TemplateValues = { body, headerText: headerText || null, headerImageUrl: headerImageUrl || null }
  const missing = body.some(v => !v.trim())
    || (header?.hasVar && !headerText.trim())
    || (header?.format === 'IMAGE' && !/^https:\/\/\S+$/i.test(headerImageUrl))

  const send = async () => {
    if (!selected || missing || sending) return
    setSending(true)
    try {
      await onSend(selected, values)
    } catch (e) {
      showToast((e as Error).message || t('shopichat.errors.sendFailed'), 'error')
    } finally {
      setSending(false)
    }
  }

  const categoryName = (c: string) => t(`shopichat.templates.category.${c}`, { defaultValue: c })
  const syncedAt = toDate(templates.syncedAt)
  const inputCls = 'w-full mt-1 px-3 py-2 text-[13px] border border-[#E6EBF1] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#38bdf8]/40 focus:border-[#38bdf8]'

  return (
    <div className="fixed inset-0 z-[70] bg-black/50 flex items-end sm:items-center justify-center sm:p-4" onClick={onClose}>
      <div
        className="bg-white rounded-t-[18px] sm:rounded-[14px] shadow-xl w-full sm:max-w-2xl max-h-[92vh] sm:max-h-[90vh] flex flex-col"
        style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
        onClick={e => e.stopPropagation()}
      >
        <div className="px-5 py-4 border-b border-[#E6EBF1] flex items-center justify-between gap-3">
          <div className="min-w-0">
            <h3 className="font-semibold text-[#1e3a5f] truncate">{title}</h3>
            <p className="text-[11.5px] text-[#8898AA] mt-0.5">{t('shopichat.templates.subtitle')}</p>
          </div>
          <div className="flex items-center gap-1 flex-none">
            <button
              type="button"
              onClick={() => sync(false)}
              disabled={syncing}
              className="p-2 text-[#8898AA] hover:text-[#1e3a5f] rounded-lg hover:bg-[#F6F9FC] disabled:opacity-50"
              title={syncedAt ? t('shopichat.templates.syncedAt', { date: syncedAt.toLocaleString(i18n.language) }) : t('shopichat.templates.sync')}
            >
              <IconRefresh className={`w-4 h-4 ${syncing ? 'animate-spin' : ''}`} />
            </button>
            <button type="button" onClick={onClose} className="p-2 text-[#8898AA] hover:text-[#1e3a5f]" aria-label={t('shopichat.common.close')}>
              <IconX className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="flex-1 min-h-0 overflow-hidden grid grid-cols-1 sm:grid-cols-5">
          <div className="sm:col-span-2 border-b sm:border-b-0 sm:border-r border-[#E6EBF1] overflow-y-auto max-h-44 sm:max-h-none">
            {approved.length === 0 && !syncing && <div className="p-4 text-[13px] text-[#8898AA]">{t('shopichat.templates.none')}</div>}
            {syncing && approved.length === 0 && <p className="p-4 text-[13px] text-[#8898AA]">{t('shopichat.templates.syncing')}</p>}
            {approved.map(tpl => (
              <button
                key={keyOf(tpl)}
                type="button"
                onClick={() => choose(tpl)}
                className={`w-full text-left px-4 py-3 border-b border-[#F1F5F9] hover:bg-[#F6F9FC] ${selected && keyOf(selected) === keyOf(tpl) ? 'bg-[#F0F9FF]' : ''}`}
              >
                <p className="text-[13px] font-semibold text-[#1e3a5f] truncate">{tpl.name}</p>
                <p className="text-[11px] text-[#8898AA]">{categoryName(tpl.category)} · {tpl.language}</p>
              </button>
            ))}
            {others.length > 0 && <div className="px-4 py-2 text-[11px] text-[#A9B6C6] uppercase tracking-wide">{t('shopichat.templates.unavailable')}</div>}
            {others.map(tpl => (
              <div key={keyOf(tpl)} className="px-4 py-2 opacity-50">
                <p className="text-[13px] text-[#425466] truncate">{tpl.name}</p>
                <p className="text-[11px] text-[#8898AA]">{t(`shopichat.templates.status.${tpl.status}`, { defaultValue: tpl.status })}</p>
              </div>
            ))}
          </div>

          <div className="sm:col-span-3 overflow-y-auto p-5">
            {!selected ? (
              <p className="text-[13px] text-[#8898AA]">{t('shopichat.templates.pick')}</p>
            ) : (
              <div className="space-y-4">
                {header?.format === 'IMAGE' && (
                  <div>
                    <label className="text-[11.5px] font-semibold text-[#425466] flex items-center gap-1.5">
                      <IconImage className="w-3.5 h-3.5" /> {t('shopichat.templates.headerImage')}
                    </label>
                    <input type="url" value={headerImageUrl} onChange={e => setHeaderImageUrl(e.target.value)} placeholder="https://..." className={inputCls} />
                  </div>
                )}
                {header?.hasVar && (
                  <div>
                    <label className="text-[11.5px] font-semibold text-[#425466]">{t('shopichat.templates.headerVar', { v: '{{1}}' })}</label>
                    <input type="text" value={headerText} onChange={e => setHeaderText(e.target.value)} className={inputCls} />
                  </div>
                )}
                {body.map((v, i) => (
                  <div key={i}>
                    <label className="text-[11.5px] font-semibold text-[#425466]">{t('shopichat.templates.variable', { n: `{{${i + 1}}}` })}</label>
                    <input
                      type="text"
                      value={v}
                      onChange={e => {
                        const copy = [...body]
                        copy[i] = e.target.value
                        setBody(copy)
                      }}
                      className={inputCls}
                    />
                  </div>
                ))}
                <div>
                  <p className="text-[11.5px] font-semibold text-[#425466] mb-1.5">{t('shopichat.templates.preview')}</p>
                  <div className="bg-[#DCF8C6] rounded-2xl rounded-br-sm px-3.5 py-2.5 max-w-sm">
                    {header?.format === 'IMAGE' && headerImageUrl && (
                      <img src={headerImageUrl} alt="" className="rounded-lg mb-2 max-h-40 w-full object-cover" onError={e => { e.currentTarget.style.display = 'none' }} />
                    )}
                    <p className="text-[13px] text-[#1e3a5f] whitespace-pre-wrap">{previewTemplate(selected, values)}</p>
                  </div>
                  {(selected.components || []).some(c => c.type === 'BUTTONS') && (
                    <p className="text-[11px] text-[#A9B6C6] mt-1">{t('shopichat.templates.hasButtons')}</p>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="px-5 py-3 border-t border-[#E6EBF1] flex justify-end gap-2">
          <button type="button" onClick={onClose} disabled={sending} className="px-4 py-2 text-[13px] font-semibold text-[#425466] hover:bg-[#F6F9FC] rounded-lg disabled:opacity-50">
            {t('shopichat.common.cancel')}
          </button>
          <button
            type="button"
            onClick={send}
            disabled={!selected || missing || sending}
            className="px-4 py-2 text-[13px] font-semibold bg-[#1e3a5f] text-white rounded-lg hover:bg-[#2a4d7a] disabled:opacity-50 flex items-center gap-2"
          >
            <IconSend className="w-4 h-4" />
            {sending ? t('shopichat.common.sending') : t('shopichat.templates.send')}
          </button>
        </div>
      </div>
    </div>
  )
}
