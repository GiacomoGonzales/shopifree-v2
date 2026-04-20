#!/usr/bin/env node
/**
 * Removes the now-dead `import { optimizeImage } from '.../cloudinary'` from
 * theme files where `optimizeImage` is no longer referenced after the HeroImg
 * migration. Leaves the import alone in files that still use it (e.g. for
 * card/thumbnail images).
 */
import { readFileSync, writeFileSync } from 'fs'
import { globSync } from 'glob'

const THEME_GLOB = 'src/themes/**/*Theme.tsx'

function clean(filepath) {
  const original = readFileSync(filepath, 'utf8')

  // Match the exact import line (nothing else on that line) — whitespace/order tolerant.
  const importRegex = /^import \{\s*optimizeImage\s*\} from '\.\.\/\.\.\/utils\/cloudinary'\r?\n/m

  if (!importRegex.test(original)) {
    return { filepath, changed: false, reason: 'no standalone optimizeImage import' }
  }

  // Strip the import line and check if `optimizeImage` is still referenced anywhere
  const withoutImport = original.replace(importRegex, '')
  // Any standalone reference to optimizeImage (function call or identifier)
  if (/\boptimizeImage\b/.test(withoutImport)) {
    return { filepath, changed: false, reason: 'still used elsewhere' }
  }

  writeFileSync(filepath, withoutImport, 'utf8')
  return { filepath, changed: true }
}

const files = globSync(THEME_GLOB, { cwd: process.cwd() })
let cleaned = 0
let skipped = 0
for (const f of files) {
  const r = clean(f)
  if (r.changed) {
    console.log(`✓ cleaned ${f}`)
    cleaned++
  } else {
    console.log(`- ${f} (${r.reason})`)
    skipped++
  }
}
console.log(`\nCleaned: ${cleaned} | Skipped: ${skipped}`)
