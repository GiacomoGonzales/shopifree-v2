import { next } from '@vercel/edge'

// Social media and crawler user agents
const SOCIAL_CRAWLER_USER_AGENTS = [
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

// Search engine bots
const SEARCH_ENGINE_BOTS = [
  'Googlebot',
  'Bingbot',
  'YandexBot',
  'DuckDuckBot',
  'Baiduspider',
]

// All crawler user agents
const CRAWLER_USER_AGENTS = [...SOCIAL_CRAWLER_USER_AGENTS, ...SEARCH_ENGINE_BOTS]

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

  // If no store detected, pass through
  if (!subdomain && !customDomain) {
    return next()
  }

  // Intercept /sitemap.xml → rewrite to API
  if (pathname === '/sitemap.xml') {
    const sitemapUrl = new URL('/api/sitemap', url.origin)
    if (subdomain) sitemapUrl.searchParams.set('subdomain', subdomain)
    if (customDomain) sitemapUrl.searchParams.set('domain', customDomain)
    return fetch(sitemapUrl.toString())
  }

  // Intercept /robots.txt → rewrite to API
  if (pathname === '/robots.txt') {
    const robotsUrl = new URL('/api/robots', url.origin)
    if (subdomain) robotsUrl.searchParams.set('subdomain', subdomain)
    if (customDomain) robotsUrl.searchParams.set('domain', customDomain)
    return fetch(robotsUrl.toString())
  }

  // Check if this is a crawler
  const isCrawler = CRAWLER_USER_AGENTS.some(crawler =>
    userAgent.toLowerCase().includes(crawler.toLowerCase())
  )

  if (!isCrawler) {
    return next()
  }

  // Detect product URL: /p/:productSlug
  const productMatch = pathname.match(/^\/p\/([^/]+)/)
  // Also match /c/:storeSlug/p/:productSlug
  const catalogProductMatch = pathname.match(/^\/c\/[^/]+\/p\/([^/]+)/)
  const productSlug = catalogProductMatch?.[1] || productMatch?.[1] || null

  // Determine if this is a social bot (needs meta-refresh) vs search bot (no redirect)
  const isSearchBot = SEARCH_ENGINE_BOTS.some(bot =>
    userAgent.toLowerCase().includes(bot.toLowerCase())
  )

  // Fetch prerendered HTML from API
  const ogUrl = new URL('/api/og-image', url.origin)
  if (subdomain) ogUrl.searchParams.set('subdomain', subdomain)
  if (customDomain) ogUrl.searchParams.set('domain', customDomain)
  if (productSlug) ogUrl.searchParams.set('product', productSlug)
  if (isSearchBot) ogUrl.searchParams.set('bot', 'search')

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

  return next()
}

export const config = {
  matcher: [
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ],
}
