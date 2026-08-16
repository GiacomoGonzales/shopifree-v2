import ThermalPrinterEncoder from 'thermal-printer-encoder'
import type { Order } from '../types'
import { groupModifierOptions } from './modifiers'

/**
 * Comanda de cocina en ESC/POS.
 *
 * Genera los bytes que entiende una impresora termica. A proposito NO sabe como
 * llegan a la impresora: eso es del transporte (Bluetooth, red). Separarlo tiene
 * dos ventajas: se puede probar sin tener una impresora delante, y el dia que
 * se agregue otra via no hay que tocar el formato.
 *
 * ── Que lleva y que no ──────────────────────────────────────────────────
 * Es la hoja que mira el cocinero, no un recibo: van los productos, las
 * cantidades y los modificadores, y NO van los precios. Un precio en la comanda
 * solo agrega ruido a quien tiene que armar el plato — y si el papel se cae en
 * el salon, tampoco es informacion que uno quiera suelta.
 *
 * ── Los dos anchos ──────────────────────────────────────────────────────
 * 58 mm son 32 caracteres por linea; 80 mm son 48. El encoder ya conoce esos
 * perfiles, pero los separadores y los recortes de texto se calculan con el
 * ancho para que nada se parta feo a mitad de palabra.
 *
 * ── Acentos ─────────────────────────────────────────────────────────────
 * Aca es donde estas impresoras suelen fallar: "Boloñesa" sale "Bolo?esa". Se
 * fija la pagina de codigos CP850, que cubre castellano, y el encoder hace la
 * conversion. Sin esto habria que sacar los acentos a mano, que es lo que
 * termina haciendo todo el mundo.
 */

export type AnchoPapel = 58 | 80

const COLUMNAS: Record<AnchoPapel, number> = { 58: 32, 80: 48 }

/** Corta sin partir palabras al medio; si una palabra no entra, la parte. */
function envolver(texto: string, ancho: number): string[] {
  const palabras = String(texto).split(/\s+/).filter(Boolean)
  const lineas: string[] = []
  let actual = ''
  for (const p of palabras) {
    if (p.length > ancho) {
      if (actual) { lineas.push(actual); actual = '' }
      for (let i = 0; i < p.length; i += ancho) lineas.push(p.slice(i, i + ancho))
      continue
    }
    if (!actual) actual = p
    else if (actual.length + 1 + p.length <= ancho) actual += ' ' + p
    else { lineas.push(actual); actual = p }
  }
  if (actual) lineas.push(actual)
  return lineas.length ? lineas : ['']
}

function hora(fecha: Date | undefined): string {
  const d = fecha ? new Date(fecha) : new Date()
  return d.toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit', hour12: false })
}

export interface OpcionesComanda {
  ancho?: AnchoPapel
  nombreTienda?: string
  /** Corte automatico de papel. Las mas baratas no lo traen y lo ignoran. */
  cortar?: boolean
}

/**
 * Devuelve los bytes ESC/POS de la comanda, listos para mandar a la impresora.
 */
