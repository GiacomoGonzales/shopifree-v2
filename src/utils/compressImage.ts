/**
 * compressImage — redimensiona y reencoda a WebP ANTES de subir.
 * ==============================================================
 * Por qué existe:
 *  - Las fotos que suben los comerciantes vienen del celular a 3-6 MB y
 *    3000-6000 px de lado. Se mostraban en cards de ~250 px.
 *  - Vercel corta el body en ~4.5 MB y base64 infla ~1.37x, así que todo
 *    archivo de más de ~3.2 MB fallaba la subida a R2 y caía al respaldo de
 *    Cloudinary sin que nadie se enterara (solo un console.warn).
 *
 * Reduciendo el lado largo a 2048 px y reencodando a WebP q82, una foto de
 * 5.6 MB queda en ~250 KB: nunca más se acerca al límite de Vercel y el
 * storage deja de crecer.
 *
 * Reglas de seguridad (en caso de duda, se sube el original):
 *  - Nunca agranda una imagen que ya es más chica que el tope.
 *  - Si el resultado pesa igual o más que el original, gana el original.
 *  - GIF y SVG no se tocan (el canvas aplanaría la animación / rasterizaría
 *    el vector).
 *  - Si el navegador no sabe encodar WebP, se sube el original tal cual.
 *  - Cualquier error de decodificación devuelve el original.
 */

/** Lado largo máximo por defecto, en px. */
export const DEFAULT_MAX_DIMENSION = 2048

/** Calidad WebP (0-1). */
export const DEFAULT_QUALITY = 0.82

// El canvas aplanaría el GIF a un solo frame y rasterizar un SVG solo lo
// empeora, así que estos pasan derecho.
const SKIP_TYPES = new Set(['image/gif', 'image/svg+xml'])

// Si el <img> no dispara ni onload ni onerror, la cola quedaría trabada para
// toda la sesión. 30 s es holgado incluso para un celular lento decodificando
// 50 MP, y el timeout hace que se suba el original en vez de colgarse.
const DECODE_TIMEOUT_MS = 30_000

export type OutputMime = 'image/webp' | 'image/png'

export interface CompressOptions {
  /** Lado largo máximo en px. Default: DEFAULT_MAX_DIMENSION. */
  maxDimension?: number
  /** Calidad 0-1 (la ignora el encoder PNG). Default: DEFAULT_QUALITY. */
  quality?: number
  /**
   * Formato de salida. Default WebP.
   *
   * Usar 'image/png' cuando el destino lo exige. Caso concreto: el ícono de
   * Play Console debe ser PNG de 32 bits, y Cloudflare NO puede forzar PNG al
   * entregar — `format=png` se ignora y preserva el formato de origen. La
   * única forma de garantizarlo es guardar el original ya en PNG.
   *
   * Cuando se pide un formato explícito no se aplica la regla de "si engorda,
   * gana el original": cumplir el formato importa más que los bytes.
   */
  mimeType?: OutputMime
}

/**
 * Cola global de compresión: las decodificaciones corren de a una.
 *
 * Varios llamadores suben en paralelo (ProductForm con Promise.all, ChatModal
 * y SupportChats con forEach). Sin cola, elegir 5 fotos del celular significa
 * decodificar 5 imágenes de 18 MP a la vez, y eso agota la memoria de iOS
 * Safari y recarga la pestaña. Las subidas siguen yendo en paralelo: lo único
 * que se serializa es el trabajo de CPU.
 */
let chain: Promise<void> = Promise.resolve()

function enqueue<T>(task: () => Promise<T>): Promise<T> {
  const result = chain.then(task)
  // La cola nunca debe quedar rechazada, o el próximo en entrar heredaría el
  // error y ni siquiera arrancaría.
  chain = result.then(() => undefined, () => undefined)
  return result
}

/** Dimensiones destino respetando el aspecto. Nunca agranda. */
function targetSize(width: number, height: number, max: number) {
  const longest = Math.max(width, height)
  if (longest <= max) return { width, height }
  const scale = max / longest
  return { width: Math.round(width * scale), height: Math.round(height * scale) }
}

