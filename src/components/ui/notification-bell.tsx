"use client";

import { useState, useEffect } from "react";
import { BellIcon, BellRingIcon, AlertCircleIcon, InfoIcon, RefreshCwIcon, Volume2Icon, Speaker } from "lucide-react";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import { Switch } from "~/components/ui/switch";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuPortal,
} from "~/components/ui/dropdown-menu";
import { api } from "~/trpc/react";
import { useNotificationStore, fetchAndProcessMessages } from "~/lib/notification-service";
import { ScrollArea } from "~/components/ui/scroll-area";
import { Card } from "~/components/ui/card";
import { Alert, AlertTitle, AlertDescription } from "~/components/ui/alert";
import { toast } from "sonner";

// Format date for display
function formatDate(timestamp: number): string {
  return new Date(timestamp * 1000).toLocaleString();
}

export default function NotificationBell() {
  const { data: unreadCount, isLoading: countLoading, error: countError, refetch: refetchCount } = 
    api.notification.getUnreadCount.useQuery(undefined, {
      refetchInterval: 30000, // Refetch every 30 seconds
      retry: 3,
      retryDelay: 1000,
    });
  
  const { 
    data: unreadNotifications, 
    isLoading: notificationsLoading,
    error: notificationsError,
    refetch: refetchNotifications
  } = api.notification.getUnreadNotifications.useQuery(undefined, {
    refetchInterval: 30000, // Refetch every 30 seconds
    retry: 3,
    retryDelay: 1000,
  });
  
  const markAsRead = api.notification.markAsRead.useMutation({
    onSuccess: () => {
      refetchCount();
      refetchNotifications();
    },
  });
  
  const markAllAsRead = api.notification.markAllAsRead.useMutation({
    onSuccess: () => {
      refetchCount();
      refetchNotifications();
      toast.success("Все уведомления прочитаны");
    },
  });
  
  const [isOpen, setIsOpen] = useState(false);
  
  // Get notification store state
  const notificationStore = useNotificationStore();
  const { error: storeError, soundEnabled, pcBeepEnabled, apiUrl, setApiConfig } = notificationStore;

  // No longer forcing HTTPS since the API server doesn't support it
  // We'll leave the API URL as-is, whether HTTP or HTTPS
  useEffect(() => {
    // Just validate that the URL has a protocol
    if (apiUrl && !/^https?:\/\//i.test(apiUrl)) {
      const fixedUrl = `http://${apiUrl}`;
      setApiConfig(notificationStore.apiKey, fixedUrl);
    }
  }, [apiUrl]);
  
  // Start notification polling
  useEffect(() => {
    const startPollingWithRetry = () => {
      try {
        notificationStore.startPolling();
      } catch (error) {
        console.error("Error starting notification polling:", error);
        // Try to restart in 10 seconds
        setTimeout(startPollingWithRetry, 10000);
      }
    };
    
    startPollingWithRetry();
    
    // Manual initial fetch
    fetchAndProcessMessages().catch(err => {
      console.warn("Initial notification fetch failed, will retry:", err);
    });
    
    return () => {
      notificationStore.stopPolling();
    };
  }, []);
  
  // Function to retry API operations
  const handleRetry = () => {
    // Clear any stored errors
    notificationStore.setError(null);
    
    // Manually trigger a fetch
    fetchAndProcessMessages().catch(console.error);
    
    // Refetch the queries
    refetchCount();
    refetchNotifications();
    
    toast.info("Переподключение к серверу уведомлений...");
  };
  
  const handleMarkAsRead = (id: number | bigint) => {
    markAsRead.mutate({ id: BigInt(id) });
  };
  
  const handleMarkAllAsRead = () => {
    markAllAsRead.mutate();
  };

  // Toggle sound settings
  const handleToggleSound = () => {
    notificationStore.setSoundEnabled(!soundEnabled);
  };

  const handleTogglePcBeep = () => {
    notificationStore.setPcBeepEnabled(!pcBeepEnabled);
  };
  
  // Determine if there's any error to show
  const hasError = Boolean(storeError || countError || notificationsError);
  const isLoading = countLoading || notificationsLoading;
  
  // Show notification badge if we have unread notifications
  const showNotification = unreadCount && unreadCount.count > 0;
  
  return (
    <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          {hasError ? (
            <AlertCircleIcon className="h-5 w-5 text-destructive" />
          ) : showNotification ? (
            <BellRingIcon className="h-5 w-5 text-primary animate-pulse" />
          ) : (
            <BellIcon className="h-5 w-5" />
          )}
          {showNotification && !hasError && (
            <Badge 
              variant="destructive" 
              className="absolute -top-1 -right-1 px-1.5 py-0.5 text-xs min-w-5 h-5 flex items-center justify-center"
            >
              {unreadCount.count > 99 ? "99+" : unreadCount.count}
            </Badge>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80">
        <DropdownMenuLabel className="flex items-center justify-between">
          <span>Уведомления</span>
          {showNotification && !hasError && (
            <Button
              variant="ghost"
              size="sm"
              className="text-xs"
              onClick={handleMarkAllAsRead}
              disabled={markAllAsRead.isPending}
            >
              Прочитать все
            </Button>
          )}
          {hasError && (
            <Button
              variant="ghost"
              size="sm"
              className="text-xs flex items-center gap-1 text-muted-foreground"
              onClick={handleRetry}
            >
              <RefreshCwIcon className="h-3 w-3" />
              Повторить
            </Button>
          )}
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <ScrollArea className="h-[300px]">
          {/* Error state */}
          {hasError && (
            <div className="p-3">
              <Alert variant="destructive" className="mb-3">
                <AlertCircleIcon className="h-4 w-4" />
                <AlertTitle>Ошибка уведомлений</AlertTitle>
                <AlertDescription>
                  {storeError || 
                   (countError && "Ошибка получения уведомлений") || 
                   (notificationsError && "Ошибка получения списка уведомлений")}
                </AlertDescription>
              </Alert>
              <p className="text-sm text-muted-foreground py-2">
                Не удалось получить уведомления. Возможные причины:
              </p>
              <ul className="text-sm text-muted-foreground list-disc pl-5 space-y-1">
                <li>Сервер уведомлений недоступен</li>
                <li>Идет настройка системы уведомлений</li>
                <li>Проблемы с подключением к сети</li>
              </ul>
            </div>
          )}
          
          {/* Loading state */}
          {isLoading && !hasError && (
            <div className="p-4 text-center">
              <div className="animate-spin w-6 h-6 border-2 border-primary border-t-transparent rounded-full mx-auto mb-2"></div>
              <p className="text-sm text-muted-foreground">Загрузка уведомлений...</p>
            </div>
          )}
          
          {/* Empty state */}
          {!isLoading && !hasError && (!unreadNotifications || unreadNotifications.length === 0) && (
            <div className="p-4 text-center">
              <InfoIcon className="h-10 w-10 text-muted-foreground/50 mx-auto mb-2" />
              <p className="text-muted-foreground">Нет новых уведомлений</p>
            </div>
          )}
          
          {/* Notifications list */}
          {!hasError && unreadNotifications && unreadNotifications.length > 0 && (
            <div className="space-y-2 p-2">
              {unreadNotifications.map((notification) => (
                <Card
                  key={notification.id}
                  className="p-3 cursor-pointer hover:bg-secondary/50 transition-colors"
                  onClick={() => handleMarkAsRead(notification.id)}
                >
                  <div className="flex flex-col gap-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-sm">
                        {notification.cabinet_name}#{notification.cabinet_id}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {new Date(notification.timestamp).toLocaleString()}
                      </span>
                    </div>
                    <p className="text-sm">{notification.message.replace(/\[.*?\] Автоматическое оповещение: /g, '')}</p>
                    <p className="text-xs text-muted-foreground">Чат: {notification.chat_name}</p>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </ScrollArea>
        <DropdownMenuSeparator />
        <DropdownMenuSub>
          <DropdownMenuSubTrigger className="cursor-pointer">
            <span>Настройки звука</span>
          </DropdownMenuSubTrigger>
          <DropdownMenuPortal>
            <DropdownMenuSubContent>
              <div className="p-2 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Volume2Icon className="h-4 w-4" />
                    <span className="text-sm">Звук уведомлений</span>
                  </div>
                  <Switch checked={soundEnabled} onCheckedChange={handleToggleSound} />
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Speaker className={`h-4 w-4 ${pcBeepEnabled ? "" : "opacity-50"}`} />
                    <span className="text-sm">Системный динамик</span>
                  </div>
                  <Switch checked={pcBeepEnabled} onCheckedChange={handleTogglePcBeep} />
                </div>

                <p className="text-xs text-muted-foreground pt-1">
                  Системный динамик (пищалка) звучит даже если нет колонок
                </p>
              </div>
            </DropdownMenuSubContent>
          </DropdownMenuPortal>
        </DropdownMenuSub>

        <DropdownMenuSeparator />
        <DropdownMenuItem
          className="cursor-pointer justify-center text-center"
          onClick={() => {
            setIsOpen(false);
            window.location.href = '/notifications';
          }}
        >
          Показать все уведомления
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}