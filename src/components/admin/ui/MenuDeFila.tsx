import { useCallback, useEffect, useLayoutEffect, useRef, useState, type ReactNode } from 'react'

/**
 * El menú "⋯" de una fila o de una tarjeta (copiado de Cobrify).
 *
 * Vive suelto (position: fixed) porque una tabla con overflow lo recortaría.
 * Al abrirse se coloca debajo del botón y después se MIDE para encajarlo en la
 * pantalla. Las páginas pintan el menú dos veces (tarjetas del celular y tabla
 * de escritorio, una oculta): el ref de callback se queda solo con la copia
 * visible, y "adentro" es cualquier [data-menu-fila].
 */
const ANCHO = 232

export function useMenuDeFila() {
  const [abiertoEn, setAbiertoEn] = useState<string | null>(null)
  const [posicion, setPosicion] = useState({ top: 0, left: 0 })
  const disparador = useRef<HTMLElement | null>(null)
  const menu = useRef<HTMLDivElement | null>(null)

  const refMenu = useCallback((el: HTMLDivElement | null) => {
    if (el && el.getClientRects().length > 0) menu.current = el
  }, [])

  const calcular = (el: HTMLElement | null) => {
    if (!el) return null
    const r = el.getBoundingClientRect()
    if (r.bottom < 0 || r.top > window.innerHeight) return null
    return { top: r.bottom + 4, left: Math.max(8, Math.min(r.right - ANCHO, window.innerWidth - ANCHO - 8)) }
  }

  useLayoutEffect(() => {
    if (!abiertoEn || !menu.current) return
    const alto = menu.current.offsetHeight
    setPosicion(pos => {
      const top = Math.max(8, Math.min(pos.top, window.innerHeight - alto - 8))
      return top === pos.top ? pos : { ...pos, top }
    })
  }, [abiertoEn])

  useEffect(() => {
    if (!abiertoEn) return undefined
    const recolocar = () => {
      const pos = calcular(disparador.current)
      if (!pos) { setAbiertoEn(null); disparador.current = null; return }
      setPosicion(pos)
    }
    window.addEventListener('scroll', recolocar, true)
    window.addEventListener('resize', recolocar)
    return () => {
      window.removeEventListener('scroll', recolocar, true)
      window.removeEventListener('resize', recolocar)
    }
  }, [abiertoEn])

  useEffect(() => {
    if (!abiertoEn) return undefined
    const alTocar = (e: Event) => {
      const t = e.target as HTMLElement | null
      if (t?.closest?.('[data-menu-fila]')) return
      if (menu.current?.contains(t)) return
      if (disparador.current?.contains(t)) return
      setAbiertoEn(null)
      disparador.current = null
    }
    const alTeclear = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { setAbiertoEn(null); disparador.current = null }
    }
    document.addEventListener('mousedown', alTocar, true)
    document.addEventListener('touchstart', alTocar, true)
    document.addEventListener('keydown', alTeclear)
    return () => {
      document.removeEventListener('mousedown', alTocar, true)
      document.removeEventListener('touchstart', alTocar, true)
      document.removeEventListener('keydown', alTeclear)
    }
  }, [abiertoEn])

  const alternar = (id: string, el: HTMLElement) => {
    if (abiertoEn === id) { setAbiertoEn(null); disparador.current = null; return }
    const pos = calcular(el)
    if (!pos) return
    disparador.current = el
    setPosicion(pos)
    setAbiertoEn(id)
  }

  const cerrar = () => { setAbiertoEn(null); disparador.current = null }

  return { abiertoEn, posicion, alternar, cerrar, refMenu }
}

export function BotonDeFila({ onClick, className = '' }: { onClick: (el: HTMLElement) => void; className?: string }) {
  return (
    <button
      type="button"
      onClick={e => { e.stopPropagation(); onClick(e.currentTarget) }}
      className={`h-7 w-7 rounded-md text-gray-400 hover:bg-gray-100 hover:text-gray-900 text-[16px] leading-none ${className}`}
      title="Acciones"
      aria-label="Acciones"
    >
      ⋯
    </button>
  )
}

export function CajaMenu({ posicion, refMenu, children }: { posicion: { top: number; left: number }; refMenu: (el: HTMLDivElement | null) => void; children?: ReactNode }) {
  return (
    <div
      ref={refMenu}
      data-menu-fila=""
      className="fixed w-[232px] max-h-[calc(100vh-16px)] overflow-y-auto overflow-x-hidden overscroll-contain whitespace-normal bg-white rounded-md border border-gray-200 shadow-md py-1 z-50 text-left"
      style={{ top: posicion.top, left: posicion.left }}
      onClick={e => e.stopPropagation()}
    >
      {children}
    </div>
  )
}

export function ItemMenu({ rojo = false, onClick, children }: { rojo?: boolean; onClick?: () => void; children?: ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`w-full px-3 py-1.5 text-left text-[12.5px] leading-snug whitespace-normal break-words hover:bg-gray-50 ${rojo ? 'text-red-600' : 'text-gray-700'}`}
    >
      {children}
    </button>
  )
}

export function SeparadorMenu() {
  return <div className="border-t border-gray-100 my-1" />
}
