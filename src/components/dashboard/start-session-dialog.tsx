"use client";

import { useState, useEffect } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { motion, AnimatePresence } from "framer-motion";
import { 
  CheckIcon, 
  XIcon, 
  PlayCircleIcon, 
  SearchIcon, 
  FilterIcon,
  ArrowLeftIcon,
  LayersIcon,
  TagIcon,
  LockIcon,
  ListIcon,
  SlidersHorizontal,
  RefreshCw
} from "lucide-react";
import { toast } from "sonner";

import { Button } from "~/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "~/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "~/components/ui/form";
import { ScrollArea } from "~/components/ui/scroll-area";
import { Checkbox } from "~/components/ui/checkbox";
import { Textarea } from "~/components/ui/textarea";
import { Input } from "~/components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "~/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import { api } from "~/trpc/react";
import { useWorkSessionStore } from "~/store/work-session-store";
import { Skeleton } from "~/components/ui/skeleton";
import { Badge } from "~/components/ui/badge";
import { Label } from "~/components/ui/label";
import { cn } from "~/lib/utils";

// Схема валидации формы
const formSchema = z.object({
  cabinetIds: z.array(z.number()).min(1, {
    message: "Выберите хотя бы один кабинет",
  }),
  comment: z.string().optional(),
});

interface StartSessionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

