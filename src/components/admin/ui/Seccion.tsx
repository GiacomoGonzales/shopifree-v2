import type { ReactNode } from 'react'
import { cn } from './cn'

// Bloque plano con borde (sin sombra) y un título pequeño. Con sinRelleno el
// contenido pega al borde (tablas).
export default function Seccion({ titulo, descripcion, acciones, sinRelleno = false, id, className, children }: {
  titulo?: ReactNode
  descripcion?: ReactNode
  acciones?: ReactNode
  sinRelleno?: boolean
  id?: string
  className?: string
  children?: ReactNode
}) {
  return (
    <section id={id} className={cn('min-w-0 bg-white border border-gray-200 rounded-lg', className)}>
      {(titulo || acciones) && (
        <header className="flex flex-col gap-2 px-4 py-2.5 border-b border-gray-200 sm:flex-row sm:items-center sm:justify-between sm:gap-3">
          <div className="min-w-0">
            {titulo && <h2 className="text-[13px] font-semibold text-gray-900 truncate">{titulo}</h2>}
            {descripcion && <p className="text-[12px] text-gray-500 mt-0.5">{descripcion}</p>}
          </div>
          {acciones && <div className="flex flex-wrap items-center gap-2 sm:shrink-0">{acciones}</div>}
        </header>
      )}
      <div className={sinRelleno ? '' : 'px-4 py-3'}>{children}</div>
    </section>
  )
}
