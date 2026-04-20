/**
 * Uploads the built IPA/AAB of the main Shopifree app to Firebase Storage
 * and records the signed URL in Firestore under platformApp/<platform>.
 * Marks status as 'success'.
 *
 * Usage: npx tsx mobile/ci/main-upload-artifact.ts <ios|android>
 * Env: ARTIFACT_PATH, BUILD_NUMBER, VERSION_NAME
 */
import { readFileSync } from 'fs'
import { getDb, getBucket } from './firebase-admin'
import { FieldValue } from 'firebase-admin/firestore'

async function main() {
  const platform = process.argv[2] as 'ios' | 'android'
  const artifactPath = process.env.ARTIFACT_PATH
  const buildNumber = parseInt(process.env.BUILD_NUMBER || '0', 10)
  const versionName = process.env.VERSION_NAME || '1.0.0'

  if (!['ios', 'android'].includes(platform)) {
    throw new Error(`Invalid platform: ${platform}`)
  }
  if (!artifactPath) throw new Error('ARTIFACT_PATH env var required')

  const ext = platform === 'ios' ? 'ipa' : 'aab'
  const fileBytes = readFileSync(artifactPath)
  const filename = `shopifree-v${buildNumber}-${versionName}.${ext}`
  const remotePath = `app-builds/platform/${platform}/${filename}`

  const bucket = getBucket()
  const file = bucket.file(remotePath)

  await file.save(fileBytes, {
    contentType: 'application/octet-stream',
    metadata: {
      cacheControl: 'private, max-age=0',
      metadata: {
        buildNumber: String(buildNumber),
        versionName,
        platform,
      },
    },
  })

  const [signedUrl] = await file.getSignedUrl({
    action: 'read',
    expires: Date.now() + 7 * 24 * 60 * 60 * 1000,
  })

  await getDb().collection('platformApp').doc(platform).set({
    status: 'success',
    artifactUrl: signedUrl,
    artifactName: filename,
    buildNumber,
    versionName,
    finishedAt: FieldValue.serverTimestamp(),
    lastError: FieldValue.delete(),
  }, { merge: true })

  console.log(`Uploaded ${remotePath}`)
  console.log(`${platform} build #${buildNumber} (${versionName}) registered`)
}

main().catch(err => {
  console.error(err)
  process.exit(1)
})
