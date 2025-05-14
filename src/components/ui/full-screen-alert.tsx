"use client";

import { useState, useEffect, useCallback } from "react";
import { X } from "lucide-react";
import { Button } from "~/components/ui/button";
import { Badge } from "~/components/ui/badge";
import { useRouter } from "next/navigation";

interface FullScreenAlertProps {
  notifications: {
    id: number;
    chat_name: string;
    cabinet_name: string;
    cabinet_id: string;
    message: string;
    timestamp: Date;
    isRead: boolean;
    message_id_str?: string;
  }[];
  onClose: () => void;
  onMarkAsRead: (id: number) => void;
  onMarkAllAsRead: () => void;
}

export function FullScreenAlert({
  notifications,
  onClose,
  onMarkAsRead,
  onMarkAllAsRead,
}: FullScreenAlertProps) {
  const router = useRouter();
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // Animate in
    setTimeout(() => {
      setIsVisible(true);
    }, 50);

    // Add escape key handler
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        handleClose();
      }
    };

    window.addEventListener("keydown", handleEscape);
    return () => {
      window.removeEventListener("keydown", handleEscape);
    };
  }, []);

  // Format message for display
  const formatMessage = (message: string) => {
    return message.replace(/\[.*?\] Автоматическое оповещение: /g, '');
  };

  const handleClose = useCallback(() => {
    setIsVisible(false);
    setTimeout(() => {
      onClose();
    }, 300); // Wait for animation to complete
  }, [onClose]);

  const handleMarkAllReadAndClose = useCallback(() => {
    onMarkAllAsRead();
    handleClose();
  }, [onMarkAllAsRead, handleClose]);

  const handleViewAll = useCallback(() => {
    router.push("/notifications");
    handleClose();
  }, [router, handleClose]);

  return (
    <div
      className={`fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center transition-opacity duration-300 ${
        isVisible ? "opacity-100" : "opacity-0"
      }`}
      onClick={handleClose}
    >
      <div 
        className={`bg-destructive text-destructive-foreground p-6 rounded-lg max-w-3xl w-full mx-4 transition-all duration-300 ${
          isVisible ? "scale-100" : "scale-95"
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-2xl font-bold flex items-center gap-2">
            Новые уведомления
            <Badge className="bg-destructive-foreground text-destructive">
              {notifications.length}
            </Badge>
          </h2>
          <Button
            variant="ghost"
            size="icon"
            className="text-destructive-foreground hover:bg-destructive-foreground/10"
            onClick={handleClose}
          >
            <X />
            <span className="sr-only">Закрыть</span>
          </Button>
        </div>

        <div className="max-h-[60vh] overflow-y-auto pr-2 space-y-4">
          {notifications.map((notification) => (
            <div 
              key={notification.id}
              className="bg-destructive-foreground/10 rounded-lg p-4 border border-destructive-foreground/20"
            >
              <div className="flex justify-between items-start mb-2">
                <div>
                  <div className="font-medium">
                    {notification.cabinet_name}
                    <span className="text-sm ml-1">#{notification.cabinet_id}</span>
                  </div>
                  <div className="text-sm opacity-80">
                    Чат: {notification.chat_name}
                  </div>
                </div>
                <div className="text-sm opacity-70">
                  {new Date(notification.timestamp).toLocaleString()}
                </div>
              </div>
              <p className="whitespace-pre-wrap mb-3">
                {formatMessage(notification.message)}
              </p>
              <div className="flex justify-end">
                <Button
                  variant="ghost"
                  size="sm"
                  className="bg-destructive-foreground/10 hover:bg-destructive-foreground/20"
                  onClick={() => onMarkAsRead(notification.id)}
                >
                  Прочитано
                </Button>
              </div>
            </div>
          ))}
        </div>

        <div className="flex justify-between mt-6">
          <Button
            variant="outline"
            onClick={handleViewAll}
            className="border-destructive-foreground text-destructive-foreground hover:bg-destructive-foreground/10"
          >
            Просмотреть все
          </Button>
          <div className="space-x-2">
            <Button
              variant="ghost"
              onClick={handleClose}
              className="hover:bg-destructive-foreground/10"
            >
              Закрыть
            </Button>
            <Button
              variant="default"
              onClick={handleMarkAllReadAndClose}
              className="bg-destructive-foreground text-destructive hover:bg-destructive-foreground/90"
            >
              Прочитать все
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}