/**
 * Celulares para la vista previa del editor en vivo. `width` y `height` son
 * el tamano de la pantalla en pixeles CSS (lo que ve la pagina), que es lo que
 * decide como se acomoda la tienda. El marco solo es la carcasa alrededor.
 */
export type DeviceShape =
  | 'island'   // iPhone con Dynamic Island
  | 'homeButton' // iPhone SE: bordes gruesos y boton de inicio
  | 'punchHole' // Android con camara perforada

export interface Device {
  id: string
  label: string
  width: number
  height: number
  shape: DeviceShape
  /** Radio de las esquinas de la pantalla. */
  radius: number
}

export const DEVICES: Device[] = [
  { id: 'iphone-16', label: 'iPhone 16', width: 393, height: 852, shape: 'island', radius: 55 },
  { id: 'iphone-16-pro-max', label: 'iPhone 16 Pro Max', width: 440, height: 956, shape: 'island', radius: 62 },
  { id: 'iphone-se', label: 'iPhone SE', width: 375, height: 667, shape: 'homeButton', radius: 0 },
  { id: 'galaxy-s24', label: 'Samsung Galaxy S24', width: 360, height: 780, shape: 'punchHole', radius: 32 },
  { id: 'galaxy-a55', label: 'Samsung Galaxy A55', width: 384, height: 832, shape: 'punchHole', radius: 30 },
  { id: 'redmi-note-13', label: 'Xiaomi Redmi Note 13', width: 393, height: 873, shape: 'punchHole', radius: 34 },
  { id: 'redmi-15c', label: 'Xiaomi Redmi 15C', width: 360, height: 800, shape: 'punchHole', radius: 28 },
  { id: 'moto-g', label: 'Motorola Moto G', width: 412, height: 915, shape: 'punchHole', radius: 30 },
]

export const DEFAULT_DEVICE = DEVICES[0]

/** Alto de la barra de estado y de la zona del gesto de inicio (las ocupa el sistema, no la pagina). */
export function systemInsets(shape: DeviceShape) {
  if (shape === 'island') return { top: 54, bottom: 34 }
  if (shape === 'homeButton') return { top: 20, bottom: 0 }
  return { top: 32, bottom: 18 }
}

/** Grosor de la carcasa alrededor de la pantalla. */
export function bezel(shape: DeviceShape) {
  if (shape === 'homeButton') return { side: 16, top: 72, bottom: 72 }
  if (shape === 'island') return { side: 12, top: 12, bottom: 12 }
  return { side: 9, top: 9, bottom: 9 }
}
