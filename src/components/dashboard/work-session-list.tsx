"use client";

import React, { useState, useMemo, useEffect } from "react";
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
  Edit2Icon,
  PlusIcon,
  TrashIcon,
  TagIcon
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
import { Checkbox } from "~/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "~/components/ui/sheet";
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
    workSessionId: number;
    idexCabinetId: number;
    assignedAt: Date;
    idexCabinet: {
      id: number;
      idexId: number;
      login: string;
      password: string;
      createdAt: Date;
      updatedAt: Date;
    };
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
  const [isEditingCabinets, setIsEditingCabinets] = useState<boolean>(false);
  const [cabinetSearchTerm, setCabinetSearchTerm] = useState<string>("");
  const [selectedCabinetsToAdd, setSelectedCabinetsToAdd] = useState<number[]>([]);
  const [selectedCabinetsToRemove, setSelectedCabinetsToRemove] = useState<number[]>([]);
  const itemsPerPage = 10;
  
  const debouncedComment = useDebounce(comment, 1000);
  const debouncedSearch = useDebounce(searchTerm, 300);

  // Сбросить страницу при изменении поиска
  useEffect(() => {
    setCurrentPage(1);
  }, [debouncedSearch]);

  // Обновление комментария
  // Получаем все кабинеты для выбора
  const cabinetsQuery = api.idexCabinet.getAll.useQuery(undefined, {
    enabled: !!selectedSession && isEditingCabinets,
    staleTime: 30000, // Кэшируем на 30 секунд
  });
  
  // Мутация для добавления кабинетов в сессию
  const addCabinetsMutation = api.workSession.addCabinetsToSession.useMutation({
    onSuccess: () => {
      toast.success("Кабинеты добавлены в сессию", {
        position: "bottom-right",
        duration: 2000,
      });
      
      // Сбрасываем выбранные кабинеты
      setSelectedCabinetsToAdd([]);
      // Обновляем данные
      if (onSessionUpdated) {
        onSessionUpdated();
      }
    },
    onError: (error) => {
      toast.error("Ошибка при добавлении кабинетов", {
        description: error.message,
      });
    },
  });
  
  // Мутация для удаления кабинетов из сессии
  const removeCabinetsMutation = api.workSession.removeCabinetsFromSession.useMutation({
    onSuccess: () => {
      toast.success("Кабинеты удалены из сессии", {
        position: "bottom-right",
        duration: 2000,
      });
      
      // Сбрасываем выбранные кабинеты
      setSelectedCabinetsToRemove([]);
      // Обновляем данные
      if (onSessionUpdated) {
        onSessionUpdated();
      }
    },
    onError: (error) => {
      toast.error("Ошибка при удалении кабинетов", {
        description: error.message,
      });
    },
  });
  
  // Мутация для обновления комментария
  const updateCommentMutation = api.workSession.updateSessionComment.useMutation({
    onSuccess: (data, variables) => {
      toast.success("Комментарий сохранен", {
        position: "bottom-right",
        duration: 2000,
      });
      
      // Обновляем данные
      if (onSessionUpdated) {
        // Запоминаем текущий комментарий перед обновлением
        const currentComment = comment;
        
        onSessionUpdated();
        
        // Если диалог открыт, обновляем выбранную сессию, но сохраняем текущий текст
        if (selectedSession) {
          const sessionId = selectedSession.id;
          
          setTimeout(() => {
            const updatedSession = sessions.find(session => session.id === sessionId);
            if (updatedSession) {
              // Создаем копию обновленной сессии, но с текущим комментарием
              const sessionWithCurrentComment = {
                ...updatedSession,
                comment: currentComment // Сохраняем текущий ввод пользователя
              };
              
              setSelectedSession(sessionWithCurrentComment);
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

  useEffect(() => {
    // Проверяем, есть ли выбранная сессия и изменился ли комментарий
    if (selectedSession && debouncedComment !== selectedSession.comment && debouncedComment !== undefined) {
      // Сохраняем текущее значение comment перед отправкой запроса
      const commentToSave = debouncedComment;
      
      updateCommentMutation.mutate({
        sessionId: selectedSession.id,
        comment: commentToSave,
      });
    }
  }, [debouncedComment]);

// Эффект для обновления состояния comment при изменении selectedSession
useEffect(() => {
  if (selectedSession && !updateCommentMutation.isPending) {
    // Устанавливаем комментарий только если мутация не выполняется
    setComment(selectedSession.comment || "");
  }
}, [selectedSession, updateCommentMutation.isPending]);

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
    if (!cabinets || cabinets.length === 0) {
      return 'Не выбраны';
    }
    
    return `${cabinets.length} кабинетов`;
  };
  
  // Получить информацию о кабинете из структуры промежуточной таблицы
  const getCabinetInfo = (cabinetRelation: WorkSession['idexCabinets'][0]) => {
    return cabinetRelation.idexCabinet || { id: 0, idexId: 0, login: 'Неизвестный' };
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
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-1.5">
                      <TagIcon className="h-3.5 w-3.5 text-muted-foreground" />
                      <span className="text-sm text-muted-foreground">
                        {formatCabinets(session.idexCabinets)}
                      </span>
                    </div>
                    {session.idexCabinets.length > 0 && (
                      <span className="text-xs text-muted-foreground">
                        {session.idexCabinets.map((cabinet, index) => (
                          <React.Fragment key={cabinet.idexCabinetId}>
                            {index > 0 && " • "}
                            ID: {getCabinetInfo(cabinet).idexId}
                          </React.Fragment>
                        ))}
                      </span>
                    )}
                  </div>
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
            // Также сбрасываем все состояния
            setComment("");
            setIsEditingCabinets(false);
            setSelectedCabinetsToAdd([]);
            setSelectedCabinetsToRemove([]);
            setCabinetSearchTerm("");
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
                <div className="mb-2 flex items-center justify-between">
                  <p className="text-sm font-medium text-muted-foreground">
                    Кабинеты Idex ({selectedSession.idexCabinets.length}):
                  </p>
                  <Sheet open={isEditingCabinets} onOpenChange={setIsEditingCabinets}>
                    <SheetTrigger asChild>
                      <Button 
                        variant="outline" 
                        size="sm"
                        className="h-7 px-2 text-xs"
                      >
                        <Edit2Icon className="mr-1 h-3 w-3" />
                        Изменить
                      </Button>
                    </SheetTrigger>
                    <SheetContent side="right" className="w-[400px] sm:w-[540px]">
                      <SheetHeader>
                        <SheetTitle>Управление кабинетами</SheetTitle>
                        <SheetDescription>
                          Добавьте или удалите кабинеты из рабочей сессии
                        </SheetDescription>
                      </SheetHeader>
                      
                      <div className="mt-6 space-y-6">
                        {/* Текущие кабинеты в сессии */}
                        <div>
                          <h3 className="mb-3 text-sm font-medium">Текущие кабинеты в сессии:</h3>
                          
                          {selectedSession.idexCabinets.length === 0 ? (
                            <p className="text-sm text-muted-foreground">В сессии нет кабинетов</p>
                          ) : (
                            <div className="space-y-2">
                              {selectedSession.idexCabinets.map((cabinetRelation) => {
                                const cabinet = getCabinetInfo(cabinetRelation);
                                return (
                                  <div 
                                    key={cabinetRelation.idexCabinetId}
                                    className="flex items-center justify-between rounded-md border p-2"
                                  >
                                    <div>
                                      <div className="font-medium">ID: {cabinet.idexId}</div>
                                      <div className="text-xs text-muted-foreground">{cabinet.login}</div>
                                    </div>
                                    <Checkbox
                                      checked={selectedCabinetsToRemove.includes(cabinetRelation.idexCabinetId)}
                                      onCheckedChange={(checked) => {
                                        if (checked) {
                                          setSelectedCabinetsToRemove([...selectedCabinetsToRemove, cabinetRelation.idexCabinetId]);
                                        } else {
                                          setSelectedCabinetsToRemove(
                                            selectedCabinetsToRemove.filter(id => id !== cabinetRelation.idexCabinetId)
                                          );
                                        }
                                      }}
                                    />
                                  </div>
                                );
                              })}
                              
                              {selectedCabinetsToRemove.length > 0 && (
                                <Button 
                                  variant="destructive"
                                  size="sm"
                                  className="mt-2 w-full"
                                  onClick={() => {
                                    if (!selectedSession) return;
                                    removeCabinetsMutation.mutate({
                                      sessionId: selectedSession.id,
                                      cabinetIds: selectedCabinetsToRemove
                                    });
                                  }}
                                  disabled={removeCabinetsMutation.isPending}
                                >
                                  {removeCabinetsMutation.isPending ? (
                                    <>Удаление...</>
                                  ) : (
                                    <>
                                      <TrashIcon className="mr-2 h-4 w-4" />
                                      Удалить выбранные ({selectedCabinetsToRemove.length})
                                    </>
                                  )}
                                </Button>
                              )}
                            </div>
                          )}
                        </div>
                        
                        {/* Доступные кабинеты для добавления */}
                        <div>
                          <h3 className="mb-3 text-sm font-medium">Добавить кабинеты:</h3>
                          
                          <div className="mb-4">
                            <Input
                              placeholder="Поиск по ID или логину..."
                              value={cabinetSearchTerm}
                              onChange={(e) => setCabinetSearchTerm(e.target.value)}
                              className="mb-3"
                            />
                          </div>
                          
                          {cabinetsQuery.isLoading ? (
                            <div className="space-y-2">
                              <Skeleton className="h-10 w-full" />
                              <Skeleton className="h-10 w-full" />
                              <Skeleton className="h-10 w-full" />
                            </div>
                          ) : cabinetsQuery.data ? (
                            <div className="max-h-[200px] space-y-2 overflow-y-auto">
                              {cabinetsQuery.data
                                .filter(cabinet => {
                                  // Фильтруем только те кабинеты, которых еще нет в сессии
                                  const cabinetIds = selectedSession.idexCabinets.map(
                                    relation => relation.idexCabinetId
                                  );
                                  return !cabinetIds.includes(cabinet.id);
                                })
                                .filter(cabinet => {
                                  // Применяем поиск
                                  if (!cabinetSearchTerm) return true;
                                  const searchLower = cabinetSearchTerm.toLowerCase();
                                  return (
                                    cabinet.idexId.toString().includes(searchLower) ||
                                    cabinet.login.toLowerCase().includes(searchLower)
                                  );
                                })
                                .map(cabinet => (
                                  <div
                                    key={cabinet.id}
                                    className="flex items-center justify-between rounded-md border p-2"
                                  >
                                    <div>
                                      <div className="font-medium">ID: {cabinet.idexId}</div>
                                      <div className="text-xs text-muted-foreground">{cabinet.login}</div>
                                    </div>
                                    <Checkbox
                                      checked={selectedCabinetsToAdd.includes(cabinet.id)}
                                      onCheckedChange={(checked) => {
                                        if (checked) {
                                          setSelectedCabinetsToAdd([...selectedCabinetsToAdd, cabinet.id]);
                                        } else {
                                          setSelectedCabinetsToAdd(
                                            selectedCabinetsToAdd.filter(id => id !== cabinet.id)
                                          );
                                        }
                                      }}
                                    />
                                  </div>
                                ))}
                            </div>
                          ) : (
                            <p className="text-sm text-muted-foreground">Не удалось загрузить кабинеты</p>
                          )}
                          
                          {selectedCabinetsToAdd.length > 0 && (
                            <Button
                              variant="default"
                              size="sm"
                              className="mt-4 w-full"
                              onClick={() => {
                                if (!selectedSession) return;
                                addCabinetsMutation.mutate({
                                  sessionId: selectedSession.id,
                                  cabinetIds: selectedCabinetsToAdd
                                });
                              }}
                              disabled={addCabinetsMutation.isPending}
                            >
                              {addCabinetsMutation.isPending ? (
                                <>Добавление...</>
                              ) : (
                                <>
                                  <PlusIcon className="mr-2 h-4 w-4" />
                                  Добавить выбранные ({selectedCabinetsToAdd.length})
                                </>
                              )}
                            </Button>
                          )}
                        </div>
                      </div>
                    </SheetContent>
                  </Sheet>
                </div>
                
                <div className="max-h-40 space-y-2 overflow-auto rounded-md border p-2">
                  {selectedSession.idexCabinets.length === 0 ? (
                    <p className="py-2 text-center text-sm text-muted-foreground">Нет кабинетов в сессии</p>
                  ) : selectedSession.idexCabinets.map((cabinetRelation) => {
                    const cabinet = getCabinetInfo(cabinetRelation);
                    return (
                      <div
                        key={cabinetRelation.idexCabinetId}
                        className="flex items-center justify-between rounded-md bg-muted/50 px-3 py-2"
                      >
                        <span className="text-sm font-medium">
                          ID: {cabinet.idexId}
                        </span>
                        <span className="text-sm text-muted-foreground">
                          Логин: {cabinet.login}
                        </span>
                      </div>
                    );
                  })}
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