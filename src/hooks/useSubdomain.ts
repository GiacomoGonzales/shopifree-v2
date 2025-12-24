import { useMemo } from 'react'

// Main domains where the app is hosted (no subdomain routing)
const MAIN_DOMAINS = [
  'localhost',
  '127.0.0.1',
  'shopifree.app',
  'www.shopifree.app',
  'shopifree-v2.vercel.app'
]

interface SubdomainInfo {
  subdomain: string | null
  isSubdomain: boolean
  mainDomain: string
}

export function useSubdomain(): SubdomainInfo {
  return useMemo(() => {
    const hostname = window.location.hostname

    // If hostname exactly matches a main domain, no subdomain
    if (MAIN_DOMAINS.includes(hostname)) {
      return { subdomain: null, isSubdomain: false, mainDomain: hostname }
    }

    // Check if we're on a subdomain of a main domain
    const matchedMainDomain = MAIN_DOMAINS.find(domain =>
      hostname.endsWith(`.${domain}`)
    )

    if (matchedMainDomain) {
      // Extract subdomain
      const subdomain = hostname.replace(`.${matchedMainDomain}`, '')

      // Skip www
      if (subdomain === 'www') {
        return { subdomain: null, isSubdomain: false, mainDomain: hostname }
      }

      // It's a store subdomain like mitienda.shopifree.app
      return {
        subdomain,
        isSubdomain: true,
        mainDomain: matchedMainDomain
      }
    }

    // For Vercel preview URLs (*.vercel.app)
    if (hostname.endsWith('.vercel.app')) {
      const parts = hostname.split('.')
      // project-name.vercel.app (no subdomain)
      if (parts.length === 3) {
        return { subdomain: null, isSubdomain: false, mainDomain: hostname }
      }
      // subdomain.project-name.vercel.app
      if (parts.length === 4) {
        return {
          subdomain: parts[0],
          isSubdomain: true,
          mainDomain: parts.slice(1).join('.')
        }
      }
    }

    return { subdomain: null, isSubdomain: false, mainDomain: hostname }
  }, [])
}

export function getSubdomainFromHostname(hostname: string): string | null {
  // Check for subdomain on shopifree.app
  if (hostname.endsWith('.shopifree.app') && hostname !== 'www.shopifree.app') {
    const subdomain = hostname.replace('.shopifree.app', '')
    if (subdomain && subdomain !== 'www') {
      return subdomain
    }
  }

  // Check for subdomain on vercel.app preview
  if (hostname.endsWith('.vercel.app')) {
    const parts = hostname.split('.')
    if (parts.length === 4) {
      return parts[0]
    }
  }

  return null
}
