/**
 * IA copiloto en el cuadro de escribir (fase 3A): el botón ✨, su menú y el
 * panel de sugerencias que flota sobre el cuadro.
 *
 *  - "Sugerir" (o Ctrl/Cmd+J): pide 2–3 respuestas a api/shopichat-ai
 *    ('suggest'); si hay algo escrito, va como borrador/intención.
 *  - Con texto escrito, el menú también ofrece Reescribir (más amable, más
 *    corto, más formal, corregir).
 *  - Elegir una sugerencia la deja en el cuadro, editable: NUNCA se manda
 *    sola. Si recomienda productos, se ofrece mandar también su tarjeta
 *    (Thread la manda después del texto, con el mismo envío de la fase 2B).
 *
 * Se monta solo con la ventana de 24 h abierta y el asistente prendido. Se
 * renderiza dentro del <form> del cuadro (que es `relative`): el menú y el
 * panel se posicionan sobre él.
 */
import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import type { Product, Store } from '../../types'
import type { WaAiRewriteMode, WaAiSuggestion } from '../../types/shopichat'
import { ShopiChatApiError, aiQuota, aiRewrite, aiSuggest, type AiQuota } from '../../lib/shopichatService'
import { storeProducts } from './storeData'
import { IconBag, IconRefresh, IconSparkles, IconX } from './icons'

const REWRITE_MODES: WaAiRewriteMode[] = ['friendlier', 'shorter', 'formal', 'fix']

// Cupo del día por tienda: se recuerda entre conversaciones (el servidor manda el real).
const quotaCache = new Map<string, AiQuota>()

type Result =
  | { kind: 'suggest'; items: { text: string; products: Product[] }[] }
  | { kind: 'rewrite'; mode: WaAiRewriteMode; text: string }

interface Props {
  store: Store
  waId: string
  text: string
  /** El panel sube un poco si está la barra de "Respondiendo a...". */
  raised?: boolean
  /** Deja el texto en el cuadro (y las tarjetas de producto a mandar con él). */
  onUse: (text: string, products: Product[]) => void
}

