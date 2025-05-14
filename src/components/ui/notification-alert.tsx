"use client";

import { useState, useEffect } from "react";
import { X } from "lucide-react";
import { Button } from "~/components/ui/button";
import { onNewNotification } from "~/lib/notification-service";
import { api } from "~/trpc/react";

export function NotificationAlert() {
  const [showAlert, setShowAlert] = useState(false);
  const [notification, setNotification] = useState<{
    id: number | bigint;
    message: string;
    cabinet_name: string;
    cabinet_id: string;
    chat_name: string;
  } | null>(null);
  
  const markAsRead = api.notification.markAsRead.useMutation();
  
  // Format message by removing the prefix
  const formatMessage = (message: string) => {
    return message.replace(/\[.*?\] Автоматическое оповещение: /g, '');
  };
  
  // Handle close and mark as read
  const handleClose = () => {
    if (notification) {
      markAsRead.mutate({ id: BigInt(notification.id) });
    }
    setShowAlert(false);
  };
  
  // Set up listener for new notifications
  useEffect(() => {
    const unsubscribe = onNewNotification(() => {
      // Get the most recent unread notification
      api.notification.getUnreadNotifications.fetchQuery().then(notifications => {
        if (notifications && notifications.length > 0) {
          // Get the latest notification (first in the array)
          const latest = notifications[0];
          setNotification(latest);
          setShowAlert(true);
          
          // Auto-close after 10 seconds
          setTimeout(() => {
            setShowAlert(false);
          }, 10000);
        }
      }).catch(error => {
        console.error("Error fetching notifications:", error);
      });
    });
    
    return () => {
      unsubscribe();
    };
  }, []);
  
  if (!showAlert || !notification) return null;
  
  return (
    <div className="fixed inset-0 flex items-center justify-center z-50 bg-black bg-opacity-70">
      <div className="bg-red-600 text-white p-8 rounded-lg max-w-4xl w-full mx-4 shadow-lg border-2 border-white animate-pulse">
        <div className="flex justify-between items-start mb-6">
          <div className="flex-1">
            <h1 className="text-3xl font-bold mb-1">ВНИМАНИЕ!</h1>
            <div className="text-xl font-medium">
              {notification.cabinet_name} #{notification.cabinet_id}
            </div>
            <div className="opacity-90 text-lg">
              Чат: {notification.chat_name}
            </div>
          </div>
          <Button 
            variant="ghost" 
            size="icon" 
            className="text-white hover:bg-red-700 -mt-2 -mr-2"
            onClick={handleClose}
          >
            <X className="h-6 w-6" />
            <span className="sr-only">Закрыть</span>
          </Button>
        </div>
        
        <div className="bg-red-700 p-4 rounded-lg mb-6">
          <p className="text-2xl whitespace-pre-wrap">
            {formatMessage(notification.message)}
          </p>
        </div>
        
        <div className="flex justify-end">
          <Button 
            variant="outline" 
            className="border-white text-white hover:bg-red-700 text-lg px-6 py-2 h-auto"
            onClick={handleClose}
          >
            Понятно
          </Button>
        </div>
      </div>
    </div>
  );
}

