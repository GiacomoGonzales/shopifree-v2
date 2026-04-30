/**
 * Single source of truth for the files that `wl:config <store>` overwrites
 * with per-tenant values. The repo's canonical state for these files is
 * Shopifree main; anything else is transient (white-label generation).
 *
 * Used by:
 *   - mobile/wl-reset.ts          → restore Shopifree main state via git
 *   - mobile/wl-build.ts          → auto-restore in try/finally around the
 *                                   native build
 *   - .git/hooks/pre-commit       → block commits if any of these files
 *                                   diverge from HEAD (= Shopifree main)
 */

export const BRANDING_FILES = [
  // Capacitor
  'capacitor.config.ts',

  // Android — branding
  'android/app/src/main/res/values/strings.xml',
  'android/app/src/main/res/values/styles.xml',
  'android/app/src/main/res/values/ic_launcher_background.xml',
  'android/app/src/main/res/drawable/ic_launcher_background.xml',

  // Android — splash icon (Android 12+ system splash)
  'android/app/src/main/res/drawable/ic_splash_icon.png',

  // Android — legacy splash drawables (pre-12 fallback + Capacitor splash)
  'android/app/src/main/res/drawable/splash.png',
  'android/app/src/main/res/drawable-port-mdpi/splash.png',
  'android/app/src/main/res/drawable-port-hdpi/splash.png',
  'android/app/src/main/res/drawable-port-xhdpi/splash.png',
  'android/app/src/main/res/drawable-port-xxhdpi/splash.png',
  'android/app/src/main/res/drawable-port-xxxhdpi/splash.png',
  'android/app/src/main/res/drawable-land-mdpi/splash.png',
  'android/app/src/main/res/drawable-land-hdpi/splash.png',
  'android/app/src/main/res/drawable-land-xhdpi/splash.png',
  'android/app/src/main/res/drawable-land-xxhdpi/splash.png',
  'android/app/src/main/res/drawable-land-xxxhdpi/splash.png',

  // Android — launcher icons (5 densities × 3 variants)
  'android/app/src/main/res/mipmap-mdpi/ic_launcher.png',
  'android/app/src/main/res/mipmap-mdpi/ic_launcher_foreground.png',
  'android/app/src/main/res/mipmap-mdpi/ic_launcher_round.png',
  'android/app/src/main/res/mipmap-hdpi/ic_launcher.png',
  'android/app/src/main/res/mipmap-hdpi/ic_launcher_foreground.png',
  'android/app/src/main/res/mipmap-hdpi/ic_launcher_round.png',
  'android/app/src/main/res/mipmap-xhdpi/ic_launcher.png',
  'android/app/src/main/res/mipmap-xhdpi/ic_launcher_foreground.png',
  'android/app/src/main/res/mipmap-xhdpi/ic_launcher_round.png',
  'android/app/src/main/res/mipmap-xxhdpi/ic_launcher.png',
  'android/app/src/main/res/mipmap-xxhdpi/ic_launcher_foreground.png',
  'android/app/src/main/res/mipmap-xxhdpi/ic_launcher_round.png',
  'android/app/src/main/res/mipmap-xxxhdpi/ic_launcher.png',
  'android/app/src/main/res/mipmap-xxxhdpi/ic_launcher_foreground.png',
  'android/app/src/main/res/mipmap-xxxhdpi/ic_launcher_round.png',

  // iOS
  'ios/App/App.xcodeproj/project.pbxproj',
  'ios/App/App/Info.plist',
  'ios/App/App/Base.lproj/LaunchScreen.storyboard',
  'ios/App/App/Assets.xcassets/AppIcon.appiconset/AppIcon-512@2x.png',
  'ios/App/App/Assets.xcassets/Splash.imageset/splash-2732x2732.png',
  'ios/App/App/Assets.xcassets/Splash.imageset/splash-2732x2732-1.png',
  'ios/App/App/Assets.xcassets/Splash.imageset/splash-2732x2732-2.png',
] as const

/**
 * Per-tenant artifacts that are gitignored entirely. They live on disk after
 * `wl:config <store>` but never enter version control. `wl:reset` removes
 * them so the working tree is fully clean for committing code changes.
 */
export const TENANT_ARTIFACTS = [
  '.env.whitelabel',
  '.build-meta.json',
  'android/app/whitelabel.properties',
  'public/whitelabel-splash-logo.png',
] as const
