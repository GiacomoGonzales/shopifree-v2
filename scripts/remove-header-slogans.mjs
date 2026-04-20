#!/usr/bin/env node
/**
 * Removes the "slogan under the logo" block from theme headers.
 *
 * Two patterns cover all 18 themes that render a header slogan:
 *
 *   (1) Scroll-responsive pattern (16 themes):
 *         {store.about?.slogan && !scrolled && (
 *           <p ...>{store.about.slogan}</p>
 *         )}
 *       — multiline regex removes the whole block.
 *
 *   (2) Inline under-h1 pattern (boutique, fresh):
 *         <h1 ...>{store.name}</h1>
 *         {store.about?.slogan && (
 *           <p className="text-xs ...">{store.about.slogan}</p>
 *         )}
 *       — only removes when the inner <p> has `text-xs` (the header-sized variant).
 *         Larger-text slogans in hero sections are never matched.
 *
 * Hero / footer / section slogans are left untouched.
 *
 * Idempotent.
 */
import { readFileSync, writeFileSync } from 'fs'
import { globSync } from 'glob'

const THEME_GLOB = 'src/themes/**/*.tsx'

// Pattern 1: `!scrolled && (...)}` with the slogan inside.
// Matches from `{store.about?.slogan && !scrolled && (` through the balancing `)}`.
const SCROLLED_PATTERN =
  /\s*\{store\.about\?\.slogan && !scrolled && \(\s*<p[\s\S]*?\{store\.about\.slogan\}\s*<\/p>\s*\)\}/g

// Pattern 2: inline header-sized slogan (text-xs marker).
// Matches only when the <p> has `text-xs` in its className, which is the
// convention for header slogans; hero slogans use text-sm / text-lg / text-xl / etc.
const INLINE_TEXT_XS_PATTERN =
  /\s*\{store\.about\?\.slogan && \(\s*<p className="[^"]*\btext-xs\b[^"]*"[^>]*>\s*\{store\.about\.slogan\}\s*<\/p>\s*\)\}/g

function strip(filepath) {
  const original = readFileSync(filepath, 'utf8')
  let c = original
  const hits = []

  const m1 = c.match(SCROLLED_PATTERN)
  if (m1) {
    hits.push(`${m1.length}× !scrolled slogan`)
    c = c.replace(SCROLLED_PATTERN, '')
  }

  const m2 = c.match(INLINE_TEXT_XS_PATTERN)
  if (m2) {
    hits.push(`${m2.length}× text-xs slogan`)
    c = c.replace(INLINE_TEXT_XS_PATTERN, '')
  }

  if (c === original) return { filepath, changed: false }

  writeFileSync(filepath, c, 'utf8')
  return { filepath, changed: true, hits }
}

const files = globSync(THEME_GLOB, { cwd: process.cwd() })
let changed = 0
for (const f of files) {
  const r = strip(f)
  if (r.changed) {
    console.log(`✓ ${f}  [${r.hits.join(' | ')}]`)
    changed++
  }
}
console.log(`\nStripped: ${changed} / ${files.length}`)
