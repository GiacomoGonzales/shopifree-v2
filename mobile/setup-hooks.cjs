// Configure git to read hooks from .githooks/ instead of .git/hooks/, so the
// repo's hooks travel with the code across machines. Runs from the npm
// `prepare` lifecycle (after install). Silent no-op outside a git worktree
// (e.g. installs from a tarball, CI caches that don't include .git).

const { execSync } = require('child_process')

try {
  execSync('git rev-parse --git-dir', { stdio: 'ignore' })
} catch {
  // Not a git worktree — nothing to do.
  process.exit(0)
}

try {
  const current = execSync('git config --get core.hooksPath', { encoding: 'utf-8', stdio: ['pipe', 'pipe', 'ignore'] }).trim()
  if (current === '.githooks') {
    process.exit(0)
  }
} catch {
  // No hooksPath set yet — fall through and set it.
}

try {
  execSync('git config core.hooksPath .githooks', { stdio: 'ignore' })
  console.log('✓ git hooks path configured to .githooks/')
} catch (e) {
  console.warn('⚠ failed to configure git hooks path:', e.message)
}
