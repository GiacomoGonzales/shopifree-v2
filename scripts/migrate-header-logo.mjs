#!/usr/bin/env node
/**
 * Migrates all theme files (and THEME_TEMPLATE) to use the new `useHeaderLogo`
 * helper instead of calling `useLogoOrientation` directly.
 *
 * Changes per file:
 *   1. `import { useLogoOrientation } from '../shared/useLogoOrientation'`
 *      → `import { useHeaderLogo } from '../shared/useHeaderLogo'`
 *   2. `const { showName } = useLogoOrientation(store.logo)`
 *      → `const { src: headerLogo, showName } = useHeaderLogo(store)`
 *   3. The single `<img src={store.logo} ... />` in the header
 *      → `<img src={headerLogo} ... />`
 *   4. `{store.logo && (`  → `{headerLogo && (`  (guards around the header img)
 *
 * Idempotent: safe to re-run.
 */
import { readFileSync, writeFileSync } from 'fs'
import { globSync } from 'glob'

const THEME_GLOB = 'src/themes/**/*.tsx'

function migrate(filepath) {
  const original = readFileSync(filepath, 'utf8')
  let c = original

  // Skip shared helpers, index, etc. Only run on theme files.
  if (!/useLogoOrientation/.test(c)) {
    return { filepath, changed: false, reason: 'no useLogoOrientation usage' }
  }

  // 1. Swap import
  c = c.replace(
    /import \{ useLogoOrientation \} from '\.\.\/shared\/useLogoOrientation'/g,
    `import { useHeaderLogo } from '../shared/useHeaderLogo'`
  )

  // 2. Swap the hook call — the exact single line all 53 themes use
  c = c.replace(
    /const \{ showName \} = useLogoOrientation\(store\.logo\)/g,
    `const { src: headerLogo, showName } = useHeaderLogo(store)`
  )

  // 3. Swap the `src={store.logo}` attribute (only appears once per file, in the header)
  c = c.replace(/src=\{store\.logo\}/g, `src={headerLogo}`)

  // 4. Swap the guard `{store.logo && (` → `{headerLogo && (`
  //    This is how themes conditionally render the header img. Only affects the
  //    header block because other files don't touch `store.logo` this way.
  c = c.replace(/\{store\.logo && \(/g, `{headerLogo && (`)

  if (c === original) {
    return { filepath, changed: false, reason: 'no substitutions made' }
  }

  writeFileSync(filepath, c, 'utf8')
  return { filepath, changed: true }
}

const files = globSync(THEME_GLOB, { cwd: process.cwd() })
let migrated = 0
let skipped = 0
for (const f of files) {
  const r = migrate(f)
  if (r.changed) {
    console.log(`✓ ${f}`)
    migrated++
  } else {
    console.log(`- ${f} (${r.reason})`)
    skipped++
  }
}
console.log(`\nMigrated: ${migrated} | Skipped: ${skipped}`)
