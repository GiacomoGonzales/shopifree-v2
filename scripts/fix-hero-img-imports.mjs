#!/usr/bin/env node
/**
 * Fixes the broken HeroImg imports placed inside multi-line `import { ... }` blocks
 * by the previous migration script.
 *
 * Pattern found (broken):
 *   import {
 *   import HeroImg from '../../components/catalog/HeroImg'
 *     ThemeProvider,
 *     ...
 *   } from '../../components/catalog'
 *
 * Fix:
 *   1. Remove the stray `import HeroImg ...` line from inside the block.
 *   2. Re-insert it on its own line after the full import block ends (after
 *      the final `} from '...'` line that closed the multi-line import).
 */
import { readFileSync, writeFileSync } from 'fs'
import { globSync } from 'glob'

const THEME_GLOB = 'src/themes/**/*Theme.tsx'
const HEROIMG_IMPORT = `import HeroImg from '../../components/catalog/HeroImg'`

function fixFile(filepath) {
  const original = readFileSync(filepath, 'utf8')
  let content = original

  // If there's no broken placement, nothing to do
  if (!/import \{\s*\nimport HeroImg from '\.\.\/\.\.\/components\/catalog\/HeroImg'/.test(content)) {
    // Still ensure exactly one HeroImg import exists somewhere sensible
    const count = (content.match(/^import HeroImg from '\.\.\/\.\.\/components\/catalog\/HeroImg'$/gm) || []).length
    if (count >= 1) return { filepath, changed: false, reason: 'already clean' }
    return { filepath, changed: false, reason: 'no hero import at all' }
  }

  // 1. Remove the stray line
  content = content.replace(/\nimport HeroImg from '\.\.\/\.\.\/components\/catalog\/HeroImg'\n/, '\n')

  // 2. Find the END of the full top-of-file import block and re-insert there
  //    We'll look for the last consecutive import-related line at the top of the file.
  const lines = content.split('\n')
  let lastImportLineIdx = -1
  let insideBlock = false
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    if (line.startsWith('import ')) {
      if (line.includes(' from ') || /^import ['"]/.test(line)) {
        // Single-line import
        lastImportLineIdx = i
      } else if (line.includes('{') && !line.includes('}')) {
        // Start of multi-line import
        insideBlock = true
      }
    } else if (insideBlock) {
      if (line.includes('} from ')) {
        lastImportLineIdx = i
        insideBlock = false
      }
    } else if (line.trim() === '' && lastImportLineIdx >= 0) {
      // allow blank lines between imports
      continue
    } else if (lastImportLineIdx >= 0 && !line.startsWith('import ') && !line.startsWith('//') && line.trim() !== '') {
      // end of import section
      break
    }
  }

  if (lastImportLineIdx < 0) {
    return { filepath, changed: false, reason: 'could not find import block end' }
  }

  // Insert HeroImg import right after the last import line
  lines.splice(lastImportLineIdx + 1, 0, HEROIMG_IMPORT)
  content = lines.join('\n')

  if (content === original) {
    return { filepath, changed: false, reason: 'no change after fix' }
  }

  writeFileSync(filepath, content, 'utf8')
  return { filepath, changed: true }
}

const files = globSync(THEME_GLOB, { cwd: process.cwd() })
let fixed = 0
let skipped = 0

for (const f of files) {
  const result = fixFile(f)
  if (result.changed) {
    console.log(`✓ fixed ${f}`)
    fixed++
  } else {
    console.log(`- ${f} (${result.reason})`)
    skipped++
  }
}

console.log(`\nFixed: ${fixed} | Skipped: ${skipped}`)
