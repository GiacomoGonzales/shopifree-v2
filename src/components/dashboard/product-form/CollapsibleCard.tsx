import { useState, type ReactNode } from 'react'

interface CollapsibleCardProps {
  title: string
  description?: string
  defaultOpen?: boolean
  /** Optional small text shown next to the title (e.g. "opcional", or a value summary). */
  badge?: string
  children: ReactNode
}

export default function CollapsibleCard({
  title,
  description,
  defaultOpen = false,
  badge,
  children,
}: CollapsibleCardProps) {
  const [open, setOpen] = useState(defaultOpen)

  return (
    <div className="bg-white rounded-xl border border-gray-200/60 shadow-sm overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        aria-expanded={open}
        className="w-full flex items-center justify-between gap-3 px-6 py-4 text-left hover:bg-gray-50/60 transition-colors"
      >
        <div className="min-w-0 flex items-center gap-2">
          <h2 className="text-lg font-semibold text-[#1e3a5f]">{title}</h2>
          {badge && (
            <span className="text-[11px] px-2 py-0.5 rounded-full bg-gray-100 text-gray-500 whitespace-nowrap">
              {badge}
            </span>
          )}
        </div>
        <div className="flex items-center gap-3 shrink-0">
          {description && !open && (
            <span className="hidden sm:inline text-xs text-gray-400 truncate max-w-[16rem]">
              {description}
            </span>
          )}
          <svg
            className={`w-5 h-5 text-gray-400 transition-transform ${open ? 'rotate-180' : ''}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </button>
      {open && <div className="px-6 pb-6">{children}</div>}
    </div>
  )
}
