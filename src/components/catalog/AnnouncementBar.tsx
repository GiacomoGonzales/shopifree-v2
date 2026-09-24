import { useState } from 'react'
import { useTheme } from './ThemeContext'
import { EditableText } from './LiveEdit'
import { useLiveEdit } from './liveEditContext'
import { getEffectivePlan } from '../../lib/stripe'

export default function AnnouncementBar() {
  const { store, theme } = useTheme()
  const [dismissed, setDismissed] = useState(false)
  const editing = useLiveEdit()

  // En el editor la tira se muestra aunque el texto este vacio, para poder escribirlo.
  if (!store.announcement?.enabled || (!store.announcement?.text && !editing) || dismissed) return null

  const bgColor = store.announcement.backgroundColor || theme.colors.primary
  const textColor = store.announcement.textColor || theme.colors.textInverted
  // El marquee repite el texto 16 veces y se mueve: en el editor se muestra fijo para poder editarlo.
  const mode = store.announcement.mode === 'marquee' && getEffectivePlan(store) !== 'free' && !editing ? 'marquee' : 'static'
  const text = store.announcement.text

  const textContent = editing ? (
    <EditableText path="announcement.text" value={text} placeholder="Escribe tu anuncio" />
  ) : store.announcement.link ? (
    <a href={store.announcement.link} target="_blank" rel="noopener noreferrer" className="hover:opacity-80 transition-opacity">
      {text}
    </a>
  ) : (
    <span>{text}</span>
  )

  return (
    <div
      data-sf-section="announcement"
      className="relative py-3 text-sm animate-fadeIn overflow-hidden"
      style={{ backgroundColor: bgColor, color: textColor }}
    >
      {mode === 'marquee' ? (
        <div className="overflow-hidden">
          <div className="animate-marquee">
            {/* Two identical groups — each fills the viewport, animation scrolls -50% for seamless loop */}
            {[0, 1].map((group) => (
              <span key={group} className="inline-flex" aria-hidden={group === 1 || undefined}>
                {Array.from({ length: 8 }).map((_, i) => (
                  <span key={i} className="inline-flex items-center gap-8 px-4">
                    {store.announcement?.link ? (
                      <a href={store.announcement.link} target="_blank" rel="noopener noreferrer" className="hover:opacity-80 transition-opacity">
                        {text}
                      </a>
                    ) : (
                      <span>{text}</span>
                    )}
                    <span aria-hidden="true" style={{ opacity: 0.4 }}>&#x2022;</span>
                  </span>
                ))}
              </span>
            ))}
          </div>
        </div>
      ) : (
        <div className="text-center px-10">{textContent}</div>
      )}
      {!editing && <button
        onClick={() => setDismissed(true)}
        className="absolute right-3 top-1/2 -translate-y-1/2 p-1 opacity-60 hover:opacity-100 transition-opacity"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>}
    </div>
  )
}
