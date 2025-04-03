"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { formatDistance } from "date-fns";
import { ru } from "date-fns/locale";
import { 
  PlayIcon, 
  PauseIcon, 
  ClockIcon, 
  ListIcon,
  MessageSquareIcon,
  TrendingUpIcon,
  BarChart3Icon,
  LogOut,
  Moon,
  Sun,
  LaptopIcon
} from "lucide-react";
import { toast } from "sonner";

import { Button } from "~/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "~/components/ui/card";
import { Separator } from "~/components/ui/separator";
import { Badge } from "~/components/ui/badge";
import { api } from "~/trpc/react";
import { useAuthStore } from "~/store/auth-store";
import { useRouter } from "next/navigation";
import { useTheme } from "~/components/theme/theme-provider";
import { Avatar, AvatarFallback } from "~/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "~/components/ui/dropdown-menu";

// Импортируем улучшенные компоненты
import { WorkSessionList } from "~/components/dashboard/work-session-list";
import { StartSessionDialog } from "~/components/dashboard/start-session-dialog";
import { TransactionsDialog } from "~/components/dashboard/transactions-dialog";

export default function DashboardPage() {
  const router = useRouter();
  const { user, logout } = useAuthStore();
  const { theme, setTheme } = useTheme();
  const [startSessionOpen, setStartSessionOpen] = useState(false);
  const [transactionsOpen, setTransactionsOpen] = useState(false);
  const [transactionType, setTransactionType] = useState<"telegram" | "bybit">("telegram");
  const [activeTime, setActiveTime] = useState<string | null>(null);
  
  // Получение активной сессии
  const activeSessionQuery = api.workSession.getActiveSession.useQuery(undefined, {
    refetchInterval: 30000, // Обновление каждые 30 секунд
  });
  
  // Получение всех сессий пользователя
  const userSessionsQuery = api.workSession.getUserSessions.useQuery();
  
  // Запросы на получение количества транзакций
  const telegramTransactionsQuery = api.transaction.getTelegramTransactionsCount.useQuery();
  const bybitTransactionsQuery = api.transaction.getBybitTransactionsCount.useQuery();
  
  // Мутация для завершения сессии
  const endSessionMutation = api.workSession.endSession.useMutation({
    onSuccess: () => {
      toast.success("Рабочая сессия завершена", {
        description: "Сессия успешно завершена",
      });
      
      // Обновление данных после завершения сессии
      activeSessionQuery.refetch();
      userSessionsQuery.refetch();
    },
    onError: (error) => {
      toast.error("Ошибка", {
        description: error.message,
      });
    },
  });
  
  // Обновление времени активной сессии
  useEffect(() => {
    if (activeSessionQuery.data && !activeSessionQuery.data.endTime) {
      const timer = setInterval(() => {
        if (activeSessionQuery.data?.startTime) {
          const time = formatDistance(
            new Date(activeSessionQuery.data.startTime),
            new Date(),
            { locale: ru, addSuffix: false }
          );
          setActiveTime(time);
        }
      }, 1000);
      
      return () => clearInterval(timer);
    }
    
    return undefined;
  }, [activeSessionQuery.data]);
  
  // Обработчик завершения сессии
  const handleEndSession = () => {
    if (activeSessionQuery.data?.id) {
      endSessionMutation.mutate({
        sessionId: activeSessionQuery.data.id,
      });
    }
  };

  // Обработчик для открытия диалога транзакций
  const handleOpenTransactions = (type: "telegram" | "bybit") => {
    setTransactionType(type);
    setTransactionsOpen(true);
  };

  // Обработчик выхода из системы
  const handleLogout = () => {
    logout();
    router.push("/login");
  };
  
  const fadeIn = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0 },
  };
  
  const staggerContainer = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
      },
    },
  };

  // Иконка для текущей темы
  const getThemeIcon = () => {
    if (theme === "dark") return <Moon className="h-4 w-4" />;
    if (theme === "light") return <Sun className="h-4 w-4" />;
    return <LaptopIcon className="h-4 w-4" />;
  };

  // Следующая тема при переключении
  const cycleTheme = () => {
    const themes: ("light" | "dark" | "system")[] = ["light", "dark", "system"];
    const currentIndex = themes.indexOf(theme as "light" | "dark" | "system");
    const nextIndex = (currentIndex + 1) % themes.length;
    setTheme(themes[nextIndex]);
  };
  
  return (
    <div className="min-h-screen bg-background pb-10">
      {/* Верхняя панель */}
      <header className="sticky top-0 z-10 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto flex h-16 items-center justify-between px-4">
          <div className="flex items-center gap-2">
            <Avatar className="h-8 w-8 bg-primary/10">
              <AvatarFallback className="text-primary">
                {user?.name?.substring(0, 2).toUpperCase() || "WT"}
              </AvatarFallback>
            </Avatar>
            <div className="hidden text-sm sm:block">
              <p className="font-medium leading-none">WorkTracker</p>
              <p className="text-xs text-muted-foreground">v1.0</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {activeSessionQuery.data && !activeSessionQuery.data.endTime && (
              <Badge variant="outline" className="hidden animate-pulse md:flex">
                <span className="mr-2 h-2 w-2 rounded-full bg-green-500"></span>
                Активная сессия: {activeTime || "загрузка..."}
              </Badge>
            )}

            {/* <Button
              variant="ghost"
              size="icon"
              onClick={cycleTheme}
              className="rounded-full"
              title={`Текущая тема: ${theme}. Нажмите, чтобы изменить`}
            >
              {getThemeIcon()}
            </Button>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="rounded-full">
                  <LogOut className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuLabel className="font-normal">
                  <div className="flex flex-col space-y-1">
                    <p className="text-sm font-medium leading-none">{user?.name}</p>
                    <p className="text-xs leading-none text-muted-foreground">
                      Онлайн
                    </p>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleLogout} className="text-destructive">
                  <LogOut className="mr-2 h-4 w-4" />
                  <span>Выйти</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu> */}
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8">
        <div className="space-y-8">
          <header>
            <motion.div 
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="flex flex-col gap-2"
            >
              <div className="flex flex-col gap-1">
                <h1 className="text-3xl font-bold tracking-tight md:text-4xl">
                  Добро пожаловать, {user?.name}
                </h1>
                <p className="text-muted-foreground">
                  Здесь вы можете управлять рабочими сессиями и отслеживать активность
                </p>
              </div>
              
              {activeSessionQuery.data && !activeSessionQuery.data.endTime && (
                <Badge variant="outline" className="w-fit animate-pulse text-primary md:hidden">
                  <span className="mr-2 h-2 w-2 rounded-full bg-green-500"></span>
                  Активная сессия: {activeTime}
                </Badge>
              )}
            </motion.div>
          </header>
          
          <motion.div
            variants={staggerContainer}
            initial="hidden"
            animate="visible"
            className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3"
          >
            <motion.div variants={fadeIn} transition={{ duration: 0.3 }} className="sm:col-span-2 lg:col-span-1">
              <Card className="overflow-hidden shadow-md transition-all hover:shadow-lg">
                <CardHeader className="flex flex-row items-center justify-between pb-2 bg-gradient-to-r from-primary/10 via-primary/5 to-transparent">
                  <CardTitle className="text-sm font-medium">
                    Статус работы
                  </CardTitle>
                  <ClockIcon className="h-4 w-4" />
                </CardHeader>
                <CardContent className="pt-6">
                  <div className="text-2xl font-bold">
                    {activeSessionQuery.data && !activeSessionQuery.data.endTime
                      ? "Активная сессия"
                      : "Не работает"}
                  </div>
                  {activeSessionQuery.data && !activeSessionQuery.data.endTime && (
                    <p className="text-xs text-muted-foreground">
                      Время работы: {activeTime || "загрузка..."}
                    </p>
                  )}
                  
                  <div className="mt-6">
                    {activeSessionQuery.data && !activeSessionQuery.data.endTime ? (
                      <Button
                        variant="destructive"
                        className="w-full transition-all hover:brightness-110"
                        onClick={handleEndSession}
                        disabled={endSessionMutation.isPending}
                      >
                        {endSessionMutation.isPending ? (
                          <span className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent"></span>
                        ) : (
                          <PauseIcon className="mr-2 h-4 w-4" />
                        )}
                        {endSessionMutation.isPending ? "Завершение..." : "Завершить работу"}
                      </Button>
                    ) : (
                      <Button
                        variant="default"
                        className="w-full bg-gradient-to-r from-primary to-primary/90 transition-all hover:brightness-110"
                        onClick={() => setStartSessionOpen(true)}
                      >
                        <PlayIcon className="mr-2 h-4 w-4" />
                        Начать работу
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            </motion.div>
            
            <motion.div variants={fadeIn} transition={{ duration: 0.3, delay: 0.1 }}>
              <Card className="h-full overflow-hidden shadow-md transition-all hover:shadow-lg">
                <CardHeader className="flex flex-row items-center justify-between pb-2 bg-gradient-to-r from-blue-500/10 via-blue-500/5 to-transparent">
                  <CardTitle className="text-sm font-medium">
                    Транзакции Telegram
                  </CardTitle>
                  <MessageSquareIcon className="h-4 w-4" />
                </CardHeader>
                <CardContent className="pt-6">
                  <div className="text-3xl font-bold">
                    {telegramTransactionsQuery.data !== undefined
                      ? telegramTransactionsQuery.data.toLocaleString()
                      : "—"}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Общее количество транзакций
                  </p>
                  
                  <div className="mt-6">
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full transition-all hover:bg-primary/10"
                      onClick={() => handleOpenTransactions("telegram")}
                    >
                      <BarChart3Icon className="mr-2 h-4 w-4" />
                      Просмотреть детали
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
            
            <motion.div variants={fadeIn} transition={{ duration: 0.3, delay: 0.2 }}>
              <Card className="h-full overflow-hidden shadow-md transition-all hover:shadow-lg">
                <CardHeader className="flex flex-row items-center justify-between pb-2 bg-gradient-to-r from-green-500/10 via-green-500/5 to-transparent">
                  <CardTitle className="text-sm font-medium">
                    Транзакции Bybit
                  </CardTitle>
                  <TrendingUpIcon className="h-4 w-4" />
                </CardHeader>
                <CardContent className="pt-6">
                  <div className="text-3xl font-bold">
                    {bybitTransactionsQuery.data !== undefined
                      ? bybitTransactionsQuery.data.toLocaleString()
                      : "—"}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Общее количество транзакций
                  </p>
                  
                  <div className="mt-6">
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full transition-all hover:bg-primary/10"
                      onClick={() => handleOpenTransactions("bybit")}
                    >
                      <BarChart3Icon className="mr-2 h-4 w-4" />
                      Просмотреть детали
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          </motion.div>
          
          <Separator className="my-8" />
          
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.3 }}
          >
            <Card className="overflow-hidden shadow-md">
              <CardHeader className="border-b bg-muted/40">
                <CardTitle className="flex items-center">
                  <ListIcon className="mr-2 h-5 w-5" />
                  Рабочие сессии
                </CardTitle>
                <CardDescription>История ваших рабочих сессий</CardDescription>
              </CardHeader>
              <CardContent className="p-4 pt-6">
                <WorkSessionList 
                  sessions={userSessionsQuery.data || []} 
                  isLoading={userSessionsQuery.isLoading}
                  onSessionUpdated={() => userSessionsQuery.refetch()}
                />
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </div>
      
      {/* Диалоги */}
      <StartSessionDialog
        open={startSessionOpen}
        onOpenChange={setStartSessionOpen}
        onSuccess={() => {
          activeSessionQuery.refetch();
          userSessionsQuery.refetch();
        }}
      />
      
      <TransactionsDialog 
        open={transactionsOpen}
        onOpenChange={setTransactionsOpen}
        initialTransactionType={transactionType}
      />
    </div>
  );
}