/**
 * Counts how many stores use each themeId across all stores.
 * Highlights the 10 themes flagged for removal so we know how many
 * merchants need to be migrated before we drop them.
 *
 * Run: node scripts/audit-theme-usage.mjs
 * Reads VITE_FIREBASE_* from .env. The /stores collection is public-read,
 * so no admin credentials needed.
 */
import { readFileSync } from 'node:fs'
import { initializeApp } from 'firebase/app'
import { getFirestore, collection, getDocs } from 'firebase/firestore'

// Lightweight .env loader (avoids extra dependency)
const env = {}
for (const line of readFileSync('.env', 'utf8').split('\n')) {
  const m = line.match(/^([A-Z_]+)=(.*)$/)
  if (m) env[m[1]] = m[2].replace(/^["']|["']$/g, '')
}

const config = {
  apiKey: env.VITE_FIREBASE_API_KEY,
  authDomain: env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: env.VITE_FIREBASE_APP_ID,
}

if (!config.projectId) {
  console.error('Missing VITE_FIREBASE_PROJECT_ID. Make sure .env is loaded.')
  process.exit(1)
}

const REMOVAL_CANDIDATES = new Set([
  'slate',
  'fresh',
  'craft',
  'pop',
  'ember',
  'neon',
  'metro',
  'luxe',
  'vapor',
  'velvet',
])

const app = initializeApp(config)
const db = getFirestore(app)

const snap = await getDocs(collection(db, 'stores'))
const counts = new Map()
const affected = []

snap.forEach(doc => {
  const data = doc.data()
  const themeId = data.themeId || '(none)'
  counts.set(themeId, (counts.get(themeId) || 0) + 1)
  if (REMOVAL_CANDIDATES.has(themeId)) {
    affected.push({
      id: doc.id,
      name: data.name || '(no name)',
      subdomain: data.subdomain || '',
      themeId,
      ownerEmail: data.ownerEmail || '',
    })
  }
})

const total = snap.size
console.log(`\n=== Total stores: ${total} ===\n`)

const sorted = [...counts.entries()].sort((a, b) => b[1] - a[1])

console.log('Theme distribution (descending):')
for (const [themeId, count] of sorted) {
  const flagged = REMOVAL_CANDIDATES.has(themeId) ? '  ← FLAGGED FOR REMOVAL' : ''
  const pct = ((count / total) * 100).toFixed(1)
  console.log(`  ${themeId.padEnd(16)} ${String(count).padStart(4)}  (${pct}%)${flagged}`)
}

console.log(`\n=== Stores using removal candidates (${affected.length}) ===\n`)
if (affected.length === 0) {
  console.log('No stores use any of the flagged themes. Safe to delete.')
} else {
  for (const s of affected) {
    console.log(`  [${s.themeId.padEnd(8)}] ${s.subdomain.padEnd(28)} ${s.name}`)
  }
}

process.exit(0)