export function StartSessionDialog({
  open,
  onOpenChange,
  onSuccess,
}: StartSessionDialogProps) {
  const [step, setStep] = useState(1);
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState<"idexId" | "login">("idexId");
  const [viewMode, setViewMode] = useState<"list" | "grid">("grid");
  const [filterSelected, setFilterSelected] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(false);
  
  // Используем useState для локального управления кабинетами
  const [cabinets, setCabinets] = useState<any[]>([]);
  const { setActiveCabinets, setCabinetSelected, setComment, resetCabinetSelections } = useWorkSessionStore();
  
  // Запрос на получение кабинетов
  const cabinetsQuery = api.idexCabinet.getAll.useQuery(undefined, {
    enabled: open,
    refetchOnWindowFocus: false
  });
  
  // Эффект для обработки данных после их получения
  useEffect(() => {
    if (cabinetsQuery.data && Array.isArray(cabinetsQuery.data) && cabinetsQuery.data.length > 0) {
      // Добавляем поле selected по умолчанию false
      const processedCabinets = cabinetsQuery.data.map(cabinet => ({
        ...cabinet,
        selected: false
      }));
      
      // Устанавливаем в локальное состояние
      setCabinets(processedCabinets);
      // И в глобальное хранилище
      setActiveCabinets(processedCabinets);
      
      console.log(`Processed ${processedCabinets.length} cabinets`);
    }
  }, [cabinetsQuery.data, setActiveCabinets]);
  
  // Принудительно обновить список кабинетов
  const refreshCabinets = async () => {
    setLoading(true);
    try {
      const result = await cabinetsQuery.refetch();
      if (result.data && result.data.length > 0) {
        toast.success(`Загружено ${result.data.length} кабинетов`);
      } else {
        toast.error("Кабинеты не найдены");
      }
    } catch (err) {
      toast.error("Ошибка при загрузке кабинетов");
      console.error("Error refreshing cabinets:", err);
    } finally {
      setLoading(false);
    }
  };
  
  // Мутация для создания новой рабочей сессии
  const startSessionMutation = api.workSession.startSession.useMutation({
    onSuccess: () => {
      toast.success("Рабочая сессия начата", {
        description: "Вы успешно начали новую рабочую сессию"
      });
      
      resetCabinetSelections();
      setStep(1);
      onOpenChange(false);
      
      // Вызов колбэка успеха
      if (onSuccess) {
        onSuccess();
      }
    },
    onError: (error) => {
      toast.error("Ошибка", {
        description: error.message
      });
    },
  });
  
  // Инициализация формы
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      cabinetIds: [],
      comment: "",
    },
  });
  
  // Фильтрация и сортировка кабинетов
  const filteredAndSortedCabinets = cabinets
    .filter((cabinet) => {
      // Фильтрация по строке поиска
      const matchesSearch = !searchQuery || 
        cabinet.idexId.toString().toLowerCase().includes(searchQuery.toLowerCase()) ||
        cabinet.login.toLowerCase().includes(searchQuery.toLowerCase());
      
      // Фильтрация по статусу выбора
      const matchesSelectedFilter = 
        filterSelected === null || 
        cabinet.selected === filterSelected;
      
      return matchesSearch && matchesSelectedFilter;
    })
    .sort((a, b) => {
      // Сортировка
      if (sortBy === "idexId") {
        return a.idexId - b.idexId;
      } else {
        return a.login.localeCompare(b.login);
      }
    });
  
  // Обработчик выбора/отмены выбора всех видимых кабинетов
  const handleSelectAll = (selected: boolean) => {
    // Создаем новый массив с обновленными значениями
    const updatedCabinets = cabinets.map(cabinet => {
      // Проверяем, есть ли кабинет в отфильтрованном списке
      const isInFilteredList = filteredAndSortedCabinets.some(
        filteredCabinet => filteredCabinet.id === cabinet.id
      );
      
      // Если кабинет в отфильтрованном списке, обновляем его состояние
      if (isInFilteredList) {
        return { ...cabinet, selected };
      }
      
      // Иначе оставляем как есть
      return cabinet;
    });
    
    // Обновляем локальное состояние
    setCabinets(updatedCabinets);
    
    // Также обновляем в хранилище Zustand
    updatedCabinets.forEach(cabinet => {
      if (filteredAndSortedCabinets.some(
        filteredCabinet => filteredCabinet.id === cabinet.id
      )) {
        setCabinetSelected(cabinet.id, selected);
      }
    });
  };

  // Обработчик выбора отдельного кабинета
  const handleCabinetSelection = (id: number, selected: boolean) => {
    // Обновляем локальное состояние
    setCabinets(prevCabinets => 
      prevCabinets.map(cabinet => 
        cabinet.id === id ? { ...cabinet, selected } : cabinet
      )
    );
    
    // Обновляем в хранилище Zustand
    setCabinetSelected(id, selected);
  };
  
  // Обработчик перехода к следующему шагу
  const handleNextStep = () => {
    const selectedCabinets = cabinets
      .filter((cabinet) => cabinet.selected)
      .map((cabinet) => cabinet.id);
    
    form.setValue("cabinetIds", selectedCabinets);
    
    if (selectedCabinets.length === 0) {
      form.setError("cabinetIds", {
        type: "manual",
        message: "Выберите хотя бы один кабинет",
      });
      return;
    }
    
    setStep(2);
  };
  
  // Обработчик отправки формы
  const onSubmit = (values: z.infer<typeof formSchema>) => {
    startSessionMutation.mutate({
      cabinetIds: values.cabinetIds,
      comment: values.comment,
    });
  };
  
  // Обработчик закрытия диалога
  const handleDialogClose = (open: boolean) => {
    if (!open) {
      setStep(1);
      setSearchQuery("");
      setFilterSelected(null);
      setSortBy("idexId");
    }
    onOpenChange(open);
  };
  
  // Подсчет выбранных кабинетов
  const selectedCount = cabinets.filter((c) => c.selected).length;
  
  // Статус загрузки
  const isLoading = cabinetsQuery.isLoading || loading;
  
  // Проверяем, есть ли данные
  const hasData = cabinets.length > 0;
  
  return (
    <Dialog open={open} onOpenChange={handleDialogClose}>
      <DialogContent className="max-w-6xl p-0">
        <DialogHeader className="p-6 pb-2">
          <DialogTitle className="text-xl flex items-center justify-between">
            <span>Начать рабочую сессию</span>
            <Button 
              variant="ghost" 
              size="sm" 
              className="h-8 px-2"
              onClick={refreshCabinets}
              disabled={isLoading}
            >
              <RefreshCw className={cn(
                "h-4 w-4 mr-1",
                isLoading && "animate-spin"
              )} />
              {isLoading ? "Загрузка..." : "Обновить список"}
            </Button>
          </DialogTitle>
        </DialogHeader>
        
        {cabinetsQuery.isSuccess && (
          <div className="bg-green-500/10 text-green-600 dark:text-green-400 px-6 py-2 text-sm">
            Загружено {cabinetsQuery.data?.length || 0} кабинетов
          </div>
        )}
        
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <AnimatePresence mode="wait">
              {step === 1 && (
                <motion.div
                  key="step1"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  className="space-y-4 p-6 pt-2"
                >
                  <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                    <FormLabel className="text-base">
                      Выберите кабинеты для работы
                    </FormLabel>
                    <div className="flex items-center gap-2 flex-wrap">
                      <Badge variant={filterSelected === null ? "default" : "outline"} 
                        className="cursor-pointer"
                        onClick={() => setFilterSelected(null)}
                      >
                        Все ({cabinets.length})
                      </Badge>
                      <Badge 
                        variant={filterSelected === true ? "default" : "outline"} 
                        className="cursor-pointer"
                        onClick={() => setFilterSelected(true)}
                      >
                        Выбранные ({selectedCount})
                      </Badge>
                      <Badge 
                        variant={filterSelected === false ? "default" : "outline"} 
                        className="cursor-pointer"
                        onClick={() => setFilterSelected(false)}
                      >
                        Не выбранные ({cabinets.length - selectedCount})
                      </Badge>
                    </div>
                  </div>
                  
                  <FormField
                    control={form.control}
                    name="cabinetIds"
                    render={() => (
                      <FormItem className="space-y-4">
                        <div className="flex flex-col space-y-3 sm:flex-row sm:items-center sm:justify-between sm:space-y-0">
                          <div className="relative w-full sm:max-w-sm">
                            <SearchIcon className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                            <Input
                              placeholder="Поиск по ID или логину..."
                              value={searchQuery}
                              onChange={(e) => setSearchQuery(e.target.value)}
                              className="pl-9"
                            />
                          </div>
                          
                          <div className="flex flex-wrap items-center gap-2">
                            <Select
                              value={sortBy}
                              onValueChange={(value) => setSortBy(value as "idexId" | "login")}
                            >
                              <SelectTrigger className="h-9 w-[180px]">
                                <SlidersHorizontal className="mr-2 h-4 w-4" />
                                <SelectValue placeholder="Сортировать по" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="idexId">ID кабинета</SelectItem>
                                <SelectItem value="login">Логин</SelectItem>
                              </SelectContent>
                            </Select>
                            
                            <Tabs 
                              value={viewMode} 
                              onValueChange={(v) => setViewMode(v as "list" | "grid")}
                              className="hidden sm:block"
                            >
                              <TabsList className="h-9">
                                <TabsTrigger value="list" className="px-3">
                                  <ListIcon className="h-4 w-4" />
                                </TabsTrigger>
                                <TabsTrigger value="grid" className="px-3">
                                  <LayersIcon className="h-4 w-4" />
                                </TabsTrigger>
                              </TabsList>
                            </Tabs>
                          </div>
                        </div>
                        
                        <div className="relative rounded-md border">
                          {isLoading ? (
                            <div className="p-4 space-y-3">
                              {Array.from({ length: 6 }).map((_, i) => (
                                <Skeleton key={i} className="h-16 w-full" />
                              ))}
                            </div>
                          ) : hasData ? (
                            <>
                              <div className="sticky top-0 z-10 flex items-center justify-between gap-2 border-b bg-muted/50 p-2 backdrop-blur">
                                <div className="flex items-center gap-2">
                                  <Checkbox
                                    id="select-all"
                                    checked={
                                      filteredAndSortedCabinets.length > 0 && 
                                      filteredAndSortedCabinets.every(c => c.selected)
                                    }
                                    onCheckedChange={(checked) => {
                                      handleSelectAll(!!checked);
                                    }}
                                  />
                                  <Label 
                                    htmlFor="select-all" 
                                    className="text-sm font-medium cursor-pointer"
                                  >
                                    Выбрать все видимые ({filteredAndSortedCabinets.length})
                                  </Label>
                                </div>
                                
                                <div className="text-xs text-muted-foreground">
                                  {selectedCount === 0 ? (
                                    "Ничего не выбрано"
                                  ) : (
                                    `Выбрано: ${selectedCount} из ${cabinets.length}`
                                  )}
                                </div>
                              </div>
                              
                              <ScrollArea className="h-[400px]">
                                {viewMode === "grid" ? (
                                  <div className="grid grid-cols-1 gap-3 p-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                                    {filteredAndSortedCabinets.map((cabinet) => (
                                      <CabinetCard
                                        key={cabinet.id}
                                        cabinet={cabinet}
                                        onCheckedChange={(checked) => {
                                          handleCabinetSelection(cabinet.id, checked);
                                        }}
                                      />
                                    ))}
                                  </div>
                                ) : (
                                  <div className="divide-y">
                                    {filteredAndSortedCabinets.map((cabinet) => (
                                      <CabinetListItem
                                        key={cabinet.id}
                                        cabinet={cabinet}
                                        onCheckedChange={(checked) => {
                                          handleCabinetSelection(cabinet.id, checked);
                                        }}
                                      />
                                    ))}
                                  </div>
                                )}
                                
                                {filteredAndSortedCabinets.length === 0 && (
                                  <div className="flex flex-col items-center justify-center p-8">
                                    <FilterIcon className="mb-2 h-6 w-6 text-muted-foreground" />
                                    <p className="text-base font-medium">
                                      По вашему запросу ничего не найдено
                                    </p>
                                    <Button
                                      variant="link"
                                      onClick={() => setSearchQuery("")}
                                      className="mt-2"
                                    >
                                      Сбросить фильтры
                                    </Button>
                                  </div>
                                )}
                              </ScrollArea>
                            </>
                          ) : (
                            <div className="flex flex-col items-center justify-center py-12">
                              <FilterIcon className="mb-2 h-10 w-10 text-muted-foreground/70" />
                              <p className="text-lg font-medium">
                                Нет доступных кабинетов
                              </p>
                              <p className="mt-1 text-sm text-muted-foreground">
                                Обновите список или добавьте кабинеты в систему
                              </p>
                              <Button
                                variant="outline"
                                onClick={refreshCabinets}
                                className="mt-4"
                              >
                                <RefreshCw className={cn(
                                  "mr-2 h-4 w-4",
                                  isLoading && "animate-spin"
                                )} />
                                Обновить список
                              </Button>
                            </div>
                          )}
                        </div>
                        
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <div className="flex justify-between pt-2">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => onOpenChange(false)}
                    >
                      <XIcon className="mr-2 h-4 w-4" />
                      Отмена
                    </Button>
                    <Button
                      type="button"
                      onClick={handleNextStep}
                      disabled={selectedCount === 0}
                      className={cn(
                        selectedCount === 0 ? "" : "bg-gradient-to-r from-primary to-primary/90"
                      )}
                    >
                      Далее
                    </Button>
                  </div>
                </motion.div>
              )}
              
              {step === 2 && (
                <motion.div
                  key="step2"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  className="space-y-4 p-6 pt-2"
                >
                  <div className="rounded-md border bg-muted/30 p-4">
                    <div className="mb-3 flex items-center justify-between">
                      <h3 className="text-sm font-medium">
                        Выбранные кабинеты:
                      </h3>
                      <Badge>Всего: {selectedCount}</Badge>
                    </div>
                    <ScrollArea className="h-[200px] rounded-md border bg-background">
                      <div className="grid grid-cols-1 gap-3 p-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                        {cabinets
                          .filter((cabinet) => cabinet.selected)
                          .map((cabinet) => (
                            <div
                              key={cabinet.id}
                              className="flex flex-col justify-between rounded-md border bg-card p-3 shadow-sm"
                            >
                              <div className="flex justify-between">
                                <Badge variant="outline" className="mb-1">
                                  ID: {cabinet.idexId}
                                </Badge>
                              </div>
                              <div className="mt-1 flex items-center text-sm text-muted-foreground">
                                <TagIcon className="mr-1 h-3.5 w-3.5" />
                                <span className="truncate">{cabinet.login}</span>
                              </div>
                            </div>
                          ))}
                      </div>
                    </ScrollArea>
                  </div>
                  
                  <FormField
                    control={form.control}
                    name="comment"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Комментарий (необязательно)</FormLabel>
                        <FormControl>
                          {/* <Textarea
                            placeholder="Введите комментарий к рабочей сессии"
                            {...field}
                            onChange={(e) => {
                              field.onChange(e);
                              setComment(e.target.value);
                            }}
                            className="min-h-[100px] resize-none"
                          /> */}
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <div className="flex justify-between pt-2">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setStep(1)}
                    >
                      <ArrowLeftIcon className="mr-2 h-4 w-4" />
                      Назад
                    </Button>
                    <Button
                      type="submit"
                      disabled={startSessionMutation.isPending}
                      className={cn(
                        "bg-gradient-to-r from-primary to-primary/90",
                        startSessionMutation.isPending && "opacity-80"
                      )}
                    >
                      {startSessionMutation.isPending ? (
                        <>
                          <span className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent"></span>
                          Загрузка...
                        </>
                      ) : (
                        <>
                          <PlayCircleIcon className="mr-2 h-4 w-4" />
                          Начать работу
                        </>
                      )}
                    </Button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

