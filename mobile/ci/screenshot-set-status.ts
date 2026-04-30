/**
 * Updates store.appConfig.screenshots.status in Firestore.
 *
 * Usage from the workflow:
 *   npx tsx mobile/ci/screenshot-set-status.ts running "$RUN_URL"
 *   npx tsx mobile/ci/screenshot-set-status.ts failed  "$RUN_URL" "reason..."
 *
 * Mirrors set-build-status.ts. Lives in its own file (rather than as an
 * inline `npx tsx -e "..."` in the YAML) because tsx's default CJS eval
 * mode rejects top-level `await`, which left earlier runs stuck in
 * 'queued' forever after the inline script crashed.
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
    'appConfig.screenshots.status': status,
    'appConfig.screenshots.runUrl': runUrl,
  }

  if (status === 'running') {
    update['appConfig.screenshots.lastError'] = FieldValue.delete()
  }
  if (status === 'success') {
    update['appConfig.screenshots.generatedAt'] = FieldValue.serverTimestamp()
  }
  if (errorMsg) update['appConfig.screenshots.lastError'] = errorMsg

  await getDb().collection('stores').doc(storeId).update(update)
  console.log(`Store ${storeId} screenshots.status → ${status}`)
}

main().catch(err => {
  console.error(err)
  process.exit(1)
})
