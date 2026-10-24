import { Capacitor } from '@capacitor/core';

/**
 * Detects whether the current runtime environment is the mobile application (Android / Capacitor APK)
 * vs a standard web browser application.
 */
export const isAppPlatform = (): boolean => {
  if (typeof window === 'undefined') return false;

  // 1. Native Capacitor bridge check
  try {
    if (Capacitor.isNativePlatform()) return true;
    const platform = Capacitor.getPlatform();
    if (platform === 'android' || platform === 'ios') return true;
  } catch (e) {
    // ignore
  }

  // 2. Query parameter explicitly injected by Capacitor or app shortcut
  try {
    const params = new URLSearchParams(window.location.search);
    if (params.get('platform') === 'app' || params.get('app') === 'true') {
      localStorage.setItem('ecoroute_app_mode', 'true');
      return true;
    }
  } catch (e) {
    // ignore
  }

  // 3. Persistent flag from a prior native app session
  if (localStorage.getItem('ecoroute_app_mode') === 'true') {
    return true;
  }

  // 4. Capacitor or Android WebView markers in window or userAgent
  if (
    typeof (window as any).Capacitor !== 'undefined' ||
    /Capacitor|wv|Android.*Version\/[0-9.]+\s+Chrome/i.test(navigator.userAgent)
  ) {
    return true;
  }

  return false;
};
