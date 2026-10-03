import { useEffect } from 'react'

/**
 * Visor de imágenes dentro de la página (antes abría otra pestaña). Esc
 * cierra y ← → recorren todas las imágenes del chat abierto. Solo escucha el
 * teclado mientras está abierto, para no robarle las flechas a la caja de
 * respuesta.
 */
export default function VisorImagenes({ urls, actual, onCambiar, onCerrar }: {
  urls: string[]
  actual: string
  onCambiar: (url: string) => void
  onCerrar: () => void
}) {
  const i = urls.indexOf(actual)

  useEffect(() => {
    const alTeclear = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onCerrar()
      else if (e.key === 'ArrowLeft' && i > 0) onCambiar(urls[i - 1])
      else if (e.key === 'ArrowRight' && i >= 0 && i < urls.length - 1) onCambiar(urls[i + 1])
    }
    window.addEventListener('keydown', alTeclear)
    return () => window.removeEventListener('keydown', alTeclear)
  }, [i, urls, onCambiar, onCerrar])

  const boton = 'absolute h-9 px-3 rounded-md bg-white/10 hover:bg-white/20 text-white text-[12.5px]'

  return (
    <div className="fixed inset-0 z-[70] bg-gray-950/90 flex items-center justify-center" onClick={onCerrar}>
      <button type="button" className={`${boton} top-4 right-4`} onClick={e => { e.stopPropagation(); onCerrar() }}>Cerrar</button>
      {urls.length > 1 && <span className="absolute top-6 left-1/2 -translate-x-1/2 text-white/80 text-[12px] tabular-nums">{i + 1} / {urls.length}</span>}
      {i > 0 && (
        <button type="button" aria-label="Anterior" className={`${boton} left-4 top-1/2 -translate-y-1/2`} onClick={e => { e.stopPropagation(); onCambiar(urls[i - 1]) }}>←</button>
      )}
      {i >= 0 && i < urls.length - 1 && (
        <button type="button" aria-label="Siguiente" className={`${boton} right-4 top-1/2 -translate-y-1/2`} onClick={e => { e.stopPropagation(); onCambiar(urls[i + 1]) }}>→</button>
      )}
      <img src={actual} alt="" className="max-w-[90vw] max-h-[90vh] object-contain" onClick={e => e.stopPropagation()} />
    </div>
  )
}
