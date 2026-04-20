/**
 * Updates platformApp/<platform>.status in Firestore for the main Shopifree app.
 *
 * Usage: npx tsx mobile/ci/main-set-build-status.ts <ios|android> <status> [runUrl] [errorMsg]
 */
import { getDb } from './firebase-admin'
import { FieldValue } from 'firebase-admin/firestore'

async function main() {
  const platform = process.argv[2] as 'ios' | 'android'
  const status = process.argv[3] as 'queued' | 'running' | 'success' | 'failed'
  const runUrl = process.argv[4] || ''
  const errorMsg = process.argv[5] || ''

  if (!['ios', 'android'].includes(platform)) {
    throw new Error(`Invalid platform: ${platform}`)
  }
  if (!['queued', 'running', 'success', 'failed'].includes(status)) {
    throw new Error(`Invalid status: ${status}`)
  }

  const update: Record<string, unknown> = {
    status,
    runUrl,
    runId: process.env.GITHUB_RUN_ID || '',
  }

  if (status === 'running') update.startedAt = FieldValue.serverTimestamp()
  if (status === 'failed' || status === 'success') update.finishedAt = FieldValue.serverTimestamp()
  if (errorMsg) update.lastError = errorMsg

  await getDb().collection('platformApp').doc(platform).set(update, { merge: true })
  console.log(`platformApp/${platform} status → ${status}`)
}

main().catch(err => {
  console.error(err)
  process.exit(1)
})
