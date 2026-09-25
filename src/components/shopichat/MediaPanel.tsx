/**
 * Todos los archivos de una conversación, como la carpeta de multimedia de
 * WhatsApp (portado de Cobrify, components/chat/PanelMultimedia.jsx). Se arma
 * con los mensajes ya cargados: no consulta nada, y las imágenes usan la misma
 * miniatura que la burbuja.
 */
import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import type { WaMessage } from '../../types/shopichat'
import { formatTime } from '../../lib/shopichatService'
import { IconFile, IconFilm, IconMusic, IconX } from './icons'

type Tab = 'media' | 'document' | 'audio'

interface Props {
  messages: WaMessage[]
  onClose: () => void
  onOpenImage: (m: WaMessage) => void
  onGoToMessage: (id: string) => void
}

export default function MediaPanel({ messages, onClose, onOpenImage, onGoToMessage }: Props) {
  const { t, i18n } = useTranslation('dashboard')
  const [tab, setTab] = useState<Tab>('media')

  const byType = useMemo(() => {
    const g: Record<Tab, WaMessage[]> = { media: [], document: [], audio: [] }
    for (const m of messages) {
      if (!m.media?.url) continue
      if (m.type === 'image' || m.type === 'sticker' || m.type === 'video') g.media.push(m)
      else if (m.type === 'document') g.document.push(m)
      else if (m.type === 'audio') g.audio.push(m)
    }
    // Lo más nuevo primero, que es lo que uno suele buscar.
    for (const k of Object.keys(g) as Tab[]) g[k].reverse()
    return g
  }, [messages])

  const list = byType[tab]
  const tabs: [Tab, string][] = [
    ['media', t('shopichat.media.tabMedia')],
    ['document', t('shopichat.media.tabDocs')],
    ['audio', t('shopichat.media.tabAudio')],
  ]

  return (
    <aside className="w-full sm:w-80 bg-white border-l border-[#E6EBF1] flex flex-col h-full">
      <div className="px-4 py-3 border-b border-[#E6EBF1] flex items-center justify-between">
        <h3 className="font-semibold text-[#1e3a5f] text-[13px]">{t('shopichat.media.title')}</h3>
        <button type="button" onClick={onClose} className="text-[#A9B6C6] hover:text-[#425466]" aria-label={t('shopichat.common.close')}>
          <IconX className="w-5 h-5" />
        </button>
      </div>
      <div className="flex border-b border-[#E6EBF1]">
        {tabs.map(([id, name]) => (
          <button
            key={id}
            type="button"
            onClick={() => setTab(id)}
            className={`flex-1 px-2 py-2 text-[11.5px] font-semibold border-b-2 transition-colors ${
              tab === id ? 'border-[#1e3a5f] text-[#1e3a5f]' : 'border-transparent text-[#8898AA] hover:text-[#425466]'
            }`}
          >
            {name}
            {byType[id].length > 0 && <span className="ml-1 text-[#A9B6C6]">{byType[id].length}</span>}
          </button>
        ))}
      </div>
      <div className="flex-1 overflow-y-auto p-3">
        {list.length === 0 && <p className="text-[13px] text-[#A9B6C6] text-center py-8">{t('shopichat.media.empty')}</p>}
        {tab === 'media' && list.length > 0 && (
          <div className="grid grid-cols-3 gap-1.5">
            {list.map(m => (
              <button
                key={m.id}
                type="button"
                onClick={() => (m.type === 'video' ? onGoToMessage(m.id) : onOpenImage(m))}
                className="relative aspect-square rounded-lg overflow-hidden bg-[#F6F9FC]"
                title={formatTime(m.timestamp, i18n.language)}
              >
                {m.type === 'video' ? (
                  <>
                    <video src={m.media!.url} preload="metadata" className="w-full h-full object-cover bg-black" muted />
                    <IconFilm className="absolute inset-0 m-auto w-6 h-6 text-white drop-shadow" />
                  </>
                ) : (
                  <img src={m.media!.thumbUrl || m.media!.url} alt="" loading="lazy" className="w-full h-full object-cover" />
                )}
              </button>
            ))}
          </div>
        )}
        {tab !== 'media' && list.length > 0 && (
          <div className="space-y-1.5">
            {list.map(m => (
              <button key={m.id} type="button" onClick={() => onGoToMessage(m.id)} className="w-full flex items-center gap-2.5 p-2 rounded-lg hover:bg-[#F6F9FC] text-left">
                <div className="w-9 h-9 rounded-lg bg-[#F6F9FC] flex items-center justify-center flex-none">
                  {tab === 'audio' ? <IconMusic className="w-5 h-5 text-[#8898AA]" /> : <IconFile className="w-5 h-5 text-red-500" />}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-[13px] text-[#1e3a5f] truncate">
                    {m.media!.filename || (tab === 'audio' ? t('shopichat.types.audio') : t('shopichat.types.document'))}
                  </p>
                  <p className="text-[11px] text-[#A9B6C6]">{formatTime(m.timestamp, i18n.language)}</p>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </aside>
  )
}
