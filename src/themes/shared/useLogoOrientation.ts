import { useState, useEffect } from 'react'

// Cached probe results — keyed by URL so we don't rescan the same image.
interface ProbeResult {
  isHorizontal: boolean
  isTransparent: boolean
}
const cache = new Map<string, ProbeResult>()

/**
 * Detects whether a logo image is:
 *   - horizontal (width > height * 1.4) — the logo already contains the brand name
 *   - square/vertical with an opaque background (e.g. photo-style logo)
 *   - square/vertical with a transparent background (icon-style logo)
 *
 * Transparency is probed by reading the alpha of the 4 corner pixels. If all
 * corners have alpha < 10, the logo is treated as transparent (no frame clip
 * should be applied).
 *
 * Returns:
 *   - `isHorizontal` — whether the image is landscape
 *   - `isTransparent` — whether the corners are transparent (only meaningful for squares)
 *   - `showName`     — whether to render the store name beside the logo (false for landscape)
 *   - `loaded`       — probe finished
 */
export function useLogoOrientation(logoUrl?: string) {
  const [state, setState] = useState<ProbeResult>(() => {
    if (logoUrl && cache.has(logoUrl)) return cache.get(logoUrl)!
    return { isHorizontal: false, isTransparent: false }
  })
  const [loaded, setLoaded] = useState(() => !!logoUrl && cache.has(logoUrl))

  useEffect(() => {
    if (!logoUrl) {
      setState({ isHorizontal: false, isTransparent: false })
      setLoaded(true)
      return
    }

    const cached = cache.get(logoUrl)
    if (cached) {
      setState(cached)
      setLoaded(true)
      return
    }

    let cancelled = false

    const finish = (result: ProbeResult) => {
      if (cancelled) return
      cache.set(logoUrl, result)
      setState(result)
      setLoaded(true)
    }

    /** Alpha de las cuatro esquinas. Lanza si el canvas quedo "tainted". */
    const probeAlpha = (img: HTMLImageElement): boolean => {
      const canvas = document.createElement('canvas')
      canvas.width = img.naturalWidth
      canvas.height = img.naturalHeight
      const ctx = canvas.getContext('2d')
      if (!ctx) return false
      ctx.drawImage(img, 0, 0)
      const w = canvas.width
      const h = canvas.height
      // Sample a small block at each corner (1x1 is too noisy with JPEG artifacts,
      // but inset by a few pixels handles faint edge gradients).
      const inset = Math.min(2, Math.floor(Math.min(w, h) * 0.02))
      const samples = [
        ctx.getImageData(inset, inset, 1, 1).data[3],
        ctx.getImageData(w - 1 - inset, inset, 1, 1).data[3],
        ctx.getImageData(inset, h - 1 - inset, 1, 1).data[3],
        ctx.getImageData(w - 1 - inset, h - 1 - inset, 1, 1).data[3],
      ]
      return samples.every(a => a < 10)
    }

    /**
     * Carga en dos intentos.
     *
     * 1) Con crossOrigin: permite leer pixeles y detectar transparencia. Exige
     *    que el origen mande cabecera CORS (el bucket R2 ya la manda).
     * 2) Sin crossOrigin, solo si el primero falla: la imagen carga igual y se
     *    mide la orientacion, que es lo unico que necesita las dimensiones.
     *
     * El reintento es la parte importante. Antes solo existia el intento con
     * crossOrigin, y como el bucket no mandaba CORS la imagen no cargaba nunca:
     * saltaba onerror y el hook devolvia el fallback, de modo que TODO logo
     * horizontal se trataba como cuadrado. Un fallo de CORS —hoy, o el dia que
     * alguien apunte un logo a otro dominio— ahora solo cuesta la deteccion de
     * transparencia, no la orientacion.
     */
    const cargar = (conCors: boolean) => {
      const img = new Image()
      if (conCors) img.crossOrigin = 'anonymous'

      img.onload = () => {
        if (cancelled) return
        const isHorizontal = img.naturalWidth > img.naturalHeight * 1.4
        let isTransparent = false
        if (conCors) {
          try {
            isTransparent = probeAlpha(img)
          } catch {
            /* canvas tainted pese al crossOrigin: se asume opaco */
          }
        }
        finish({ isHorizontal, isTransparent })
      }

      img.onerror = () => {
        if (cancelled) return
        if (conCors) {
          cargar(false)   // reintento sin CORS: al menos se mide la orientacion
          return
        }
        finish({ isHorizontal: false, isTransparent: false })
      }

      // Con crossOrigin se agrega ?cors=1, un sufijo FIJO (no un cache-buster,
      // asi que se cachea normal). Sin el, el navegador reusa la entrada que
      // ya tiene guardada de una carga SIN CORS —sin cabecera
      // Access-Control-Allow-Origin— y la comprobacion falla aunque el
      // servidor hoy si la mande. Las imagenes van marcadas immutable a un
      // año: esperar a que expire el cache no era opcion.
      img.src = conCors
        ? logoUrl + (logoUrl.includes('?') ? '&' : '?') + 'cors=1'
        : logoUrl
    }

    cargar(true)

    return () => { cancelled = true }
  }, [logoUrl])

  return {
    isHorizontal: state.isHorizontal,
    isTransparent: state.isTransparent,
    loaded,
    showName: !state.isHorizontal,
  }
}
