/**
 * Updates store.appConfig.build.status in Firestore.
 *
 * Usage from the workflow:
 *   npx tsx mobile/ci/set-build-status.ts running "$RUN_URL"
 *   npx tsx mobile/ci/set-build-status.ts failed  "$RUN_URL" "reason..."
 *
 * Env: STORE_ID, plus FIREBASE_* service account.
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
    'appConfig.build.status': status,
    'appConfig.build.runUrl': runUrl,
    'appConfig.build.runId': process.env.GITHUB_RUN_ID || '',
  }

  if (status === 'running') update['appConfig.build.startedAt'] = FieldValue.serverTimestamp()
  if (status === 'failed' || status === 'success') update['appConfig.build.finishedAt'] = FieldValue.serverTimestamp()
  if (errorMsg) update['appConfig.build.lastError'] = errorMsg

  await getDb().collection('stores').doc(storeId).update(update)
  console.log(`Store ${storeId} build.status → ${status}`)
}

main().catch(err => {
  console.error(err)
  process.exit(1)
})
