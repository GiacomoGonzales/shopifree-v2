import { useEffect, type ReactNode } from 'react'
import { cn } from './cn'

const ANCHOS = { sm: 'max-w-sm', md: 'max-w-lg', lg: 'max-w-2xl', xl: 'max-w-4xl' } as const

// Ventana plana: cabecera con título, cuerpo con scroll y pie con botones.
// Esc y el clic en el fondo la cierran.
export default function Modal({ titulo, subtitulo, onClose, ancho = 'md', pie, className, children }: {
  titulo: ReactNode
  subtitulo?: ReactNode
  onClose: () => void
  ancho?: keyof typeof ANCHOS
  pie?: ReactNode
  className?: string
  children?: ReactNode
}) {
  useEffect(() => {
    const alTeclear = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', alTeclear)
    return () => document.removeEventListener('keydown', alTeclear)
  }, [onClose])

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/40 p-3 sm:p-6" onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        onClick={e => e.stopPropagation()}
        className={cn('bg-white rounded-lg border border-gray-200 shadow-lg w-full max-h-[92vh] flex flex-col text-[13px] text-gray-900', ANCHOS[ancho], className)}
      >
        <header className="flex items-start justify-between gap-3 px-4 py-3 border-b border-gray-200">
          <div className="min-w-0">
            <h2 className="text-[14px] font-semibold text-gray-900 truncate">{titulo}</h2>
            {subtitulo && <p className="text-[12px] text-gray-500 truncate">{subtitulo}</p>}
          </div>
          <button type="button" onClick={onClose} className="p-1 -mr-1 rounded-md text-gray-400 hover:bg-gray-100 hover:text-gray-900" aria-label="Cerrar">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </header>
        <div className="flex-1 overflow-y-auto px-4 py-3">{children}</div>
        {pie && <footer className="flex items-center justify-end gap-2 px-4 py-3 border-t border-gray-200">{pie}</footer>}
      </div>
    </div>
  )
}
