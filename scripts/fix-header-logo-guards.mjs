#!/usr/bin/env node
/**
 * Fixes the header-logo migration by replacing the remaining `store.logo`
 * references in the HEADER conditionals of every theme.
 *
 * The first migration only handled `{store.logo && (` guards. Themes use at
 * least four other guard shapes that also need to switch from `store.logo`
 * (which is only the square logo) to `headerLogo` (the effective logo — either
 * landscape if uploaded, or square):
 *
 *   {store.logo ? (                       → {headerLogo ? (
 *   {store.logo && <img                   → {headerLogo && <img
 *   {!store.logo && (                     → {!headerLogo && (
 *   {!store.logo && <                     → {!headerLogo && <
 *   (!store.logo || showName)             → (!headerLogo || showName)
 *
 * Idempotent. Safe to re-run.
 */
import { readFileSync, writeFileSync } from 'fs'
import { globSync } from 'glob'

const THEME_GLOB = 'src/themes/**/*.tsx'

const PATTERNS = [
  { from: /\{store\.logo \? \(/g, to: '{headerLogo ? (' },
  { from: /\{store\.logo && <img/g, to: '{headerLogo && <img' },
  { from: /\{!store\.logo && \(/g, to: '{!headerLogo && (' },
  { from: /\{!store\.logo && </g, to: '{!headerLogo && <' },
  { from: /\(!store\.logo \|\| showName\)/g, to: '(!headerLogo || showName)' },
]

function fix(filepath) {
  const original = readFileSync(filepath, 'utf8')
  let c = original
  const hits = []
  for (const { from, to } of PATTERNS) {
    const matches = c.match(from)
    if (matches) {
      hits.push(`${matches.length}× ${from}`)
      c = c.replace(from, to)
    }
  }
  if (c === original) {
    return { filepath, changed: false }
  }
  writeFileSync(filepath, c, 'utf8')
  return { filepath, changed: true, hits }
}

const files = globSync(THEME_GLOB, { cwd: process.cwd() })
let fixed = 0
for (const f of files) {
  const r = fix(f)
  if (r.changed) {
    console.log(`✓ ${f}  [${r.hits.join(', ')}]`)
    fixed++
  }
}
console.log(`\nFixed: ${fixed} / ${files.length}`)
