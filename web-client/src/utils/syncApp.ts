import toast from 'react-hot-toast';

/**
 * syncLiveApp
 * Forces a fresh cache-busted synchronization with the live cloud deployment.
 * 1. Unregisters all PWA service workers (clearing cached HTML/JS chunks).
 * 2. Purges browser cache storage.
 * 3. Preserves localStorage (keeps user authentication token & staked credits).
 * 4. Hard-reloads the page with a timestamp query param.
 */
export const syncLiveApp = async () => {
  const toastId = toast.loading('🔄 Syncing latest GreenByte updates from cloud...', {
    duration: 3500,
  });

  try {
    if ('serviceWorker' in navigator) {
      const registrations = await navigator.serviceWorker.getRegistrations();
      for (const registration of registrations) {
        await registration.unregister();
      }
    }

    if ('caches' in window) {
      const cacheKeys = await caches.keys();
      for (const key of cacheKeys) {
        await caches.delete(key);
      }
    }

    sessionStorage.clear();
  } catch (err) {
    console.warn('Cache purge notice:', err);
  }

  setTimeout(() => {
    toast.success('App updated to latest cloud version!', { id: toastId });
    const cleanUrl = window.location.origin + window.location.pathname;
    window.location.href = `${cleanUrl}?sync_v=${Date.now()}`;
  }, 450);
};
