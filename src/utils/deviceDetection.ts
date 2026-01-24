/**
 * Device detection utilities for analytics
 */

export function getDeviceType(): 'mobile' | 'desktop' {
  // Check if window is available (SSR safety)
  if (typeof window === 'undefined') return 'desktop'

  // Use multiple detection methods for accuracy
  const userAgent = navigator.userAgent.toLowerCase()
  const isMobileUA = /android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini|mobile/i.test(userAgent)

  // Also check screen width as a fallback
  const isMobileScreen = window.innerWidth < 768

  // Check for touch capability
  const hasTouch = 'ontouchstart' in window || navigator.maxTouchPoints > 0

  // If mobile user agent or (small screen + touch), consider mobile
  if (isMobileUA || (isMobileScreen && hasTouch)) {
    return 'mobile'
  }

  return 'desktop'
}

export function getReferrer(): string {
  if (typeof document === 'undefined') return 'direct'

  const referrer = document.referrer

  if (!referrer) return 'direct'

  try {
    const url = new URL(referrer)
    const hostname = url.hostname.toLowerCase()

    // Categorize common referrers
    if (hostname.includes('google')) return 'google'
    if (hostname.includes('facebook') || hostname.includes('fb.com')) return 'facebook'
    if (hostname.includes('instagram')) return 'instagram'
    if (hostname.includes('twitter') || hostname.includes('t.co') || hostname.includes('x.com')) return 'twitter'
    if (hostname.includes('whatsapp') || hostname.includes('wa.me')) return 'whatsapp'
    if (hostname.includes('tiktok')) return 'tiktok'
    if (hostname.includes('linkedin')) return 'linkedin'
    if (hostname.includes('pinterest')) return 'pinterest'
    if (hostname.includes('youtube')) return 'youtube'

    // Return the hostname for other referrers
    return hostname
  } catch {
    return 'unknown'
  }
}
