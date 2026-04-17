/**
 * Updates store.appConfig.buildIos.status in Firestore.
 * Mirrors set-build-status.ts but for the iOS field.
 *
 * Usage: npx tsx mobile/ci/ios-set-build-status.ts running "$RUN_URL"
 */
import { getDb } from './firebase-admin'
import { FieldValue } from 'firebase-admin/firestore'

async function main() {
  const status = process.argv[2] as 'queued' | 'running' | 'success' | 'failed'
  const runUrl = process.argv[3] || ''
  const errorMsg = process.argv[4] || ''
  const storeId = process.env.STORE_ID

  if (!storeId) throw new Error('STORE_ID env var required')
  if (!['queued', 'running', 'success', 'failed'].includes(status)) {
    throw new Error(`Invalid status: ${status}`)
  }

  const update: Record<string, unknown> = {
    'appConfig.buildIos.status': status,
    'appConfig.buildIos.runUrl': runUrl,
    'appConfig.buildIos.runId': process.env.GITHUB_RUN_ID || '',
  }

  if (status === 'running') update['appConfig.buildIos.startedAt'] = FieldValue.serverTimestamp()
  if (status === 'failed' || status === 'success') update['appConfig.buildIos.finishedAt'] = FieldValue.serverTimestamp()
  if (errorMsg) update['appConfig.buildIos.lastError'] = errorMsg

  await getDb().collection('stores').doc(storeId).update(update)
  console.log(`Store ${storeId} buildIos.status → ${status}`)
}

main().catch(err => {
  console.error(err)
  process.exit(1)
})
