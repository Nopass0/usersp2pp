// Service Worker Handler for registering and managing service worker

import { useNotificationStore } from "./notification-service";

// Register service worker
export async function registerServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  if (!('serviceWorker' in navigator)) {
    console.warn('Service workers are not supported by this browser');
    return null;
  }

  try {
    // Register the service worker
    const registration = await navigator.serviceWorker.register('/service-worker.js', {
      scope: '/'
    });
    
    console.log('Service Worker registered with scope:', registration.scope);
    
    // Set up the API key in the service worker
    await setupServiceWorker(registration);
    
    return registration;
  } catch (error) {
    console.error('Service Worker registration failed:', error);
    return null;
  }
}

// Setup service worker with API key
export async function setupServiceWorker(registration: ServiceWorkerRegistration): Promise<void> {
  try {
    // Get API key from notification store
    const { apiKey } = useNotificationStore.getState();
    
    // Wait for service worker to become active
    const serviceWorker = registration.active || registration.waiting || registration.installing;
    
    if (!serviceWorker) {
      console.warn('No active service worker found');
      return;
    }
    
    // If the service worker is installing, wait for it to finish
    if (serviceWorker.state === 'installing') {
      await new Promise<void>((resolve) => {
        serviceWorker.addEventListener('statechange', () => {
          if (serviceWorker.state === 'activated') {
            resolve();
          }
        });
      });
    }
    
    // Send API key to service worker
    if (serviceWorker.state === 'activated') {
      serviceWorker.postMessage({
        type: 'SET_API_KEY',
        apiKey: apiKey
      });
      
      console.log('API key sent to Service Worker');
    }
  } catch (error) {
    console.error('Error setting up service worker:', error);
  }
}

// Check for notifications in the background
export async function checkNotificationsBackground(): Promise<void> {
  if (!('serviceWorker' in navigator)) {
    return;
  }
  
  try {
    const registration = await navigator.serviceWorker.ready;
    
    // Tell service worker to check for notifications
    registration.active?.postMessage({
      type: 'CHECK_NOTIFICATIONS'
    });
    
    // Register for background sync if supported
    if ('sync' in registration) {
      await registration.sync.register('fetch-notifications');
      await registration.sync.register('fetch-cancellations');
    }
  } catch (error) {
    console.error('Error triggering background notification check:', error);
  }
}

// Schedule periodic background checks
export function scheduleBackgroundChecks(intervalMinutes = 5): void {
  if (typeof window === 'undefined') return;

  // Clear any existing interval
  if (window._notificationCheckInterval) {
    clearInterval(window._notificationCheckInterval);
    window._notificationCheckInterval = null;
  }

  // Set up new interval
  window._notificationCheckInterval = setInterval(() => {
    checkNotificationsBackground().catch(error => {
      console.error('Background notification check failed:', error);
    });
  }, intervalMinutes * 60 * 1000); // Convert minutes to milliseconds

  // Run initial check
  checkNotificationsBackground().catch(error => {
    console.error('Initial background notification check failed:', error);
  });
}

// Request push notification subscription
export async function subscribeForPushNotifications(): Promise<PushSubscription | null> {
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
    console.warn('Push notifications are not supported by this browser');
    return null;
  }
  
  try {
    const registration = await navigator.serviceWorker.ready;
    
    // Check for existing subscription
    let subscription = await registration.pushManager.getSubscription();
    
    // If not subscribed, create new subscription
    if (!subscription) {
      // This uses VAPID keys which would need to be generated and stored on the server
      // For now, we're using a dummy public key
      const publicKey = 'BEl62iUYgUivxIkv69yViEuiBIa-Ib9-SkvMeAtA3LFgDzkrxZJjSgSnfckjBJuBkr3qBUYIHBQFLXYp5Nksh8U';
      
      // Convert public key to array buffer
      const applicationServerKey = urlBase64ToUint8Array(publicKey);
      
      // Subscribe
      subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey
      });
      
      console.log('User is subscribed to push notifications');
    }
    
    return subscription;
  } catch (error) {
    console.error('Error subscribing to push notifications:', error);
    return null;
  }
}

// Helper function to convert base64 to Uint8Array
function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - base64String.length % 4) % 4);
  const base64 = (base64String + padding)
    .replace(/-/g, '+')
    .replace(/_/g, '/');
  
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  
  return outputArray;
}

// Clean up function to unregister service worker
export async function unregisterServiceWorker(): Promise<boolean> {
  if (!('serviceWorker' in navigator)) {
    return false;
  }
  
  try {
    const registration = await navigator.serviceWorker.ready;
    const result = await registration.unregister();
    
    // Clear background check interval
    if (window._notificationCheckInterval) {
      clearInterval(window._notificationCheckInterval);
    }
    
    return result;
  } catch (error) {
    console.error('Error unregistering service worker:', error);
    return false;
  }
}

// Add type definitions
declare global {
  interface Window {
    _notificationCheckInterval?: number | NodeJS.Timeout | null;
  }
}