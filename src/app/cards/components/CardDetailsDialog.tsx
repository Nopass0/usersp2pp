import type { Card } from "./CardTable";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose,
} from "~/components/ui/dialog";
import StatusBadge from "~/app/cards/components/StatusBadge";
import { Button } from "~/components/ui/button";
import { ScrollArea } from "~/components/ui/scroll-area";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "~/components/ui/table";
import { format } from "date-fns";
import { ru } from "date-fns/locale";

interface CardDetailsDialogProps {
  card: Card | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function CardDetailsDialog({
  card,
  open,
  onOpenChange,
}: CardDetailsDialogProps) {
  if (!card) return null;

  // Функция для форматирования сумм
  const formatAmount = (value: number | null | undefined) => {
    if (value === null || value === undefined) return "-";
    return new Intl.NumberFormat("ru-RU", {
      style: "currency",
      currency: "RUB",
      minimumFractionDigits: 2,
    }).format(value);
  };

  // Функция для форматирования дат
  const formatDate = (date: Date) => {
    return format(new Date(date), "dd MMMM yyyy", { locale: ru });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Подробная информация о карте #{card.externalId}</DialogTitle>
          <DialogDescription>
            Банк: {card.bank}, Номер: {card.cardNumber}
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="h-[400px] w-full rounded border p-4">
          <div className="space-y-4">
            <h3 className="font-medium text-lg">Основная информация</h3>
            <Table>
              <TableBody>
                <TableRow>
                  <TableCell className="font-medium">ID</TableCell>
                  <TableCell>{card.externalId}</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell className="font-medium">Банк</TableCell>
                  <TableCell>{card.bank}</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell className="font-medium">Номер карты</TableCell>
                  <TableCell>{card.cardNumber}</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell className="font-medium">Телефон</TableCell>
                  <TableCell>{card.phoneNumber}</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell className="font-medium">Статус</TableCell>
                  <TableCell><StatusBadge status={card.status} /></TableCell>
                </TableRow>
                <TableRow>
                  <TableCell className="font-medium">PIN-код приложения</TableCell>
                  <TableCell>{card.appPin}</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell className="font-medium">PIN-код терминала</TableCell>
                  <TableCell>{card.terminalPin}</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell className="font-medium">Код-буква</TableCell>
                  <TableCell>{card.letterCode || "-"}</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell className="font-medium">Поставщик</TableCell>
                  <TableCell>{card.provider}</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell className="font-medium">В работе</TableCell>
                  <TableCell>{card.inWork ? "Да" : "Нет"}</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell className="font-medium">Актер</TableCell>
                  <TableCell>{card.actor || "-"}</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell className="font-medium">Пикачу</TableCell>
                  <TableCell>{card.picachu || "-"}</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell className="font-medium">Стоимость</TableCell>
                  <TableCell>{formatAmount(card.cardPrice)}</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell className="font-medium">Оплачено</TableCell>
                  <TableCell>{card.isPaid ? "Да" : "Нет"}</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell className="font-medium">Комментарий</TableCell>
                  <TableCell>{card.comment || "-"}</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell className="font-medium">Дата создания</TableCell>
                  <TableCell>{formatDate(card.createdAt)}</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell className="font-medium">Дата обновления</TableCell>
                  <TableCell>{formatDate(card.updatedAt)}</TableCell>
                </TableRow>
              </TableBody>
            </Table>

            <h3 className="font-medium text-lg mt-6">Информация о проливах и балансах</h3>
            <Table>
              <TableBody>
                <TableRow>
                  <TableCell className="font-medium">Баланс на начало пролива</TableCell>
                  <TableCell>{formatAmount(card.initialBalance)}</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell className="font-medium">Баланс на конец пролива</TableCell>
                  <TableCell>{formatAmount(card.lastBalance)}</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell className="font-medium">Пролито (разница балансов)</TableCell>
                  <TableCell>{formatAmount(card.totalPoured)}</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell className="font-medium">Сумма выплат</TableCell>
                  <TableCell>{formatAmount(card.withdrawal)}</TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </div>
        </ScrollArea>

        <DialogFooter>
          <DialogClose asChild>
            <Button variant="secondary">Закрыть</Button>
          </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
