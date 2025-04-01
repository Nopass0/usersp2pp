"use client";

import { useState } from "react";
import { format } from "date-fns";
import { ru } from "date-fns/locale";
import { Plus, Loader2, Pencil, Trash, AlertTriangle, History } from "lucide-react";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { api } from "~/trpc/react";

import { Button } from "~/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "~/components/ui/dialog";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "~/components/ui/form";
import { Input } from "~/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "~/components/ui/table";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "~/components/ui/alert-dialog";
import { Card } from "./CardTable";
import AuditLogDialog from "~/components/AuditLogDialog";

// Схема для добавления/редактирования баланса
const balanceSchema = z.object({
  date: z.string().nonempty("Укажите дату баланса"),
  startBalance: z.coerce.number().min(0, "Начальный баланс не может быть отрицательным"),
  endBalance: z.coerce.number().min(0, "Конечный баланс не может быть отрицательным"),
  comment: z.string().optional(),
});

type BalanceFormValues = z.infer<typeof balanceSchema>;

interface CardBalancesDialogProps {
  card: Card;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onBalanceAdded: () => void;
}

export default function CardBalancesDialog({
  card,
  open,
  onOpenChange,
  onBalanceAdded,
}: CardBalancesDialogProps) {
  const [showForm, setShowForm] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [editingBalanceId, setEditingBalanceId] = useState<number | null>(null);
  const [balanceToDelete, setBalanceToDelete] = useState<number | null>(null);
  
  // Для просмотра истории изменений
  const [auditLogOpen, setAuditLogOpen] = useState(false);
  const [currentBalanceId, setCurrentBalanceId] = useState<number | null>(null);

  // Получаем историю балансов
  const { data: balances, isLoading: loadingBalances, refetch } = api.cardBalances.getByCardId.useQuery(
    { cardId: Number(card.id) },
    { enabled: open }
  );

  // Форма для добавления/редактирования баланса
  const form = useForm<BalanceFormValues>({
    resolver: zodResolver(balanceSchema),
    defaultValues: {
      date: format(new Date(), "yyyy-MM-dd'T'HH:mm"),
      startBalance: 0,
      endBalance: 0,
      comment: "",
    },
  });

  // Мутация для добавления баланса
  const addBalanceMutation = api.cardBalances.create.useMutation({
    onSuccess: () => {
      void refetch();
      setShowForm(false);
      form.reset();
      onBalanceAdded();
    },
    onError: (error) => {
      console.error("Ошибка при добавлении баланса:", error);
    },
  });

  // Мутация для обновления баланса
  const updateBalanceMutation = api.cardBalances.update.useMutation({
    onSuccess: () => {
      void refetch();
      setShowForm(false);
      setEditMode(false);
      setEditingBalanceId(null);
      form.reset();
      onBalanceAdded();
    },
    onError: (error) => {
      console.error("Ошибка при обновлении баланса:", error);
    },
  });

  // Мутация для удаления баланса
  const deleteBalanceMutation = api.cardBalances.delete.useMutation({
    onSuccess: () => {
      void refetch();
      setBalanceToDelete(null);
      onBalanceAdded();
    },
    onError: (error) => {
      console.error("Ошибка при удалении баланса:", error);
    },
  });

  // Обработчик добавления/обновления баланса
  const onSubmit = (data: BalanceFormValues) => {
    if (editMode && editingBalanceId) {
      updateBalanceMutation.mutate({
        id: Number(editingBalanceId),
        ...data,
      });
    } else {
      addBalanceMutation.mutate({
        cardId: Number(card.id),
        ...data,
      });
    }
  };

  // Начать редактирование баланса
  const startEditing = (balance: any) => {
    setEditMode(true);
    setEditingBalanceId(balance.id);
    setShowForm(true);

    form.reset({
      date: format(new Date(balance.date), "yyyy-MM-dd'T'HH:mm"),
      startBalance: balance.startBalance,
      endBalance: balance.endBalance,
      comment: balance.comment || "",
    });
  };

  // Подтверждение удаления баланса
  const confirmDelete = () => {
    if (balanceToDelete !== null) {
      deleteBalanceMutation.mutate({ id: Number(balanceToDelete) });
    }
  };

  // Форматирование суммы
  const formatAmount = (amount: number | null | undefined) => {
    if (amount === null || amount === undefined) return "₽0.00";
    
    return new Intl.NumberFormat("ru-RU", {
      style: "currency",
      currency: "RUB",
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
  };

  // Форматирование даты
  const formatDate = (date: Date | string) => {
    return format(new Date(date), "dd.MM.yyyy HH:mm", { locale: ru });
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>История балансов карты #{card.externalId}</DialogTitle>
            <DialogDescription>
              Карта {card.provider} / {card.bank} / {card.cardNumber}
            </DialogDescription>
          </DialogHeader>

          {/* Кнопка добавления и общая статистика */}
          <div className="flex justify-between items-center mb-4">
            <Button
              onClick={() => {
                setEditMode(false);
                setEditingBalanceId(null);
                form.reset({
                  date: format(new Date(), "yyyy-MM-dd'T'HH:mm"),
                  startBalance: card.lastBalance || 0,
                  endBalance: card.lastBalance || 0,
                  comment: "",
                });
                setShowForm(true);
              }}
              className="flex items-center gap-1"
            >
              <Plus className="h-4 w-4" />
              <span>Добавить баланс</span>
            </Button>
            
            {/* Общая статистика */}
            <div className="text-sm text-muted-foreground">
              <span className="font-semibold">Всего записей:</span> {balances?.length || 0} | 
              <span className="font-semibold ml-2">Нач. баланс:</span> {formatAmount(card.initialBalance)} | 
              <span className="font-semibold ml-2">Тек. баланс:</span> {formatAmount(card.lastBalance)}
            </div>
          </div>

          {/* Форма добавления/редактирования баланса */}
          {showForm && (
            <div className="border rounded-md p-4 mb-6 bg-muted/30">
              <h3 className="text-lg font-medium mb-4">
                {editMode ? "Редактировать запись баланса" : "Добавить новую запись баланса"}
              </h3>

              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {/* Дата баланса */}
                    <FormField
                      control={form.control}
                      name="date"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Дата баланса</FormLabel>
                          <FormControl>
                            <Input type="datetime-local" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    {/* Начальный баланс */}
                    <FormField
                      control={form.control}
                      name="startBalance"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Начальный баланс (₽)</FormLabel>
                          <FormControl>
                            <Input type="number" step="0.01" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    {/* Конечный баланс */}
                    <FormField
                      control={form.control}
                      name="endBalance"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Конечный баланс (₽)</FormLabel>
                          <FormControl>
                            <Input type="number" step="0.01" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    {/* Комментарий */}
                    <FormField
                      control={form.control}
                      name="comment"
                      render={({ field }) => (
                        <FormItem className="md:col-span-3">
                          <FormLabel>Комментарий</FormLabel>
                          <FormControl>
                            <Input {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <DialogFooter>
                    <Button
                      variant="outline"
                      type="button"
                      onClick={() => setShowForm(false)}
                    >
                      Отмена
                    </Button>
                    <Button
                      type="submit"
                      disabled={
                        addBalanceMutation.isLoading || updateBalanceMutation.isLoading
                      }
                    >
                      {(addBalanceMutation.isLoading || updateBalanceMutation.isLoading) && (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      )}
                      {editMode ? "Сохранить" : "Добавить"}
                    </Button>
                  </DialogFooter>
                </form>
              </Form>
            </div>
          )}

          {/* Таблица со списком балансов */}
          {loadingBalances ? (
            <div className="flex justify-center items-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : balances && balances.length > 0 ? (
            <div className="rounded-md border overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[70px]">ID</TableHead>
                    <TableHead>Дата</TableHead>
                    <TableHead className="text-right">Начальный баланс</TableHead>
                    <TableHead className="text-right">Конечный баланс</TableHead>
                    <TableHead className="text-right">Разница</TableHead>
                    <TableHead>Комментарий</TableHead>
                    <TableHead className="w-[100px] text-center">Действия</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {balances.map((balance) => {
                    const difference = balance.endBalance - balance.startBalance;
                    
                    return (
                      <TableRow key={balance.id}>
                        <TableCell>{balance.id}</TableCell>
                        <TableCell>
                          {formatDate(balance.date)}
                        </TableCell>
                        <TableCell className="text-right">
                          {formatAmount(balance.startBalance)}
                        </TableCell>
                        <TableCell className="text-right">
                          {formatAmount(balance.endBalance)}
                        </TableCell>
                        <TableCell className="text-right">
                          <span className={difference > 0 ? "text-green-600" : difference < 0 ? "text-red-600" : ""}>
                            {difference > 0 ? "+" : ""}{formatAmount(difference)}
                          </span>
                        </TableCell>
                        <TableCell>
                          {balance.comment || "-"}
                        </TableCell>
                        <TableCell>
                          <div className="flex justify-center gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              onClick={() => startEditing(balance)}
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-red-500"
                              onClick={() => setBalanceToDelete(balance.id)}
                            >
                              <Trash className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              onClick={() => {
                                setCurrentBalanceId(balance.id);
                                setAuditLogOpen(true);
                              }}
                            >
                              <History className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              У этой карты нет истории балансов
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Диалог подтверждения удаления */}
      <AlertDialog 
        open={balanceToDelete !== null} 
        onOpenChange={(open) => !open && setBalanceToDelete(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Удалить запись баланса?</AlertDialogTitle>
            <AlertDialogDescription>
              Это действие нельзя отменить. Запись баланса будет полностью удалена из системы.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Отмена</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              {deleteBalanceMutation.isLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                "Удалить"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Диалог истории изменений баланса */}
      {currentBalanceId && (
        <AuditLogDialog
          open={auditLogOpen}
          onOpenChange={setAuditLogOpen}
          entityType="CardBalance"
          entityId={currentBalanceId}
        />
      )}
    </>
  );
}