// Компонент карточки кабинета (для отображения в сетке)
function CabinetCard({ 
  cabinet, 
  onCheckedChange 
}: { 
  cabinet: any, 
  onCheckedChange: (checked: boolean) => void 
}) {
  return (
    <div
      className={cn(
        "group relative rounded-lg border p-3 shadow-sm transition-all hover:shadow-md",
        cabinet.selected 
          ? "border-primary bg-primary/5" 
          : "hover:border-primary/30"
      )}
    >
      <div className="absolute right-2.5 top-2.5">
        <Checkbox
          checked={cabinet.selected}
          onCheckedChange={(checked) => onCheckedChange(!!checked)}
          className="h-4 w-4 transition-transform group-hover:scale-110"
        />
      </div>
      
      <div className="mb-2 flex items-center">
        <Badge className="bg-muted text-foreground">
          ID: {cabinet.idexId}
        </Badge>
        {cabinet.selected && (
          <Badge className="ml-2 bg-primary/20 text-primary">
            Выбрано
          </Badge>
        )}
      </div>
      
      <div className="space-y-1 text-sm">
        <div className="flex items-center text-muted-foreground">
          <TagIcon className="mr-1.5 h-3.5 w-3.5" />
          <span className="font-medium">Логин:</span> 
          <span className="ml-1 truncate">{cabinet.login}</span>
        </div>
        <div className="flex items-center text-muted-foreground">
          <LockIcon className="mr-1.5 h-3.5 w-3.5" />
          <span className="font-medium">Пароль:</span>
          <span className="ml-1 truncate opacity-70">••••••••</span>
        </div>
      </div>
      
      <Button
        variant="ghost"
        size="sm"
        className={cn(
          "mt-2 w-full justify-center transition-opacity", 
          cabinet.selected ? "opacity-100" : "opacity-0 group-hover:opacity-100"
        )}
        onClick={() => onCheckedChange(!cabinet.selected)}
      >
        {cabinet.selected ? "Отменить" : "Выбрать"}
      </Button>
    </div>
  );
}

