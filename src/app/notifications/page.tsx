"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "~/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "~/components/ui/card";
import { Pagination, PaginationContent, PaginationItem, PaginationNext, PaginationPrevious } from "~/components/ui/pagination";
import { Badge } from "~/components/ui/badge";
import { api } from "~/trpc/react";
import { RefreshCw, ChevronLeft } from "lucide-react";
import { Separator } from "~/components/ui/separator";

export default function NotificationsPage() {
  const router = useRouter();
  const [currentPage, setCurrentPage] = useState(1);
  const [limit] = useState(10);
  
  // Get all notifications with pagination
  const { 
    data,
    isLoading,
    error,
    refetch
  } = api.notification.getAllNotifications.useQuery({
    limit,
    cursor: (currentPage - 1) * limit > 0 ? (currentPage - 1) * limit : undefined,
  }, {
    refetchInterval: 30000, // Refetch every 30 seconds
  });
  
  // Mark notification as read
  const markAsRead = api.notification.markAsRead.useMutation({
    onSuccess: () => {
      refetch();
    },
  });
  
  // Mark all as read
  const markAllAsRead = api.notification.markAllAsRead.useMutation({
    onSuccess: () => {
      refetch();
    },
  });
  
  // Format message for display
  const formatMessage = (message: string) => {
    return message.replace(/\[.*?\] Автоматическое оповещение: /g, '');
  };
  
  // Handle pagination
  const handleNextPage = () => {
    if (data?.nextCursor) {
      setCurrentPage(prev => prev + 1);
    }
  };
  
  const handlePrevPage = () => {
    if (currentPage > 1) {
      setCurrentPage(prev => prev - 1);
    }
  };
  
  return (
    <div className="container py-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <Button 
            variant="outline" 
            size="icon" 
            onClick={() => router.back()}
          >
            <ChevronLeft className="h-4 w-4" />
            <span className="sr-only">Назад</span>
          </Button>
          <h1 className="text-2xl font-bold">Уведомления</h1>
        </div>
        <div className="flex gap-2">
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => refetch()} 
            disabled={isLoading}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? "animate-spin" : ""}`} />
            Обновить
          </Button>
          <Button 
            variant="default" 
            size="sm" 
            onClick={() => markAllAsRead.mutate()} 
            disabled={markAllAsRead.isPending}
          >
            Прочитать все
          </Button>
        </div>
      </div>
      
      {error && (
        <Card className="mb-6 border-destructive">
          <CardHeader>
            <CardTitle className="text-destructive">Ошибка загрузки уведомлений</CardTitle>
            <CardDescription>
              Произошла ошибка при загрузке уведомлений. Попробуйте обновить страницу.
            </CardDescription>
          </CardHeader>
        </Card>
      )}
      
      {isLoading && (
        <div className="flex justify-center items-center py-12">
          <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full"></div>
        </div>
      )}
      
      {!isLoading && data?.items.length === 0 && (
        <Card>
          <CardContent className="py-12">
            <div className="text-center text-muted-foreground">
              <p>Уведомления отсутствуют</p>
            </div>
          </CardContent>
        </Card>
      )}
      
      {!isLoading && data?.items.length > 0 && (
        <>
          <div className="grid gap-4">
            {data.items.map((notification) => (
              <Card 
                key={notification.id}
                className={notification.isRead ? "bg-muted/40" : ""}
              >
                <CardHeader className="pb-2">
                  <div className="flex justify-between items-start">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <CardTitle className="text-base">{notification.cabinet_name}</CardTitle>
                        <span className="text-sm text-muted-foreground">#{notification.cabinet_id}</span>
                        {!notification.isRead && (
                          <Badge variant="secondary" className="ml-2">Новое</Badge>
                        )}
                      </div>
                      <CardDescription>
                        Чат: {notification.chat_name}
                      </CardDescription>
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {new Date(notification.timestamp).toLocaleString()}
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="pt-0">
                  <p className="whitespace-pre-wrap">{formatMessage(notification.message)}</p>
                  
                  {!notification.isRead && (
                    <>
                      <Separator className="my-3" />
                      <div className="flex justify-end">
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => markAsRead.mutate({ id: BigInt(notification.id) })}
                          disabled={markAsRead.isPending}
                        >
                          Прочитано
                        </Button>
                      </div>
                    </>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
          
          <Pagination className="mt-6">
            <PaginationContent>
              <PaginationItem>
                <PaginationPrevious 
                  onClick={handlePrevPage} 
                  disabled={currentPage === 1} 
                  className={currentPage === 1 ? "pointer-events-none opacity-50" : "cursor-pointer"}
                />
              </PaginationItem>
              <PaginationItem>
                <span className="text-sm">Страница {currentPage}</span>
              </PaginationItem>
              <PaginationItem>
                <PaginationNext 
                  onClick={handleNextPage} 
                  disabled={!data.nextCursor} 
                  className={!data.nextCursor ? "pointer-events-none opacity-50" : "cursor-pointer"}
                />
              </PaginationItem>
            </PaginationContent>
          </Pagination>
        </>
      )}
    </div>
  );
}