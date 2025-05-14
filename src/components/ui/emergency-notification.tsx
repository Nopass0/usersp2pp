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
      // Try with data URI technique first (more reliable in browsers)
      try {
        const audio = new Audio("data:audio/wav;base64,//uQRAAAAWMSLwUIYAAsYkXgoQwAEaYLWfkWgAI0wWs/ItAAAGDgYtAgAyN+QWaAAihwMWm4G8QQRDiMcCBcH3Cc+CDv/7xA4Tvh9Rz/y8QADBwMWgQAZG/ILNAARQ4GLTcDeIIIhxGOBAuD7hOfBB3/94gcJ3w+o5/5eIAIAAAVwWgQAVQ2ORaIQwEMAJiDg95G4nQL7mQVWI6GwRcfsZAcsKkJvxgxEjzFUgfHoSQ9Qq7KNwqHwuB13MA4a1q/DmBrHgPcmjiGoh//EwC5nGPEmS4RcfkVKOhJf+WOgoxJclFz3kgn//dBA+ya1GhurNn8zb//9NNutNuhz31f////9vt///z+IdAEAAAK4LQIAKobHItEIYCGAExBwe8jcToF9zIKrEdDYIuP2MgOWFSE34wYiR5iqQPj0JIeoVdlG4VD4XA67mAcNa1fhzA1jwHuTRxDUQ//iYBczjHiTJcIuPyKlHQkv/LHQUYkuSi57yQT//uggfZNajQ3Vmz+Zt//+mm3Wm3Q576v////+32///5/EOgAAADVghQAAAAA//uQZAUAB1WI0PZugAAAAAoQwAAAEk3nRd2qAAAAACiDgAAAAAAABCqEEQRLCgwpBGMlJkIz8jKhGvj4k6jzRnqasNKIeoh5gI7BJaC1A1AoNBjJgbyApVS4IDlZgDU5WUAxEKDNmmALHzZp0Fkz1FMTmGFl1FMEyodIavcCAUHDWrKAIA4aa2oCgILEBupZgHvAhEBcZ6joQBxS76AgccrFlczBvKLC0QI2cBoCFvfTDAo7eoOQInqDPBtvrDEZBNYN5xwNwxQRfw8ZQ5wQVLvO8OYU+mHvFLlDh05Mdg7BT6YrRPpCBznMB2r//xKJjyyOh+cImr2/4doscwD6neZjuZR4AgAABYAAAABy1xcdQtxYBYYZdifkUDgzzXaXn98Z0oi9ILU5mBjFANmRwlVJ3/6jYDAmxaiDG3/6xjQQCCKkRb/6kg/wW+kSJ5//rLobkLSiKmqP/0ikJuDaSaSf/6JiLYLEYnW/+kXg1WRVJL/9EmQ1YZIsv/6Qzwy5qk7/+tEU0nkls3/zIUMPKNX/6yZLf+kFgAfgGyLFAUwY//uQZAUABcd5UiNPVXAAAApAAAAAE0VZQKw9ISAAACgAAAAAVQIygIElVrFkBS+Jhi+EAuu+lKAkYUEIsmEAEoMeDmCETMvfSHTGkF5RWH7kz/ESHWPAq/kcCRhqBtMdokPdM7vil7RG98A2sc7zO6ZvTdM7pmOUAZTnJW+NXxqmd41dqJ6mLTXxrPpnV8AvadNvGGcnhFd/djf3kub/xmN8P/tqfEAAAAASUVORK5CYII=");
        audio.play().catch(() => {});
      } catch (e) {
        // Fallback to console.log approach
      }

      // Also try to use console.log approach with special character for PC beep
      try {
        // Direct single beep
        console.log('\u0007'); // BEL character (ASCII 7)

        // Multiple beeps for better attention
        for (let i = 0; i < 5; i++) {
          setTimeout(() => {
            console.log('\u0007'); // BEL character (ASCII 7)
          }, i * 200);
        }
      } catch (e) {
        console.error("Error playing system beep:", e);
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