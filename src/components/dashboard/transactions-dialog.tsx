"use client";

import { useState, useMemo, useEffect } from "react";
import { format } from "date-fns";
import { ru } from "date-fns/locale";
import type { DateRange } from "react-day-picker";
import { 
  ArrowDownIcon, 
  ArrowUpIcon, 
  CalendarIcon, 
  ChevronLeftIcon, 
  ChevronRightIcon, 
  FilterIcon,
  SearchIcon,
  XIcon
} from "lucide-react";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "~/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "~/components/ui/table";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "~/components/ui/tabs";
import { Calendar } from "~/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "~/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import { api } from "~/trpc/react";
import { Skeleton } from "~/components/ui/skeleton";
import { cn } from "~/lib/utils";

interface TransactionsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialTransactionType?: "telegram" | "bybit";
}

export function TransactionsDialog({
  open,
  onOpenChange,
  initialTransactionType = "telegram",
}: TransactionsDialogProps) {
  // Состояния для фильтрации и пагинации
  const [transactionType, setTransactionType] = useState<string>(initialTransactionType);
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [filterType, setFilterType] = useState<string>("all");
  const [date, setDate] = useState<DateRange | undefined>({
    from: new Date(new Date().setDate(new Date().getDate() - 30)),
    to: new Date(),
  });
  const [currentPage, setCurrentPage] = useState<number>(1);
  const itemsPerPage = 10;

  // Сбросить страницу при изменении фильтров
  useEffect(() => {
    setCurrentPage(1);
  }, [transactionType, searchTerm, filterType, date]);

  // Запросы на получение транзакций
  const telegramTransactionsQuery = api.transaction.getTelegramTransactions.useQuery(
    {
      startDate: date?.from?.toISOString() ?? undefined,
      endDate: date?.to?.toISOString() ?? undefined,
      type: filterType !== "all" ? filterType : undefined,
    },
    {
      enabled: transactionType === "telegram" && open,
    }
  );

  const bybitTransactionsQuery = api.transaction.getBybitTransactions.useQuery(
    {
      startDate: date?.from?.toISOString() ?? undefined,
      endDate: date?.to?.toISOString() ?? undefined,
      type: filterType !== "all" ? filterType : undefined,
    },
    {
      enabled: transactionType === "bybit" && open,
    }
  );

  // Получение данных в зависимости от выбранного типа транзакций
  const transactions = useMemo(() => {
    if (transactionType === "telegram") {
      return telegramTransactionsQuery.data || [];
    }
    return bybitTransactionsQuery.data || [];
  }, [transactionType, telegramTransactionsQuery.data, bybitTransactionsQuery.data]);

  // Фильтрация и поиск
  const filteredTransactions = useMemo(() => {
    if (!searchTerm) return transactions;

    const term = searchTerm.toLowerCase();
    return transactions.filter(
      (t) =>
        t.asset.toLowerCase().includes(term) ||
        t.type.toLowerCase().includes(term) ||
        t.status.toLowerCase().includes(term) ||
        t.amount.toString().includes(term) ||
        t.totalPrice.toString().includes(term)
    );
  }, [transactions, searchTerm]);

  // Пагинация
  const paginatedTransactions = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filteredTransactions.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredTransactions, currentPage, itemsPerPage]);

  // Общее количество страниц
  const totalPages = Math.ceil(filteredTransactions.length / itemsPerPage);

  // Состояние загрузки
  const isLoading =
    (transactionType === "telegram" && telegramTransactionsQuery.isLoading) ||
    (transactionType === "bybit" && bybitTransactionsQuery.isLoading);

  // Иконка в зависимости от типа транзакции
  const getTypeIcon = (type: string) => {
    if (type.toLowerCase() === "buy") {
      return <ArrowDownIcon className="h-4 w-4 text-green-500" />;
    }
    return <ArrowUpIcon className="h-4 w-4 text-red-500" />;
  };

  // Статус транзакции
  const getStatusBadge = (status: string) => {
    switch (status.toLowerCase()) {
      case "completed":
      case "успешно":
        return <Badge className="bg-green-500/20 text-green-500">Успешно</Badge>;
      case "pending":
      case "в обработке":
        return <Badge className="bg-yellow-500/20 text-yellow-500">В обработке</Badge>;
      case "failed":
      case "ошибка":
        return <Badge className="bg-red-500/20 text-red-500">Ошибка</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl p-0">
        <DialogHeader className="sticky top-0 z-10 border-b bg-background p-4">
          <div className="flex items-center justify-between">
            <DialogTitle className="text-xl">Транзакции</DialogTitle>
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={() => onOpenChange(false)}
              className="rounded-full hover:bg-muted"
            >
              <XIcon className="h-4 w-4" />
            </Button>
          </div>
        </DialogHeader>

        <div className="px-4 py-3">
          <div className="flex flex-col gap-4 md:flex-row md:items-center">
            <Tabs
              defaultValue={transactionType}
              onValueChange={(value) => setTransactionType(value)}
              className="w-full md:w-auto"
            >
              <TabsList className="w-full md:w-auto">
                <TabsTrigger value="telegram" className="flex-1 md:flex-initial">
                  Telegram
                </TabsTrigger>
                <TabsTrigger value="bybit" className="flex-1 md:flex-initial">
                  Bybit
                </TabsTrigger>
              </TabsList>
            </Tabs>

            <div className="relative flex-1">
              <SearchIcon className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Поиск по активу, типу..."
                className="pl-9"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>

            <div className="flex items-center gap-2">
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    className="whitespace-nowrap"
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {date?.from ? (
                      date.to ? (
                        <>
                          {format(date.from, "dd.MM.yy", { locale: ru })} -{" "}
                          {format(date.to, "dd.MM.yy", { locale: ru })}
                        </>
                      ) : (
                        format(date.from, "dd.MM.yy", { locale: ru })
                      )
                    ) : (
                      "Дата"
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="end">
                  <Calendar
                    initialFocus
                    mode="range"
                    defaultMonth={date?.from}
                    selected={date}
                    onSelect={setDate}
                    numberOfMonths={2}
                    locale={ru}
                  />
                </PopoverContent>
              </Popover>

              <Select
                defaultValue="all"
                onValueChange={setFilterType}
              >
                <SelectTrigger className="w-auto">
                  <div className="flex items-center">
                    <FilterIcon className="mr-2 h-4 w-4" />
                    <SelectValue placeholder="Тип" />
                  </div>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Все</SelectItem>
                  <SelectItem value="buy">Покупка</SelectItem>
                  <SelectItem value="sell">Продажа</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        <div className="max-h-[calc(100vh-15rem)] min-h-[400px] overflow-auto px-4 py-2">
          {isLoading ? (
            <div className="space-y-2 p-4">
              {Array.from({ length: 5 }).map((_, index) => (
                <Skeleton key={index} className="h-12 w-full" />
              ))}
            </div>
          ) : paginatedTransactions.length === 0 ? (
            <div className="flex flex-col items-center justify-center p-10 text-center">
              <div className="rounded-full bg-muted p-3">
                <FilterIcon className="h-6 w-6 text-muted-foreground" />
              </div>
              <h3 className="mt-4 text-lg font-medium">Нет транзакций</h3>
              <p className="mt-2 text-sm text-muted-foreground">
                Попробуйте изменить период или критерии поиска
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader className="sticky top-0 bg-muted/50 backdrop-blur-sm">
                <TableRow>
                  <TableHead>Дата</TableHead>
                  <TableHead>Тип</TableHead>
                  <TableHead>Актив</TableHead>
                  <TableHead>Количество</TableHead>
                  <TableHead>Цена</TableHead>
                  <TableHead>Сумма</TableHead>
                  <TableHead>Статус</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedTransactions.map((transaction) => (
                  <TableRow 
                    key={transaction.id}
                    className="hover:bg-muted/50"
                  >
                    <TableCell className="font-medium">
                      {format(new Date(transaction.dateTime), "dd.MM.yyyy", {
                        locale: ru,
                      })}
                      <div className="text-xs text-muted-foreground">
                        {format(new Date(transaction.dateTime), "HH:mm", {
                          locale: ru,
                        })}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {getTypeIcon(transaction.type)}
                        <span className="capitalize">
                          {transaction.type === "buy" ? "Покупка" : "Продажа"}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>{transaction.asset}</TableCell>
                    <TableCell className="tabular-nums">
                      {transaction.amount.toLocaleString()}
                    </TableCell>
                    <TableCell className="tabular-nums">
                      {new Intl.NumberFormat("ru-RU", {
                        style: "currency",
                        currency: "USD",
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      }).format(transaction.unitPrice)}
                    </TableCell>
                    <TableCell className="tabular-nums">
                      {new Intl.NumberFormat("ru-RU", {
                        style: "currency",
                        currency: "USD",
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      }).format(transaction.totalPrice)}
                    </TableCell>
                    <TableCell>{getStatusBadge(transaction.status)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </div>

        {filteredTransactions.length > 0 && (
          <div className="flex items-center justify-between border-t px-4 py-3">
            <div className="text-sm text-muted-foreground">
              Показано {(currentPage - 1) * itemsPerPage + 1} – {
                Math.min(currentPage * itemsPerPage, filteredTransactions.length)
              } из {filteredTransactions.length} транзакций
            </div>
            <div className="flex items-center space-x-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
                disabled={currentPage === 1}
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
                      "w-9",
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
              >
                <ChevronRightIcon className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}