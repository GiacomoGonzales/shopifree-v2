/**
 * PayPal-supported currencies. Pure data + a tiny helper, no server deps,
 * so both the API routes (api/create-paypal-order.ts) and the dashboard UI
 * (PayPalConnect.tsx) can import the same source of truth.
 *
 * Source: https://developer.paypal.com/docs/integration/direct/rest/currency-codes/
 *
 * Notable LatAm absences (auto-converted to USD by our backend):
 * PEN, COP, ARS, CLP, BOB, UYU, GTQ, CRC, DOP, HNL, NIO, PYG, VES, etc.
 * Notable LatAm supported: MXN, BRL.
 */
export const PAYPAL_SUPPORTED_CURRENCIES: ReadonlySet<string> = new Set([
  'AUD', 'BRL', 'CAD', 'CNY', 'CZK', 'DKK', 'EUR', 'HKD', 'HUF', 'ILS',
  'JPY', 'MYR', 'MXN', 'TWD', 'NZD', 'NOK', 'PHP', 'PLN', 'GBP', 'RUB',
  'SGD', 'SEK', 'CHF', 'THB', 'USD',
])

export function isPayPalSupportedCurrency(code: string): boolean {
  return PAYPAL_SUPPORTED_CURRENCIES.has(code.toUpperCase())
}
