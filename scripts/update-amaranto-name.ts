import { initializeApp, cert } from 'firebase-admin/app'
import { getFirestore } from 'firebase-admin/firestore'

const privateKey = process.env.FIREBASE_PRIVATE_KEY!.replace(/\\n/g, '\n')
initializeApp({
  credential: cert({
    projectId: process.env.FIREBASE_PROJECT_ID,
    clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
    privateKey,
  }),
})

async function main() {
  const db = getFirestore()
  const ref = db.collection('stores').doc('KnQKQDeBFLPPpLx1kar7jcSTzRt2')
  const snap = await ref.get()
  const data = snap.data()!
  console.log('Current appName:', data.appConfig?.appName)
  console.log('Store name:', data.name)
  await ref.update({ 'appConfig.appName': 'Amaranto Women' })
  console.log('Updated appConfig.appName → Amaranto Women')
}

main().then(() => process.exit(0)).catch(err => { console.error(err); process.exit(1) })
