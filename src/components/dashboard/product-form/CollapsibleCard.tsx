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
    <div className="bg-white rounded-[14px] border border-[#E6EBF1] overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        aria-expanded={open}
        className="w-full flex items-center justify-between gap-3 px-4 sm:px-5 py-3.5 text-left transition-colors hover:bg-[#F6F9FC]"
      >
        <div className="min-w-0 flex items-center gap-2">
          <h2 className="text-[0.9rem] font-semibold text-[#1e3a5f]">{title}</h2>
          {badge && (
            <span className="text-[0.68rem] font-medium px-2 py-0.5 rounded-full bg-[#F1F5F9] text-[#8898AA] whitespace-nowrap">
              {badge}
            </span>
          )}
        </div>
        <div className="flex items-center gap-3 shrink-0">
          {description && !open && (
            <span className="hidden sm:inline text-[0.74rem] font-normal text-[#A9B6C6] truncate max-w-[16rem]">
              {description}
            </span>
          )}
          {/* Cheurón dibujado con dos bordes rotados, sin SVG. La rotación va
              inline en vez de con rotate-45/rotate-[-135deg] para no depender de
              que Tailwind genere el valor arbitrario. */}
          <span
            style={{
              width: 7,
              height: 7,
              borderRight: '1.6px solid #A9B6C6',
              borderBottom: '1.6px solid #A9B6C6',
              transform: `rotate(${open ? -135 : 45}deg)`,
              transition: 'transform .15s ease',
            }}
          />
        </div>
      </button>
      {open && <div className="px-4 sm:px-5 pb-4 sm:pb-5">{children}</div>}
    </div>
  )
}
