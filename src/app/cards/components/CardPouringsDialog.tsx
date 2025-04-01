"use client";

import { useState } from "react";
import { format } from "date-fns";
import { ru } from "date-fns/locale";
import { Plus, Loader2, Pencil, Trash, AlertTriangle } from "lucide-react";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import { Card } from "./CardTable";
import AuditLogDialog from "~/components/AuditLogDialog";

// Схема для добавления пролива
const pouringSchema = z.object({
  pouringDate: z.string().nonempty("Укажите дату пролива"),
  initialAmount: z.coerce.number().min(0, "Начальная сумма должна быть неотрицательной"),
  initialDate: z.string().nonempty("Укажите начальную дату"),
  pouringAmount: z.coerce.number().min(0.01, "Сумма пролива должна быть больше нуля"),
  finalAmount: z.coerce.number().optional(),
  finalDate: z.string().optional(),
  withdrawalAmount: z.coerce.number().optional(),
  withdrawalDate: z.string().optional(),
  collectorName: z.string().optional(),
  status: z.enum(["ACTIVE", "WARNING", "BLOCKED"]),
  comment: z.string().optional(),
});

type PouringFormValues = z.infer<typeof pouringSchema>;

interface CardPouringsDialogProps {
  card: Card;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onPouringAdded: () => void;
}

