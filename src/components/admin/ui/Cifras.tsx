import type { ReactNode } from 'react'
import { cn } from './cn'

// Fila de cifras sin tarjetas ni iconos: etiqueta pequeña arriba, número
// abajo. En el celular van de a dos por fila; en escritorio, en línea.
export function Cifras({ children, className }: { children?: ReactNode; className?: string }) {
  return <div className={cn('grid grid-cols-2 gap-x-6 gap-y-3 sm:flex sm:flex-wrap sm:gap-x-8', className)}>{children}</div>
}

export function Cifra({ etiqueta, valor, nota, alerta = false, className }: {
  etiqueta: ReactNode
  valor: ReactNode
  nota?: ReactNode
  alerta?: boolean
  className?: string
}) {
  return (
    <div className={cn('min-w-0 sm:min-w-[6.5rem]', className)}>
      <p className="text-[11.5px] text-gray-500">{etiqueta}</p>
      <p className={cn('text-[17px] sm:text-[18px] font-semibold leading-7 tabular-nums break-words', alerta ? 'text-red-600' : 'text-gray-900')}>{valor}</p>
      {nota && <p className="text-[11.5px] text-gray-500">{nota}</p>}
    </div>
  )
}
