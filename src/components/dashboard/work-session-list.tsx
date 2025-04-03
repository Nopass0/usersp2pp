"use client";

import { useState, useMemo, useEffect } from "react";
import { format, formatDistance } from "date-fns";
import { ru } from "date-fns/locale";
import { 
  CalendarIcon, 
  ChevronLeftIcon, 
  ChevronRightIcon, 
  ClockIcon, 
  InfoIcon,
  CheckIcon, 
  SearchIcon,
  XIcon,
  Edit2Icon
} from "lucide-react";
import { toast } from "sonner";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "~/components/ui/dialog";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Textarea } from "~/components/ui/textarea";
import { Skeleton } from "~/components/ui/skeleton";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "~/components/ui/popover";
import { cn } from "~/lib/utils";
import { api } from "~/trpc/react";
import { useDebounce } from "~/hooks/use-debounce";

interface WorkSession {
  id: number;
  startTime: Date;
  endTime: Date | null;
  duration: number | null;
  autoCompleted: boolean;
  userId: number;
  idexCabinets: {
    id: number;
    idexId: number;
    login: string;
  }[];
  createdAt: Date;
  updatedAt: Date;
  comment?: string;
}

interface WorkSessionListProps {
  sessions: WorkSession[];
  isLoading?: boolean;
  onSessionUpdated?: () => void;
}