export default function AiAssist({ store, waId, text, raised, onUse }: Props) {
  const { t } = useTranslation('dashboard')
  const storeId = store.id
  const [menu, setMenu] = useState(false)
  const [loading, setLoading] = useState<null | 'suggest' | WaAiRewriteMode>(null)
  const [result, setResult] = useState<Result | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [quota, setQuota] = useState<AiQuota | null>(() => quotaCache.get(storeId) || null)
  // Tarjetas a mandar con cada sugerencia (por defecto sí, se pueden destildar).
  const [withCards, setWithCards] = useState<Record<number, boolean>>({})
  const busy = loading !== null
  const reqId = useRef(0)

  const keepQuota = (q: Partial<AiQuota>) => {
    if (typeof q.remaining !== 'number' || typeof q.limit !== 'number') return
    const next = { remaining: q.remaining, limit: q.limit }
    quotaCache.set(storeId, next)
    setQuota(next)
  }

  const errorText = (e: unknown) => {
    const code = (e as ShopiChatApiError)?.code || ''
    const known = ['LIMIT_REACHED', 'WINDOW_CLOSED', 'AI_DISABLED', 'PLAN_REQUIRED', 'REFUSED', 'BUSY', 'NETWORK', 'NOT_DEPLOYED', 'EMPTY',
      'AI_KEY_MISSING', 'INVALID_KEY', 'QUOTA', 'MODEL_NOT_FOUND', 'PROVIDER_ERROR']
    if (code === 'LIMIT_REACHED') keepQuota({ remaining: 0, limit: quota?.limit || (e as { limit?: number }).limit || 0 })
    return t(`shopichat.ai.errors.${known.includes(code) ? code : 'generic'}`)
  }

  const suggest = async () => {
    if (busy) return
    const id = ++reqId.current
    setMenu(false)
    setError(null)
    setResult(null)
    setWithCards({})
    setLoading('suggest')
    try {
      const [data, products] = await Promise.all([aiSuggest(storeId, waId, text), storeProducts(storeId)])
      if (id !== reqId.current) return
      keepQuota(data)
      const byId = new Map(products.map(p => [p.id, p]))
      const items = (data.suggestions || []).map((s: WaAiSuggestion) => ({
        text: s.text,
        products: (s.productIds || []).map(pid => byId.get(pid)).filter((p): p is Product => Boolean(p)),
      }))
      setResult({ kind: 'suggest', items })
    } catch (e) {
      if (id === reqId.current) setError(errorText(e))
    } finally {
      if (id === reqId.current) setLoading(null)
    }
  }

  const rewrite = async (mode: WaAiRewriteMode) => {
    if (busy || !text.trim()) return
    const id = ++reqId.current
    setMenu(false)
    setError(null)
    setResult(null)
    setLoading(mode)
    try {
      const data = await aiRewrite(storeId, waId, text.trim(), mode)
      if (id !== reqId.current) return
      keepQuota(data)
      setResult({ kind: 'rewrite', mode, text: data.text })
    } catch (e) {
      if (id === reqId.current) setError(errorText(e))
    } finally {
      if (id === reqId.current) setLoading(null)
    }
  }

  const close = () => {
    reqId.current++
    setLoading(null)
    setResult(null)
    setError(null)
  }

  const use = (value: string, products: Product[] = []) => {
    onUse(value, products)
    close()
  }

  const openMenu = () => {
    if (!text.trim()) { void suggest(); return }
    setMenu(v => !v)
  }

  // Cupo del día: una vez por tienda y sesión, sin molestar si falla.
  useEffect(() => {
    if (quotaCache.has(storeId)) return
    let alive = true
    aiQuota(storeId).then(q => { if (alive) keepQuota(q) }).catch(() => { /* API sin desplegar o sin red */ })
    return () => { alive = false }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [storeId])

  // Ctrl/Cmd+J pide sugerencias; Escape cierra el panel.
  const suggestRef = useRef(suggest)
  useEffect(() => { suggestRef.current = suggest })
  const open = Boolean(result || error || loading)
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && !e.altKey && !e.shiftKey && e.key.toLowerCase() === 'j') {
        e.preventDefault()
        void suggestRef.current()
      } else if (e.key === 'Escape' && (open || menu)) {
        setMenu(false)
        close()
      }
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open, menu])

  const quotaText = quota ? t('shopichat.ai.quota', { remaining: quota.remaining, limit: quota.limit }) : null

  return (
    <>
      <button
        type="button"
        onClick={openMenu}
        disabled={busy}
        className={`p-2 sm:p-2.5 rounded-full hover:bg-[#F5F3FF] flex-none disabled:opacity-60 ${menu || open ? 'text-[#7C3AED]' : 'text-[#8898AA] hover:text-[#7C3AED]'}`}
        title={t('shopichat.ai.buttonTitle')}
        aria-label={t('shopichat.ai.buttonTitle')}
        aria-expanded={menu}
      >
        <IconSparkles className={`w-5 h-5 ${busy ? 'animate-pulse' : ''}`} />
      </button>

      {menu && (
        <>
          <div className="fixed inset-0 z-20" onClick={() => setMenu(false)} />
          <div className="absolute bottom-full left-2 sm:left-14 mb-1 z-30 w-60 rounded-xl bg-white border border-[#E6EBF1] shadow-lg py-1 text-[13px] text-[#425466]">
            <button type="button" onClick={() => void suggest()} className="w-full text-left px-3.5 py-2 hover:bg-[#F6F9FC] flex items-center gap-2.5">
              <IconSparkles className="w-4 h-4 text-[#7C3AED]" />
              <span className="flex-1">{t('shopichat.ai.suggestFromDraft')}</span>
              <kbd className="text-[10.5px] text-[#A9B6C6] font-sans">{t('shopichat.ai.shortcut')}</kbd>
            </button>
            <p className="px-3.5 pt-2 pb-1 text-[10.5px] font-semibold uppercase tracking-[0.07em] text-[#A9B6C6]">{t('shopichat.ai.rewrite')}</p>
            {REWRITE_MODES.map(m => (
              <button key={m} type="button" onClick={() => void rewrite(m)} className="w-full text-left px-3.5 py-1.5 hover:bg-[#F6F9FC]">
                {t(`shopichat.ai.modes.${m}`)}
              </button>
            ))}
            {quotaText && <p className="px-3.5 pt-1.5 pb-1 text-[10.5px] text-[#A9B6C6] border-t border-[#F1F5F9] mt-1">{quotaText}</p>}
          </div>
        </>
      )}

      {open && (
        <div className={`absolute left-2 right-2 sm:left-4 sm:right-4 bottom-full ${raised ? 'mb-[62px]' : 'mb-1'} z-30 bg-white border border-[#DDD6FE] rounded-xl shadow-lg overflow-hidden`}>
          <div className="px-3.5 py-2 bg-[#F5F3FF] border-b border-[#EDE9FE] flex items-center gap-2">
            <IconSparkles className="w-3.5 h-3.5 text-[#7C3AED] flex-none" />
            <p className="text-[12px] font-semibold text-[#5B21B6] flex-1 min-w-0 truncate">
              {loading === 'suggest' ? t('shopichat.ai.thinking')
                : loading ? t('shopichat.ai.rewriting')
                : result?.kind === 'rewrite' ? t(`shopichat.ai.modes.${result.mode}`)
                : t('shopichat.ai.title')}
            </p>
            {quotaText && <span className="text-[10.5px] text-[#A78BFA] flex-none hidden sm:inline">{quotaText}</span>}
            {result?.kind === 'suggest' && (
              <button type="button" onClick={() => void suggest()} className="p-1 text-[#A78BFA] hover:text-[#7C3AED] rounded" title={t('shopichat.ai.again')} aria-label={t('shopichat.ai.again')}>
                <IconRefresh className="w-3.5 h-3.5" />
              </button>
            )}
            <button type="button" onClick={close} className="p-1 text-[#A78BFA] hover:text-[#7C3AED] rounded" aria-label={t('shopichat.common.close')}>
              <IconX className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="max-h-[45vh] overflow-y-auto p-2 space-y-1.5">
            {loading && (
              <div className="space-y-1.5 p-1" aria-busy="true">
                {[0, 1].map(i => (
                  <div key={i} className="rounded-lg bg-[#F6F9FC] p-3 space-y-2 animate-pulse">
                    <div className="h-2.5 rounded bg-[#E6EBF1] w-11/12" />
                    <div className="h-2.5 rounded bg-[#E6EBF1] w-2/3" />
                  </div>
                ))}
              </div>
            )}

            {error && !loading && <p className="px-2 py-2 text-[12.5px] text-[#96690F]">{error}</p>}

            {!loading && result?.kind === 'rewrite' && (
              <button type="button" onClick={() => use(result.text)} className="w-full text-left rounded-lg border border-[#E6EBF1] hover:border-[#C4B5FD] hover:bg-[#FAF5FF] p-3">
                <p className="text-[13px] text-[#1e3a5f] whitespace-pre-wrap break-words">{result.text}</p>
                <p className="mt-1.5 text-[11px] font-semibold text-[#7C3AED]">{t('shopichat.ai.useThis')}</p>
              </button>
            )}

            {!loading && result?.kind === 'suggest' && result.items.map((s, i) => {
              const cards = withCards[i] !== false && s.products.length > 0
              return (
                <div key={i} className="rounded-lg border border-[#E6EBF1] hover:border-[#C4B5FD] hover:bg-[#FAF5FF]">
                  <button type="button" onClick={() => use(s.text, cards ? s.products : [])} className="w-full text-left p-3 pb-2">
                    <p className="text-[10.5px] font-semibold uppercase tracking-[0.06em] text-[#A78BFA] mb-1">
                      {t(i === 0 ? 'shopichat.ai.short' : i === 1 ? 'shopichat.ai.detailed' : 'shopichat.ai.alternative')}
                    </p>
                    <p className="text-[13px] text-[#1e3a5f] whitespace-pre-wrap break-words">{s.text}</p>
                  </button>
                  {s.products.length > 0 && (
                    <label className="flex items-start gap-2 px-3 pb-2.5 text-[11.5px] text-[#425466] cursor-pointer">
                      <input
                        type="checkbox"
                        checked={withCards[i] !== false}
                        onChange={e => setWithCards(prev => ({ ...prev, [i]: e.target.checked }))}
                        className="mt-0.5 accent-[#7C3AED]"
                      />
                      <span className="min-w-0">
                        <IconBag className="inline w-3 h-3 mr-1 -mt-0.5 text-[#0284C7]" />
                        {t('shopichat.ai.sendCard', { count: s.products.length })}: <span className="font-medium">{s.products.map(p => p.name).join(', ')}</span>
                      </span>
                    </label>
                  )}
                </div>
              )
            })}
          </div>

          {!loading && result?.kind === 'suggest' && (
            <p className="px-3.5 py-1.5 border-t border-[#F1F5F9] text-[10.5px] text-[#A9B6C6]">{t('shopichat.ai.reviewHint')}</p>
          )}
        </div>
      )}
    </>
  )
}
