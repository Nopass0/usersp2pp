import { useState, useEffect } from "react";
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import { Textarea } from "~/components/ui/textarea";
import { Checkbox } from "~/components/ui/checkbox";

// Определяем тип для карты
interface CardType {
  id: number;
  externalId: number;
  provider: string;
  cardNumber: string;
  bank: string;
  phoneNumber: string;
  appPin: number;
  terminalPin: string;
  comment?: string | null;
  status: "ACTIVE" | "WARNING" | "BLOCKED";
  picachu?: string | null;
  cardPrice?: number | null;
  isPaid: boolean;
}

interface CardEditDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  card: CardType;
}

export default function CardEditDialog({
  open,
  onOpenChange,
  card,
}: CardEditDialogProps) {
  // Форма для редактирования карты
  const [formData, setFormData] = useState<CardType>({
    id: 0,
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
    cardPrice: null,
    isPaid: false,
  });

  // Заполняем форму данными карты
  useEffect(() => {
    if (card) {
      setFormData(card);
    }
  }, [card]);

  // Мутация для обновления карты
  const utils = api.useContext();
  const updateCardMutation = api.cards.update.useMutation({
    onSuccess: () => {
      toast.success("Карта успешно обновлена!");
      onOpenChange(false);
      utils.cards.getAll.invalidate();
    },
    onError: (error) => {
      toast.error(`Ошибка при обновлении карты: ${error.message}`);
    },
  });

  // Обработчик изменения полей формы
  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value, type } = e.target;
    
    setFormData((prev) => ({
      ...prev,
      [name]: type === "number" ? (value === "" ? null : Number(value)) : value,
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

  // Отправка формы
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    updateCardMutation.mutate({
      id: formData.id,
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
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Редактировать карту</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 max-h-[70vh] overflow-y-auto p-1">
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
                value={formData.picachu || ""}
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
              value={formData.comment || ""}
              onChange={handleChange}
              rows={3}
              placeholder="Добавьте комментарий к карте"
            />
          </div>
          
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
              disabled={updateCardMutation.isLoading}
            >
              {updateCardMutation.isLoading ? "Сохранение..." : "Сохранить"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}