/**
 * Resolves the Android versionCode for this build.
 * - If INPUT_BUILD_NUMBER is set, uses it.
 * - Else reads appConfig.build.buildNumber from Firestore and increments by 1.
 * - Writes the result to $GITHUB_OUTPUT as `versionCode`.
 *
 * Env: STORE_ID, INPUT_BUILD_NUMBER (optional), FIREBASE_* service account.
 */
import { appendFileSync } from 'fs'
import { getDb } from './firebase-admin'

async function main() {
  const storeId = process.env.STORE_ID
  if (!storeId) throw new Error('STORE_ID env var required')

  let versionCode: number

  const input = process.env.INPUT_BUILD_NUMBER
  if (input && /^\d+$/.test(input)) {
    versionCode = parseInt(input, 10)
  } else {
    const snap = await getDb().collection('stores').doc(storeId).get()
    if (!snap.exists) throw new Error(`Store ${storeId} not found`)
    const data = snap.data() as { appConfig?: { build?: { buildNumber?: number } } }
    const last = data?.appConfig?.build?.buildNumber || 0
    versionCode = last + 1
  }

  console.log(`Resolved versionCode: ${versionCode}`)

  const out = process.env.GITHUB_OUTPUT
  if (out) {
    appendFileSync(out, `versionCode=${versionCode}\n`)
  }
}

main().catch(err => {
  console.error(err)
  process.exit(1)
})
