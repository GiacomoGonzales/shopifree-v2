# Mobile build flows

Two build modes share this codebase:

| App | Identity | Build command |
|---|---|---|
| **Shopifree main** (dashboard) | `app.shopifree.mobile` / "Shopifree" | `npm run build:main` |
| **White-label** (per-store) | `app.shopifree.store.<subdomain>` / store name | `npm run wl <storeId> <android\|ios>` |

The repo's git state is **always** Shopifree main. White-label builds overwrite branding files in the working tree, but the orchestrator restores everything before the script exits — so between any two runs, `git status` only shows real code changes.

## Day-to-day flows

### Build the Shopifree dashboard app

```bash
git pull
npm install            # also configures git hooks (one-time per clone)
npm run build:main
# Then open Android Studio (Windows) or Xcode (Mac) and build/sign normally.
```

No special steps. The repo is already in canonical state.

### Build a white-label app for a store (Windows → Android AAB)

```bash
git pull
npm run wl amaranto-women android
```

Under the hood:
1. Pulls store data from Firestore, regenerates `capacitor.config.ts`, `strings.xml`, splash drawables, launcher icons, iOS Info.plist + Storyboard, etc.
2. `vite build --mode whitelabel`
3. `cap sync android`
4. `gradle assembleRelease`
5. **`finally`**: restores Shopifree main state in the working tree.

Output: `android/app/build/outputs/apk/release/app-release.apk` (or `bundle/release/app-release.aab`). Sign + upload to Play Console.

### Build a white-label app for a store (Mac → iOS IPA)

```bash
git pull
npm run wl amaranto-women ios
# Then:
cd ios && fastlane build
```

The `wl` script generates assets, syncs, and **then auto-restores** before exiting (it doesn't run fastlane). You get a clean Xcode project ready for `fastlane build` or manual archive in Xcode.

### Just generate per-tenant branding (no build, no auto-restore)

```bash
npm run wl:config amaranto-women
# … inspect, debug, run intermediate commands …
npm run wl:reset       # when you're done, restore main state manually
```

Useful for debugging builds in Android Studio interactively. **Remember to run `wl:reset` afterward** — or the pre-commit hook will block your next commit.

## Safety nets

- **Pre-commit hook** (`.githooks/pre-commit`): blocks any commit that includes a per-tenant or branding-shaped file. Lives in `mobile/wl-precommit-check.ts`. Activated automatically by `npm install` (see `prepare` script).
- **Auto-restore in `wl`**: try/finally + SIGINT handler. Even Ctrl+C during the build leaves the repo clean.
- **Bypass for genuine main updates**: `WL_ALLOW_BRANDING_COMMIT=1 git commit ...` — for the rare case where you actually want to update the Shopifree dashboard's logo, splash, etc.

## Files at a glance

| File | Role |
|---|---|
| `mobile/build-config.ts` | Reads Firestore, writes per-tenant branding to native projects. The "white-label generator". |
| `mobile/wl-build.ts` | Orchestrator: config → vite → cap sync → gradle/xcode → restore. |
| `mobile/wl-reset.ts` | Manual escape hatch: restore Shopifree main state. |
| `mobile/wl-precommit-check.ts` | Pre-commit guard against tenant pollution. |
| `mobile/branding-files.ts` | Single source of truth: the list of files that get overwritten per tenant. |
| `mobile/setup-hooks.cjs` | Runs from `npm install`; points git at `.githooks/`. |
| `.githooks/pre-commit` | Bash entrypoint that calls `wl-precommit-check.ts`. |
