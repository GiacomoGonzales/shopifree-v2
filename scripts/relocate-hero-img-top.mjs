#!/usr/bin/env node
/**
 * Relocates `import HeroImg` lines that the migration placed at line 1
 * (before the file's leading docstring) so they sit right after the last
 * real import statement, alongside the rest of the imports.
 */
import { readFileSync, writeFileSync } from 'fs'
import { globSync } from 'glob'

const THEME_GLOB = 'src/themes/**/*Theme.tsx'
const HEROIMG_IMPORT = `import HeroImg from '../../components/catalog/HeroImg'`

function relocate(filepath) {
  const original = readFileSync(filepath, 'utf8')
  const lines = original.split('\n')
  if (lines[0] !== HEROIMG_IMPORT) {
    return { filepath, changed: false, reason: 'not at line 1' }
  }

  // Drop the first line (plus its trailing newline if present)
  lines.shift()
  // If the next line is now empty, preserve one blank line — but if there's a big docstring,
  // that empty line is fine. Just leave the rest alone.

  // Find end of import block in the remaining content
  let lastImportLineIdx = -1
  let insideBlock = false
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    if (line.startsWith('import ')) {
      if (line.includes(' from ') || /^import ['"]/.test(line)) {
        lastImportLineIdx = i
      } else if (line.includes('{') && !line.includes('}')) {
        insideBlock = true
      }
    } else if (insideBlock) {
      if (line.includes('} from ')) {
        lastImportLineIdx = i
        insideBlock = false
      }
    } else if (line.trim() === '' && lastImportLineIdx >= 0) {
      continue
    } else if (lastImportLineIdx >= 0 && !line.startsWith('import ') && !line.startsWith('//') && line.trim() !== '') {
      break
    }
  }

  if (lastImportLineIdx < 0) {
    return { filepath, changed: false, reason: 'could not locate import block end' }
  }

  lines.splice(lastImportLineIdx + 1, 0, HEROIMG_IMPORT)
  const content = lines.join('\n')

  if (content === original) {
    return { filepath, changed: false, reason: 'no change' }
  }

  writeFileSync(filepath, content, 'utf8')
  return { filepath, changed: true }
}

const files = globSync(THEME_GLOB, { cwd: process.cwd() })
let fixed = 0
let skipped = 0
for (const f of files) {
  const r = relocate(f)
  if (r.changed) {
    console.log(`✓ relocated ${f}`)
    fixed++
  } else {
    console.log(`- ${f} (${r.reason})`)
    skipped++
  }
}
console.log(`\nRelocated: ${fixed} | Skipped: ${skipped}`)
