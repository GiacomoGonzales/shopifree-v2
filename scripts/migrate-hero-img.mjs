#!/usr/bin/env node
/**
 * One-shot migration: replace `<img src={optimizeImage(x, 'hero')} ... />`
 * with `<HeroImg src={x} ... />` across all theme files.
 *
 * Also ensures HeroImg is imported at the top of each modified file.
 *
 * Safe to re-run (idempotent via "already uses HeroImg" check).
 */
import { readFileSync, writeFileSync } from 'fs'
import { globSync } from 'glob'

const THEME_GLOB = 'src/themes/**/*Theme.tsx'
const HEROIMG_IMPORT = `import HeroImg from '../../components/catalog/HeroImg'`

// Match: <img  ...attrs... src={optimizeImage(<anything>, 'hero')} ...attrs... />
// Multi-line safe. We capture attrs before/after the src so we keep refs, className, style, etc.
const HERO_IMG_REGEX = /<img(\s+[^>]*?)src=\{optimizeImage\(([^)]+?),\s*['"]hero['"]\)\}([^>]*?)\/>/gs

function transformFile(filepath) {
  const original = readFileSync(filepath, 'utf8')

  // Fast skip: file doesn't have the old pattern
  if (!/optimizeImage\([^)]*,\s*['"]hero['"]\)/.test(original)) {
    return { filepath, changed: false, reason: 'no hero img' }
  }

  let content = original

  // Replace <img ... src={optimizeImage(X, 'hero')} ... />  →  <HeroImg ... src={X} ... />
  content = content.replace(HERO_IMG_REGEX, (_match, before, srcExpr, after) => {
    return `<HeroImg${before}src={${srcExpr.trim()}}${after}/>`
  })

  if (content === original) {
    return { filepath, changed: false, reason: 'regex did not match' }
  }

  // Add the import if missing
  if (!content.includes(`from '../../components/catalog/HeroImg'`)) {
    // Insert after the last import line at the top of the file
    const importRegex = /(^import .+?\n)(?!import)/m
    const match = content.match(/^(import .+?\n)+/m)
    if (match) {
      const importBlock = match[0]
      content = content.replace(importBlock, importBlock + HEROIMG_IMPORT + '\n')
    } else {
      content = HEROIMG_IMPORT + '\n' + content
    }
  }

  writeFileSync(filepath, content, 'utf8')
  return { filepath, changed: true }
}

const files = globSync(THEME_GLOB, { cwd: process.cwd() })
let modified = 0
let skipped = 0

for (const f of files) {
  const result = transformFile(f)
  if (result.changed) {
    console.log(`✓ ${f}`)
    modified++
  } else {
    console.log(`- ${f} (${result.reason})`)
    skipped++
  }
}

console.log(`\nModified: ${modified} | Skipped: ${skipped}`)
