import { Capacitor } from '@capacitor/core'

// Hide all pricing / upgrade / "buy plan" UI on every native mobile build
// (iOS forbids external payment links per App Store Guideline 3.1.1; we keep
// Android aligned so the experience is consistent). Payments only on the web.
export function useShowUpgradeUI() {
  return !Capacitor.isNativePlatform()
}
