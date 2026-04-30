/**
 * Block commits that include white-label per-tenant artifacts.
 *
 * Invoked by the .githooks/pre-commit hook. The intent is to make it
 * impossible to accidentally commit Amaranto's (or any other tenant's)
 * branding back into main, which is the trap the repo fell into with the
 * 15d85c6 snapshot before this safety net existed.
 *
 * Bypass for the rare legitimate case of updating Shopifree main branding:
 *   WL_ALLOW_BRANDING_COMMIT=1 git commit ...
 */

import { execSync } from 'child_process'
import { BRANDING_FILES, TENANT_ARTIFACTS } from './branding-files'

if (process.env.WL_ALLOW_BRANDING_COMMIT === '1') {
  process.exit(0)
}

const staged = execSync('git diff --cached --name-only', { encoding: 'utf-8' })
  .split(/\r?\n/)
  .filter(Boolean)

const watched = new Set<string>([...BRANDING_FILES, ...TENANT_ARTIFACTS])
const violations = staged.filter((f) => watched.has(f))

if (violations.length === 0) {
  process.exit(0)
}

const branding = violations.filter((f) => (BRANDING_FILES as readonly string[]).includes(f))
const tenant = violations.filter((f) => (TENANT_ARTIFACTS as readonly string[]).includes(f))

console.error('\n✗ commit blocked: white-label artifacts staged for commit')
if (branding.length > 0) {
  console.error('\n  Branding files (canonical state is Shopifree main):')
  branding.forEach((f) => console.error(`    - ${f}`))
}
if (tenant.length > 0) {
  console.error('\n  Per-tenant artifacts (must never enter git):')
  tenant.forEach((f) => console.error(`    - ${f}`))
}
console.error('')
console.error('  Restore the working tree and try again:')
console.error('    npm run wl:reset')
console.error('')
console.error('  If you genuinely want to update Shopifree main branding')
console.error('  (e.g. a new logo for the dashboard app), bypass once with:')
console.error('    WL_ALLOW_BRANDING_COMMIT=1 git commit ...')
console.error('')

process.exit(1)
