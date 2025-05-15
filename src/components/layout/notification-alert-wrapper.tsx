"use client";

import { useState, useEffect } from "react";
import { FullScreenAlert } from "~/components/ui/full-screen-alert";
import { api } from "~/trpc/react";
import {
  useNotificationStore,
  onNewNotification,
  requestNotificationPermission,
  hasNotificationPermission,
  areNotificationsSupported
} from "~/lib/notification-service";

export function NotificationAlertWrapper({ children }: { children: React.ReactNode }) {
  const [showAlert, setShowAlert] = useState(false);
  const [newNotifications, setNewNotifications] = useState<any[]>([]);

  // Get notification API mutation for marking as read
  const markAsRead = api.notification.markAsRead.useMutation();
  const markAllAsRead = api.notification.markAllAsRead.useMutation();

  // Get notifications from store
  const { notifications, desktopNotificationsEnabled, setDesktopNotificationsEnabled } = useNotificationStore();
  
  // Function to mark a notification as read
  const handleMarkAsRead = (id: number) => {
    markAsRead.mutate({ id });
    setNewNotifications(prev => prev.filter(notification => notification.id !== id));
    
    // Close the alert if all notifications have been read
    if (newNotifications.length <= 1) {
      setShowAlert(false);
    }
  };
  
  // Function to mark all notifications as read
  const handleMarkAllAsRead = () => {
    markAllAsRead.mutate();
    setNewNotifications([]);
    setShowAlert(false);
  };
  
  // Request notification permissions when component mounts
  useEffect(() => {
    // Only request permissions if desktop notifications are enabled in settings
    if (desktopNotificationsEnabled && areNotificationsSupported()) {
      // Check if we already have permission
      if (!hasNotificationPermission()) {
        // Request permission after user interaction
        const requestPermissions = async () => {
          const granted = await requestNotificationPermission();
          // If permission was denied, disable desktop notifications in settings
          if (!granted) {
            setDesktopNotificationsEnabled(false);
          }
        };

        // Use a listener for the first user interaction
        const handleInteraction = () => {
          requestPermissions();
          // Remove the listener once we've requested permissions
          ['click', 'touchstart', 'keydown'].forEach(event => {
            window.removeEventListener(event, handleInteraction);
          });
        };

        // Add event listeners for common user interactions
        ['click', 'touchstart', 'keydown'].forEach(event => {
          window.addEventListener(event, handleInteraction);
        });

        // Cleanup listeners if component unmounts
        return () => {
          ['click', 'touchstart', 'keydown'].forEach(event => {
            window.removeEventListener(event, handleInteraction);
          });
        };
      }
    }
  }, [desktopNotificationsEnabled, setDesktopNotificationsEnabled]);

  // Listen for new notifications and show alert
  useEffect(() => {
    // Set up listener for new notifications
    const unsubscribe = onNewNotification(() => {
      // This is triggered when a new notification arrives

      // Fetch latest unread notifications
      api.notification.getUnreadNotifications.fetchQuery().then(unreadNotifications => {
        if (unreadNotifications && unreadNotifications.length > 0) {
          setNewNotifications(unreadNotifications);
          setShowAlert(true);
        }
      }).catch(error => {
        console.error("Error fetching unread notifications:", error);
      });
    });

    return () => {
      unsubscribe();
    };
  }, []);
  
  return (
    <>
      {children}
      
      {showAlert && newNotifications.length > 0 && (
        <FullScreenAlert 
          notifications={newNotifications}
          onClose={() => setShowAlert(false)}
          onMarkAsRead={handleMarkAsRead}
          onMarkAllAsRead={handleMarkAllAsRead}
        />
      )}
    </>
  );
}