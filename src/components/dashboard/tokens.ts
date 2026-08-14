/**
 * Tokens de estilo del dashboard.
 *
 * Una sola fuente para el aspecto de todas las pantallas del panel: tarjetas,
 * campos, etiquetas, interruptores y chips.
 * Antes cada archivo repetia sus propias cadenas de clases, asi que la misma
 * tarjeta tenia tres radios distintos y los inputs cuatro estilos de foco.
 *
 * ── Criterio del ajuste de densidad (08/2026) ────────────────────────────
 * La version anterior se sentia inflada: radios de 14px, padding de 20px,
 * campos con relleno Y borde a la vez, y una separacion generosa entre cada
 * cosa. Todo junto da ese aire de plantilla generica donde cada seccion pesa
 * lo mismo y nada guia la vista.
 *
 * Lo que cambio y por que:
 *  - Radios mas chicos (14→10 en tarjetas, 12→8 en campos). El radio grande
 *    lee como "amigable"; el chico lee como herramienta.
 *  - Menos padding y menos aire entre etiqueta y campo. Se gana densidad sin
 *    achicar el area clickeable, que sigue arriba de 34px de alto.
 *  - Bordes mas claros. El borde deja de competir con el contenido.
 *  - Tipografia un punto mas chica en titulos y etiquetas, pero NO en los
 *    valores que el usuario escribe: esos se mantienen legibles.
 *
 * Todo vive en este archivo: revertirlo es volver este commit.
 */

export const CARD = 'bg-white rounded-[10px] border border-[#EAF0F6] p-3.5 sm:p-4'

/** Titulo de seccion. Compacto y firme, sin llegar a grito. */
export const SECTION_TITLE = 'text-[0.82rem] font-semibold text-[#1e3a5f] tracking-[-0.01em]'
export const SECTION_HINT = 'text-[0.72rem] font-normal text-[#8898AA] mt-0.5 leading-snug'

/** Etiqueta de campo: chica y pegada a su input, para que se lean como una unidad. */
export const LABEL = 'block text-[0.7rem] font-medium text-[#8898AA] mb-1'

/**
 * Base de los campos, sin ancho ni padding: se componen abajo.
 *
 * El relleno es apenas mas claro que antes y el borde tambien: juntos marcan
 * el campo sin encerrarlo. Al enfocar pasa a blanco, que da la sensacion de
 * "se abrio" sin necesidad de un halo grueso.
 */
export const FIELD =
  'rounded-lg bg-[#F8FAFC] border border-[#E7EDF3] font-medium text-[#1e3a5f] ' +
  'placeholder:text-[#AFBBC8] placeholder:font-normal transition-colors focus:outline-none ' +
  'focus:bg-white focus:border-[#38bdf8] focus:ring-2 focus:ring-[#38bdf8]/12'

export const INPUT = `w-full ${FIELD} px-3 py-2 text-[0.82rem]`
export const INPUT_SM = `w-full ${FIELD} px-2.5 py-1.5 text-[0.78rem]`
export const INPUT_XS = `w-full ${FIELD} px-2 py-1 text-[0.72rem]`

/** Interruptor: navy solido, sin degradado. */
export const TOGGLE =
  "w-10 h-[22px] bg-[#E1E8EF] rounded-full peer peer-focus:ring-2 peer-focus:ring-[#38bdf8]/40 " +
  "peer-checked:bg-[#1e3a5f] after:content-[''] after:absolute after:top-[3px] after:left-[3px] " +
  "after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all " +
  "peer-checked:after:translate-x-full transition-colors"

/** Nota informativa (limite alcanzado, upsell a Pro). */
export const NOTE = 'rounded-lg p-3 bg-[#F0F9FF]'
export const NOTE_BORDER = { border: '1px solid #BAE6FD' }

/** Chip seleccionable (presets de garantia, tipos de mascota, etc). */
export const chipClass = (active: boolean) =>
  `px-2.5 py-1 rounded-md text-[0.72rem] font-semibold border transition-colors ${
    active
      ? 'bg-[#1e3a5f] border-[#1e3a5f] text-white'
      : 'bg-white border-[#E7EDF3] text-[#425466] hover:bg-[#F8FAFC]'
  }`

/** Boton de quitar: solo texto, sin icono. */
export const REMOVE_BTN = 'text-[0.74rem] font-medium text-[#A9B6C6] hover:text-[#DC2626] transition-colors'
