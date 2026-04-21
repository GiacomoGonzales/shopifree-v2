#!/usr/bin/env node
/**
 * One-shot codemod: updates every theme file to wire the new `logoClassName`
 * returned by useHeaderLogo onto the header <img>, and sets squareStyle='rounded'
 * on themes with a squared/industrial aesthetic.
 *
 * Run once: `node scripts/update-theme-logo-shape.mjs`
 */
import { readFileSync, writeFileSync, readdirSync, statSync } from 'node:fs'
import { join } from 'node:path'

const THEMES_DIR = new URL('../src/themes/', import.meta.url).pathname

// Themes with a squared/industrial/editorial aesthetic — their opaque-square
// logos get `rounded-xl` instead of circular.
const ROUNDED_SQUARE_THEMES = new Set([
  'bold', 'brutalist', 'circuit', 'cosmos', 'deco', 'folio', 'grunge',
  'hologram', 'metro', 'midnight', 'minimal', 'minimal-tech', 'neon',
  'neon-cyber', 'noir', 'prism', 'slate', 'vapor', 'vaporwave', 'fitness',
])

const IMG_RE = /<img src={headerLogo} alt={store\.name} className="h-12 w-auto max-w-\[200px\] object-contain"\s*\/>/g
const DESTRUCTURE_RE = /const \{ src: headerLogo, showName \} = useHeaderLogo\(store\)/

let updated = 0
let skipped = 0

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

  // 1) Destructure logoClassName + pass squareStyle='rounded' if needed
  const newDestructure = usesRounded
    ? "const { src: headerLogo, showName, logoClassName } = useHeaderLogo(store, { squareStyle: 'rounded' })"
    : "const { src: headerLogo, showName, logoClassName } = useHeaderLogo(store)"
  src = src.replace(DESTRUCTURE_RE, newDestructure)

  // 2) Update the <img> to append logoClassName
  src = src.replace(
    IMG_RE,
    `<img src={headerLogo} alt={store.name} className={\`h-12 w-auto max-w-[200px] object-contain \${logoClassName}\`} />`
  )

  if (src === original) {
    skipped++
    continue
  }

  writeFileSync(path, src, 'utf8')
  updated++
  console.log(`  ✓ ${entry}${usesRounded ? '  (rounded-xl)' : ''}`)
}

console.log(`\nUpdated ${updated} themes, skipped ${skipped}.`)
