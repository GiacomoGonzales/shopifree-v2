export type TrustBadgeId = 'shipping' | 'secure' | 'returns' | 'quality' | 'support' | 'freeShipping' | 'natural' | 'madeWithLove'

const trustBadgeTexts: Record<string, Record<TrustBadgeId, string>> = {
  es: {
    shipping: 'Envio rapido',
    secure: 'Pago seguro',
    returns: 'Devoluciones faciles',
    quality: 'Calidad garantizada',
    support: 'Atencion al cliente',
    freeShipping: 'Envio gratis',
    natural: '100% Natural',
    madeWithLove: 'Hecho con amor',
  },
  en: {
    shipping: 'Fast shipping',
    secure: 'Secure payment',
    returns: 'Easy returns',
    quality: 'Quality guaranteed',
    support: 'Customer support',
    freeShipping: 'Free shipping',
    natural: '100% Natural',
    madeWithLove: 'Made with love',
  },
  pt: {
    shipping: 'Envio rapido',
    secure: 'Pagamento seguro',
    returns: 'Devolucoes faceis',
    quality: 'Qualidade garantida',
    support: 'Atendimento ao cliente',
    freeShipping: 'Frete gratis',
    natural: '100% Natural',
    madeWithLove: 'Feito com amor',
  },
}

export function getTrustBadgeText(badgeId: TrustBadgeId, language: string): string {
  const lang = trustBadgeTexts[language] ? language : 'es'
  return trustBadgeTexts[lang][badgeId]
}

export const ALL_BADGE_IDS: TrustBadgeId[] = ['shipping', 'secure', 'returns', 'quality', 'support', 'freeShipping', 'natural', 'madeWithLove']
