import { useState } from 'react'
import { useTheme } from './ThemeContext'

export default function AnnouncementBar() {
  const { store, theme } = useTheme()
  const [dismissed, setDismissed] = useState(false)

  if (!store.announcement?.enabled || !store.announcement?.text || dismissed) return null

  const bgColor = store.announcement.backgroundColor || theme.colors.primary
  const textColor = store.announcement.textColor || theme.colors.textInverted
  const mode = store.announcement.mode === 'marquee' && store.plan !== 'free' ? 'marquee' : 'static'
  const text = store.announcement.text

  const textContent = store.announcement.link ? (
    <a href={store.announcement.link} target="_blank" rel="noopener noreferrer" className="hover:opacity-80 transition-opacity">
      {text}
    </a>
  ) : (
    <span>{text}</span>
  )

  return (
    <div
      className="relative py-3 text-sm animate-fadeIn overflow-hidden"
      style={{ backgroundColor: bgColor, color: textColor }}
    >
      {mode === 'marquee' ? (
        <div className="overflow-hidden">
          <div className="animate-marquee">
            {[0, 1, 2].map((i) => (
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
          </div>
        </div>
      ) : (
        <div className="text-center px-10">{textContent}</div>
      )}
      <button
        onClick={() => setDismissed(true)}
        className="absolute right-3 top-1/2 -translate-y-1/2 p-1 opacity-60 hover:opacity-100 transition-opacity"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </div>
  )
}
