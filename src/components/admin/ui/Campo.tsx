import type { InputHTMLAttributes, ReactNode, SelectHTMLAttributes, TextareaHTMLAttributes } from 'react'
import { cn } from './cn'

const BASE = 'w-full rounded-md border border-gray-300 bg-white px-2.5 text-[12.5px] text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500'

export function Campo({ etiqueta, ayuda, children, className }: { etiqueta: ReactNode; ayuda?: ReactNode; children?: ReactNode; className?: string }) {
  return (
    <label className={cn('block', className)}>
      <span className="block text-[12px] font-medium text-gray-700 mb-1">{etiqueta}</span>
      {children}
      {ayuda && <span className="block text-[11.5px] text-gray-500 mt-1">{ayuda}</span>}
    </label>
  )
}

export function Entrada({ className, ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return <input className={cn(BASE, 'h-8', className)} {...props} />
}

export function Selector({ className, children, ...props }: SelectHTMLAttributes<HTMLSelectElement>) {
  return <select className={cn(BASE, 'h-8 pr-7', className)} {...props}>{children}</select>
}

export function AreaTexto({ className, ...props }: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea className={cn(BASE, 'py-2 min-h-[80px]', className)} {...props} />
}

export function Casilla({ etiqueta, className, ...props }: InputHTMLAttributes<HTMLInputElement> & { etiqueta: ReactNode }) {
  return (
    <label className={cn('inline-flex items-center gap-2 text-[12.5px] text-gray-700', className)}>
      <input type="checkbox" className="h-3.5 w-3.5 rounded border-gray-300 text-blue-600" {...props} />
      {etiqueta}
    </label>
  )
}