/** Carga el blob en un <img> para poder leer sus dimensiones reales. */
function loadImage(blob: Blob): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(blob)
    const img = new Image()
    let settled = false
    const finish = (fn: () => void) => {
      if (settled) return
      settled = true
      clearTimeout(timer)
      URL.revokeObjectURL(url)
      fn()
    }
    const timer = setTimeout(
      () => finish(() => reject(new Error('Timeout decodificando la imagen'))),
      DECODE_TIMEOUT_MS
    )
    img.onload = () => finish(() => resolve(img))
    img.onerror = () => finish(() => reject(new Error('No se pudo decodificar la imagen')))
    img.src = url
  })
}

/**
 * Dibuja la imagen ya escalada en un canvas del tamaño DESTINO.
 *
 * Importante que el canvas sea del tamaño final y no del original: una foto
 * de 3213×5712 son 18 MP y supera el límite de superficie de canvas de iOS
 * Safari (~16.7 MP). Escalando al vuelo con drawImage el canvas queda en
 * ~2.4 MP y no hay problema en ningún navegador.
 */
async function drawScaled(img: HTMLImageElement, width: number, height: number): Promise<HTMLCanvasElement | null> {
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d')
  if (!ctx) return null
  ctx.imageSmoothingEnabled = true
  ctx.imageSmoothingQuality = 'high'

  // createImageBitmap remuestrea durante el decode y da mejor resultado que
  // un drawImage directo en reducciones grandes. Si no está disponible o
  // falla, el drawImage escalado alcanza.
  if (typeof createImageBitmap === 'function') {
    try {
      const bitmap = await createImageBitmap(img, {
        resizeWidth: width,
        resizeHeight: height,
        resizeQuality: 'high',
      })
      ctx.drawImage(bitmap, 0, 0)
      bitmap.close?.()
      return canvas
    } catch {
      // sigue al camino de abajo
    }
  }

  ctx.drawImage(img, 0, 0, width, height)
  return canvas
}

function canvasToBlob(canvas: HTMLCanvasElement, type: OutputMime, quality: number): Promise<Blob | null> {
  return new Promise(resolve => canvas.toBlob(resolve, type, quality))
}

/** Cambia la extensión del nombre para que coincida con el formato de salida. */
function renameTo(file: File | Blob, type: OutputMime): string {
  const ext = type === 'image/png' ? 'png' : 'webp'
  const original = (file as File).name
  if (!original) return `image.${ext}`
  return original.replace(/\.[^./\\]+$/, '') + '.' + ext
}

/**
 * Devuelve una versión comprimida del archivo, o el original si comprimir no
 * conviene o no se puede. Nunca lanza: ante cualquier problema devuelve la
 * entrada intacta para que la subida siga funcionando.
 *
 * El trabajo pesado pasa por una cola global (ver `enqueue`), así que varias
 * llamadas concurrentes se procesan de a una.
 */
export async function compressImage(
  file: File | Blob,
  opts: CompressOptions = {}
): Promise<File | Blob> {
  const type = (file.type || '').toLowerCase()
  // Los descartes baratos se resuelven fuera de la cola: un GIF no tiene por
  // qué esperar detrás de una foto de 18 MP.
  if (!type.startsWith('image/') || SKIP_TYPES.has(type)) return file
  if (!file.size) return file

  return enqueue(() => compressOne(file, opts))
}

async function compressOne(
  file: File | Blob,
  { maxDimension = DEFAULT_MAX_DIMENSION, quality = DEFAULT_QUALITY, mimeType }: CompressOptions
): Promise<File | Blob> {
  const outType: OutputMime = mimeType || 'image/webp'
  // Si el llamador impuso un formato, cumplirlo manda sobre ahorrar bytes.
  const formatoImpuesto = !!mimeType

  try {
    const img = await loadImage(file)
    const { width, height } = targetSize(img.naturalWidth, img.naturalHeight, maxDimension)
    if (!width || !height) return file

    const canvas = await drawScaled(img, width, height)
    if (!canvas) return file

    const blob = await canvasToBlob(canvas, outType, quality)
    // toBlob devuelve null si falla, y ante un formato no soportado puede
    // devolver otra cosa en silencio. En ambos casos preferimos el original
    // antes que subir algo distinto de lo que se pidió.
    if (!blob || blob.type !== outType) return file

    // Una imagen que ya venía optimizada puede engordar al reencodar.
    if (!formatoImpuesto && blob.size >= file.size) return file

    return new File([blob], renameTo(file, outType), { type: outType })
  } catch {
    return file
  }
}
