import { forwardRef, type InputHTMLAttributes, type ReactNode, type SelectHTMLAttributes } from 'react'
import { cn } from './cn'

export function Filtros({ children, className }: { children?: ReactNode; className?: string }) {
  return <div className={cn('flex flex-wrap items-center gap-2', className)}>{children}</div>
}

// Select compacto. Con un valor distinto de "todos" se marca con borde oscuro.
export const FiltroSelect = forwardRef<HTMLSelectElement, SelectHTMLAttributes<HTMLSelectElement> & { activo?: boolean; valorTodos?: string }>(
  function FiltroSelect({ className, activo, value, valorTodos = 'all', children, ...props }, ref) {
    const puesto = activo ?? (value !== undefined && value !== valorTodos && value !== '')
    return (
      <select
        ref={ref}
        value={value}
        className={cn(
          'h-8 max-w-full flex-1 basis-[calc(50%-0.25rem)] sm:flex-none sm:basis-auto rounded-md border bg-white pl-2.5 pr-7 text-[12.5px] focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500',
          puesto ? 'border-gray-500 text-gray-900' : 'border-gray-300 text-gray-600',
          className
        )}
        {...props}
      >
        {children}
      </select>
    )
  }
)

export const Buscador = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement> & { ancho?: string }>(
  function Buscador({ className, ancho = 'w-full sm:w-72', ...props }, ref) {
    return (
      <div className={cn('relative', ancho, className)}>
        <svg className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-4.35-4.35M11 18a7 7 0 100-14 7 7 0 000 14z" /></svg>
        <input
          ref={ref}
          type="search"
          className="h-8 w-full rounded-md border border-gray-300 bg-white pl-8 pr-2.5 text-[12.5px] text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500"
          {...props}
        />
      </div>
    )
  }
)
