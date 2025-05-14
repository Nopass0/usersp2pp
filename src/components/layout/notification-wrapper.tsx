"use client";

import { useEffect, useRef } from "react";
import {
  useNotificationStore,
  fetchAndProcessMessages,
} from "~/lib/notification-service";

interface NotificationWrapperProps {
  children: React.ReactNode;
}

export function NotificationWrapper({ children }: NotificationWrapperProps) {
  // Use a ref to track initialization instead of state to avoid re-renders
  const initializedRef = useRef(false);

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
