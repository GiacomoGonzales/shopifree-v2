/**
 * Utilidades para mostrar modificadores seleccionados.
 *
 * Con los grupos multiopción (allowRepeat) la misma opción puede aparecer
 * VARIAS veces en la selección — así "2x mayonesa" no necesitó cambiar el
 * modelo ni los cálculos: conteos y sumas ya recorren la lista completa.
 * Lo único que quedaba feo eran las pantallas, que mostraban
 * "Mayonesa, Mayonesa". Estas funciones agrupan para presentación.
 */

interface PickedOption {
  id?: string
  name: string
  price: number
}

export interface GroupedOption {
  name: string
  price: number
  qty: number
}

/** Agrupa opciones repetidas: [mayo, mayo, rocoto] → [{mayo, qty:2}, {rocoto, qty:1}] */
export function groupModifierOptions(options: PickedOption[]): GroupedOption[] {
  const byKey = new Map<string, GroupedOption>()
  for (const opt of options) {
    const key = opt.id ?? opt.name
    const prev = byKey.get(key)
    if (prev) prev.qty++
    else byKey.set(key, { name: opt.name, price: opt.price, qty: 1 })
  }
  return [...byKey.values()]
}

/** "2x Mayonesa, Rocoto Cream" — para las líneas compactas de carrito/pedido. */
export function formatModifierNames(mods: Array<{ options: PickedOption[] }>): string {
  return mods
    .flatMap(m => groupModifierOptions(m.options))
    .map(g => (g.qty > 1 ? `${g.qty}x ${g.name}` : g.name))
    .join(', ')
}
