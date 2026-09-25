/**
 * A quién reenviar (portado de Cobrify, components/chat/ReenviarSheet.jsx).
 * Se pueden marcar varias conversaciones. Las que tienen la ventana de 24 h
 * cerrada salen apagadas: WhatsApp no aceptaría el mensaje y es mejor decirlo
 * antes que fallar después.
 */
import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import type { WaConversation } from '../../types/shopichat'
import { formatPhone, windowRemainingMs } from '../../lib/shopichatService'
import { IconCheck, IconSearch, IconX } from './icons'

interface Props {
  conversations: WaConversation[]
  summary: string
  now: number
  onClose: () => void
  onSend: (waIds: string[]) => Promise<void>
}

export default function ForwardSheet({ conversations, summary, now, onClose, onSend }: Props) {
  const { t } = useTranslation('dashboard')
  const [search, setSearch] = useState('')
  const [picked, setPicked] = useState<string[]>([])
  const [sending, setSending] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return conversations
    return conversations.filter(c => (c.name || '').toLowerCase().includes(q) || (c.waId || '').includes(q))
  }, [conversations, search])

  const toggle = (id: string) => setPicked(v => (v.includes(id) ? v.filter(x => x !== id) : [...v, id]))

  const send = async () => {
    setSending(true)
    setError(null)
    try {
      await onSend(picked)
    } catch (e) {
      setError((e as Error).message || t('shopichat.errors.sendFailed'))
      setSending(false)
    }
  }

  return (
    <div className="fixed inset-0 z-[85] bg-black/40 flex items-end sm:items-center justify-center sm:p-4" onClick={onClose}>
      <div
        className="bg-white rounded-t-[18px] sm:rounded-[14px] shadow-xl w-full sm:max-w-md max-h-[85vh] flex flex-col"
        style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
        onClick={e => e.stopPropagation()}
      >
        <div className="px-5 py-4 border-b border-[#E6EBF1] flex items-center justify-between gap-3">
          <div className="min-w-0">
            <h3 className="font-semibold text-[#1e3a5f]">{t('shopichat.forward.title')}</h3>
            {summary && <p className="text-[12.5px] text-[#8898AA] truncate">{summary}</p>}
          </div>
          <button type="button" onClick={onClose} className="text-[#A9B6C6] hover:text-[#425466] flex-none" aria-label={t('shopichat.common.close')}>
            <IconX className="w-5 h-5" />
          </button>
        </div>
        <div className="px-4 py-2 border-b border-[#F1F5F9]">
          <div className="relative">
            <IconSearch className="w-4 h-4 text-[#A9B6C6] absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder={t('shopichat.list.search')}
              className="w-full pl-9 pr-3 py-2 text-[13px] bg-[#F6F9FC] border border-[#E6EBF1] rounded-lg outline-none focus:border-[#38bdf8]"
            />
          </div>
        </div>
        <div className="flex-1 overflow-y-auto">
          {filtered.map(c => {
            const closed = windowRemainingMs(c, now) <= 0
            const on = picked.includes(c.id)
            return (
              <button
                key={c.id}
                type="button"
                disabled={closed || sending}
                onClick={() => toggle(c.id)}
                className={`w-full flex items-center gap-3 px-4 py-2.5 text-left hover:bg-[#F6F9FC] ${closed ? 'opacity-50' : ''}`}
              >
                <span className="w-9 h-9 rounded-full bg-[#E6EBF1] grid place-items-center text-[#425466] text-[13px] font-semibold flex-none">
                  {(c.name || '#').trim().charAt(0).toUpperCase()}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-[13.5px] text-[#1e3a5f] truncate">{c.name || formatPhone(c.waId)}</span>
                  <span className={`block text-[11.5px] truncate ${closed ? 'text-amber-600' : 'text-[#8898AA]'}`}>
                    {closed ? t('shopichat.window.closedShort') : formatPhone(c.waId)}
                  </span>
                </span>
                <span className={`w-5 h-5 rounded-full border grid place-items-center flex-none ${on ? 'bg-[#1e3a5f] border-[#1e3a5f] text-white' : 'border-[#CBD5E1]'}`}>
                  {on && <IconCheck className="w-3 h-3" />}
                </span>
              </button>
            )
          })}
          {filtered.length === 0 && <p className="px-4 py-6 text-center text-[13px] text-[#A9B6C6]">{t('shopichat.list.noMatches')}</p>}
        </div>
        {error && <p className="px-5 py-2 text-[12.5px] text-red-600 border-t border-[#F1F5F9]">{error}</p>}
        {picked.length > 0 && (
          <div className="p-3 border-t border-[#E6EBF1]">
            <button
              type="button"
              onClick={send}
              disabled={sending}
              className="w-full py-2.5 rounded-xl bg-[#1e3a5f] text-white font-semibold text-[14px] disabled:opacity-60"
            >
              {sending ? t('shopichat.common.sending') : t('shopichat.forward.sendTo', { count: picked.length })}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
