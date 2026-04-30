/**
 * Orchestrate a white-label build end-to-end with guaranteed cleanup.
 *
 *   1. Generate per-tenant branding via build-config.ts
 *   2. Build the web bundle (Vite, white-label mode)
 *   3. Sync to the requested native platform
 *   4. Optionally run the native build (gradle for Android)
 *   5. Restore Shopifree main state in a finally block — even on Ctrl+C
 *      or build failure — so the repo is never left in tenant state
 *
 * Usage:
 *   npx tsx mobile/wl-build.ts <storeId> android         (Windows: full build)
 *   npx tsx mobile/wl-build.ts <storeId> ios             (Mac: prepares Xcode/fastlane)
 *   npx tsx mobile/wl-build.ts <storeId> sync            (just generate + cap sync)
 *
 * The auto-restore is the load-bearing guarantee: between any two consecutive
 * runs of this script the working tree is guaranteed to be Shopifree main.
 */

import { spawn, spawnSync } from 'child_process'
import { resolve } from 'path'

type Platform = 'android' | 'android-install' | 'ios' | 'sync'

const storeId = process.argv[2]
const platform = (process.argv[3] || 'sync') as Platform
const ALL: Platform[] = ['android', 'android-install', 'ios', 'sync']

if (!storeId) {
  console.error('Usage: npx tsx mobile/wl-build.ts <storeId> [android|android-install|ios|sync]')
  console.error('  android         → AAB for Play Console (signed release)')
  console.error('  android-install → APK for adb install on a connected device (release-signed)')
  console.error('  ios             → cap sync ios (build with fastlane / Xcode)')
  console.error('  sync            → just generate config + cap sync (no native build)')
  process.exit(1)
}
if (!ALL.includes(platform)) {
  console.error(`Unknown platform "${platform}". Use one of: ${ALL.join(', ')}.`)
  process.exit(1)
}

function step(name: string) {
  console.log(`\n━━━ ${name} ━━━`)
}

// runStreaming: passes through stdout/stderr so the user sees progress live.
// Returns the exit code; we deliberately don't throw on non-zero so the
// finally block in main() can still run the cleanup.
function runStreaming(cmd: string, args: string[]): Promise<number> {
  return new Promise((resolveFn) => {
    const child = spawn(cmd, args, {
      stdio: 'inherit',
      shell: process.platform === 'win32', // npm/npx need shell on Windows
    })
    child.on('exit', (code) => resolveFn(code ?? 1))
    child.on('error', (err) => {
      console.error(err)
      resolveFn(1)
    })
  })
}

async function autoRestore() {
  step('Cleanup: restoring Shopifree main state')
  const result = spawnSync('npx', ['tsx', resolve('mobile/wl-reset.ts')], {
    stdio: 'inherit',
    shell: process.platform === 'win32',
  })
  if (result.status !== 0) {
    console.error('\n✗ wl-reset failed. Run `npm run wl:reset` manually.')
  }
}

// Trap signals so Ctrl+C still triggers cleanup. Without this, an
// interrupted build would leave the repo in tenant state.
let cleaningUp = false
async function handleSignal(sig: NodeJS.Signals) {
  if (cleaningUp) return
  cleaningUp = true
  console.log(`\n\nReceived ${sig} — cleaning up before exit…`)
  await autoRestore()
  process.exit(130)
}
process.on('SIGINT', handleSignal)
process.on('SIGTERM', handleSignal)

async function main() {
  let buildCode = 0
  try {
    step(`1/4 Generate per-tenant branding for "${storeId}"`)
    const cfg = await runStreaming('npx', ['tsx', resolve('mobile/build-config.ts'), storeId])
    if (cfg !== 0) throw new Error('build-config.ts failed')

    step('2/4 Build web bundle (Vite, white-label mode)')
    const web = await runStreaming('npx', ['vite', 'build', '--mode', 'whitelabel'])
    if (web !== 0) throw new Error('vite build failed')

    if (platform === 'sync' || platform === 'android' || platform === 'android-install') {
      step('3/4 Capacitor sync → Android')
      const sync = await runStreaming('npx', ['cap', 'sync', 'android'])
      if (sync !== 0) throw new Error('cap sync android failed')
    }
    if (platform === 'sync' || platform === 'ios') {
      step('3/4 Capacitor sync → iOS')
      const sync = await runStreaming('npx', ['cap', 'sync', 'ios'])
      if (sync !== 0) throw new Error('cap sync ios failed')
    }

    const isWin = process.platform === 'win32'
    // Windows cmd.exe doesn't search cwd for unqualified commands, so
    // prefix with `.\` to invoke the wrapper from inside android/. On
    // Unix `./gradlew` already resolves correctly under the same cwd.
    const gradleCmd = isWin ? '.\\gradlew.bat' : './gradlew'

    if (platform === 'android') {
      step('4/4 Gradle: bundleRelease (AAB for Play Store)')
      const gradle = spawnSync(gradleCmd, ['bundleRelease'], {
        cwd: resolve('android'),
        stdio: 'inherit',
        shell: isWin,
      })
      buildCode = gradle.status ?? 1
      if (buildCode !== 0) throw new Error('gradle bundleRelease failed')
      console.log('\n✓ AAB ready: android/app/build/outputs/bundle/release/app-release.aab')
      console.log('  Sign + upload to Google Play Console.')
    } else if (platform === 'android-install') {
      step('4/5 Gradle: assembleRelease (APK for direct install)')
      const gradle = spawnSync(gradleCmd, ['assembleRelease'], {
        cwd: resolve('android'),
        stdio: 'inherit',
        shell: isWin,
      })
      buildCode = gradle.status ?? 1
      if (buildCode !== 0) throw new Error('gradle assembleRelease failed')

      step('5/5 adb install -r → connected device')
      const apk = resolve('android/app/build/outputs/apk/release/app-release.apk')
      const adb = spawnSync('adb', ['install', '-r', apk], {
        stdio: 'inherit',
        shell: isWin,
      })
      if (adb.status !== 0) {
        // Don't throw — the build succeeded, only the convenience install
        // failed (e.g. USB-install gate on MIUI). User can retry adb manually.
        console.error('\n⚠ adb install failed (you may need to approve on the device)')
        console.error(`  APK is at: ${apk}`)
        console.error(`  Retry: adb install -r "${apk}"`)
      } else {
        console.log('\n✓ Installed on connected device.')
        console.log(`  APK kept at: ${apk}`)
      }
    } else if (platform === 'ios') {
      console.log('\n✓ iOS project synced. Next:')
      console.log('  cd ios && fastlane build    # or open in Xcode')
      console.log('  When you finish, the cleanup at the end of this script')
      console.log('  has already restored Shopifree main state.')
    } else {
      console.log('\n✓ Sync done. Build natively from android/ or ios/ as needed.')
    }
  } catch (err) {
    console.error(`\n✗ ${(err as Error).message}`)
    buildCode = buildCode || 1
  } finally {
    if (!cleaningUp) {
      cleaningUp = true
      await autoRestore()
    }
  }
  process.exit(buildCode)
}

main()
