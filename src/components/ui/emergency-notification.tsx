"use client";

import { useState, useEffect } from "react";
import { X, AlertTriangle, Lightbulb } from "lucide-react";
import { Button } from "~/components/ui/button";
import { onNewNotification, useNotificationStore } from "~/lib/notification-service";
import { api } from "~/trpc/react";
import { useRouter } from "next/navigation";

export function EmergencyNotification() {
  const router = useRouter();
  const [showAlert, setShowAlert] = useState(false);
  const [notification, setNotification] = useState<{
    id: number;
    message: string;
    cabinet_name: string;
    cabinet_id: string;
  } | null>(null);

  const markAsRead = api.notification.markAsRead.useMutation({
    onSuccess: () => {
      // Navigate to dashboard after marking as read
      router.push('/dashboard');
    }
  });
  
  // Format message by removing the prefix
  const formatMessage = (message: string) => {
    return message.replace(/\[.*?\] Автоматическое оповещение: /g, '');
  };
  
  // Handle close and mark as read
  const handleClose = () => {
    if (notification) {
      markAsRead.mutate({ id: notification.id });
    }
    setShowAlert(false);
  };
  
  // Set up listener for new notifications - this is triggered automatically when a new notification arrives
  // Fetch the latest unread notifications both on component mount and when new notifications arrive
  // Use the tRPC hook instead of direct query
  const { data: notifications } = api.notification.getUnreadNotifications.useQuery(undefined, {
    refetchOnWindowFocus: false
  });

  const fetchLatestNotification = () => {
    // Use the data from the hook
    if (notifications && notifications.length > 0) {
      // Get the latest notification
      const latest = notifications[0];
      setNotification(latest);
      setShowAlert(true);
    }
  };

  // Check for unread notifications when notifications data updates
  useEffect(() => {
    fetchLatestNotification();
  }, [notifications]);

  // Get notification store to access PC beep setting
  const { pcBeepEnabled } = useNotificationStore();

  // Function to play PC beep directly
  const playSystemBeep = () => {
    if (pcBeepEnabled) {
      // Try to use console.log approach with special character for PC beep
      for (let i = 0; i < 5; i++) {
        setTimeout(() => {
          console.log('\u0007'); // BEL character (ASCII 7)
        }, i * 200);
      }
    }
  };

  // Play beep when notification appears or becomes visible
  useEffect(() => {
    if (showAlert && notification) {
      // Use a small delay to ensure the beep plays after the component renders
      const timeout = setTimeout(() => {
        playSystemBeep();
      }, 100);

      return () => {
        clearTimeout(timeout);
      };
    }
  }, [showAlert, notification, pcBeepEnabled]);

  // Set up listener for new notifications
  useEffect(() => {
    const handleNewNotification = () => {
      // No query invalidation here - let React Query handle the refetching
      // Just manually fetch the latest notification to be safe
      try {
        fetchLatestNotification();
      } catch (error) {
        console.error("Error handling notification:", error);
      }
    };

    const unsubscribe = onNewNotification(handleNewNotification);

    return () => {
      unsubscribe();
    };
  }, []);
  
  if (!showAlert || !notification) return null;
  
  return (
    <div className="fixed inset-0 flex items-center justify-center z-50 bg-black bg-opacity-80">
      <div className="bg-red-600 text-white p-6 rounded-lg w-full max-w-2xl mx-4 shadow-2xl border-4 border-yellow-300">
        <div className="flex justify-between items-center mb-4">
          <div className="flex-1 text-center relative">
            {/* Flashing lightbulbs */}
            <div className="absolute -top-7 -left-7">
              <Lightbulb className="h-14 w-14 text-yellow-300 animate-pulse" />
            </div>
            <div className="absolute -top-7 -right-7">
              <Lightbulb className="h-14 w-14 text-yellow-300 animate-pulse" style={{ animationDelay: '0.5s' }} />
            </div>
            
            <h1 className="text-3xl font-bold tracking-wider flex items-center justify-center">
              <AlertTriangle className="h-8 w-8 mr-2" />
              СРОЧНОЕ УВЕДОМЛЕНИЕ!
              <AlertTriangle className="h-8 w-8 ml-2" />
            </h1>
          </div>
          
          <Button 
            variant="ghost" 
            size="icon" 
            className="text-white hover:bg-red-700 -mr-2 h-12 w-12"
            onClick={handleClose}
          >
            <X className="h-8 w-8" />
            <span className="sr-only">Закрыть</span>
          </Button>
        </div>
        
        <div className="bg-red-700 p-5 rounded-lg mb-5 border-2 border-white">
          <div className="text-2xl font-bold mb-2 flex items-center gap-2">
            Кабинет: {notification.cabinet_name}
            <span className="text-yellow-300">#{notification.cabinet_id}</span>
          </div>
          <p className="text-xl whitespace-pre-wrap">
            {formatMessage(notification.message)}
          </p>
        </div>
        
        <div className="flex justify-center">
          <Button 
            variant="default" 
            className="bg-yellow-500 hover:bg-yellow-600 text-black font-bold text-lg px-10 py-3 h-auto"
            onClick={handleClose}
          >
            ПОНЯТНО
          </Button>
        </div>
      </div>
    </div>
  );
}