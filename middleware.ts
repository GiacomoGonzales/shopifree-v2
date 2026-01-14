import { next } from '@vercel/edge'

// Social media and crawler user agents
const CRAWLER_USER_AGENTS = [
  'facebookexternalhit',
  'Facebot',
  'Twitterbot',
  'WhatsApp',
  'LinkedInBot',
  'Pinterest',
  'Slackbot',
  'TelegramBot',
  'Discordbot',
]

// Main domains (not store domains)
const MAIN_DOMAINS = [
  'localhost',
  '127.0.0.1',
  'shopifree.app',
  'www.shopifree.app',
  'shopifree-v2.vercel.app',
]

export default async function middleware(request: Request) {
  const userAgent = request.headers.get('user-agent') || ''
  const url = new URL(request.url)
  const hostname = url.hostname
  const pathname = url.pathname

  // Skip API routes and static files
  if (pathname.startsWith('/api/') || pathname.startsWith('/_next/') || pathname.match(/\.(js|css|png|jpg|jpeg|gif|svg|ico|webp|woff|woff2)$/)) {
    return next()
  }

  // Check if this is a crawler
  const isCrawler = CRAWLER_USER_AGENTS.some(crawler =>
    userAgent.toLowerCase().includes(crawler.toLowerCase())
  )

  if (!isCrawler) {
    return next()
  }

  // Determine if we're on a store subdomain or custom domain
  let subdomain: string | null = null
  let customDomain: string | null = null

  const matchedMainDomain = MAIN_DOMAINS.find(domain =>
    hostname.endsWith(`.${domain}`)
  )

  if (matchedMainDomain) {
    subdomain = hostname.replace(`.${matchedMainDomain}`, '')
    if (subdomain === 'www') {
      subdomain = null
    }
  } else if (!MAIN_DOMAINS.includes(hostname) && !hostname.endsWith('.vercel.app')) {
    customDomain = hostname.startsWith('www.') ? hostname.slice(4) : hostname
  }

  // Check for /c/:storeSlug pattern
  const catalogMatch = pathname.match(/^\/c\/([^/]+)/)
  if (catalogMatch) {
    subdomain = catalogMatch[1]
  }

  // If store detected, fetch OG data from API
  if (subdomain || customDomain) {
    const ogUrl = new URL('/api/og-image', url.origin)
    if (subdomain) {
      ogUrl.searchParams.set('subdomain', subdomain)
    }
    if (customDomain) {
      ogUrl.searchParams.set('domain', customDomain)
    }

    try {
      const response = await fetch(ogUrl.toString())
      if (response.ok) {
        return new Response(await response.text(), {
          headers: {
            'Content-Type': 'text/html; charset=utf-8',
            'Cache-Control': 's-maxage=3600, stale-while-revalidate',
          },
        })
      }
    } catch (error) {
      console.error('Error fetching OG data:', error)
    }
  }

  return next()
}

export const config = {
  matcher: [
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ],
}
