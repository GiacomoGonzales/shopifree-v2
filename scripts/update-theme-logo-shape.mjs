#!/usr/bin/env node
/**
 * Codemod: rewires theme header logos to use the className returned by
 * useHeaderLogo (size + shape). Themes with a squared/industrial aesthetic
 * get squareStyle='rounded'.
 *
 * Idempotent — safe to re-run.
 */
import { readFileSync, writeFileSync, readdirSync, statSync } from 'node:fs'
import { join } from 'node:path'

const THEMES_DIR = new URL('../src/themes/', import.meta.url).pathname

const ROUNDED_SQUARE_THEMES = new Set([
  'bold', 'brutalist', 'circuit', 'cosmos', 'deco', 'folio', 'grunge',
  'hologram', 'metro', 'midnight', 'minimal', 'minimal-tech', 'neon',
  'neon-cyber', 'noir', 'prism', 'slate', 'vapor', 'vaporwave', 'fitness',
])

// Matches the current <img> (any variant with hard-coded classes OR the
// previous template-string form produced by the first run of this codemod).
const IMG_CURRENT_RE = /<img src={headerLogo} alt={store\.name} className=(?:"h-12 w-auto max-w-\[200px\] object-contain"|{`h-12 w-auto max-w-\[200px\] object-contain \${logoClassName}`})\s*\/>/g

const DESTRUCTURE_RE = /const \{ src: headerLogo, showName(?:, logoClassName)? \} = useHeaderLogo\(store(?:, \{ squareStyle: 'rounded' \})?\)/

let updated = 0

for (const entry of readdirSync(THEMES_DIR)) {
  const themeDir = join(THEMES_DIR, entry)
  if (!statSync(themeDir).isDirectory()) continue
  if (entry === 'shared') continue

  const themeFile = readdirSync(themeDir).find(f => f.endsWith('Theme.tsx'))
  if (!themeFile) continue

  const path = join(themeDir, themeFile)
  let src = readFileSync(path, 'utf8')
  const original = src

  const usesRounded = ROUNDED_SQUARE_THEMES.has(entry)

  const newDestructure = usesRounded
    ? "const { src: headerLogo, showName, logoClassName } = useHeaderLogo(store, { squareStyle: 'rounded' })"
    : "const { src: headerLogo, showName, logoClassName } = useHeaderLogo(store)"
  src = src.replace(DESTRUCTURE_RE, newDestructure)

  // The new img just uses logoClassName directly (it now carries size + shape).
  src = src.replace(
    IMG_CURRENT_RE,
    `<img src={headerLogo} alt={store.name} className={logoClassName} />`
  )

  if (src === original) continue

  writeFileSync(path, src, 'utf8')
  updated++
  console.log(`  ✓ ${entry}${usesRounded ? '  (rounded-xl)' : ''}`)
}

console.log(`\nUpdated ${updated} themes.`)
