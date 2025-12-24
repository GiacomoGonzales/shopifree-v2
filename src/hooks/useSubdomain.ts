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

    // Check if we're on localhost or main domain
    if (MAIN_DOMAINS.some(domain => hostname === domain || hostname.endsWith(`.${domain}`))) {
      // Check for subdomain on main domains
      const parts = hostname.split('.')

      // localhost:3000 or shopifree.app
      if (parts.length <= 2 || hostname === 'localhost') {
        return { subdomain: null, isSubdomain: false, mainDomain: hostname }
      }

      // Check if it's www or a store subdomain
      const potentialSubdomain = parts[0]
      if (potentialSubdomain === 'www') {
        return { subdomain: null, isSubdomain: false, mainDomain: hostname }
      }

      // It's a store subdomain like mitienda.shopifree.app
      return {
        subdomain: potentialSubdomain,
        isSubdomain: true,
        mainDomain: parts.slice(1).join('.')
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