export function WorkSessionList({ 
  sessions, 
  isLoading = false,
  onSessionUpdated
}: WorkSessionListProps) {
  const [selectedSession, setSelectedSession] = useState<WorkSession | null>(null);
  const [comment, setComment] = useState<string>("");
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [currentPage, setCurrentPage] = useState<number>(1);
  const itemsPerPage = 10;
  
  const debouncedComment = useDebounce(comment, 1000);
  const debouncedSearch = useDebounce(searchTerm, 300);

  // Сбросить страницу при изменении поиска
  useEffect(() => {
    setCurrentPage(1);
  }, [debouncedSearch]);

  // Обновление комментария
  const updateCommentMutation = api.workSession.updateSessionComment.useMutation({
    onSuccess: () => {
      toast.success("Комментарий сохранен", {
        position: "bottom-right",
        duration: 2000,
      });
      
      // Обновляем список сессий после успешного сохранения
      // Обновляем данные в любом случае, чтобы изменения отображались немедленно
      if (onSessionUpdated) {
        onSessionUpdated();
        
        // Если диалог открыт, обновляем также выбранную сессию, чтобы она отражала актуальные данные
        if (selectedSession) {
          // Запоминаем ID текущей сессии
          const sessionId = selectedSession.id;
          
          // После небольшой задержки обновляем текущую сессию, чтобы совпало с обновлением списка
          setTimeout(() => {
            // Находим обновленную сессию в списке
            const updatedSession = sessions.find(session => session.id === sessionId);
            if (updatedSession) {
              setSelectedSession(updatedSession);
            }
          }, 300);
        }
      }
    },
    onError: (error) => {
      toast.error("Ошибка при сохранении", {
        description: error.message,
      });
    },
  });

  // Эффект для сохранения комментария при изменении debouncedComment
  useEffect(() => {
    // Проверяем, есть ли выбранная сессия и изменился ли комментарий
    // Также проверяем, не пустой ли debouncedComment, чтобы избежать ненужных запросов
    if (selectedSession && debouncedComment !== selectedSession.comment && debouncedComment !== undefined) {
      updateCommentMutation.mutate({
        sessionId: selectedSession.id,
        comment: debouncedComment,
      });
    }
  }, [debouncedComment]); // Удаляем selectedSession из зависимостей эффекта

  // Эффект для обновления состояния comment при изменении selectedSession
  // Важно: устанавливаем комментарий при каждом изменении сессии
  useEffect(() => {
    if (selectedSession) {
      // Устанавливаем комментарий при каждом изменении выбранной сессии
      // Это необходимо для отображения актуальных данных после обновления списка
      setComment(selectedSession.comment || "");
    }
  }, [selectedSession]); // Зависимость от всего объекта сессии, чтобы отслеживать изменения комментариев

  // Фильтрация сессий по поиску
  const filteredSessions = useMemo(() => {
    if (!debouncedSearch) return sessions;

    const term = debouncedSearch.toLowerCase();
    return sessions.filter(session => {
      // Поиск по дате
      const startDate = format(new Date(session.startTime), "dd.MM.yyyy", { locale: ru });
      
      // Поиск по кабинетам
      const cabinetMatch = session.idexCabinets.some(
        cabinet => 
          cabinet.idexId.toString().includes(term) || 
          cabinet.login.toLowerCase().includes(term)
      );
      
      // Поиск по комментарию
      const commentMatch = session.comment?.toLowerCase().includes(term);
      
      return startDate.includes(term) || cabinetMatch || commentMatch;
    });
  }, [sessions, debouncedSearch]);

  // Пагинация
  const paginatedSessions = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filteredSessions.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredSessions, currentPage, itemsPerPage]);

  // Общее количество страниц
  const totalPages = Math.ceil(filteredSessions.length / itemsPerPage);

  // Подсчет продолжительности для незавершенных сессий
  const calculateDuration = (session: WorkSession) => {
    if (session.duration) {
      const hours = Math.floor(session.duration / 3600);
      const minutes = Math.floor((session.duration % 3600) / 60);
      return `${hours} ч ${minutes} мин`;
    }
    
    if (!session.endTime) {
      const now = new Date();
      const start = new Date(session.startTime);
      const durationInSeconds = Math.floor((now.getTime() - start.getTime()) / 1000);
      const hours = Math.floor(durationInSeconds / 3600);
      const minutes = Math.floor((durationInSeconds % 3600) / 60);
      return `${hours} ч ${minutes} мин (активно)`;
    }
    
    return "Нет данных";
  };

  // Форматирование списка кабинетов
  const formatCabinets = (cabinets: WorkSession['idexCabinets']) => {
    if (cabinets.length <= 2) {
      return cabinets.map(cab => `ID: ${cab.idexId}`).join(', ');
    }
    return `ID: ${cabinets[0].idexId}, ${cabinets[1].idexId} +${cabinets.length - 2}`;
  };

  if (isLoading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 5 }).map((_, index) => (
          <Skeleton key={index} className="h-16 w-full" />
        ))}
      </div>
    );
  }

  if (sessions.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-lg border border-dashed p-8 text-center">
        <div className="rounded-full bg-muted p-3">
          <ClockIcon className="h-6 w-6 text-muted-foreground" />
        </div>
        <h3 className="mt-4 text-lg font-medium">Нет рабочих сессий</h3>
        <p className="mt-2 text-sm text-muted-foreground">
          Начните работу, чтобы создать первую рабочую сессию
        </p>
      </div>
    );
  }

  return (
    <>
      <div className="mb-4 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative">
          <SearchIcon className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Поиск по дате, кабинетам..."
            className="pl-9 sm:w-80"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        
        <div className="text-sm text-muted-foreground">
          Всего сессий: {filteredSessions.length}
        </div>
      </div>

      <div className="rounded-md border">
        <div className="divide-y">
          {paginatedSessions.map((session) => (
            <div 
              key={session.id} 
              className="group flex flex-col space-y-1 p-4 hover:bg-muted/50 sm:flex-row sm:items-center sm:justify-between sm:space-y-0"
            >
              <div className="flex-1 space-y-1">
                <div className="flex items-center gap-2">
                  <CalendarIcon className="h-4 w-4 text-muted-foreground" />
                  <span className="font-medium">
                    {format(new Date(session.startTime), "dd MMMM yyyy", {
                      locale: ru,
                    })}
                  </span>
                  {!session.endTime && (
                    <Badge variant="outline" className="animate-pulse bg-primary/10">
                      <span className="mr-1 h-1.5 w-1.5 rounded-full bg-green-500"></span>
                      Активно
                    </Badge>
                  )}
                </div>
                
                <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:gap-6">
                  <div className="flex items-center text-sm text-muted-foreground">
                    <ClockIcon className="mr-1 h-3.5 w-3.5" />
                    {calculateDuration(session)}
                  </div>
                  
                  <div className="flex items-center text-sm text-muted-foreground">
                    <span className="mr-1">Время:</span>
                    {format(new Date(session.startTime), "HH:mm", { locale: ru })}
                    {" – "}
                    {session.endTime
                      ? format(new Date(session.endTime), "HH:mm", { locale: ru })
                      : "сейчас"}
                  </div>
                </div>
                
                <div className="flex items-center text-sm">
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="link" className="h-auto p-0 text-sm font-normal">
                        {formatCabinets(session.idexCabinets)}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                      <div className="space-y-2 p-3">
                        <div className="font-medium">Кабинеты ({session.idexCabinets.length})</div>
                        <div className="max-h-60 space-y-1 overflow-auto">
                          {session.idexCabinets.map((cabinet) => (
                            <div 
                              key={cabinet.id} 
                              className="flex justify-between rounded-md bg-muted/50 px-2 py-1.5 text-xs"
                            >
                              <span className="font-medium">ID: {cabinet.idexId}</span>
                              <span className="text-muted-foreground">
                                Логин: {cabinet.login}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </PopoverContent>
                  </Popover>
                </div>
                
                {session.comment && (
                  <div className="mt-1 max-w-md truncate text-sm text-muted-foreground">
                    <span className="font-medium">Комментарий:</span> {session.comment}
                  </div>
                )}
              </div>
              
              <div className="flex items-center justify-end gap-2">
                {session.comment ? (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 gap-1"
                    onClick={() => setSelectedSession(session)}
                  >
                    <Edit2Icon className="h-3.5 w-3.5" />
                    <span className="hidden sm:inline">Редактировать</span>
                  </Button>
                ) : (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 gap-1"
                    onClick={() => setSelectedSession(session)}
                  >
                    <InfoIcon className="h-3.5 w-3.5" />
                    <span className="hidden sm:inline">Подробности</span>
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {totalPages > 1 && (
        <div className="mt-4 flex items-center justify-between">
          <div className="text-sm text-muted-foreground">
            Показано {(currentPage - 1) * itemsPerPage + 1} – {
              Math.min(currentPage * itemsPerPage, filteredSessions.length)
            } из {filteredSessions.length} сессий
          </div>
          <div className="flex items-center space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
              disabled={currentPage === 1}
              className="h-8 w-8 p-0"
            >
              <ChevronLeftIcon className="h-4 w-4" />
            </Button>
            {Array.from({ length: Math.min(totalPages, 5) }).map((_, i) => {
              // Логика для отображения страниц вокруг текущей
              let pageNum = i + 1;
              if (totalPages > 5) {
                if (currentPage <= 3) {
                  pageNum = i + 1;
                } else if (currentPage >= totalPages - 2) {
                  pageNum = totalPages - 4 + i;
                } else {
                  pageNum = currentPage - 2 + i;
                }
              }
              
              return (
                <Button
                  key={i}
                  variant={pageNum === currentPage ? "default" : "outline"}
                  size="sm"
                  onClick={() => setCurrentPage(pageNum)}
                  className={cn(
                    "h-8 w-8 p-0",
                    pageNum === currentPage && "pointer-events-none"
                  )}
                >
                  {pageNum}
                </Button>
              );
            })}
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))}
              disabled={currentPage === totalPages}
              className="h-8 w-8 p-0"
            >
              <ChevronRightIcon className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      <Dialog
        open={!!selectedSession}
        onOpenChange={(open) => {
          if (!open) {
            // При закрытии диалога сбрасываем выбранную сессию
            setSelectedSession(null);
            // Также сбрасываем состояние комментария
            setComment("");
          }
        }}
      >
        {selectedSession && (
          <DialogContent className="sm:max-w-[550px]">
            <DialogHeader className="border-b pb-3">
              <DialogTitle>Детали рабочей сессии</DialogTitle>
            </DialogHeader>
            
            <div className="space-y-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">
                    Дата:
                  </p>
                  <p className="text-sm">
                    {format(new Date(selectedSession.startTime), "dd MMMM yyyy", {
                      locale: ru,
                    })}
                  </p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">
                    Статус:
                  </p>
                  <p className="text-sm flex items-center gap-1.5">
                    {selectedSession.endTime ? (
                      <>
                        <CheckIcon className="h-3.5 w-3.5 text-green-500" />
                        Завершено
                      </>
                    ) : (
                      <>
                        <span className="relative flex h-2 w-2">
                          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-green-400 opacity-75"></span>
                          <span className="relative inline-flex h-2 w-2 rounded-full bg-green-500"></span>
                        </span>
                        Активно
                      </>
                    )}
                  </p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">
                    Начало:
                  </p>
                  <p className="text-sm">
                    {format(new Date(selectedSession.startTime), "HH:mm", {
                      locale: ru,
                    })}
                  </p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">
                    Окончание:
                  </p>
                  <p className="text-sm">
                    {selectedSession.endTime
                      ? format(new Date(selectedSession.endTime), "HH:mm", {
                          locale: ru,
                        })
                      : "В процессе"}
                  </p>
                </div>
                <div className="col-span-2">
                  <p className="text-sm font-medium text-muted-foreground">
                    Длительность:
                  </p>
                  <p className="text-sm">{calculateDuration(selectedSession)}</p>
                </div>
              </div>

              <div>
                <p className="mb-2 text-sm font-medium text-muted-foreground">
                  Кабинеты Idex ({selectedSession.idexCabinets.length}):
                </p>
                <div className="max-h-40 space-y-2 overflow-auto rounded-md border p-2">
                  {selectedSession.idexCabinets.map((cabinet) => (
                    <div
                      key={cabinet.id}
                      className="flex items-center justify-between rounded-md bg-muted/50 px-3 py-2"
                    >
                      <span className="text-sm font-medium">
                        ID: {cabinet.idexId}
                      </span>
                      <span className="text-sm text-muted-foreground">
                        Логин: {cabinet.login}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <div className="mb-2 flex items-center justify-between">
                  <p className="text-sm font-medium text-muted-foreground">
                    Комментарий:
                  </p>
                  {updateCommentMutation.isPending && (
                    <div className="flex items-center text-xs text-muted-foreground">
                      <span className="mr-1 h-3 w-3 animate-spin rounded-full border-2 border-current border-t-transparent"></span>
                      Сохранение...
                    </div>
                  )}
                </div>
                <Textarea
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  placeholder="Добавить комментарий..."
                  className="min-h-[100px] resize-none"
                />
              </div>
            </div>
          </DialogContent>
        )}
      </Dialog>
    </>
  );
}