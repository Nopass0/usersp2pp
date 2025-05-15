"use client";

import { useEffect, useRef } from "react";
import {
  useNotificationStore,
  fetchAndProcessMessages,
  requestNotificationPermission,
} from "~/lib/notification-service";
import {
  registerServiceWorker,
  setupServiceWorker,
  scheduleBackgroundChecks
} from "~/lib/service-worker-handler";

interface NotificationWrapperProps {
  children: React.ReactNode;
}

export function NotificationWrapper({ children }: NotificationWrapperProps) {
  // Use a ref to track initialization instead of state to avoid re-renders
  const initializedRef = useRef(false);
  const serviceWorkerRegisteredRef = useRef(false);

  useEffect(() => {
    // Run this only once
    if (!initializedRef.current) {
      initializedRef.current = true;

      const store = useNotificationStore.getState();

      // Set API values from environment variables
      const apiKey = process.env.NEXT_PUBLIC_TELEGRAM_API_KEY || "";
      const apiUrl = process.env.NEXT_PUBLIC_TELEGRAM_API_URL || "";

      if (!apiKey || !apiUrl) {
        console.error("API key and URL must be set in environment variables");
      }

      store.setApiConfig(apiKey, apiUrl);

      // Start polling with a delay to ensure config is set
      const pollingTimeout = setTimeout(() => {
        store.startPolling();
      }, 500);

      // Schedule initial fetch
      const fetchTimeout = setTimeout(() => {
        fetchAndProcessMessages().catch((err) => {
          console.warn("Initial notification fetch failed:", err);
        });
      }, 1000);

      // Register service worker
      if (!serviceWorkerRegisteredRef.current && 'serviceWorker' in navigator) {
        serviceWorkerRegisteredRef.current = true;

        // Use a listener for first user interaction to register service worker
        const registerServiceWorkerAfterInteraction = async () => {
          try {
            // Request notification permission first
            await requestNotificationPermission();

            // Register service worker
            const registration = await registerServiceWorker();

            if (registration) {
              // Set up service worker with API key
              await setupServiceWorker(registration);

              // Schedule background checks every 5 minutes
              scheduleBackgroundChecks(5);

              console.log('Service worker registered and background checks scheduled');
            }
          } catch (error) {
            console.error('Failed to register service worker:', error);
          }
        };

        // Add interaction event listeners
        const interactionEvents = ['click', 'touchstart', 'keydown'];
        const handleInteraction = () => {
          registerServiceWorkerAfterInteraction();
          // Remove event listeners once registered
          interactionEvents.forEach(event => {
            window.removeEventListener(event, handleInteraction);
          });
        };

        // Set up event listeners
        interactionEvents.forEach(event => {
          window.addEventListener(event, handleInteraction);
        });
      }

      // Clean up timeouts on unmount
      return () => {
        clearTimeout(pollingTimeout);
        clearTimeout(fetchTimeout);
        // Don't call stopPolling here to avoid the infinite loop
      };
    }

    // Empty return function for when initializedRef.current is true
    return () => {};
  }, []); // Empty dependency array - run only on mount

  return <>{children}</>;
}
