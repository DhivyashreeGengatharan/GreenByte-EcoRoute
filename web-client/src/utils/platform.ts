import { Capacitor } from '@capacitor/core';

// Clean up any stale flags so web browsers are never mistakenly treated as APK
try {
  if (typeof window !== 'undefined') {
    localStorage.removeItem('ecoroute_app_mode');
    localStorage.removeItem('ecoroute_platform');
  }
} catch (e) {
  // ignore
}

/**
 * Returns true STRICTLY if running inside the compiled native mobile APK (Capacitor on Android/iOS).
 * For ALL web browsers (desktop, mobile web, Brave, Chrome, Safari, Vercel deployments),
 * this strictly returns false.
 */
export const isNativeApk = (): boolean => {
  if (typeof window === 'undefined') return false;

  // 1. Strict Capacitor native platform check
  try {
    if (Capacitor.isNativePlatform()) {
      return true;
    }
    const platform = Capacitor.getPlatform();
    if (platform === 'android' || platform === 'ios') {
      return true;
    }
  } catch (e) {
    // ignore
  }

  // 2. Strict Capacitor bridge object injected by native Android container
  if (
    typeof (window as any).Capacitor !== 'undefined' && 
    typeof (window as any).Capacitor.isNativePlatform === 'function' && 
    (window as any).Capacitor.isNativePlatform() === true
  ) {
    return true;
  }

  // All standard web browsers (Brave, Chrome, Safari, Firefox, Edge on desktop or mobile)
  return false;
};
