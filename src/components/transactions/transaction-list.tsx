"use client";

import { useMemo, useState } from "react";
import { format } from "date-fns";
import { ru } from "date-fns/locale";
import { motion } from "framer-motion";
import type { DateRange } from "react-day-picker";
import { ArrowDownIcon, ArrowUpIcon, FileIcon } from "lucide-react";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "~/components/ui/table";
import { Badge } from "~/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "~/components/ui/tabs";
import { TransactionFilter } from "./transaction-filter";
import { Skeleton } from "~/components/ui/skeleton";
import { api } from "~/trpc/react";

interface Transaction {
  id: number;
  dateTime: Date;
  type: string;
  asset: string;
  amount: number;
  totalPrice: number;
  unitPrice: number;
  status: string;
}

export function TransactionList() {
  const [dateRange, setDateRange] = useState<DateRange | undefined>({
    from: new Date(new Date().setDate(new Date().getDate() - 30)),
    to: new Date(),
  });
  const [transactionType, setTransactionType] = useState<string>("all");
  const [activeTab, setActiveTab] = useState<string>("telegram");

  // Запросы на получение транзакций
  const telegramTransactionsQuery = api.transaction.getTelegramTransactions.useQuery(
    {
      startDate: dateRange?.from?.toISOString() ?? undefined,
      endDate: dateRange?.to?.toISOString() ?? undefined,
      type: transactionType !== "all" ? transactionType : undefined,
    }
  );

  const bybitTransactionsQuery = api.transaction.getBybitTransactions.useQuery(
    {
      startDate: dateRange?.from?.toISOString() ?? undefined,
      endDate: dateRange?.to?.toISOString() ?? undefined,
      type: transactionType !== "all" ? transactionType : undefined,
    }
  );

  // Текущие транзакции в зависимости от выбранной вкладки
  const transactions = useMemo(() => {
    if (activeTab === "telegram") {
      return telegramTransactionsQuery.data || [];
    }
    return bybitTransactionsQuery.data || [];
  }, [activeTab, telegramTransactionsQuery.data, bybitTransactionsQuery.data]);

  // Обработчик изменения фильтров
  const handleFilterChange = (range: DateRange | undefined, type: string) => {
    setDateRange(range);
    setTransactionType(type);
  };

  // Анимации
  const container = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.05,
      },
    },
  };

  const item = {
    hidden: { opacity: 0, y: 10 },
    show: { opacity: 1, y: 0 },
  };

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

  const isLoading = activeTab === "telegram" 
    ? telegramTransactionsQuery.isLoading 
    : bybitTransactionsQuery.isLoading;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Транзакции</CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs
          defaultValue="telegram"
          onValueChange={setActiveTab}
          className="space-y-4"
        >
          <TabsList>
            <TabsTrigger value="telegram">Telegram</TabsTrigger>
            <TabsTrigger value="bybit">Bybit</TabsTrigger>
          </TabsList>

          <TransactionFilter onFilterChange={handleFilterChange} />

          <TabsContent value="telegram" className="space-y-4">
            {isLoading ? (
              <div className="space-y-2">
                {Array.from({ length: 5 }).map((_, index) => (
                  <Skeleton key={index} className="h-12 w-full" />
                ))}
              </div>
            ) : transactions.length === 0 ? (
              <div className="flex flex-col items-center justify-center rounded-lg border border-dashed p-8 text-center">
                <FileIcon className="mb-2 h-10 w-10 text-muted-foreground" />
                <h3 className="mb-2 text-lg font-medium">Нет транзакций</h3>
                <p className="text-sm text-muted-foreground">
                  За выбранный период нет транзакций или измените фильтры
                </p>
              </div>
            ) : (
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Дата и время</TableHead>
                      <TableHead>Тип</TableHead>
                      <TableHead>Актив</TableHead>
                      <TableHead>Количество</TableHead>
                      <TableHead>Цена</TableHead>
                      <TableHead>Сумма</TableHead>
                      <TableHead>Статус</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {transactions.map((transaction) => (
                      <motion.tr 
                        key={transaction.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.3 }}
                      >
                        <TableCell>
                          {format(new Date(transaction.dateTime), "dd.MM.yyyy HH:mm", {
                            locale: ru,
                          })}
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
                        <TableCell>{transaction.amount}</TableCell>
                        <TableCell>
                          {new Intl.NumberFormat("ru-RU", {
                            style: "currency",
                            currency: "USD",
                          }).format(transaction.unitPrice)}
                        </TableCell>
                        <TableCell>
                          {new Intl.NumberFormat("ru-RU", {
                            style: "currency",
                            currency: "USD",
                          }).format(transaction.totalPrice)}
                        </TableCell>
                        <TableCell>{getStatusBadge(transaction.status)}</TableCell>
                      </motion.tr>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </TabsContent>

          <TabsContent value="bybit" className="space-y-4">
            {isLoading ? (
              <div className="space-y-2">
                {Array.from({ length: 5 }).map((_, index) => (
                  <Skeleton key={index} className="h-12 w-full" />
                ))}
              </div>
            ) : transactions.length === 0 ? (
              <div className="flex flex-col items-center justify-center rounded-lg border border-dashed p-8 text-center">
                <FileIcon className="mb-2 h-10 w-10 text-muted-foreground" />
                <h3 className="mb-2 text-lg font-medium">Нет транзакций</h3>
                <p className="text-sm text-muted-foreground">
                  За выбранный период нет транзакций или измените фильтры
                </p>
              </div>
            ) : (
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Дата и время</TableHead>
                      <TableHead>Тип</TableHead>
                      <TableHead>Актив</TableHead>
                      <TableHead>Количество</TableHead>
                      <TableHead>Цена</TableHead>
                      <TableHead>Сумма</TableHead>
                      <TableHead>Статус</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {transactions.map((transaction) => (
                      <motion.tr 
                        key={transaction.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.3 }}
                      >
                        <TableCell>
                          {format(new Date(transaction.dateTime), "dd.MM.yyyy HH:mm", {
                            locale: ru,
                          })}
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
                        <TableCell>{transaction.amount}</TableCell>
                        <TableCell>
                          {new Intl.NumberFormat("ru-RU", {
                            style: "currency",
                            currency: "USD",
                          }).format(transaction.unitPrice)}
                        </TableCell>
                        <TableCell>
                          {new Intl.NumberFormat("ru-RU", {
                            style: "currency",
                            currency: "USD",
                          }).format(transaction.totalPrice)}
                        </TableCell>
                        <TableCell>{getStatusBadge(transaction.status)}</TableCell>
                      </motion.tr>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}