import { useState } from "react";
import { Loader2, Plus } from "lucide-react";
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import { Checkbox } from "~/components/ui/checkbox";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "~/components/ui/tabs";

// Валидационная схема для формы создания карты
const createCardSchema = z.object({
  letterCode: z.string().optional(),
  actor: z.string().optional(),
  provider: z.string().min(1, "Поставщик обязателен"),
  cardNumber: z.string().min(1, "Номер карты обязателен"),
  bank: z.string().min(1, "Банк обязателен"),
  phoneNumber: z.string().min(1, "Номер телефона обязателен"),
  appPin: z.coerce.number().int().nullable(),
  terminalPin: z.string().min(1, "Пин терминала обязателен"),
  status: z.enum(["ACTIVE", "WARNING", "BLOCKED"]),
  collectorName: z.string().min(1, "Имя инкассатора обязательно"),
  picachu: z.string().min(1, "Пикачу обязателен"),
  cardPrice: z.coerce
    .number()
    .min(0, "Стоимость должна быть положительным числом"),
  isPaid: z.boolean().default(false),
  comment: z.string().optional(),
  externalId: z.coerce.number().int().positive("ID должен быть положительным числом"),
  initialBalance: z.coerce
    .number()
    .min(0, "Начальный баланс должен быть положительным числом")
    .optional(),
  initialPouringAmount: z.coerce
    .number()
    .min(0, "Начальная сумма пополнения должна быть положительным числом")
    .optional(),
  actor: z.string().optional(),
});

type CreateCardFormValues = z.infer<typeof createCardSchema>;

interface CardCreateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function CardCreateDialog({ open, onOpenChange }: CardCreateDialogProps) {
  const [activeTab, setActiveTab] = useState("details");

  // Используем хук формы с валидацией Zod
  const form = useForm<CreateCardFormValues>({
    resolver: zodResolver(createCardSchema),
    defaultValues: {
      letterCode: "",
      actor: "",
      provider: "",
      cardNumber: "",
      bank: "",
      phoneNumber: "",
      appPin: undefined,
      terminalPin: "",
      status: "ACTIVE",
      collectorName: "",
      picachu: "",
      cardPrice: 0,
      isPaid: false,
      comment: "",
      externalId: undefined,
      initialBalance: undefined,
      initialPouringAmount: undefined,
      actor: "",
    },
  });

  // Получаем функцию для обновления данных карт
  const utils = api.useContext();

  // Мутация для создания карты
  const createCardMutation = api.cards.create.useMutation({
    onSuccess: () => {
      // Обновляем кэш после успешного создания
      void utils.cards.getAll.invalidate();
      void utils.cards.getStats.invalidate();
      
      // Закрываем диалог и сбрасываем форму
      onOpenChange(false);
      form.reset();
    },
    onError: (error) => {
      console.error("Ошибка при создании карты:", error);
    },
  });

  // Обработчик отправки формы
  const onSubmit = (data: CreateCardFormValues) => {
    createCardMutation.mutate({
      ...data,
      appPin: data.appPin ?? 0, // Обеспечиваем, что appPin всегда число
      initialBalance: data.initialBalance,
      pouringAmount: data.initialPouringAmount, // Переименовываем для API
      initialAmount: data.initialPouringAmount, // Дублируем для совместимости
      initialDate: new Date().toISOString(),
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Создать новую карту</DialogTitle>
          <DialogDescription>
            Заполните информацию о карте, включая ее стоимость и статус оплаты.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <Tabs
              value={activeTab}
              onValueChange={setActiveTab}
              className="w-full"
            >
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="details">Основные данные</TabsTrigger>
                <TabsTrigger value="additional">Дополнительно</TabsTrigger>
              </TabsList>
              
              <TabsContent value="details" className="space-y-4 pt-4">
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="letterCode"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Код буквы</FormLabel>
                        <FormControl>
                          <Input placeholder="Например, А" {...field} />
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
                        <FormLabel>Внешний ID</FormLabel>
                        <FormControl>
                          <Input type="number" placeholder="ID карты" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                
                <div className="grid grid-cols-2 gap-4">
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
                  
                  <FormField
                    control={form.control}
                    name="appPin"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Пин приложения</FormLabel>
                        <FormControl>
                          <Input type="number" placeholder="Введите пин (4 цифры)" {...field} />
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
                </div>
              </TabsContent>
              
              <TabsContent value="additional" className="space-y-4 pt-4">
                <div className="grid grid-cols-2 gap-4">
                  {/* <FormField
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
                  /> */}
                  
                  <FormField
                    control={form.control}
                    name="picachu"
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
                    name="cardPrice"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Стоимость карты</FormLabel>
                        <FormControl>
                          <Input type="number" placeholder="Введите стоимость" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="isPaid"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                        <FormControl>
                          <Checkbox
                            checked={field.value}
                            onCheckedChange={field.onChange}
                          />
                        </FormControl>
                        <div className="space-y-1 leading-none">
                          <FormLabel>
                            Оплачена
                          </FormLabel>
                          <FormDescription>
                            Отметьте, если карта уже оплачена
                          </FormDescription>
                        </div>
                      </FormItem>
                    )}
                  />
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="initialBalance"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Начальный баланс</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            placeholder="Введите начальный баланс"
                            {...field}
                            value={field.value === undefined ? "" : field.value}
                            onChange={(e) => {
                              if (e.target.value === "") {
                                field.onChange(undefined);
                              } else {
                                field.onChange(e);
                              }
                            }}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="initialPouringAmount"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Начальная сумма</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            placeholder="Введите начальную сумму"
                            {...field}
                            value={field.value === undefined ? "" : field.value}
                            onChange={(e) => {
                              if (e.target.value === "") {
                                field.onChange(undefined);
                              } else {
                                field.onChange(e);
                              }
                            }}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                
                <div className="grid grid-cols-1 gap-4">
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
                          <Input placeholder="Введите комментарий" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </TabsContent>
            </Tabs>
            
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
              >
                Отмена
              </Button>
              <Button 
                type="submit"
                disabled={createCardMutation.isLoading}
              >
                {createCardMutation.isLoading && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                Создать карту
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
