/**
 * Tipos para `thermal-printer-encoder`, que se publica sin declaraciones.
 *
 * Se declara solo lo que usa la comanda, no la API completa: un tipo inventado
 * de mas es peor que uno faltante, porque miente sobre lo que el paquete
 * garantiza. Si mas adelante hace falta otro metodo, se agrega aca.
 *
 * Todos los metodos de formato devuelven el mismo encoder para poder encadenar;
 * `encode()` cierra la cadena y entrega los bytes.
 */
declare module 'thermal-printer-encoder' {
  interface EncoderOptions {
    language?: 'esc-pos' | 'star-prnt' | 'star-line'
    width?: number
    codepageMapping?: string
    imageMode?: string
  }

  export default class ThermalPrinterEncoder {
    constructor(options?: EncoderOptions)
    initialize(): this
    codepage(name: string): this
    text(value: string): this
    line(value: string): this
    newline(): this
    align(value: 'left' | 'center' | 'right'): this
    bold(value?: boolean): this
    underline(value?: boolean): this
    invert(value?: boolean): this
    /** 1 = normal, 2 = doble alto y ancho. */
    size(value: number): this
    cut(value?: 'full' | 'partial'): this
    raw(data: number[] | Uint8Array): this
    encode(): Uint8Array
  }
}
