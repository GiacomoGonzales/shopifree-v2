import { Capacitor } from '@capacitor/core'

export function useNativeApp() {
  const isNative = Capacitor.isNativePlatform()
  const platform = Capacitor.getPlatform() // 'ios', 'android', or 'web'

  return {
    isNative,
    platform,
    isIOS: platform === 'ios',
    isAndroid: platform === 'android',
    isWeb: platform === 'web'
  }
}
