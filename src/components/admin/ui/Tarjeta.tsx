import type { ReactNode } from 'react'

/**
 * Una fila de tabla convertida en tarjeta, para el celular. Cada pantalla del
 * admin pinta dos versiones: las tarjetas (`sm:hidden`) y la tabla
 * (`hidden sm:block`). `datos` es una lista de [etiqueta, valor]; lo vacío no
 * se pinta.
 */
export default function TarjetaDeFila({ titulo, subtitulo, estado, datos = [], acciones, onClick, className = '' }: {
  titulo: ReactNode
  subtitulo?: ReactNode
  estado?: ReactNode
  datos?: Array<[string, ReactNode]>
  acciones?: ReactNode
  onClick?: () => void
  className?: string
}) {
  const llenos = datos.filter(([, v]) => v !== null && v !== undefined && v !== '' && v !== false)
  return (
    <div className={`px-3 py-2.5 ${onClick ? 'cursor-pointer active:bg-gray-50' : ''} ${className}`} onClick={onClick}>
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <div className="text-[12.5px] font-medium text-gray-900 break-words">{titulo}</div>
          {subtitulo && <div className="text-[11.5px] text-gray-500 break-words">{subtitulo}</div>}
        </div>
        {estado && <span className="shrink-0 text-[11.5px]">{estado}</span>}
        {acciones && <div className="shrink-0" onClick={e => e.stopPropagation()}>{acciones}</div>}
      </div>
      {llenos.length > 0 && (
        <dl className="mt-1 space-y-0.5">
          {llenos.map(([etiqueta, valor]) => (
            <div key={etiqueta} className="flex gap-2 text-[11.5px]">
              <dt className="w-24 shrink-0 text-gray-500">{etiqueta}</dt>
              <dd className="min-w-0 flex-1 text-gray-700 break-words">{valor}</dd>
            </div>
          ))}
        </dl>
      )}
    </div>
  )
}

/** Lista de tarjetas con separadores, solo en el celular. */
export function ListaTarjetas({ children, vacio }: { children?: ReactNode; vacio?: ReactNode }) {
  const hay = Array.isArray(children) ? children.length > 0 : !!children
  return (
    <div className="sm:hidden divide-y divide-gray-100">
      {hay ? children : <p className="px-3 py-8 text-center text-[12.5px] text-gray-500">{vacio}</p>}
    </div>
  )
}
