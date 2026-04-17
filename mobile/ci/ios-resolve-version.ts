/**
 * Resolves the iOS build number (CFBundleVersion) for this build.
 * - If INPUT_BUILD_NUMBER is set, uses it.
 * - Else reads appConfig.buildIos.buildNumber from Firestore and increments by 1.
 */
import { appendFileSync } from 'fs'
import { getDb } from './firebase-admin'

async function main() {
  const storeId = process.env.STORE_ID
  if (!storeId) throw new Error('STORE_ID env var required')

  let buildNumber: number

  const input = process.env.INPUT_BUILD_NUMBER
  if (input && /^\d+$/.test(input)) {
    buildNumber = parseInt(input, 10)
  } else {
    const snap = await getDb().collection('stores').doc(storeId).get()
    if (!snap.exists) throw new Error(`Store ${storeId} not found`)
    const data = snap.data() as { appConfig?: { buildIos?: { buildNumber?: number } } }
    const last = data?.appConfig?.buildIos?.buildNumber || 0
    buildNumber = last + 1
  }

  console.log(`Resolved iOS buildNumber: ${buildNumber}`)

  const out = process.env.GITHUB_OUTPUT
  if (out) {
    appendFileSync(out, `buildNumber=${buildNumber}\n`)
  }
}

main().catch(err => {
  console.error(err)
  process.exit(1)
})
