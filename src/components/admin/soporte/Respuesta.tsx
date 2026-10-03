import { useEffect, useRef } from 'react'
import { Boton } from '../ui'
import type { ImagenPendiente } from './utilidades'

export interface EnvioFallido { text: string; imageUrls?: string[] }

/**
 * Caja de respuesta: imágenes en cola (cada una con su subida), aviso del
 * último envío fallido con Reintentar / Descartar, y el texto. Enter envía,
 * Shift+Enter hace salto de línea.
 */
export default function Respuesta({
  texto, onTexto, imagenes, onQuitarImagen, onElegirArchivos, enviando, fallido, onReintentar, onDescartarFallido, onEnviar, foco,
}: {
  texto: string
  onTexto: (t: string) => void
  imagenes: ImagenPendiente[]
  onQuitarImagen: (id: string) => void
  onElegirArchivos: (archivos: FileList) => void
  enviando: boolean
  fallido: EnvioFallido | null
  onReintentar: () => void
  onDescartarFallido: () => void
  onEnviar: () => void
  /** Sube en cada envío terminado: la caja recupera el foco. */
  foco: number
}) {
  const refArchivo = useRef<HTMLInputElement>(null)
  const refTexto = useRef<HTMLTextAreaElement>(null)

  useEffect(() => { if (foco) refTexto.current?.focus() }, [foco])

  // El textarea crece con el contenido hasta 160 px (para no comerse la
  // conversación) y vuelve a encogerse al borrar o enviar.
  useEffect(() => {
    const ta = refTexto.current
    if (!ta) return
    ta.style.height = 'auto'
    ta.style.height = Math.min(ta.scrollHeight, 160) + 'px'
  }, [texto])

  const puedeEnviar = (texto.trim() || imagenes.length > 0) && !enviando && !imagenes.some(p => p.subiendo)

  return (
    <div className="border-t border-gray-200 px-3 py-2 bg-white">
      <div className="max-w-2xl mx-auto">
        {/* Antes un fallo devolvía el texto a la caja sin decir nada y
            parecía que el chat se había "comido" el mensaje. */}
        {fallido && (
          <div className="mb-2 flex items-center gap-2 rounded-md border border-red-200 bg-red-50 px-3 py-1.5">
            <div className="flex-1 min-w-0">
              <p className="text-[12px] font-medium text-red-700">No se pudo enviar el mensaje</p>
              <p className="text-[11.5px] text-red-600 truncate">
                {fallido.text || (fallido.imageUrls?.length ? `${fallido.imageUrls.length} imagen${fallido.imageUrls.length > 1 ? 'es' : ''}` : '')}
              </p>
            </div>
            <Boton tamano="sm" variante="peligro" onClick={onReintentar} disabled={enviando}>Reintentar</Boton>
            <Boton tamano="sm" variante="enlace" onClick={onDescartarFallido} className="text-red-700">Descartar</Boton>
          </div>
        )}

        {imagenes.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-2">
            {imagenes.map(p => (
              <div key={p.id} className="relative">
                <img src={p.preview} alt="" className={`h-14 w-14 rounded object-cover border border-gray-200 ${p.subiendo ? 'opacity-50' : ''}`} />
                {p.subiendo
                  ? <span className="absolute inset-x-0 bottom-0 text-center text-[10px] text-gray-700 bg-white/80">Subiendo…</span>
                  : (
                    <button
                      type="button"
                      onClick={() => onQuitarImagen(p.id)}
                      aria-label="Quitar imagen"
                      className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full bg-gray-700 hover:bg-gray-900 text-white text-[11px] leading-4 text-center"
                    >
                      ×
                    </button>
                  )}
              </div>
            ))}
          </div>
        )}

        <div className="flex items-end gap-2">
          <input
            ref={refArchivo}
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            onChange={e => {
              if (e.target.files) onElegirArchivos(e.target.files)
              // Se limpia para poder elegir el mismo archivo otra vez.
              e.target.value = ''
            }}
          />
          <Boton onClick={() => refArchivo.current?.click()} disabled={enviando} title="Adjuntar imagen (también puedes pegarla o arrastrarla)">Imagen</Boton>
          <textarea
            ref={refTexto}
            value={texto}
            onChange={e => onTexto(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); onEnviar() }
            }}
            placeholder="Responder…"
            rows={1}
            // 16 px en el celular para que iOS no haga zoom al enfocar.
            className="flex-1 block resize-none rounded-md border border-gray-300 bg-white px-2.5 py-1.5 text-[16px] sm:text-[13px] leading-snug max-h-[160px] overflow-y-auto focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500"
          />
          <Boton variante="primario" onClick={onEnviar} disabled={!puedeEnviar}>Enviar</Boton>
        </div>
      </div>
    </div>
  )
}
