import type { ReactNode } from 'react'
import { cn } from './cn'

const ALINEAR = { izq: 'text-left', der: 'text-right', centro: 'text-center' } as const
type Alinear = keyof typeof ALINEAR

export interface Orden { campo: string; direccion: 'asc' | 'desc' }

// Tabla densa del admin: 12.5px, una línea por celda. Las flechas de orden son
// texto (↑ ↓). Sin alto propio: el único scroll es el de la página.
export function Tabla({ children, className, fija = false }: { children?: ReactNode; className?: string; fija?: boolean }) {
  return (
    <div className="overflow-x-auto">
      <table className={cn('w-full border-collapse text-[12.5px] leading-tight', fija && 'table-fixed', className)}>
        {children}
      </table>
    </div>
  )
}

// campo + onOrdenar hacen la columna ordenable.
export function Th({ children, className, alinear = 'izq', ancho, campo, orden, onOrdenar, title }: {
  children?: ReactNode
  className?: string
  alinear?: Alinear
  ancho?: string | number
  campo?: string
  orden?: Orden
  onOrdenar?: (campo: string) => void
  title?: string
}) {
  const ordenable = Boolean(campo && onOrdenar)
  const activo = ordenable && orden?.campo === campo
  return (
    <th
      scope="col"
      title={title}
      style={ancho ? { width: ancho } : undefined}
      onClick={ordenable ? () => onOrdenar!(campo!) : undefined}
      className={cn(
        'bg-gray-50 border-b border-gray-200 px-3 py-2 text-[11.5px] font-medium text-gray-500 whitespace-nowrap',
        ALINEAR[alinear],
        ordenable && 'cursor-pointer select-none hover:text-gray-900',
        activo && 'text-gray-900',
        className
      )}
    >
      {children}
      {activo && <span className="ml-1 text-gray-400" aria-hidden="true">{orden!.direccion === 'asc' ? '↑' : '↓'}</span>}
    </th>
  )
}

export function Td({ children, className, alinear = 'izq', apagado = false, numero = false, colSpan, title, onClick }: {
  children?: ReactNode
  className?: string
  alinear?: Alinear
  apagado?: boolean
  numero?: boolean
  colSpan?: number
  title?: string
  onClick?: (e: React.MouseEvent) => void
}) {
  return (
    <td
      colSpan={colSpan}
      title={title}
      onClick={onClick}
      className={cn(
        'px-3 py-1.5 border-b border-gray-100 align-middle whitespace-nowrap',
        numero ? 'text-right tabular-nums' : ALINEAR[alinear],
        apagado ? 'text-gray-500' : 'text-gray-900',
        className
      )}
    >
      {children}
    </td>
  )
}

export function Fila({ children, className, onClick, seleccionada = false, apagada = false }: {
  children?: ReactNode
  className?: string
  onClick?: () => void
  seleccionada?: boolean
  apagada?: boolean
}) {
  return (
    <tr
      onClick={onClick}
      className={cn(
        'transition-colors',
        onClick && 'cursor-pointer hover:bg-gray-50',
        seleccionada && 'bg-blue-50 hover:bg-blue-50',
        apagada && 'text-gray-400',
        className
      )}
    >
      {children}
    </tr>
  )
}

export function FilaVacia({ colSpan, children }: { colSpan: number; children?: ReactNode }) {
  return (
    <tr>
      <td colSpan={colSpan} className="px-3 py-10 text-center text-[12.5px] text-gray-500">{children}</td>
    </tr>
  )
}

/** Hook de orden de columnas: alterna asc/desc al tocar la misma columna. */
export function siguienteOrden(actual: Orden, campo: string, inicial: 'asc' | 'desc' = 'desc'): Orden {
  if (actual.campo === campo) return { campo, direccion: actual.direccion === 'asc' ? 'desc' : 'asc' }
  return { campo, direccion: inicial }
}
