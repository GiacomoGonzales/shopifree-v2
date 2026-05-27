import { useState, useRef, useEffect } from 'react'

/**
 * HelpTip — small "i" icon that reveals a contextual tooltip on hover (desktop)
 * or tap (mobile). Used to put short explanations next to confusing labels
 * without bloating the form layout.
 *
 * Why not the native `title` attribute: on mobile, native titles never
 * appear, and the merchant audience for Shopifree skews heavily mobile.
 * This component shows the tip on click for touch users.
 */
interface HelpTipProps {
  text: string
  /** Optional href for "Más información" link (e.g. to the help page) */
  learnMoreHref?: string
  learnMoreLabel?: string
  /** Where the bubble appears relative to the icon. Default: 'top'. */
  position?: 'top' | 'bottom'
}

export default function HelpTip({ text, learnMoreHref, learnMoreLabel, position = 'top' }: HelpTipProps) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLSpanElement>(null)

  // Close on outside click (so the click-to-open behavior on mobile doesn't
  // leave a stale bubble on screen).
  useEffect(() => {
    if (!open) return
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  return (
    <span
      ref={ref}
      className="relative inline-flex"
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
    >
      <button
        type="button"
        onClick={(e) => { e.preventDefault(); e.stopPropagation(); setOpen(o => !o) }}
        className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-gray-200 text-gray-500 text-[10px] font-bold hover:bg-gray-300 hover:text-gray-700 transition-colors"
        aria-label="Más información"
      >
        i
      </button>
      {open && (
        <span
          className={`absolute z-50 ${position === 'top' ? 'bottom-full mb-2' : 'top-full mt-2'} left-1/2 -translate-x-1/2 w-64 px-3 py-2 bg-gray-900 text-white text-xs rounded-lg shadow-lg pointer-events-auto`}
          onMouseEnter={() => setOpen(true)}
        >
          <span className="block leading-relaxed">{text}</span>
          {learnMoreHref && (
            <a
              href={learnMoreHref}
              className="block mt-1.5 text-amber-300 hover:text-amber-200 underline text-[11px]"
            >
              {learnMoreLabel || 'Más información →'}
            </a>
          )}
          {/* Arrow */}
          <span
            className={`absolute left-1/2 -translate-x-1/2 ${position === 'top' ? 'top-full' : 'bottom-full'} w-0 h-0 border-l-4 border-r-4 border-transparent ${position === 'top' ? 'border-t-4 border-t-gray-900' : 'border-b-4 border-b-gray-900'}`}
          />
        </span>
      )}
    </span>
  )
}
