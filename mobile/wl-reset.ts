/**
 * Restore the working tree to canonical Shopifree main state.
 *
 * Use this after building a white-label AAB/IPA to clean up the local
 * branding files so subsequent commits don't accidentally include per-tenant
 * values. The pre-commit hook also calls into the same logic to block dirty
 * commits — this script is the manual escape hatch.
 *
 * Usage: npm run wl:reset
 */

import { execSync } from 'child_process'
import { existsSync, unlinkSync } from 'fs'
import { resolve } from 'path'
import { BRANDING_FILES, TENANT_ARTIFACTS } from './branding-files'

function run(cmd: string) {
  return execSync(cmd, { encoding: 'utf-8' }).trim()
}

function main() {
  // Restore tracked branding files from HEAD. `git restore` is a no-op for
  // files that already match HEAD, so this is safe to run at any time.
  const tracked = BRANDING_FILES.filter(f => {
    try {
      run(`git ls-files --error-unmatch "${f}"`)
      return true
    } catch {
      return false
    }
  })

  if (tracked.length > 0) {
    // --staged + --worktree restores BOTH the index and the working tree, so
    // an `npm run wl:reset` after a `git add android/...` still leaves a clean
    // diff. With only `git restore --` the index keeps the staged change and
    // the pre-commit hook would still flag it.
    run(`git restore --staged --worktree -- ${tracked.map(f => `"${f}"`).join(' ')}`)
    console.log(`✓ Restored ${tracked.length} branding files to Shopifree main`)
  }

  // Remove gitignored per-tenant artifacts. These don't live in git so we
  // can't `git restore`; we just delete them. Next `wl:config` regenerates.
  let removed = 0
  for (const path of TENANT_ARTIFACTS) {
    const abs = resolve(process.cwd(), path)
    if (existsSync(abs)) {
      unlinkSync(abs)
      removed++
    }
  }
  if (removed > 0) {
    console.log(`✓ Removed ${removed} per-tenant artifact(s)`)
  }

  // Final sanity check
  const status = run('git status --porcelain -- ' + BRANDING_FILES.map(f => `"${f}"`).join(' '))
  if (status) {
    console.error('✗ Some branding files still differ from HEAD after restore:')
    console.error(status)
    process.exit(1)
  }

  console.log('\n✓ Working tree is back to Shopifree main canonical state.')
}

main()
