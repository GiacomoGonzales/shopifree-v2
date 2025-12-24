// Currency formatting utility

const currencySymbols: Record<string, string> = {
  USD: '$',
  EUR: '€',
  MXN: '$',
  COP: '$',
  PEN: 'S/',
  ARS: '$',
  CLP: '$',
  BRL: 'R$',
  VES: 'Bs.',
  UYU: '$U',
  BOB: 'Bs',
  PYG: '₲',
  GTQ: 'Q',
  HNL: 'L',
  NIO: 'C$',
  CRC: '₡',
  PAB: 'B/.',
  DOP: 'RD$'
}

const currencyLocales: Record<string, string> = {
  USD: 'en-US',
  EUR: 'es-ES',
  MXN: 'es-MX',
  COP: 'es-CO',
  PEN: 'es-PE',
  ARS: 'es-AR',
  CLP: 'es-CL',
  BRL: 'pt-BR',
  VES: 'es-VE',
  UYU: 'es-UY',
  BOB: 'es-BO',
  PYG: 'es-PY',
  GTQ: 'es-GT',
  HNL: 'es-HN',
  NIO: 'es-NI',
  CRC: 'es-CR',
  PAB: 'es-PA',
  DOP: 'es-DO'
}

export function formatPrice(price: number, currency: string = 'USD'): string {
  const symbol = currencySymbols[currency] || '$'
  const locale = currencyLocales[currency] || 'en-US'

  try {
    const formatted = new Intl.NumberFormat(locale, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(price)

    return `${symbol}${formatted}`
  } catch {
    return `${symbol}${price.toFixed(2)}`
  }
}

export function getCurrencySymbol(currency: string): string {
  return currencySymbols[currency] || '$'
}
