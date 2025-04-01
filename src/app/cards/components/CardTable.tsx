import { useState, useMemo } from "react";
import {
  ArrowUpDown,
  Edit,
  DollarSign,
  WalletCards,
  History,
  Loader2,
  MoreHorizontal,
  Trash,
  ChevronLeft,
  ChevronRight,
  CalendarIcon
} from "lucide-react";
import { format, subMonths } from "date-fns";
import { ru } from "date-fns/locale";
import { api } from "~/trpc/react";
import { Button } from "~/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "~/components/ui/dropdown-menu";
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
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "~/components/ui/tooltip";
import { CardStatus } from "@prisma/client";
import StatusBadge from "./StatusBadge";
import CardEditDialog from "./CardEditDialog";
import AuditLogDialog from "~/components/AuditLogDialog";
import CardPouringsDialog from "./CardPouringsDialog";
import CardBalancesDialog from "./CardBalancesDialog";
import { Input } from "~/components/ui/input";

// Определим типы для карты
export type Card = {
  id: string;
  externalId: number;
  provider: string;
  bank: string;
  cardNumber: string;
  phoneNumber: string;
  appPin: number;
  terminalPin: string;
  status: CardStatus;
  collectorName: string;
  picachu: string;
  cardPrice: number;
  isPaid: boolean;
  comment?: string;
  createdAt: Date;
  updatedAt: Date;
  // Добавленные поля с агрегацией
  totalPoured: number;
  lastBalance: number;
  initialBalance: number;
  withdrawal: number;
  _count: {
    cardPouring: number;
    balances: number;
  };
};

interface CardTableProps {
  cards: Card[];
  isLoading: boolean;
  sortBy: string;
  sortDirection: "asc" | "desc";
  onSort: (column: string) => void;
  onCardDeleted: () => void;
  onCardUpdated: () => void;
  // Добавим параметры пагинации
  page: number;
  pageSize: number;
  totalItems: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (pageSize: number) => void;
}

