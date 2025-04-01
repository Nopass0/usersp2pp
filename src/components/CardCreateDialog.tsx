import { useState } from "react";
import { toast } from "sonner";
import { api } from "~/trpc/react";
import { Button } from "~/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "~/components/ui/dialog";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "~/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import { Textarea } from "~/components/ui/textarea";
import { Checkbox } from "~/components/ui/checkbox";

interface CardCreateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function CardCreateDialog({
  open,
  onOpenChange,
}: CardCreateDialogProps) {
  // Форма для создания карты
  const [formData, setFormData] = useState({
    externalId: 0,
    provider: "",
    cardNumber: "",
    bank: "",
    phoneNumber: "",
    appPin: 0,
    terminalPin: "",
    comment: "",
    status: "ACTIVE" as "ACTIVE" | "WARNING" | "BLOCKED",
    picachu: "",
    cardPrice: undefined as number | undefined,
    isPaid: false,
    initialBalance: undefined as number | undefined,
    initialPouring: {
      pouringAmount: undefined as number | undefined,
      initialAmount: undefined as number | undefined,
      initialDate: "",
      collectorName: "",
    },
  });

  // Мутация для создания карты
  const utils = api.useContext();
  const createCardMutation = api.cards.create.useMutation({
    onSuccess: () => {
      toast.success("Карта успешно создана!");
      onOpenChange(false);
      utils.cards.getAll.invalidate();
      setFormData({
        externalId: 0,
        provider: "",
        cardNumber: "",
        bank: "",
        phoneNumber: "",
        appPin: 0,
        terminalPin: "",
        comment: "",
        status: "ACTIVE",
        picachu: "",
        cardPrice: undefined,
        isPaid: false,
        initialBalance: undefined,
        initialPouring: {
          pouringAmount: undefined,
          initialAmount: undefined,
          initialDate: "",
          collectorName: "",
        },
      });
    },
    onError: (error) => {
      toast.error(`Ошибка при создании карты: ${error.message}`);
    },
  });

  // Обработчик изменения полей формы
  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value, type } = e.target;
    
    setFormData((prev) => ({
      ...prev,
      [name]: type === "number" ? (value === "" ? undefined : Number(value)) : value,
    }));
  };

  // Обработчик изменения checkbox
  const handleCheckboxChange = (checked: boolean) => {
    setFormData((prev) => ({
      ...prev,
      isPaid: checked,
    }));
  };

  // Обработчик изменения select
  const handleSelectChange = (name: string, value: string) => {
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  // Обработчик изменения полей начального пролива
  const handlePouringChange = (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const { name, value, type } = e.target;
    
    setFormData((prev) => ({
      ...prev,
      initialPouring: {
        ...prev.initialPouring,
        [name]: type === "number" ? (value === "" ? undefined : Number(value)) : value,
      },
    }));
  };

  // Отправка формы
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const pouringData = (
      formData.initialPouring.pouringAmount !== undefined && 
      formData.initialPouring.initialAmount !== undefined && 
      formData.initialPouring.initialDate
    ) ? {
      pouringAmount: formData.initialPouring.pouringAmount,
      initialAmount: formData.initialPouring.initialAmount,
      initialDate: formData.initialPouring.initialDate,
      collectorName: formData.initialPouring.collectorName || undefined,
    } : undefined;
    
    createCardMutation.mutate({
      externalId: formData.externalId,
      provider: formData.provider,
      cardNumber: formData.cardNumber,
      bank: formData.bank,
      phoneNumber: formData.phoneNumber,
      appPin: formData.appPin,
      terminalPin: formData.terminalPin,
      comment: formData.comment || undefined,
      status: formData.status,
      picachu: formData.picachu || undefined,
      cardPrice: formData.cardPrice,
      isPaid: formData.isPaid,
      initialBalance: formData.initialBalance,
      ...pouringData,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Добавить новую карту</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 max-h-[70vh] overflow-y-auto p-1">
          <Tabs defaultValue="card-info">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="card-info">Информация</TabsTrigger>
              <TabsTrigger value="initial-balance">Баланс</TabsTrigger>
              <TabsTrigger value="initial-pouring">Пролив</TabsTrigger>
            </TabsList>
            
            {/* Вкладка с информацией о карте */}
            <TabsContent value="card-info" className="space-y-4 pt-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="externalId">Внешний ID</Label>
                  <Input
                    id="externalId"
                    name="externalId"
                    type="number"
                    value={formData.externalId.toString()}
                    onChange={handleChange}
                    required
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="provider">Поставщик</Label>
                  <Input
                    id="provider"
                    name="provider"
                    value={formData.provider}
                    onChange={handleChange}
                    required
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="cardNumber">Номер карты</Label>
                  <Input
                    id="cardNumber"
                    name="cardNumber"
                    value={formData.cardNumber}
                    onChange={handleChange}
                    required
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="bank">Банк</Label>
                  <Input
                    id="bank"
                    name="bank"
                    value={formData.bank}
                    onChange={handleChange}
                    required
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="phoneNumber">Номер телефона</Label>
                  <Input
                    id="phoneNumber"
                    name="phoneNumber"
                    value={formData.phoneNumber}
                    onChange={handleChange}
                    required
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="appPin">PIN приложения</Label>
                  <Input
                    id="appPin"
                    name="appPin"
                    type="number"
                    value={formData.appPin.toString()}
                    onChange={handleChange}
                    required
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="terminalPin">PIN терминала</Label>
                  <Input
                    id="terminalPin"
                    name="terminalPin"
                    value={formData.terminalPin}
                    onChange={handleChange}
                    required
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="status">Статус</Label>
                  <Select
                    value={formData.status}
                    onValueChange={(value) => handleSelectChange("status", value)}
                  >
                    <SelectTrigger id="status">
                      <SelectValue placeholder="Выберите статус" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ACTIVE">Активна</SelectItem>
                      <SelectItem value="WARNING">Внимание</SelectItem>
                      <SelectItem value="BLOCKED">Блокирована</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="picachu">Пикачу</Label>
                  <Input
                    id="picachu"
                    name="picachu"
                    value={formData.picachu}
                    onChange={handleChange}
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="cardPrice">Цена карты</Label>
                  <Input
                    id="cardPrice"
                    name="cardPrice"
                    type="number"
                                       value={formData.cardPrice?.toString() || ""}
                                       onChange={handleChange}
                                     />
                                   </div>
                                   
                                   <div className="flex items-center space-x-2 pt-4">
                                     <Checkbox
                                       id="isPaid"
                                       checked={formData.isPaid}
                                       onCheckedChange={handleCheckboxChange}
                                     />
                                     <Label htmlFor="isPaid">Карта оплачена</Label>
                                   </div>
                                 </div>
                                 
                                 <div className="space-y-2">
                                   <Label htmlFor="comment">Комментарий</Label>
                                   <Textarea
                                     id="comment"
                                     name="comment"
                                     value={formData.comment}
                                     onChange={handleChange}
                                     rows={3}
                                     placeholder="Добавьте комментарий к карте"
                                   />
                                 </div>
                               </TabsContent>
                               
                               {/* Вкладка с начальным балансом */}
                               <TabsContent value="initial-balance" className="space-y-4 pt-4">
                                 <div className="space-y-2">
                                   <Label htmlFor="initialBalance">Начальный баланс</Label>
                                   <Input
                                     id="initialBalance"
                                     name="initialBalance"
                                     type="number"
                                     value={formData.initialBalance?.toString() || ""}
                                     onChange={handleChange}
                                     placeholder="Введите начальный баланс карты"
                                   />
                                   <p className="text-sm text-muted-foreground mt-1">
                                     При указании начального баланса будет создана запись баланса с текущей датой
                                   </p>
                                 </div>
                               </TabsContent>
                               
                               {/* Вкладка с начальным проливом */}
                               <TabsContent value="initial-pouring" className="space-y-4 pt-4">
                                 <div className="grid grid-cols-2 gap-4">
                                   <div className="space-y-2">
                                     <Label htmlFor="pouringAmount">Сумма пролива</Label>
                                     <Input
                                       id="pouringAmount"
                                       name="pouringAmount"
                                       type="number"
                                       value={formData.initialPouring.pouringAmount?.toString() || ""}
                                       onChange={handlePouringChange}
                                       placeholder="Введите сумму пролива"
                                     />
                                   </div>
                                   
                                   <div className="space-y-2">
                                     <Label htmlFor="initialAmount">Начальная сумма</Label>
                                     <Input
                                       id="initialAmount"
                                       name="initialAmount"
                                       type="number"
                                       value={formData.initialPouring.initialAmount?.toString() || ""}
                                       onChange={handlePouringChange}
                                       placeholder="Введите начальную сумму"
                                     />
                                   </div>
                                   
                                   <div className="space-y-2">
                                     <Label htmlFor="initialDate">Дата</Label>
                                     <Input
                                       id="initialDate"
                                       name="initialDate"
                                       type="date"
                                       value={formData.initialPouring.initialDate}
                                       onChange={handlePouringChange}
                                     />
                                   </div>
                                   
                                   <div className="space-y-2">
                                     <Label htmlFor="collectorName">Имя инкассатора</Label>
                                     <Input
                                       id="collectorName"
                                       name="collectorName"
                                       value={formData.initialPouring.collectorName}
                                       onChange={handlePouringChange}
                                       placeholder="Введите имя инкассатора"
                                     />
                                   </div>
                                 </div>
                                 <p className="text-sm text-muted-foreground mt-1">
                                   Для создания начального пролива необходимо заполнить все поля
                                 </p>
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
                                 {createCardMutation.isLoading ? "Сохранение..." : "Сохранить"}
                               </Button>
                             </DialogFooter>
                           </form>
                         </DialogContent>
                       </Dialog>
                     );
                   }