export function generarComanda(order: Order, opciones: OpcionesComanda = {}): Uint8Array {
  const ancho = opciones.ancho ?? 58
  const cols = COLUMNAS[ancho]
  const linea = '-'.repeat(cols)

  const encoder = new ThermalPrinterEncoder({
    language: 'esc-pos',
    width: cols,
    codepageMapping: 'epson',
  })

  let e = encoder.initialize().codepage('cp850')

  // ── Encabezado ────────────────────────────────────────────────────────
  e = e.align('center').bold(true).size(2).line('COMANDA').size(1).bold(false)
  if (opciones.nombreTienda) e = e.line(opciones.nombreTienda)
  e = e.align('left').line(linea)

  // Numero de pedido grande: es el dato que se grita en la cocina.
  e = e.bold(true).size(2).line(order.orderNumber).size(1).bold(false)

  const entrega = order.deliveryMethod === 'pickup' ? 'RECOJO EN TIENDA' : 'DELIVERY'
  e = e.line(`${hora(order.createdAt)}  ${entrega}`)
  if (order.customer?.name) e = e.line(`Cliente: ${order.customer.name}`)
  e = e.line(linea)

  // ── Productos ─────────────────────────────────────────────────────────
  for (const item of order.items) {
    // "2x " ocupa lugar: el nombre se envuelve con el ancho restante y las
    // lineas siguientes se sangran, para que se lea como un bloque.
    const prefijo = `${item.quantity}x `
    const sangria = ' '.repeat(prefijo.length)
    const lineasNombre = envolver(item.productName, cols - prefijo.length)

    e = e.bold(true).line(prefijo + lineasNombre[0]).bold(false)
    for (const extra of lineasNombre.slice(1)) e = e.line(sangria + extra)

    // Modificadores agrupados: "2x Mayonesa" en vez de repetir la linea.
    const mods = item.selectedModifiers
    if (Array.isArray(mods)) {
      for (const grupo of mods) {
        for (const opt of groupModifierOptions(grupo.options)) {
          const texto = opt.qty > 1 ? `${opt.qty}x ${opt.name}` : opt.name
          for (const l of envolver('- ' + texto, cols - 2)) e = e.line('  ' + l)
        }
      }
    }

    // Variaciones (talla, color...). En comida casi no se usan, pero cuando
    // estan son parte de lo que hay que preparar.
    if (item.selectedVariations?.length) {
      const v = item.selectedVariations.map(x => `${x.name}: ${x.value}`).join(', ')
      for (const l of envolver('- ' + v, cols - 2)) e = e.line('  ' + l)
    }
  }

  // ── Nota general ──────────────────────────────────────────────────────
  if (order.notes) {
    e = e.line(linea).bold(true).line('NOTA DEL PEDIDO').bold(false)
    for (const l of envolver(order.notes, cols)) e = e.line(l)
  }

  // Avance antes del corte: sin esto, la ultima linea queda dentro del cabezal
  // y hay que tirar del papel para leerla.
  e = e.line(linea).newline().newline().newline()
  if (opciones.cortar !== false) e = e.cut()

  return e.encode()
}

/**
 * Vista previa en texto plano de la misma comanda.
 *
 * Sirve para dos cosas: mostrarle al comerciante como va a salir antes de
 * gastar papel, y poder verificar el formato en pruebas sin una impresora.
 */
export function previsualizarComanda(order: Order, opciones: OpcionesComanda = {}): string {
  const ancho = opciones.ancho ?? 58
  const cols = COLUMNAS[ancho]
  const linea = '-'.repeat(cols)
  const out: string[] = []
  const centrar = (t: string) => t.padStart(Math.floor((cols + t.length) / 2)).padEnd(cols)

  out.push(centrar('COMANDA'))
  if (opciones.nombreTienda) out.push(centrar(opciones.nombreTienda))
  out.push(linea, order.orderNumber)
  out.push(`${hora(order.createdAt)}  ${order.deliveryMethod === 'pickup' ? 'RECOJO EN TIENDA' : 'DELIVERY'}`)
  if (order.customer?.name) out.push(`Cliente: ${order.customer.name}`)
  out.push(linea)

  for (const item of order.items) {
    const prefijo = `${item.quantity}x `
    const sangria = ' '.repeat(prefijo.length)
    const ls = envolver(item.productName, cols - prefijo.length)
    out.push(prefijo + ls[0])
    ls.slice(1).forEach(l => out.push(sangria + l))

    const mods = item.selectedModifiers
    if (Array.isArray(mods)) {
      for (const grupo of mods) {
        for (const opt of groupModifierOptions(grupo.options)) {
          const texto = opt.qty > 1 ? `${opt.qty}x ${opt.name}` : opt.name
          envolver('- ' + texto, cols - 2).forEach(l => out.push('  ' + l))
        }
      }
    }
    if (item.selectedVariations?.length) {
      const v = item.selectedVariations.map(x => `${x.name}: ${x.value}`).join(', ')
      envolver('- ' + v, cols - 2).forEach(l => out.push('  ' + l))
    }
  }

  if (order.notes) {
    out.push(linea, 'NOTA DEL PEDIDO')
    envolver(order.notes, cols).forEach(l => out.push(l))
  }
  out.push(linea)
  return out.join('\n')
}
