/**
 * Resolves the build number for the main Shopifree app (iOS CFBundleVersion
 * or Android versionCode).
 * - If INPUT_BUILD_NUMBER is set, uses it verbatim.
 * - Else reads platformApp/<platform>.buildNumber from Firestore and adds 1.
 *
 * Usage: npx tsx mobile/ci/main-resolve-version.ts <ios|android>
 */
import { appendFileSync } from 'fs'
import { getDb } from './firebase-admin'

async function main() {
  const platform = process.argv[2] as 'ios' | 'android'
  if (!['ios', 'android'].includes(platform)) {
    throw new Error(`Invalid platform: ${platform}`)
  }

  let buildNumber: number
  const input = process.env.INPUT_BUILD_NUMBER
  if (input && /^\d+$/.test(input)) {
    buildNumber = parseInt(input, 10)
  } else {
    const snap = await getDb().collection('platformApp').doc(platform).get()
    const last = (snap.data() as { buildNumber?: number } | undefined)?.buildNumber || 0
    buildNumber = last + 1
  }

  console.log(`Resolved ${platform} buildNumber: ${buildNumber}`)

  const out = process.env.GITHUB_OUTPUT
  if (out) {
    appendFileSync(out, `buildNumber=${buildNumber}\n`)
  }
}

main().catch(err => {
  console.error(err)
  process.exit(1)
})
