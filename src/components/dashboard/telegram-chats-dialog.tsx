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

  const apiKey =
    process.env.NEXT_PUBLIC_TELEGRAM_API_KEY ||
    "ob5QCRUUuz9HhoB1Yj9FEsm1Hb03U4tct71rgGcnVNE";
  const apiUrl =
    process.env.NEXT_PUBLIC_TELEGRAM_API_URL || "http://95.163.152.102:8000";

  // Fetch available chats
  useEffect(() => {
    if (open) {
      fetchChats();
      setResponseData(null);
      setMessage("");
    }
  }, [open]);

  const fetchChats = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${apiUrl}/chats`, {
        method: "GET",
        headers: {
          accept: "application/json",
          "X-API-Key": apiKey,
        },
      });

      if (!response.ok) {
        throw new Error(`Error fetching chats: ${response.status}`);
      }

      const data = await response.json();
      setChats(data.chats || []);

      // Auto-select the first chat if available
      if (data.chats && data.chats.length > 0) {
        setSelectedChatId(data.chats[0].id.toString());
      }
    } catch (error) {
      console.error("Failed to fetch chats:", error);
      toast.error("Ошибка при загрузке чатов", {
        description:
          error instanceof Error ? error.message : "Неизвестная ошибка",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSendMessage = async () => {
    if (!selectedChatId || !message.trim()) {
      toast.error("Ошибка", {
        description: "Выберите кабинет и введите сообщение",
      });
      return;
    }

    try {
      setSendingMessage(true);
      setResponseData(null);

      const response = await fetch(`${apiUrl}/send`, {
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
      });

      if (!response.ok) {
        throw new Error(`Error sending message: ${response.status}`);
      }

      const data = await response.json();
      setResponseData(data);

      if (data.success) {
        toast.success("Запрос обработан", {
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
          error instanceof Error ? error.message : "Неизвестная ошибка",
      });
      setResponseData({
        success: false,
        message: error instanceof Error ? error.message : "Неизвестная ошибка",
      });
    } finally {
      setSendingMessage(false);
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
