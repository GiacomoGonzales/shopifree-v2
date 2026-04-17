/**
 * Uploads the built IPA to Firebase Storage and records the signed URL
 * in Firestore under appConfig.buildIos. Marks status as 'success'.
 */
import { readFileSync } from 'fs'
import { getDb, getBucket } from './firebase-admin'
import { FieldValue } from 'firebase-admin/firestore'

async function main() {
  const storeId = process.env.STORE_ID
  const ipaPath = process.env.IPA_PATH
  const buildNumber = parseInt(process.env.BUILD_NUMBER || '0', 10)
  const versionName = process.env.VERSION_NAME || '1.0.0'

  if (!storeId) throw new Error('STORE_ID env var required')
  if (!ipaPath) throw new Error('IPA_PATH env var required')

  const fileBytes = readFileSync(ipaPath)
  const filename = `${storeId}-v${buildNumber}-${versionName}.ipa`
  const remotePath = `app-builds-ios/${storeId}/${filename}`

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
        platform: 'ios',
      },
    },
  })

  const [signedUrl] = await file.getSignedUrl({
    action: 'read',
    expires: Date.now() + 7 * 24 * 60 * 60 * 1000,
  })

  await getDb().collection('stores').doc(storeId).update({
    'appConfig.buildIos.status': 'success',
    'appConfig.buildIos.artifactUrl': signedUrl,
    'appConfig.buildIos.artifactName': filename,
    'appConfig.buildIos.buildNumber': buildNumber,
    'appConfig.buildIos.versionName': versionName,
    'appConfig.buildIos.finishedAt': FieldValue.serverTimestamp(),
    'appConfig.buildIos.lastError': FieldValue.delete(),
  })

  console.log(`Uploaded ${remotePath}`)
  console.log(`iOS build #${buildNumber} (${versionName}) registered for ${storeId}`)
}

main().catch(err => {
  console.error(err)
  process.exit(1)
})
