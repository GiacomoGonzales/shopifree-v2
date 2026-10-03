import type { ReactNode } from 'react'
import { cn } from './cn'

// Contenedor de toda página del admin. Arriba una línea de resumen en gris
// ("612 tiendas · 48 pagando") y, a la derecha, las acciones de la página.
// Sin tarjetas de cifras ni título: el título lo pone la cabecera del layout.
export default function Pagina({ resumen, acciones, className, children }: {
  resumen?: ReactNode
  acciones?: ReactNode
  className?: string
  children?: ReactNode
}) {
  return (
    <div className={cn('flex flex-col gap-4 min-w-0', className)}>
      {(resumen || acciones) && (
        <div className="flex flex-wrap items-center justify-between gap-3 min-h-8">
          <div className="text-[12.5px] text-gray-500 tabular-nums">{resumen}</div>
          {acciones && <div className="flex flex-wrap items-center gap-2">{acciones}</div>}
        </div>
      )}
      {children}
    </div>
  )
}