// Компонент строки кабинета (для отображения в списке)
function CabinetListItem({ 
  cabinet, 
  onCheckedChange 
}: { 
  cabinet: any, 
  onCheckedChange: (checked: boolean) => void 
}) {
  return (
    <div 
      className={cn(
        "group flex items-center justify-between p-3 transition-colors",
        cabinet.selected ? "bg-primary/5" : "hover:bg-muted/50"
      )}
    >
      <div className="flex items-center gap-3">
        <Checkbox
          checked={cabinet.selected}
          onCheckedChange={(checked) => onCheckedChange(!!checked)}
          className="h-4 w-4"
        />
        
        <div>
          <div className="flex items-center gap-2">
            <span className="font-medium">ID: {cabinet.idexId}</span>
            {cabinet.selected && (
              <Badge className="bg-primary/20 text-primary">
                Выбрано
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-4 text-sm text-muted-foreground">
            <div className="flex items-center">
              <TagIcon className="mr-1 h-3.5 w-3.5" />
              <span>{cabinet.login}</span>
            </div>
          </div>
        </div>
      </div>
      
      <Button
        variant="ghost"
        size="sm"
        className="h-8 opacity-0 transition-opacity group-hover:opacity-100"
        onClick={() => onCheckedChange(!cabinet.selected)}
      >
        {cabinet.selected ? "Отменить" : "Выбрать"}
      </Button>
    </div>
  );
}