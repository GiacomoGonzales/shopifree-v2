/**
 * Capture phone-shape screenshots of a store's public storefront and upload
 * them to Firebase Storage so they're ready to drop into the Play Store
 * "Capturas de pantalla de teléfono" field.
 *
 * Loads `https://<subdomain>.shopifree.app` in a 1080×2400 viewport (16:9
 * vertical, comfortably above Play's 1080-px-per-side promotion threshold)
 * and snapshots a small set of representative views. Each step is wrapped
 * so a failure on one screenshot doesn't kill the whole run — partial
 * coverage is more useful than no coverage at all.
 *
 * Env: STORE_ID, RUN_URL, FIREBASE_* service account, FIREBASE_STORAGE_BUCKET.
 */

import { chromium, type Browser, type Page } from 'playwright'
import { FieldValue } from 'firebase-admin/firestore'
import { getDb, getBucket } from './firebase-admin'

const VIEWPORT = { width: 1080, height: 2400 }
const NAV_TIMEOUT = 45_000
const SETTLE_MS = 2_500    // Let lazy-loaded images + theme animations finish
const SIGNED_URL_DAYS = 30 // Operator may revisit a Play Console draft

interface Shot {
  filename: string
  description: string
  setup: (page: Page, baseUrl: string) => Promise<void>
}

const SHOTS: Shot[] = [
  {
    filename: '01-home-top.png',
    description: 'Home — hero + categories visible',
    setup: async (page, baseUrl) => {
      await page.goto(baseUrl, { waitUntil: 'networkidle', timeout: NAV_TIMEOUT })
      await page.waitForTimeout(SETTLE_MS)
      await page.evaluate(() => window.scrollTo(0, 0))
    },
  },
  {
    filename: '02-home-products.png',
    description: 'Home — products grid scrolled into view',
    setup: async (page) => {
      await page.evaluate(() => window.scrollBy(0, window.innerHeight))
      await page.waitForTimeout(1500)
    },
  },
  {
    filename: '03-product-detail.png',
    description: 'First product detail page',
    setup: async (page, baseUrl) => {
      await page.goto(baseUrl, { waitUntil: 'networkidle', timeout: NAV_TIMEOUT })
      await page.waitForTimeout(SETTLE_MS)
      const productLink = page.locator('a[href*="/p/"]').first()
      const count = await productLink.count()
      if (count === 0) throw new Error('No product link found on home')
      await productLink.click()
      await page.waitForLoadState('networkidle', { timeout: NAV_TIMEOUT })
      await page.waitForTimeout(SETTLE_MS)
    },
  },
  {
    filename: '04-home-footer.png',
    description: 'Home — bottom of page (footer + contact)',
    setup: async (page, baseUrl) => {
      await page.goto(baseUrl, { waitUntil: 'networkidle', timeout: NAV_TIMEOUT })
      await page.waitForTimeout(SETTLE_MS)
      await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight))
      await page.waitForTimeout(1500)
    },
  },
]

async function uploadScreenshot(
  storeId: string,
  filename: string,
  buffer: Buffer,
): Promise<string> {
  const bucket = getBucket()
  const remotePath = `stores/${storeId}/screenshots/${filename}`
  const file = bucket.file(remotePath)
  await file.save(buffer, {
    contentType: 'image/png',
    metadata: {
      cacheControl: 'public, max-age=86400',
      metadata: { storeId },
    },
  })
  const [url] = await file.getSignedUrl({
    action: 'read',
    expires: Date.now() + SIGNED_URL_DAYS * 24 * 60 * 60 * 1000,
  })
  return url
}

async function captureOne(
  browser: Browser,
  storeId: string,
  baseUrl: string,
  shot: Shot,
): Promise<string> {
  const context = await browser.newContext({
    viewport: VIEWPORT,
    deviceScaleFactor: 1,
    isMobile: true,
    hasTouch: true,
    userAgent:
      'Mozilla/5.0 (Linux; Android 13; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36',
  })
  try {
    const page = await context.newPage()
    await shot.setup(page, baseUrl)
    const buffer = await page.screenshot({ fullPage: false, type: 'png' })
    return await uploadScreenshot(storeId, shot.filename, buffer)
  } finally {
    await context.close()
  }
}

async function main() {
  const storeId = process.env.STORE_ID
  if (!storeId) throw new Error('STORE_ID env var required')

  const db = getDb()
  const storeSnap = await db.collection('stores').doc(storeId).get()
  if (!storeSnap.exists) throw new Error(`Store ${storeId} not found`)
  const store = storeSnap.data() as { subdomain?: string; customDomain?: string }
  const subdomain = store.subdomain
  if (!subdomain) throw new Error('Store has no subdomain')

  // Prefer subdomain over customDomain — the *.shopifree.app surface is
  // guaranteed to be reachable from the GitHub-hosted runner; a custom
  // domain might be DNS-misconfigured or behind a redirect we don't control.
  const baseUrl = `https://${subdomain}.shopifree.app`
  console.log(`Capturing screenshots from ${baseUrl}`)

  const browser = await chromium.launch({ args: ['--no-sandbox'] })
  const captured: string[] = []
  const failures: { shot: string; error: string }[] = []

  try {
    for (const shot of SHOTS) {
      try {
        console.log(`→ ${shot.description}`)
        const url = await captureOne(browser, storeId, baseUrl, shot)
        captured.push(url)
        console.log(`  ✓ ${shot.filename}`)
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err)
        failures.push({ shot: shot.filename, error: msg })
        console.error(`  ✗ ${shot.filename}: ${msg}`)
      }
    }
  } finally {
    await browser.close()
  }

  if (captured.length === 0) {
    throw new Error(
      `All screenshots failed. First error: ${failures[0]?.error || 'unknown'}`,
    )
  }

  await db.collection('stores').doc(storeId).update({
    'appConfig.screenshots.status': 'success',
    'appConfig.screenshots.urls': captured,
    'appConfig.screenshots.generatedAt': FieldValue.serverTimestamp(),
    'appConfig.screenshots.lastError':
      failures.length > 0
        ? `Partial: ${failures.length} of ${SHOTS.length} shot(s) failed — ${failures
            .map(f => f.shot)
            .join(', ')}`
        : FieldValue.delete(),
    'appConfig.screenshots.runUrl': process.env.RUN_URL || FieldValue.delete(),
  })

  console.log(`\nDone. ${captured.length}/${SHOTS.length} screenshots uploaded.`)
}

main().catch(async err => {
  console.error(err)
  const storeId = process.env.STORE_ID
  if (storeId) {
    try {
      await getDb().collection('stores').doc(storeId).update({
        'appConfig.screenshots.status': 'failed',
        'appConfig.screenshots.lastError':
          err instanceof Error ? err.message : String(err),
        'appConfig.screenshots.runUrl':
          process.env.RUN_URL || FieldValue.delete(),
      })
    } catch (updateErr) {
      console.error('Failed to write failure status to Firestore:', updateErr)
    }
  }
  process.exit(1)
})
