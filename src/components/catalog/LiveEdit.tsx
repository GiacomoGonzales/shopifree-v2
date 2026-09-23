import { useContext, useRef } from 'react'
import type { ElementType, KeyboardEvent, MouseEvent } from 'react'
import { LiveEditContext } from './liveEditContext'

/** Texto que se edita con un clic dentro del editor en vivo (ver liveEditContext). */
interface EditableTextProps {
  path: string
  value: string | undefined
  as?: ElementType
  className?: string
  /** Texto gris que se ve en el editor cuando el campo esta vacio. */
  placeholder?: string
  /** Campos obligatorios (el nombre de la tienda) no se pueden dejar vacios. */
  required?: boolean
  /** Texto del tema que se muestra cuando el campo esta vacio (en el editor tambien, como texto normal). */
  fallback?: string
  /** Si el texto no pasa esta prueba (por ejemplo, un email mal escrito) se descarta. */
  pattern?: RegExp
}

export function EditableText({ path, value, as: Tag = 'span', className, placeholder, required, fallback, pattern }: EditableTextProps) {
  const ctx = useContext(LiveEditContext)
  const ref = useRef<HTMLElement>(null)

  // data-sf-text marca el campo (por ejemplo, para aplicar la tipografia de titulos al nombre).
  if (!ctx) return <Tag className={className} data-sf-text={path}>{value || fallback}</Tag>

  // No es un input controlado: React no toca el contenido mientras se escribe
  // (si no, el cursor saltaria al inicio). El valor se confirma al salir.
  const commit = () => {
    const el = ref.current
    if (!el) return
    const next = (el.textContent || '').replace(/\s+/g, ' ').trim()
    // Dejar el texto por defecto del tema tal cual no es un cambio.
    if (!value && fallback && next === fallback) return
    if ((required && !next) || (next && pattern && !pattern.test(next))) {
      el.textContent = value || fallback || ''
      return
    }
    if (next !== (value || '')) ctx.onChange(path, next)
  }

  const handleKeyDown = (e: KeyboardEvent<HTMLElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      ref.current?.blur()
    } else if (e.key === 'Escape') {
      if (ref.current) ref.current.textContent = value || fallback || ''
      ref.current?.blur()
    }
  }

  return (
    <Tag
      ref={ref}
      // La key fuerza a React a repintar el texto cuando el valor cambia desde
      // fuera (por ejemplo, el nombre editado en el header se refleja en el hero).
      key={value}
      contentEditable="plaintext-only"
      suppressContentEditableWarning
      spellCheck={false}
      data-placeholder={placeholder}
      data-sf-text={path}
      onBlur={commit}
      onKeyDown={handleKeyDown}
      onClick={(e: MouseEvent) => { e.stopPropagation(); e.preventDefault() }}
      className={`${className || ''} live-edit-text`}
    >
      {value || fallback}
    </Tag>
  )
}