export default function CardTable({
  cards,
  isLoading,
  sortBy,
  sortDirection,
  onSort,
  onCardDeleted,
  onCardUpdated,
  page,
  pageSize,
  totalItems,
  onPageChange,
  onPageSizeChange,
}: CardTableProps) {
  const [cardToDelete, setCardToDelete] = useState<string | null>(null);
  const [cardToEdit, setCardToEdit] = useState<Card | null>(null);
  const [cardForAuditLog, setCardForAuditLog] = useState<string | null>(null);
  const [cardForPourings, setCardForPourings] = useState<Card | null>(null);
  const [cardForBalances, setCardForBalances] = useState<Card | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Состояния для фильтра по дате
  const [startDate, setStartDate] = useState<string>(
    format(subMonths(new Date(), 1), "yyyy-MM-dd")
  );
  const [endDate, setEndDate] = useState<string>(
    format(new Date(), "yyyy-MM-dd")
  );
  const [filteredCards, setFilteredCards] = useState<Card[]>(cards);

  // Обновляем фильтрованные карты при изменении основного списка или фильтров
  useMemo(() => {
    if (!cards.length) {
      setFilteredCards([]);
      return;
    }

    try {
      const start = new Date(startDate);
      start.setHours(0, 0, 0, 0);

      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);

      const filtered = cards.filter((card) => {
        const cardDate = new Date(card.createdAt);
        return cardDate >= start && cardDate <= end;
      });

      setFilteredCards(filtered);
    } catch (e) {
      console.error("Ошибка при фильтрации карт:", e);
      setFilteredCards(cards);
    }
  }, [cards, startDate, endDate]);

  // Рассчитываем суммарные показатели
  const summaryStats = useMemo(() => {
    if (!filteredCards.length) {
      return {
        totalCardPrice: 0,
        totalPaidCardPrice: 0,
        totalUnpaidCardPrice: 0,
        totalPoured: 0,
        totalWithdrawal: 0,
        totalLastBalance: 0,
      };
    }

    return {
      totalCardPrice: filteredCards.reduce((sum, card) => sum + (card.cardPrice || 0), 0),
      totalPaidCardPrice: filteredCards
        .filter((card) => card.isPaid)
        .reduce((sum, card) => sum + (card.cardPrice || 0), 0),
      totalUnpaidCardPrice: filteredCards
        .filter((card) => !card.isPaid)
        .reduce((sum, card) => sum + (card.cardPrice || 0), 0),
      totalPoured: filteredCards.reduce((sum, card) => sum + (card.totalPoured || 0), 0),
      totalWithdrawal: filteredCards.reduce((sum, card) => sum + (card.withdrawal || 0), 0),
      totalLastBalance: filteredCards.reduce((sum, card) => sum + (card.lastBalance || 0), 0),
    };
  }, [filteredCards]);

  const deleteCardMutation = api.cards.delete.useMutation({
    onSuccess: () => {
      onCardDeleted();
      setCardToDelete(null);
      setIsDeleting(false);
    },
    onError: (error) => {
      console.error("Ошибка при удалении карты:", error);
      setIsDeleting(false);
    },
  });

  const handleDeleteCard = () => {
    if (!cardToDelete) return;

    setIsDeleting(true);
    deleteCardMutation.mutate({ id: parseInt(cardToDelete) });
  };

  const formatDate = (date: Date) => {
    return new Date(date).toLocaleDateString("ru-RU", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  };

  // Функция для форматирования сумм
  const formatAmount = (value: number | null | undefined) => {
    if (value === null || value === undefined) return "₽0.00";

    try {
      return new Intl.NumberFormat("ru-RU", {
        style: "currency",
        currency: "RUB",
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }).format(value);
    } catch (e) {
      console.error("Ошибка форматирования суммы:", e);
      return "₽0.00";
    }
  };

  const getSortIcon = (column: string) => {
    if (sortBy !== column) return <ArrowUpDown className="ml-2 h-4 w-4" />;

    return sortDirection === "asc" ? (
      <ArrowUpDown className="ml-2 h-4 w-4 text-primary rotate-180" />
    ) : (
      <ArrowUpDown className="ml-2 h-4 w-4 text-primary" />
    );
  };

  const SortableHeader = ({ column, label }: { column: string; label: string }) => (
    <Button
      variant="ghost"
      onClick={() => onSort(column)}
      className="font-medium"
    >
      {label}
      {getSortIcon(column)}
    </Button>
  );

  // Вычисляем количество страниц
  const totalPages = Math.ceil(totalItems / pageSize);

  if (isLoading) {
    return (
      <div className="flex justify-center items-center py-8">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!cards.length) {
    return (
      <div className="flex flex-col items-center justify-center py-8 text-center">
        <p className="text-lg font-medium mb-2">Нет данных для отображения</p>
        <p className="text-sm text-muted-foreground">
          Попробуйте изменить фильтры или создать новую карту
        </p>
      </div>
    );
  }

  return (
    <>
      {/* Фильтры по дате */}
      <div className="mb-4 flex items-center gap-4 flex-wrap">
        <div className="flex items-center gap-2">
          <span className="text-sm">Период с:</span>
          <Input 
            type="date" 
            className="w-40"
            value={startDate} 
            onChange={(e) => setStartDate(e.target.value)}
          />
          <span className="text-sm">по:</span>
          <Input 
            type="date" 
            className="w-40"
            value={endDate} 
            onChange={(e) => setEndDate(e.target.value)}
          />
        </div>
        <div className="ml-auto text-sm text-muted-foreground">
          <span className="font-semibold">Найдено карт:</span> {filteredCards.length} | 
          <span className="font-semibold ml-2">Общая стоимость:</span> {formatAmount(summaryStats.totalCardPrice)}
        </div>
      </div>

      <div className="rounded-md border overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[70px]">
                <SortableHeader column="externalId" label="ID" />
              </TableHead>
              <TableHead>
                <SortableHeader column="provider" label="Поставщик" />
              </TableHead>
              <TableHead>
                <SortableHeader column="bank" label="Банк" />
              </TableHead>
              <TableHead>
                <SortableHeader column="cardNumber" label="Номер карты" />
              </TableHead>
              <TableHead>
                <SortableHeader column="phoneNumber" label="Телефон" />
              </TableHead>
              <TableHead className="w-[100px]">
                <SortableHeader column="status" label="Статус" />
              </TableHead>
              <TableHead className="text-right">
                <SortableHeader column="cardPrice" label="Стоимость" />
                {filteredCards.length > 0 && (
                  <div className="text-xs font-normal text-muted-foreground">
                    Всего: {formatAmount(summaryStats.totalCardPrice)}
                  </div>
                )}
              </TableHead>
              <TableHead className="text-right">
                Оплата
                {filteredCards.length > 0 && (
                  <div className="text-xs font-normal text-muted-foreground">
                    Оплачено: {formatAmount(summaryStats.totalPaidCardPrice)}
                  </div>
                )}
              </TableHead>
              <TableHead className="text-right">
                Пролито
                {filteredCards.length > 0 && (
                  <div className="text-xs font-normal text-muted-foreground">
                    Всего: {formatAmount(summaryStats.totalPoured)}
                  </div>
                )}
              </TableHead>
              <TableHead className="text-right">
                Снято
                {filteredCards.length > 0 && (
                  <div className="text-xs font-normal text-muted-foreground">
                    Всего: {formatAmount(summaryStats.totalWithdrawal)}
                  </div>
                )}
              </TableHead>
              <TableHead className="text-right">
                Баланс
                {filteredCards.length > 0 && (
                  <div className="text-xs font-normal text-muted-foreground">
                    Всего: {formatAmount(summaryStats.totalLastBalance)}
                  </div>
                )}
              </TableHead>
              <TableHead className="w-[150px] text-center">Действия</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredCards.map((card) => (
              <TableRow key={card.id}>
                <TableCell>{card.externalId}</TableCell>
                <TableCell>{card.provider}</TableCell>
                <TableCell>{card.bank}</TableCell>
                <TableCell>{card.cardNumber}</TableCell>
                <TableCell>{card.phoneNumber}</TableCell>
                <TableCell>
                  <StatusBadge status={card.status} />
                </TableCell>
                <TableCell className="text-right font-medium">
                  {formatAmount(card.cardPrice)}
                </TableCell>
                <TableCell className="text-right font-medium">
                  {card.isPaid ? (
                    <span className="text-green-600 font-medium">Да</span>
                  ) : (
                    <span className="text-red-600 font-medium">Нет</span>
                  )}
                </TableCell>
                <TableCell className="text-right font-medium">
                  {formatAmount(card.totalPoured)}
                  {card._count.cardPouring > 0 && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="ml-1 h-6 w-auto px-2 py-0 text-xs"
                      onClick={() => setCardForPourings(card)}
                    >
                      <DollarSign className="h-3 w-3 mr-1" />
                      <span>Проливы ({card._count.cardPouring})</span>
                    </Button>
                  )}
                </TableCell>
                <TableCell className="text-right font-medium">
                  {formatAmount(card.withdrawal)}
                </TableCell>
                <TableCell className="text-right font-medium">
                  {formatAmount(card.lastBalance)}
                  {card._count.balances > 0 && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="ml-1 h-6 w-auto px-2 py-0 text-xs"
                      onClick={() => setCardForBalances(card)}
                    >
                      <WalletCards className="h-3 w-3 mr-1" />
                      <span>Балансы ({card._count.balances})</span>
                    </Button>
                  )}
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-1">
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => setCardToEdit(card)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>Редактировать карту</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>

                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                        >
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent>
                        <DropdownMenuItem onClick={() => setCardForPourings(card)}>
                          <WalletCards className="mr-2 h-4 w-4" />
                          <span>История проливов</span>
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => setCardForBalances(card)}>
                          <DollarSign className="mr-2 h-4 w-4" />
                          <span>Балансы карты</span>
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => setCardForAuditLog(card.id)}>
                          <History className="mr-2 h-4 w-4" />
                          <span>История изменений</span>
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={() => setCardToDelete(card.id)}>
                          <Trash className="mr-2 h-4 w-4 text-red-500" />
                          <span className="text-red-500">Удалить карту</span>
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Пагинация */}
      <div className="flex justify-between items-center py-4">
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={() => onPageChange(page - 1)}
            disabled={page === 1}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="text-sm font-medium">
            {page} из {totalPages}
          </span>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={() => onPageChange(page + 1)}
            disabled={page === totalPages}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium">Количество записей:</span>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="h-6 w-auto px-2 py-0 text-xs">
                {pageSize}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuItem onClick={() => onPageSizeChange(10)}>10</DropdownMenuItem>
              <DropdownMenuItem onClick={() => onPageSizeChange(20)}>20</DropdownMenuItem>
              <DropdownMenuItem onClick={() => onPageSizeChange(50)}>50</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Диалог подтверждения удаления */}
      <AlertDialog open={cardToDelete !== null} onOpenChange={(open) => !open && setCardToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Вы уверены?</AlertDialogTitle>
            <AlertDialogDescription>
              Это действие нельзя отменить. Карта будет удалена навсегда.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Отмена</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteCard}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                "Удалить"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Диалог редактирования карты */}
      {cardToEdit && (
        <CardEditDialog
          card={cardToEdit}
          open={cardToEdit !== null}
          onOpenChange={(open) => !open && setCardToEdit(null)}
          onCardUpdated={onCardUpdated}
        />
      )}

      {/* Диалог истории изменений */}
      {cardForAuditLog && (
        <AuditLogDialog
          open={cardForAuditLog !== null}
          onOpenChange={(open) => !open && setCardForAuditLog(null)}
          entityType="Card"
          entityId={parseInt(cardForAuditLog)}
        />
      )}

      {/* Диалог истории проливов */}
      {cardForPourings && (
        <CardPouringsDialog
          card={cardForPourings}
          open={cardForPourings !== null}
          onOpenChange={(open) => !open && setCardForPourings(null)}
          onPouringAdded={onCardUpdated}
        />
      )}

      {/* Диалог истории балансов */}
      {cardForBalances && (
        <CardBalancesDialog
          card={cardForBalances}
          open={cardForBalances !== null}
          onOpenChange={(open) => !open && setCardForBalances(null)}
          onBalanceAdded={onCardUpdated}
        />
      )}
    </>
  );
}
