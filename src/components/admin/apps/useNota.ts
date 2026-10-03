import { useCallback, useEffect, useState } from 'react'

export interface Nota { tipo: 'info' | 'error'; texto: string }

/**
 * Mensaje de resultado de una acción, pintado con <Aviso> arriba de la página.
 * El admin no usa el Toast del dashboard (verde/ámbar, sombra grande). Los
 * avisos grises se van solos; los errores se quedan hasta cerrarlos o hasta
 * la próxima acción, para que no se pierdan.
 */
export function useNota() {
  const [nota, setNota] = useState<Nota | null>(null)

  useEffect(() => {
    if (!nota || nota.tipo === 'error') return
    const t = setTimeout(() => setNota(null), 5000)
    return () => clearTimeout(t)
  }, [nota])

  const info = useCallback((texto: string) => setNota({ tipo: 'info', texto }), [])
  const error = useCallback((texto: string) => setNota({ tipo: 'error', texto }), [])
  const limpiar = useCallback(() => setNota(null), [])

  return { nota, info, error, limpiar }
}