export default function CardPouringsDialog({
  card,
  open,
  onOpenChange,
  onPouringAdded,
}: CardPouringsDialogProps) {
  const [showForm, setShowForm] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [editingPouringId, setEditingPouringId] = useState<number | null>(null);
  const [pouringToDelete, setPouringToDelete] = useState<number | null>(null);
  
  // Для просмотра истории изменений
  const [auditLogOpen, setAuditLogOpen] = useState(false);
  const [currentPouringId, setCurrentPouringId] = useState<number | null>(null);

  // Получаем историю проливов
  const { data: pourings, isLoading: loadingPourings, refetch } = api.cardPourings.getByCardId.useQuery(
    { cardId: Number(card.id) },
    { enabled: open }
  );

  // Форма для добавления/редактирования пролива
  const form = useForm<PouringFormValues>({
    resolver: zodResolver(pouringSchema),
    defaultValues: {
      pouringDate: format(new Date(), "yyyy-MM-dd'T'HH:mm"),
      initialAmount: 0,
      initialDate: format(new Date(), "yyyy-MM-dd'T'HH:mm"),
      pouringAmount: undefined,
      status: "ACTIVE",
    },
  });

  // Мутация для добавления пролива
  const addPouringMutation = api.cardPourings.create.useMutation({
    onSuccess: () => {
      void refetch();
      setShowForm(false);
      form.reset();
      onPouringAdded();
    },
    onError: (error) => {
      console.error("Ошибка при добавлении пролива:", error);
    },
  });

  // Мутация для обновления пролива
  const updatePouringMutation = api.cardPourings.update.useMutation({
    onSuccess: () => {
      void refetch();
      setShowForm(false);
      setEditMode(false);
      setEditingPouringId(null);
      form.reset();
      onPouringAdded();
    },
    onError: (error) => {
      console.error("Ошибка при обновлении пролива:", error);
    },
  });

  // Мутация для удаления пролива
  const deletePouringMutation = api.cardPourings.delete.useMutation({
    onSuccess: () => {
      void refetch();
      setPouringToDelete(null);
      onPouringAdded();
    },
    onError: (error) => {
      console.error("Ошибка при удалении пролива:", error);
    },
  });

  // Обработчик добавления/обновления пролива
  const onSubmit = (data: PouringFormValues) => {
    if (editMode && editingPouringId) {
      updatePouringMutation.mutate({
        id: Number(editingPouringId),
        ...data,
      });
    } else {
      addPouringMutation.mutate({
        cardId: Number(card.id),
        ...data,
      });
    }
  };

  // Начать редактирование пролива
  const startEditing = (pouring: any) => {
    setEditMode(true);
    setEditingPouringId(pouring.id);
    setShowForm(true);
    
    form.reset({
      pouringDate: format(new Date(pouring.pouringDate), "yyyy-MM-dd'T'HH:mm"),
      initialAmount: pouring.initialAmount,
      initialDate: pouring.initialDate 
        ? format(new Date(pouring.initialDate), "yyyy-MM-dd'T'HH:mm") 
        : undefined,
      pouringAmount: pouring.pouringAmount,
      finalAmount: pouring.finalAmount,
      finalDate: pouring.finalDate 
        ? format(new Date(pouring.finalDate), "yyyy-MM-dd'T'HH:mm") 
        : undefined,
      withdrawalAmount: pouring.withdrawalAmount,
      withdrawalDate: pouring.withdrawalDate 
        ? format(new Date(pouring.withdrawalDate), "yyyy-MM-dd'T'HH:mm") 
        : undefined,
      collectorName: pouring.collectorName,
      status: pouring.status,
      comment: pouring.comment,
    });
  };

  // Подтверждение удаления пролива
  const confirmDelete = () => {
    if (pouringToDelete !== null) {
      deletePouringMutation.mutate({ id: Number(pouringToDelete) });
    }
  };

  // Открыть историю изменений
  const openAuditLog = (pouringId: number) => {
    setCurrentPouringId(pouringId);
    setAuditLogOpen(true);
  };

  // Форматирование даты
  const formatDate = (date: Date) => {
    return format(new Date(date), "dd.MM.yyyy HH:mm", { locale: ru });
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

  // Отмена формы
  const cancelForm = () => {
    setShowForm(false);
    setEditMode(false);
    setEditingPouringId(null);
    form.reset();
  };

  const isLoading = addPouringMutation.isLoading || updatePouringMutation.isLoading;

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>История проливов карты #{card.externalId}</DialogTitle>
            <DialogDescription>
              Карта {card.provider} / {card.bank} / {card.cardNumber}
            </DialogDescription>
          </DialogHeader>

          {/* Кнопка добавления нового пролива */}
          <div className="flex justify-between items-center mb-4">
            <Button
              onClick={() => {
                setEditMode(false);
                setEditingPouringId(null);
                form.reset({
                  pouringDate: format(new Date(), "yyyy-MM-dd'T'HH:mm"),
                  initialAmount: 0,
                  initialDate: format(new Date(), "yyyy-MM-dd'T'HH:mm"),
                  pouringAmount: 0,
                  status: "ACTIVE",
                });
                setShowForm(true);
              }}
              className="flex items-center gap-1"
            >
              <Plus className="h-4 w-4" />
              <span>Добавить пролив</span>
            </Button>
            
            {/* Общая статистика */}
            <div className="text-sm text-muted-foreground">
              <span className="font-semibold">Всего проливов:</span> {pourings?.length || 0} | 
              <span className="font-semibold ml-2">Пролито:</span> {formatAmount(card.totalPoured)} | 
              <span className="font-semibold ml-2">Снято:</span> {formatAmount(card.withdrawal)}
            </div>
          </div>

          {/* Форма добавления/редактирования пролива */}
          {showForm && (
            <div className="border rounded-md p-4 mb-6 bg-muted/30">
              <h3 className="text-lg font-medium mb-4">
                {editMode ? "Редактировать пролив" : "Добавить новый пролив"}
              </h3>

              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {/* Дата пролива */}
                    <FormField
                      control={form.control}
                      name="pouringDate"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Дата пролива</FormLabel>
                          <FormControl>
                            <Input type="datetime-local" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    {/* Начальная сумма */}
                    <FormField
                      control={form.control}
                      name="initialAmount"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Начальная сумма (₽)</FormLabel>
                          <FormControl>
                            <Input type="number" step="0.01" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    {/* Дата начальной суммы */}
                    <FormField
                      control={form.control}
                      name="initialDate"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Дата начальной суммы</FormLabel>
                          <FormControl>
                            <Input type="datetime-local" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    {/* Сумма пролива */}
                    <FormField
                      control={form.control}
                      name="pouringAmount"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Сумма пролива (₽)</FormLabel>
                          <FormControl>
                            <Input type="number" step="0.01" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    {/* Конечная сумма */}
                    <FormField
                      control={form.control}
                      name="finalAmount"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Конечная сумма (₽)</FormLabel>
                          <FormControl>
                            <Input type="number" step="0.01" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    {/* Дата конечной суммы */}
                    <FormField
                      control={form.control}
                      name="finalDate"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Дата конечной суммы</FormLabel>
                          <FormControl>
                            <Input type="datetime-local" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    {/* Сумма снятия */}
                    <FormField
                      control={form.control}
                      name="withdrawalAmount"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Сумма снятия (₽)</FormLabel>
                          <FormControl>
                            <Input type="number" step="0.01" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    {/* Дата снятия */}
                    <FormField
                      control={form.control}
                      name="withdrawalDate"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Дата снятия</FormLabel>
                          <FormControl>
                            <Input type="datetime-local" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    {/* Имя инкассатора */}
                    <FormField
                      control={form.control}
                      name="collectorName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Инкассатор</FormLabel>
                          <FormControl>
                            <Input {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    {/* Статус */}
                    <FormField
                      control={form.control}
                      name="status"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Статус</FormLabel>
                          <Select
                            onValueChange={field.onChange}
                            defaultValue={field.value}
                          >
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Выберите статус" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="ACTIVE">Активен</SelectItem>
                              <SelectItem value="WARNING">Предупреждение</SelectItem>
                              <SelectItem value="BLOCKED">Заблокирован</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  {/* Комментарий */}
                  <FormField
                    control={form.control}
                    name="comment"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Комментарий</FormLabel>
                        <FormControl>
                          <Input {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

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
                        addPouringMutation.isLoading || updatePouringMutation.isLoading
                      }
                    >
                      {(addPouringMutation.isLoading || updatePouringMutation.isLoading) && (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      )}
                      {editMode ? "Сохранить" : "Добавить"}
                    </Button>
                  </DialogFooter>
                </form>
              </Form>
            </div>
          )}

          {/* Таблица со списком проливов */}
          {loadingPourings ? (
            <div className="flex justify-center items-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : pourings && pourings.length > 0 ? (
            <div className="rounded-md border overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[70px]">ID</TableHead>
                    <TableHead>Дата пролива</TableHead>
                    <TableHead>Инкассатор</TableHead>
                    <TableHead className="text-right">Нач. сумма</TableHead>
                    <TableHead className="text-right">Пролито</TableHead>
                    <TableHead className="text-right">Кон. сумма</TableHead>
                    <TableHead className="text-right">Снято</TableHead>
                    <TableHead>Статус</TableHead>
                    <TableHead className="w-[100px] text-center">Действия</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pourings.map((pouring) => {
                    // Расчет разницы между конечной и начальной суммой
                    const difference = 
                      (pouring.finalAmount || 0) - 
                      (pouring.initialAmount || 0) - 
                      (pouring.pouringAmount || 0);
                    
                    return (
                      <TableRow key={pouring.id}>
                        <TableCell>{pouring.id}</TableCell>
                        <TableCell>
                          {format(new Date(pouring.pouringDate), "dd.MM.yyyy HH:mm", {
                            locale: ru,
                          })}
                        </TableCell>
                        <TableCell>{pouring.collectorName || "-"}</TableCell>
                        <TableCell className="text-right">
                          {formatAmount(pouring.initialAmount || 0)}
                          {pouring.initialDate && (
                            <div className="text-xs text-muted-foreground">
                              {format(new Date(pouring.initialDate), "dd.MM.yyyy HH:mm", {
                                locale: ru,
                              })}
                            </div>
                          )}
                        </TableCell>
                        <TableCell className="text-right font-medium">
                          {formatAmount(pouring.pouringAmount)}
                        </TableCell>
                        <TableCell className="text-right">
                          {formatAmount(pouring.finalAmount || 0)}
                          {pouring.finalDate && (
                            <div className="text-xs text-muted-foreground">
                              {format(new Date(pouring.finalDate), "dd.MM.yyyy HH:mm", {
                                locale: ru,
                              })}
                            </div>
                          )}
                          {difference !== 0 && (
                            <div className={`text-xs ${difference > 0 ? "text-green-600" : "text-red-600"}`}>
                              {difference > 0 ? "+" : ""}{formatAmount(difference)}
                            </div>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          {formatAmount(pouring.withdrawalAmount || 0)}
                          {pouring.withdrawalDate && (
                            <div className="text-xs text-muted-foreground">
                              {format(new Date(pouring.withdrawalDate), "dd.MM.yyyy HH:mm", {
                                locale: ru,
                              })}
                            </div>
                          )}
                        </TableCell>
                        <TableCell>
                          {pouring.status === "ACTIVE" && (
                            <span className="text-green-600 font-medium">Активен</span>
                          )}
                          {pouring.status === "WARNING" && (
                            <span className="text-amber-600 font-medium flex items-center gap-1">
                              <AlertTriangle className="h-3 w-3" />
                              Предупреждение
                            </span>
                          )}
                          {pouring.status === "BLOCKED" && (
                            <span className="text-red-600 font-medium">Заблокирован</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="flex justify-center gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              onClick={() => startEditing(pouring)}
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-red-500"
                              onClick={() => setPouringToDelete(pouring.id)}
                            >
                              <Trash className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              onClick={() => {
                                setCurrentPouringId(pouring.id);
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
              У этой карты нет истории проливов
            </div>
          )}
        </DialogContent>
      </Dialog>
      
      {/* Диалог подтверждения удаления */}
      <AlertDialog 
        open={pouringToDelete !== null} 
        onOpenChange={(open) => !open && setPouringToDelete(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Удалить пролив?</AlertDialogTitle>
            <AlertDialogDescription>
              Это действие нельзя отменить. Пролив будет полностью удален из системы.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Отмена</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              {deletePouringMutation.isLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                "Удалить"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Диалог истории изменений пролива */}
      {currentPouringId && (
        <AuditLogDialog
          open={auditLogOpen}
          onOpenChange={setAuditLogOpen}
          entityType="CardPouring"
          entityId={currentPouringId}
        />
      )}
    </>
  );
}
