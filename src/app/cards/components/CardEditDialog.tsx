import { useState } from "react";
import { Loader2 } from "lucide-react";
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
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "~/components/ui/form";
import { Input } from "~/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import { Checkbox } from "~/components/ui/checkbox";
import { Textarea } from "~/components/ui/textarea";
import type { Card } from "./CardTable";

// Валидационная схема для формы редактирования карты
const editCardSchema = z.object({
  letterCode: z.string().optional(),
  actor: z.string().optional(),
  externalId: z.coerce
    .number()
    .int()
    .positive("ID должен быть положительным числом"),
  provider: z.string().min(1, "Поставщик обязателен"),
  cardNumber: z.string().min(1, "Номер карты обязателен"),
  bank: z.string().min(1, "Банк обязателен"),
  phoneNumber: z.string().min(1, "Номер телефона обязателен"),
  appPin: z.coerce.number().int().optional(),
  terminalPin: z.string().min(1, "Пин терминала обязателен"),
  status: z.enum(["ACTIVE", "WARNING", "BLOCKED"]),
  collectorName: z.string().min(1, "Имя инкассатора обязательно"),
  picachu: z.string().min(1, "Пикачу обязателен"),
  cardPrice: z.coerce
    .number()
    .min(0, "Стоимость должна быть положительным числом"),
  isPaid: z.boolean().default(false),
  inWork: z.boolean().default(true),
  comment: z.string().optional(),
});

type EditCardFormValues = z.infer<typeof editCardSchema>;

interface CardEditDialogProps {
  card: Card;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCardUpdated: () => void;
}

export default function CardEditDialog({
  card,
  open,
  onOpenChange,
  onCardUpdated,
}: CardEditDialogProps) {
  // Используем хук формы с валидацией Zod
  const form = useForm<EditCardFormValues>({
    resolver: zodResolver(editCardSchema),
    defaultValues: {
      letterCode: card.letterCode || "",
      actor: card.actor || "",
      externalId: card.externalId,
      provider: card.provider,
      cardNumber: card.cardNumber,
      bank: card.bank,
      phoneNumber: card.phoneNumber,
      appPin: card.appPin,
      terminalPin: card.terminalPin,
      status: card.status,
      collectorName: card.collectorName || "",
      picachu: card.picachu,
      cardPrice: card.cardPrice,
      isPaid: card.isPaid,
      inWork: card.inWork,
      comment: card.comment || "",
    },
  });

  // Мутация для обновления карты
  const updateCardMutation = api.cards.update.useMutation({
    onSuccess: () => {
      onCardUpdated();
      onOpenChange(false);
    },
    onError: (error) => {
      console.error("Ошибка при обновлении карты:", error);
    },
  });

  // Обработчик отправки формы
  const onSubmit = (data: EditCardFormValues) => {
    updateCardMutation.mutate({
      id: card.id,
      ...data,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[525px]">
        <DialogHeader>
          <DialogTitle>Редактировать карту</DialogTitle>
          <DialogDescription>
            Измените информацию о карте и нажмите сохранить, когда закончите.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="letterCode"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Код буквы</FormLabel>
                    <FormControl>
                      <Input placeholder="Введите код буквы" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="externalId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>ID</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        placeholder="Введите ID"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="provider"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Поставщик</FormLabel>
                    <FormControl>
                      <Input placeholder="Введите поставщика" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="cardNumber"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Номер карты</FormLabel>
                    <FormControl>
                      <Input placeholder="Введите номер карты" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="bank"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Банк</FormLabel>
                    <FormControl>
                      <Input placeholder="Введите банк" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="phoneNumber"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Номер телефона</FormLabel>
                    <FormControl>
                      <Input placeholder="Введите номер телефона" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="appPin"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Пин приложения</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        placeholder="Введите пин приложения"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="terminalPin"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Пин терминала</FormLabel>
                    <FormControl>
                      <Input placeholder="Введите пин терминала" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
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
                        <SelectItem value="ACTIVE">Активна</SelectItem>
                        <SelectItem value="WARNING">Внимание</SelectItem>
                        <SelectItem value="BLOCKED">Блокирована</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="cardPrice"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Стоимость карты</FormLabel>
                    <FormControl>
                      <Input type="number" placeholder="0.00" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="collectorName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Инкассатор</FormLabel>
                    <FormControl>
                      <Input placeholder="Имя инкассатора" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="picachu"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Пикачу</FormLabel>
                    <FormControl>
                      <Input placeholder="Введите пикачу" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="actor"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Актер</FormLabel>
                  <FormControl>
                    <Input placeholder="Введите актера" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="comment"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Комментарий</FormLabel>
                  <FormControl>
                    <Textarea placeholder="Введите комментарий" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="isPaid"
              render={({ field }) => (
                <FormItem className="flex flex-row items-start space-y-0 space-x-3 rounded-md border p-4">
                  <FormControl>
                    <Checkbox
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                  <div className="space-y-1 leading-none">
                    <FormLabel>Карта оплачена</FormLabel>
                    <p className="text-muted-foreground text-sm">
                      Отметьте, если карта была оплачена
                    </p>
                  </div>
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="inWork"
              render={({ field }) => (
                <FormItem className="flex flex-row items-start space-y-0 space-x-3 rounded-md border p-4">
                  <FormControl>
                    <Checkbox
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                  <div className="space-y-1 leading-none">
                    <FormLabel>В работе</FormLabel>
                    <p className="text-muted-foreground text-sm">
                      Отметьте, если карта находится в работе
                    </p>
                  </div>
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={updateCardMutation.isLoading}
              >
                Отмена
              </Button>
              <Button type="submit" disabled={updateCardMutation.isLoading}>
                {updateCardMutation.isLoading && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                Сохранить изменения
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
