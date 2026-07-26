/**
 * Tokens de estilo del formulario de producto.
 *
 * Una sola fuente para el aspecto de /dashboard/products/new y de todas las
 * secciones que se montan dentro (variantes, modificadores, especificaciones...).
 * Antes cada archivo repetia sus propias cadenas de clases, asi que la misma
 * tarjeta tenia tres radios distintos y los inputs cuatro estilos de foco.
 *
 * Mismos valores que el Inicio y el listado de Productos: borde de 1px en
 * #E6EBF1, radio de 14px y nada por encima de semibold.
 */

export const CARD = 'bg-white rounded-[14px] border border-[#E6EBF1] p-4 sm:p-5'
export const SECTION_TITLE = 'text-[0.9rem] font-semibold text-[#1e3a5f]'
export const SECTION_HINT = 'text-[0.78rem] font-normal text-[#8898AA] mt-0.5'
export const LABEL = 'block text-[0.74rem] font-medium text-[#8898AA] mb-1.5'

/** Base de los campos, sin ancho ni padding: se componen abajo. */
export const FIELD =
  'rounded-xl bg-[#F6F9FC] border border-[#E6EBF1] font-medium text-[#1e3a5f] ' +
  'placeholder:text-[#A9B6C6] placeholder:font-normal transition-colors focus:outline-none ' +
  'focus:bg-white focus:border-[#38bdf8] focus:ring-2 focus:ring-[#38bdf8]/15'

export const INPUT = `w-full ${FIELD} px-3.5 py-2.5 text-[0.84rem]`
export const INPUT_SM = `w-full ${FIELD} px-3 py-2 text-[0.8rem]`
export const INPUT_XS = `w-full ${FIELD} px-2 py-1.5 text-[0.74rem]`

/** Interruptor: navy solido, sin degradado. */
export const TOGGLE =
  "w-10 h-[22px] bg-[#E1E8EF] rounded-full peer peer-focus:ring-2 peer-focus:ring-[#38bdf8]/40 " +
  "peer-checked:bg-[#1e3a5f] after:content-[''] after:absolute after:top-[3px] after:left-[3px] " +
  "after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all " +
  "peer-checked:after:translate-x-full transition-colors"

/** Nota informativa (limite alcanzado, upsell a Pro). */
export const NOTE = 'rounded-xl p-3.5 bg-[#F0F9FF]'
export const NOTE_BORDER = { border: '1px solid #BAE6FD' }

/** Chip seleccionable (presets de garantia, tipos de mascota, etc). */
export const chipClass = (active: boolean) =>
  `px-3 py-1.5 rounded-lg text-[0.74rem] font-semibold border transition-colors ${
    active
      ? 'bg-[#1e3a5f] border-[#1e3a5f] text-white'
      : 'bg-white border-[#E6EBF1] text-[#425466] hover:bg-[#F6F9FC]'
  }`

/** Boton de quitar: solo texto, sin icono. */
export const REMOVE_BTN = 'text-[0.76rem] font-medium text-[#A9B6C6] hover:text-[#DC2626] transition-colors'
