export type TrustBadgeId = 'shipping' | 'secure' | 'returns' | 'quality' | 'support' | 'freeShipping'

const trustBadgeTexts: Record<string, Record<TrustBadgeId, string>> = {
  es: {
    shipping: 'Envio rapido',
    secure: 'Pago seguro',
    returns: 'Devoluciones faciles',
    quality: 'Calidad garantizada',
    support: 'Atencion al cliente',
    freeShipping: 'Envio gratis',
  },
  en: {
    shipping: 'Fast shipping',
    secure: 'Secure payment',
    returns: 'Easy returns',
    quality: 'Quality guaranteed',
    support: 'Customer support',
    freeShipping: 'Free shipping',
  },
  pt: {
    shipping: 'Envio rapido',
    secure: 'Pagamento seguro',
    returns: 'Devolucoes faceis',
    quality: 'Qualidade garantida',
    support: 'Atendimento ao cliente',
    freeShipping: 'Frete gratis',
  },
}

export function getTrustBadgeText(badgeId: TrustBadgeId, language: string): string {
  const lang = trustBadgeTexts[language] ? language : 'es'
  return trustBadgeTexts[lang][badgeId]
}

export const ALL_BADGE_IDS: TrustBadgeId[] = ['shipping', 'secure', 'returns', 'quality', 'support', 'freeShipping']
