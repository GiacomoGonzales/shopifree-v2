import { Capacitor } from '@capacitor/core'

// Hide all pricing / upgrade / "buy plan" UI on iOS native, where Apple
// forbids linking to external payment (App Store Guideline 3.1.1).
// Returns false on iOS, true everywhere else (web + Android for now).
export function useShowUpgradeUI() {
  return Capacitor.getPlatform() !== 'ios'
}
