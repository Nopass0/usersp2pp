"use client";

import { useState, useEffect } from "react";
import { toast } from "sonner";
import {
  SendIcon,
  MessageSquareIcon,
  CheckCircleIcon,
  XCircleIcon,
  AlertCircleIcon,
  Loader2Icon,
} from "lucide-react";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "~/components/ui/dialog";
import { Alert, AlertTitle, AlertDescription } from "~/components/ui/alert";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { ScrollArea } from "~/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";

interface TelegramChat {
  id: number;
  name: string;
}

interface ResponseMessage {
  success: boolean;
  message: string;
  auto_withdraw?: boolean;
}

interface TelegramChatsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function TelegramChatsDialog({
  open,
  onOpenChange,
}: TelegramChatsDialogProps) {
  const [chats, setChats] = useState<TelegramChat[]>([]);
  const [selectedChatId, setSelectedChatId] = useState<string>("");
  const [message, setMessage] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(false);
  const [sendingMessage, setSendingMessage] = useState<boolean>(false);
  const [responseData, setResponseData] = useState<ResponseMessage | null>(
    null,
  );

  const apiKey = process.env.NEXT_PUBLIC_TELEGRAM_API_KEY || "";
  const apiUrl = process.env.NEXT_PUBLIC_TELEGRAM_API_URL || "";

  // Check if we're running in a secure context (HTTPS)
  const isSecureContext = typeof window !== 'undefined' && window.location.protocol === 'https:';

  // Fetch available chats
  useEffect(() => {
    if (open) {
      // If we're running in HTTPS mode, always use the proxy to avoid mixed content issues
      if (isSecureContext && apiUrl && apiUrl.startsWith('http://')) {
        console.log("Secure context detected - using proxy to avoid mixed content issues");
        fetchChatsViaProxy();
      } else {
        fetchChats();
      }
      setResponseData(null);
      setMessage("");
    }
  }, [open]);

  const fetchChats = async () => {
    if (!apiUrl) {
      toast.error("Ошибка конфигурации", {
        description: "API URL не настроен, проверьте настройки",
      });
      return;
    }

    try {
      setLoading(true);

      // Make a direct HTTP request to the API
      let targetUrl = apiUrl;
      if (!targetUrl.endsWith('/')) targetUrl += '/';
      targetUrl += 'chats';

      console.log("Fetching chats directly from:", targetUrl);

      // Use XMLHttpRequest for better control
      const xhr = new XMLHttpRequest();

      // Create a promise wrapper around XHR
      const result = await new Promise((resolve, reject) => {
        // Set timeout (10 seconds)
        const timeout = setTimeout(() => {
          xhr.abort();
          reject(new Error("Request timed out"));
        }, 10000);

        xhr.open('GET', targetUrl, true);
        xhr.setRequestHeader('Accept', 'application/json');
        xhr.setRequestHeader('X-API-Key', apiKey);

        xhr.onload = function() {
          clearTimeout(timeout);
          if (xhr.status >= 200 && xhr.status < 300) {
            try {
              const data = JSON.parse(xhr.responseText);
              resolve(data);
            } catch (e) {
              reject(new Error("Invalid JSON response"));
            }
          } else {
            reject(new Error(`HTTP Error: ${xhr.status}`));
          }
        };

        xhr.onerror = function() {
          clearTimeout(timeout);
          reject(new Error("Network error"));
        };

        xhr.send();
      });

      const data = result as { chats: TelegramChat[] };
      setChats(data.chats || []);

      // Auto-select the first chat if available
      if (data.chats && data.chats.length > 0) {
        setSelectedChatId(data.chats[0].id.toString());
      }
    } catch (error) {
      console.error("Failed to fetch chats directly:", error);

      // Fallback to proxy
      try {
        console.log("Falling back to proxy for chat fetching");
        toast.info("Используем резервный метод для загрузки чатов...");

        // Use proxy as fallback
        const response = await fetch(`/api/proxy/chats`, {
          method: "GET",
          headers: {
            accept: "application/json",
            "X-API-Key": apiKey,
          },
          // Manual timeout using AbortController for broader browser support
          signal: (() => {
            const controller = new AbortController();
            setTimeout(() => controller.abort(), 15000); // 15 second timeout
            return controller.signal;
          })(),
        });

        if (!response.ok) {
          throw new Error(`Error fetching chats via proxy: ${response.status}`);
        }

        const data = await response.json();
        setChats(data.chats || []);

        // Auto-select the first chat if available
        if (data.chats && data.chats.length > 0) {
          setSelectedChatId(data.chats[0].id.toString());
          toast.success("Чаты загружены через прокси");
        } else {
          toast.warning("Нет доступных чатов");
        }
      } catch (fallbackError) {
        console.error("Fallback also failed:", fallbackError);
        toast.error("Ошибка при загрузке чатов", {
          description:
            fallbackError instanceof Error
              ? fallbackError.message
              : "Все методы загрузки завершились с ошибкой",
        });
      }
    } finally {
      setLoading(false);
    }
  };

  // Function to fetch chats via proxy (for HTTPS contexts)
  const fetchChatsViaProxy = async () => {
    try {
      setLoading(true);

      console.log("Fetching chats via proxy");
      const response = await fetch(`/api/proxy/chats`, {
        method: "GET",
        headers: {
          accept: "application/json",
          "X-API-Key": apiKey,
        },
        // Manual timeout using AbortController for broader browser support
        signal: (() => {
          const controller = new AbortController();
          setTimeout(() => controller.abort(), 15000); // 15 second timeout
          return controller.signal;
        })(),
      });

      if (!response.ok) {
        throw new Error(`Error fetching chats via proxy: ${response.status}`);
      }

      const data = await response.json();
      setChats(data.chats || []);

      // Auto-select the first chat if available
      if (data.chats && data.chats.length > 0) {
        setSelectedChatId(data.chats[0].id.toString());
      }
    } catch (error) {
      console.error("Failed to fetch chats via proxy:", error);
      toast.error("Ошибка при загрузке чатов", {
        description:
          error instanceof Error ? error.message : "Неизвестная ошибка",
      });
    } finally {
      setLoading(false);
    }
  };

  // Add a debounce mechanism to prevent duplicate requests
  const [lastRequestTime, setLastRequestTime] = useState<number>(0);
  const [requestInProgress, setRequestInProgress] = useState<boolean>(false);
  const DEBOUNCE_TIME = 2000; // 2 seconds between requests

  const handleSendMessage = async () => {
    // Check if we're already in the process of sending a request
    if (requestInProgress) {
      console.log("Request already in progress, ignoring duplicate");
      return;
    }

    // Check if enough time has passed since the last request
    const now = Date.now();
    if (now - lastRequestTime < DEBOUNCE_TIME) {
      console.log(`Ignoring duplicate request (waited only ${now - lastRequestTime}ms)`);
      toast.info("Запрос уже отправляется, пожалуйста подождите");
      return;
    }

    if (!selectedChatId || !message.trim()) {
      toast.error("Ошибка", {
        description: "Выберите кабинет и введите сообщение",
      });
      return;
    }

    if (!apiUrl) {
      toast.error("Ошибка конфигурации", {
        description: "API URL не настроен, проверьте настройки",
      });
      return;
    }

    try {
      // Set request tracking flags
      setRequestInProgress(true);
      setLastRequestTime(now);
      setSendingMessage(true);
      setResponseData(null);

      let response;
      let isProxyRequest = false;

      // Determine if we should use proxy
      const shouldUseProxy = isSecureContext && apiUrl.startsWith('http://');

      if (shouldUseProxy) {
        // Use proxy for secure contexts with HTTP API
        console.log("Using proxy for secure context to avoid mixed content");
        isProxyRequest = true;

        response = await fetch(`/api/proxy/send`, {
          method: "POST",
          headers: {
            accept: "application/json",
            "Content-Type": "application/json",
            "X-API-Key": apiKey,
          },
          body: JSON.stringify({
            chat_id: parseInt(selectedChatId),
            text: message,
          }),
          signal: (() => {
            const controller = new AbortController();
            setTimeout(() => controller.abort(), 15000);
            return controller.signal;
          })(),
        });
      } else {
        // Use direct request for non-secure contexts or HTTPS API
        console.log("Using direct request");
        
        let targetUrl = apiUrl;
        if (!targetUrl.endsWith('/')) targetUrl += '/';
        targetUrl += 'send';

        response = await fetch(targetUrl, {
          method: "POST",
          headers: {
            accept: "application/json",
            "Content-Type": "application/json",
            "X-API-Key": apiKey,
          },
          body: JSON.stringify({
            chat_id: parseInt(selectedChatId),
            text: message,
          }),
          signal: (() => {
            const controller = new AbortController();
            setTimeout(() => controller.abort(), 15000);
            return controller.signal;
          })(),
        });
      }

      if (!response.ok) {
        throw new Error(`Error sending message${isProxyRequest ? ' via proxy' : ''}: ${response.status}`);
      }

      const data = await response.json();
      setResponseData(data);

      if (data.success) {
        toast.success(`Запрос обработан${isProxyRequest ? ' через прокси' : ''}`, {
          description:
            data.auto_withdraw !== undefined
              ? `Автовывод: ${data.auto_withdraw ? "ДА" : "НЕТ"}`
              : "Операция успешно выполнена",
        });
        setMessage("");
      } else {
        toast.error("Ошибка", {
          description: data.message || "Ошибка при обработке запроса",
        });
      }
    } catch (error) {
      console.error("Failed to send message:", error);
      toast.error("Ошибка при отправке сообщения", {
        description:
          error instanceof Error
            ? error.message
            : "Ошибка при отправке запроса",
      });
      setResponseData({
        success: false,
        message: error instanceof Error
          ? error.message
          : "Ошибка при отправке запроса",
      });
    } finally {
      setSendingMessage(false);
      // Reset request tracking flag after a slight delay
      setTimeout(() => {
        setRequestInProgress(false);
      }, 500);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MessageSquareIcon className="h-5 w-5" />
            ВЫВОД СРЕДСТВ
          </DialogTitle>
          <DialogDescription>Выберите кабинет</DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4 py-4">
          <div className="space-y-2">
            <label htmlFor="chat-select" className="text-sm font-medium">
              Выберите кабинет
            </label>
            <Select
              value={selectedChatId}
              onValueChange={setSelectedChatId}
              disabled={loading || chats.length === 0}
            >
              <SelectTrigger id="chat-select" className="w-full">
                <SelectValue placeholder="Выберите кабинет" />
              </SelectTrigger>
              <SelectContent>
                {loading ? (
                  <SelectItem value="loading" disabled>
                    Загрузка кабинетов...
                  </SelectItem>
                ) : chats.length === 0 ? (
                  <SelectItem value="empty" disabled>
                    Нет доступных кабинетов
                  </SelectItem>
                ) : (
                  chats.map((chat) => (
                    <SelectItem key={chat.id} value={chat.id.toString()}>
                      {chat.name}
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <label htmlFor="message" className="text-sm font-medium">
              Сообщение
            </label>
            <div className="flex gap-2">
              <Input
                id="message"
                placeholder="Введите сообщение для отправки"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                disabled={!selectedChatId || sendingMessage}
                className="flex-1"
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    handleSendMessage();
                  }
                }}
              />
              <Button
                onClick={handleSendMessage}
                disabled={!selectedChatId || !message.trim() || sendingMessage}
                variant="default"
                size="icon"
              >
                {sendingMessage ? (
                  <Loader2Icon className="h-4 w-4 animate-spin" />
                ) : (
                  <SendIcon className="h-4 w-4" />
                )}
              </Button>
            </div>
          </div>

          {responseData && (
            <div className="mt-4">
              {responseData.success ? (
                <Alert className="border-green-500 bg-green-500/10">
                  <CheckCircleIcon className="h-4 w-4 text-green-500" />
                  <AlertTitle className="text-green-500">Успешно</AlertTitle>
                  <AlertDescription className="text-muted-foreground text-sm">
                    {responseData.message}
                    {responseData.auto_withdraw !== undefined && (
                      <div className="mt-2 flex items-center font-medium">
                        Автовывод:
                        <span
                          className={
                            responseData.auto_withdraw
                              ? "ml-2 text-green-500"
                              : "ml-2 text-red-500"
                          }
                        >
                          {responseData.auto_withdraw ? "ДА" : "НЕТ"}
                        </span>
                      </div>
                    )}
                  </AlertDescription>
                </Alert>
              ) : (
                <Alert className="border-red-500 bg-red-500/10">
                  <AlertCircleIcon className="h-4 w-4 text-red-500" />
                  <AlertTitle className="text-red-500">Ошибка</AlertTitle>
                  <AlertDescription className="text-muted-foreground text-sm">
                    {responseData.message}
                  </AlertDescription>
                </Alert>
              )}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Закрыть
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}