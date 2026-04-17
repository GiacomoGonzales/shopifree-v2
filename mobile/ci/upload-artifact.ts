/**
 * Uploads the built AAB to Firebase Storage and records the signed URL
 * (+ build metadata) in Firestore. Also marks status as 'success'.
 *
 * Env: STORE_ID, AAB_PATH, BUILD_NUMBER, VERSION_NAME, FIREBASE_* service account.
 */
import { readFileSync } from 'fs'
import { basename } from 'path'
import { getDb, getBucket } from './firebase-admin'
import { FieldValue } from 'firebase-admin/firestore'

async function main() {
  const storeId = process.env.STORE_ID
  const aabPath = process.env.AAB_PATH
  const buildNumber = parseInt(process.env.BUILD_NUMBER || '0', 10)
  const versionName = process.env.VERSION_NAME || '1.0.0'

  if (!storeId) throw new Error('STORE_ID env var required')
  if (!aabPath) throw new Error('AAB_PATH env var required')

  const fileBytes = readFileSync(aabPath)
  const filename = `${storeId}-v${buildNumber}-${versionName}.aab`
  const remotePath = `app-builds/${storeId}/${filename}`

  const bucket = getBucket()
  const file = bucket.file(remotePath)

  await file.save(fileBytes, {
    contentType: 'application/octet-stream',
    metadata: {
      cacheControl: 'private, max-age=0',
      metadata: {
        storeId,
        buildNumber: String(buildNumber),
        versionName,
      },
    },
  })

  // Signed URL valid 7 days — admin downloads within that window
  const [signedUrl] = await file.getSignedUrl({
    action: 'read',
    expires: Date.now() + 7 * 24 * 60 * 60 * 1000,
  })

  await getDb().collection('stores').doc(storeId).update({
    'appConfig.build.status': 'success',
    'appConfig.build.artifactUrl': signedUrl,
    'appConfig.build.artifactName': filename,
    'appConfig.build.buildNumber': buildNumber,
    'appConfig.build.versionName': versionName,
    'appConfig.build.finishedAt': FieldValue.serverTimestamp(),
    'appConfig.build.lastError': FieldValue.delete(),
  })

  console.log(`Uploaded ${remotePath}`)
  console.log(`Signed URL valid 7 days`)
  console.log(`Build #${buildNumber} (${versionName}) registered for ${storeId}`)
}

main().catch(err => {
  console.error(err)
  process.exit(1)
})
