import { createContext, useContext } from 'react'

/**
 * Modo "editor en vivo". Solo existe dentro del editor del dashboard
 * (/dashboard/editor): ahi se envuelve el tema con <LiveEditProvider> y cada
 * <EditableText> se vuelve editable con un clic. En la tienda publica no hay
 * provider, asi que <EditableText> pinta texto plano y no cambia nada.
 *
 * `path` es la ruta del campo en el documento de la tienda ('name',
 * 'about.slogan', 'announcement.text'): el editor la usa tal cual para el
 * updateDoc con notacion de puntos.
 */
/** Colores originales del tema que se esta mostrando (antes de los cambios del editor). */
export interface ThemeBaseColors {
  background: string
  surface: string
  text: string
  primary: string
}

interface LiveEditContextValue {
  onChange: (path: string, value: string) => void
  /** Abre la edicion rapida de un producto (boton "Editar" de cada tarjeta). */
  onEditProduct?: (productId: string) => void
  /** El tema avisa sus colores originales: el editor los usa de referencia (y para saber si es oscuro). */
  onThemeInfo?: (colors: ThemeBaseColors) => void
}

export const LiveEditContext = createContext<LiveEditContextValue | null>(null)

export const LiveEditProvider = LiveEditContext.Provider

/** Contexto completo del editor, o null fuera de el. */
export function useLiveEditContext() {
  return useContext(LiveEditContext)
}

/** true dentro del editor en vivo. */
export function useLiveEdit() {
  return useContext(LiveEditContext) !== null
}
