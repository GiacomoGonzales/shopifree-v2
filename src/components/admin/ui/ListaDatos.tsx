import type { ReactNode } from 'react'
import { cn } from './cn'

// Pares etiqueta/valor en dos columnas (fichas). Lo vacío se pinta como "—".
export function ListaDatos({ children, className }: { children?: ReactNode; className?: string }) {
  return <dl className={cn('grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-1.5 text-[12.5px]', className)}>{children}</dl>
}

export function Dato({ etiqueta, children }: { etiqueta: ReactNode; children?: ReactNode }) {
  const vacio = children === null || children === undefined || children === ''
  return (
    <div className="flex gap-3 min-w-0">
      <dt className="w-32 shrink-0 text-gray-500">{etiqueta}</dt>
      <dd className="min-w-0 flex-1 text-gray-900 break-words">{vacio ? <span className="text-gray-400">—</span> : children}</dd>
    </div>
  )
}
