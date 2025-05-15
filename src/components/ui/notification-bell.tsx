"use client";

import { useState, useEffect } from "react";
import { BellIcon, BellRingIcon, AlertCircleIcon, InfoIcon, RefreshCwIcon, Volume2Icon, Speaker, DesktopIcon } from "lucide-react";
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
import {
  useNotificationStore,
  fetchAndProcessMessages,
  areNotificationsSupported,
  hasNotificationPermission,
  requestNotificationPermission
} from "~/lib/notification-service";
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

  // Get unread cancellations count
  const { data: unreadCancellationsCount, isLoading: cancellationsCountLoading, error: cancellationsCountError, refetch: refetchCancellationsCount } =
    api.notification.getUnreadCancellationsCount.useQuery(undefined, {
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

  // Get unread cancellations
  const {
    data: unreadCancellations,
    isLoading: cancellationsLoading,
    error: cancellationsError,
    refetch: refetchCancellations
  } = api.notification.getUnreadCancellations.useQuery(undefined, {
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

  // Add markCancellationAsRead mutation
  const markCancellationAsRead = api.notification.markCancellationAsRead.useMutation({
    onSuccess: () => {
      refetchCancellationsCount();
      refetchCancellations();
    },
  });

  const markAllAsRead = api.notification.markAllAsRead.useMutation({
    onSuccess: () => {
      refetchCount();
      refetchNotifications();
      toast.success("Все уведомления прочитаны");
    },
  });

  // Add markAllCancellationsAsRead mutation
  const markAllCancellationsAsRead = api.notification.markAllCancellationsAsRead.useMutation({
    onSuccess: () => {
      refetchCancellationsCount();
      refetchCancellations();
      toast.success("Все уведомления об отменах прочитаны");
    },
  });
  
  const [isOpen, setIsOpen] = useState(false);
  
  // Get notification store state
  const notificationStore = useNotificationStore();
  const {
    error: storeError,
    soundEnabled,
    pcBeepEnabled,
    desktopNotificationsEnabled,
    apiUrl,
    setApiConfig
  } = notificationStore;

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

  const handleMarkCancellationAsRead = (id: number) => {
    markCancellationAsRead.mutate({ id });
  };

  const handleMarkAllAsRead = () => {
    markAllAsRead.mutate();
  };

  const handleMarkAllCancellationsAsRead = () => {
    markAllCancellationsAsRead.mutate();
  };

  // Toggle sound settings
  const handleToggleSound = () => {
    notificationStore.setSoundEnabled(!soundEnabled);
  };

  const handleTogglePcBeep = () => {
    notificationStore.setPcBeepEnabled(!pcBeepEnabled);
  };

  // Handle toggle desktop notifications
  const handleToggleDesktopNotifications = async () => {
    // If we're enabling and don't have permission yet, request it
    if (!desktopNotificationsEnabled && areNotificationsSupported() && !hasNotificationPermission()) {
      const granted = await requestNotificationPermission();
      if (!granted) {
        toast.error("Разрешение на отображение уведомлений не получено");
        return; // Don't enable if permission was denied
      }
    }

    // Toggle the setting
    notificationStore.setDesktopNotificationsEnabled(!desktopNotificationsEnabled);

    // Show status toast
    if (!desktopNotificationsEnabled) {
      toast.success("Уведомления рабочего стола включены");
    } else {
      toast.info("Уведомления рабочего стола отключены");
    }
  };
  
  // Determine if there's any error to show
  const hasError = Boolean(storeError || countError || notificationsError || cancellationsError || cancellationsCountError);
  const isLoading = countLoading || notificationsLoading || cancellationsLoading || cancellationsCountLoading;

  // Calculate total unread count (notifications + cancellations)
  const notificationsCount = unreadCount?.count || 0;
  const cancellationsCount = unreadCancellationsCount?.count || 0;
  const totalUnreadCount = notificationsCount + cancellationsCount;

  // Show notification badge if we have unread notifications or cancellations
  const showNotification = totalUnreadCount > 0;
  
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
              {totalUnreadCount > 99 ? "99+" : totalUnreadCount}
            </Badge>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80">
        <DropdownMenuLabel className="flex items-center justify-between">
          <span>Уведомления</span>
          {showNotification && !hasError && (
            <div className="flex gap-1">
              {notificationsCount > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-xs"
                  onClick={handleMarkAllAsRead}
                  disabled={markAllAsRead.isPending}
                >
                  Прочитать уведомления
                </Button>
              )}
              {cancellationsCount > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-xs"
                  onClick={handleMarkAllCancellationsAsRead}
                  disabled={markAllCancellationsAsRead.isPending}
                >
                  Прочитать отмены
                </Button>
              )}
            </div>
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
          {!isLoading && !hasError && (!unreadNotifications || unreadNotifications.length === 0) && (!unreadCancellations || unreadCancellations.length === 0) && (
            <div className="p-4 text-center">
              <InfoIcon className="h-10 w-10 text-muted-foreground/50 mx-auto mb-2" />
              <p className="text-muted-foreground">Нет новых уведомлений</p>
            </div>
          )}

          {/* Notifications list */}
          {!hasError && unreadNotifications && unreadNotifications.length > 0 && (
            <div className="space-y-2 p-2">
              <div className="px-2 py-1 text-sm font-medium">Уведомления от кабинетов</div>
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

          {/* Cancellations list */}
          {!hasError && unreadCancellations && unreadCancellations.length > 0 && (
            <div className="space-y-2 p-2">
              <div className="px-2 py-1 text-sm font-medium text-destructive">Уведомления об отменах</div>
              {unreadCancellations.map((cancellation) => (
                <Card
                  key={cancellation.id}
                  className="p-3 cursor-pointer hover:bg-secondary/50 transition-colors border-destructive/30"
                  onClick={() => handleMarkCancellationAsRead(cancellation.id)}
                >
                  <div className="flex flex-col gap-1">
                    <div className="flex items-center justify-between">
                      <span className="font-medium text-sm text-destructive">
                        Отмена
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {new Date(cancellation.timestamp).toLocaleString()}
                      </span>
                    </div>
                    <p className="text-sm">{cancellation.message}</p>
                    <p className="text-xs text-muted-foreground">Чат: {cancellation.chatName}</p>
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

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <DesktopIcon className={`h-4 w-4 ${desktopNotificationsEnabled ? "" : "opacity-50"}`} />
                    <span className="text-sm">Уведомления на рабочем столе</span>
                  </div>
                  <Switch
                    checked={desktopNotificationsEnabled}
                    onCheckedChange={handleToggleDesktopNotifications}
                    disabled={!areNotificationsSupported()}
                  />
                </div>

                <p className="text-xs text-muted-foreground pt-1">
                  Системный динамик (пищалка) звучит даже если нет колонок
                </p>
                {!areNotificationsSupported() && (
                  <p className="text-xs text-destructive pt-1">
                    Уведомления на рабочем столе не поддерживаются в вашем браузере
                  </p>
                )}
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