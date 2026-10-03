import type { ReactNode } from 'react'
import { cn } from './cn'

// Aviso plano: gris para información, rojo para errores.
export default function Aviso({ tipo = 'info', children, className }: { tipo?: 'info' | 'error'; children?: ReactNode; className?: string }) {
  return (
    <div className={cn(
      'rounded-md border px-3 py-2 text-[12.5px]',
      tipo === 'error' ? 'border-red-200 bg-red-50 text-red-700' : 'border-gray-200 bg-gray-50 text-gray-700',
      className
    )}>
      {children}
    </div>
  )
}
