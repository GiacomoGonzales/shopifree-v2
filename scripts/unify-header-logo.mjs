#!/usr/bin/env node
/**
 * Unifies the header `<img>` styling across every theme so that:
 *   - Landscape logos are no longer squished into a fixed-size square wrapper.
 *   - Square logos render consistently at 48px tall.
 *
 * Target markup:
 *   <img src={headerLogo} alt={store.name} className="h-12 w-auto max-w-[200px] object-contain" />
 *
 * This script covers three existing patterns:
 *
 *   A) Wrapper + inner img (most common):
 *        <div className="w-X h-X flex items-center justify-center">
 *          <img src={headerLogo} alt={store.name} className="max-w-full max-h-full object-contain" />
 *        </div>
 *      → replaced by the bare img above (the wrapper was the cause of the squished-landscape bug).
 *
 *   B) Direct-sized img (varies: h-7/h-8/h-9/h-10 w-auto, h-12 w-12, etc.)
 *      → className normalized to the target above.
 *
 *   C) Wrapper + inner img with `w-full h-full` variants (pop, craft, neon, bold)
 *      → same treatment as (A).
 *
 * Fallback blocks (the `: ( <div>icon/letter</div> )` branch of the ternary, or the
 * `{!headerLogo && <fallback />}` companion) are left untouched — they still want
 * a fixed square wrapper because they render an icon, not an image.
 *
 * Idempotent. Safe to re-run.
 */
import { readFileSync, writeFileSync } from 'fs'
import { globSync } from 'glob'

const THEME_GLOB = 'src/themes/**/*.tsx'
const UNIFIED_CLASSNAME = 'h-12 w-auto max-w-[200px] object-contain'

function unify(filepath) {
  const original = readFileSync(filepath, 'utf8')
  let c = original
  const hits = []

  // Pattern A/C — wrapper div that contains JUST the headerLogo img with
  // max/full sizing. Replace the whole thing with the bare img.
  const wrapperPattern =
    /<div\s+className="[^"]*\b(?:w|h)-(?:\d+)\s+(?:h|w)-(?:\d+)[^"]*">\s*<img\s+src=\{headerLogo\}\s+alt=\{store\.name\}\s+className="(?:max-w-full max-h-full|w-full h-full)\s+object-(?:contain|cover)"\s*\/>\s*<\/div>/gs

  const wrapperMatches = c.match(wrapperPattern)
  if (wrapperMatches) {
    hits.push(`${wrapperMatches.length}× wrapper pattern`)
    c = c.replace(
      wrapperPattern,
      `<img src={headerLogo} alt={store.name} className="${UNIFIED_CLASSNAME}" />`
    )
  }

  // Pattern B — direct-sized img. Normalize any className.
  // Match any `<img src={headerLogo} alt={store.name} className="..." />` still
  // left with a non-unified class string.
  const directPattern =
    /<img\s+src=\{headerLogo\}\s+alt=\{store\.name\}\s+className="([^"]+)"\s*\/>/g
  c = c.replace(directPattern, (match, cls) => {
    if (cls === UNIFIED_CLASSNAME) return match
    hits.push(`direct className "${cls}"`)
    return `<img src={headerLogo} alt={store.name} className="${UNIFIED_CLASSNAME}" />`
  })

  if (c === original) {
    return { filepath, changed: false }
  }

  writeFileSync(filepath, c, 'utf8')
  return { filepath, changed: true, hits }
}

const files = globSync(THEME_GLOB, { cwd: process.cwd() })
let changed = 0
for (const f of files) {
  const r = unify(f)
  if (r.changed) {
    console.log(`✓ ${f}  [${r.hits.join(' | ')}]`)
    changed++
  }
}
console.log(`\nUnified: ${changed} / ${files.length}`)
