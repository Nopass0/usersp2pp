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
import type { Card } from "./CardTable";
import { type FieldPath } from "react-hook-form";

// Валидационная схема для формы редактирования карты
const editCardSchema = z.object({
  externalId: z.coerce.number().int("Внешний ID должен быть целым числом"),
  provider: z.string().min(1, "Поставщик обязателен"),
  cardNumber: z.string().min(1, "Номер карты обязателен"),
  bank: z.string().min(1, "Банк обязателен"),
  phoneNumber: z.string().min(1, "Номер телефона обязателен"),
  appPin: z.coerce.number().int("PIN приложения должен быть целым числом"),
  terminalPin: z.string().min(1, "PIN терминала обязателен"),
  status: z.enum(["ACTIVE", "WARNING", "BLOCKED"]),
  collectorName: z.string().min(1, "Имя инкассатора обязательно"),
  picachu: z.string().min(1, "Пикачу обязателен"),
  cardPrice: z.coerce
    .number()
    .min(0, "Стоимость должна быть положительным числом"),
  isPaid: z.boolean().default(false),
  comment: z.string().optional(),
});

type EditCardFormValues = z.infer<typeof editCardSchema>;

// Проверяем, что все поля карты определены в интерфейсе Card
type CardWithAllFields = Card & {
  externalId: number;
  cardNumber: string;
  phoneNumber: string;
  appPin: number;
  terminalPin: string;
  comment?: string | null;
};

interface CardEditDialogProps {
  card: CardWithAllFields;
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
      externalId: card.externalId,
      provider: card.provider,
      cardNumber: card.cardNumber,
      bank: card.bank,
      phoneNumber: card.phoneNumber,
      appPin: card.appPin,
      terminalPin: card.terminalPin,
      status: card.status,
      collectorName: card.collectorName,
      picachu: card.picachu,
      cardPrice: card.cardPrice,
      isPaid: card.isPaid,
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
                name="externalId" as FieldPath<EditCardFormValues>
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Внешний ID</FormLabel>
                    <FormControl>
                      <Input type="number" placeholder="Внешний ID" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="provider" as FieldPath<EditCardFormValues>
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
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="cardNumber" as FieldPath<EditCardFormValues>
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
              
              <FormField
                control={form.control}
                name="bank" as FieldPath<EditCardFormValues>
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
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="phoneNumber" as FieldPath<EditCardFormValues>
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
              
              <FormField
                control={form.control}
                name="appPin" as FieldPath<EditCardFormValues>
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>PIN приложения</FormLabel>
                    <FormControl>
                      <Input type="number" placeholder="PIN приложения" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="terminalPin" as FieldPath<EditCardFormValues>
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>PIN терминала</FormLabel>
                    <FormControl>
                      <Input placeholder="PIN терминала" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="status" as FieldPath<EditCardFormValues>
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
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="collectorName" as FieldPath<EditCardFormValues>
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
                name="picachu" as FieldPath<EditCardFormValues>
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Пикачу</FormLabel>
                    <FormControl>
                      <Input placeholder="Пикачу" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="cardPrice" as FieldPath<EditCardFormValues>
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Стоимость карты</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        placeholder="0.00"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="isPaid" as FieldPath<EditCardFormValues>
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center space-x-2 space-y-0 pt-4">
                    <FormControl>
                      <Checkbox 
                        checked={field.value} 
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                    <FormLabel>Карта оплачена</FormLabel>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            
            <FormField
              control={form.control}
              name="comment" as FieldPath<EditCardFormValues>
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Комментарий</FormLabel>
                  <FormControl>
                    <Input placeholder="Комментарий" {...field} />
                  </FormControl>
                  <FormMessage />
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
              <Button 
                type="submit" 
                disabled={updateCardMutation.isLoading}
              >
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
