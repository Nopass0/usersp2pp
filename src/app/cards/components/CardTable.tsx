import { useState, useMemo, useEffect } from "react";
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
  CalendarIcon,
  Info,
  CreditCard,
  Phone,
  Check,
  ClipboardList,
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
import StatusBadge from "~/app/cards/components/StatusBadge";
import CardEditDialog from "~/app/cards/components/CardEditDialog";
import AuditLogDialog from "~/app/cards/components/AuditLogDialog";
import CardPouringsDialog from "~/app/cards/components/CardPouringsDialog";
import CardBalancesDialog from "~/app/cards/components/CardBalancesDialog";
import CardDetailsDialog from "~/app/cards/components/CardDetailsDialog";
import { Input } from "~/components/ui/input";
import { Switch } from "~/components/ui/switch";
import { Label } from "~/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "~/components/ui/tabs";

// Определим типы для карты
export interface Card {
  id: string;
  letterCode?: string;
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
  actor?: String;
  updatedAt: Date;
  inWork: boolean;
  activePaymentMethod?: string; // Новое поле для хранения активного метода оплаты
  // Добавленные поля с агрегацией
  totalPoured: number;
  lastBalance: number;
  initialBalance: number;
  withdrawal: number;
  _count: {
    cardPouring: number;
    balances: number;
  };
}

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
  const [cardForDetails, setCardForDetails] = useState<Card | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [selectedCard, setSelectedCard] = useState<Card | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [auditLogDialogOpen, setAuditLogDialogOpen] = useState(false);
  const [activePaymentMethods, setActivePaymentMethods] = useState<
    Record<string, "c2c" | "sbp">
  >({}); // Хранит активный метод оплаты для каждой карты
  const [noPeriod, setNoPeriod] = useState<boolean>(false);

  // Состояния для фильтра по дате
  const [startDate, setStartDate] = useState<string>(
    format(subMonths(new Date(), 1), "yyyy-MM-dd"),
  );
  const [endDate, setEndDate] = useState<string>(
    format(new Date(), "yyyy-MM-dd"),
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

  // Вычисляем статистику для таблицы
  const summaryStats = useMemo(() => {
    if (!filteredCards.length) {
      return {
        totalCardPrice: 0,
        totalPaidCardPrice: 0,
        totalPoured: 0,
        totalWithdrawal: 0,
        totalLastBalance: 0,
        totalInitialBalance: 0,
      };
    }

    return filteredCards.reduce(
      (acc, card) => {
        // Суммируем стоимость всех карт
        acc.totalCardPrice += card.cardPrice || 0;

        // Суммируем стоимость оплаченных карт
        if (card.isPaid) {
          acc.totalPaidCardPrice += card.cardPrice || 0;
        }

        // Суммируем общий объем проливов
        acc.totalPoured += card.totalPoured || 0;

        // Суммируем выплаты
        acc.totalWithdrawal += card.withdrawal || 0;

        // Суммируем текущие балансы (на конец пролива)
        acc.totalLastBalance += card.lastBalance || 0;

        // Суммируем начальные балансы (на начало пролива)
        acc.totalInitialBalance += card.initialBalance || 0;

        return acc;
      },
      {
        totalCardPrice: 0,
        totalPaidCardPrice: 0,
        totalPoured: 0,
        totalWithdrawal: 0,
        totalLastBalance: 0,
        totalInitialBalance: 0,
      },
    );
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
    if (value === null || value === undefined) return "-";
    return new Intl.NumberFormat("ru-RU", {
      style: "currency",
      currency: "RUB",
      minimumFractionDigits: 2,
    }).format(value);
  };

  // Мутация для обновления активного метода оплаты
  const updatePaymentMethodMutation = api.cards.updatePaymentMethod.useMutation(
    {
      onSuccess: () => {
        // Можно добавить уведомление об успешном обновлении при необходимости
      },
      onError: (error) => {
        console.error("Ошибка при обновлении метода оплаты:", error);
      },
    },
  );

  const toggleNoPeriod = () => {
    if (!noPeriod) {
      // Calculate dates ±50 years from now
      const pastDate = new Date();
      pastDate.setFullYear(pastDate.getFullYear() - 50);

      const futureDate = new Date();
      futureDate.setFullYear(futureDate.getFullYear() + 50);

      // Format dates to string format used by inputs
      setStartDate(format(pastDate, "yyyy-MM-dd"));
      setEndDate(format(futureDate, "yyyy-MM-dd"));
      setNoPeriod(true);
    } else {
      // Reset to default date range (1 month)
      setStartDate(format(subMonths(new Date(), 1), "yyyy-MM-dd"));
      setEndDate(format(new Date(), "yyyy-MM-dd"));
      setNoPeriod(false);
    }
  };

  // Функция для переключения активного метода оплаты
  const togglePaymentMethod = async (cardId: string, method: "c2c" | "sbp") => {
    // Обновляем локальное состояние для мгновенной обратной связи
    setActivePaymentMethods((prev) => ({
      ...prev,
      [cardId]: method,
    }));

    try {
      // Сохраняем выбор в базе данных
      await updatePaymentMethodMutation.mutateAsync({
        id: parseInt(cardId),
        paymentMethod: method,
      });
    } catch (error) {
      console.error("Ошибка при обновлении метода оплаты:", error);
    }
  };

  // Заполняем активные методы оплаты из полученных данных
  useEffect(() => {
    // При загрузке компонента загружаем активные методы оплаты для всех карт
    if (cards.length > 0) {
      const initialMethods: Record<string, "c2c" | "sbp"> = {};
      cards.forEach((card) => {
        initialMethods[card.id] =
          (card.activePaymentMethod as "c2c" | "sbp") || "c2c";
      });
      setActivePaymentMethods(initialMethods);
    }
  }, [cards]);

  // Добавляем функцию для открытия диалога истории всех изменений
  const openFullAuditLog = () => {
    setAuditLogDialogOpen(true);
    // Используем null для id, чтобы показать все изменения
    setSelectedCard(null);
  };

  const getSortIcon = (column: string) => {
    if (sortBy !== column) return <ArrowUpDown className="ml-2 h-4 w-4" />;

    return sortDirection === "asc" ? (
      <ArrowUpDown className="text-primary ml-2 h-4 w-4 rotate-180" />
    ) : (
      <ArrowUpDown className="text-primary ml-2 h-4 w-4" />
    );
  };

  const SortableHeader = ({
    column,
    label,
  }: {
    column: string;
    label: string;
  }) => (
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
      <div className="flex items-center justify-center py-8">
        <Loader2 className="text-muted-foreground h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (!cards.length) {
    return (
      <div className="flex flex-col items-center justify-center py-8 text-center">
        <p className="mb-2 text-lg font-medium">Нет данных для отображения</p>
        <p className="text-muted-foreground text-sm">
          Попробуйте изменить фильтры или создать новую карту
        </p>
      </div>
    );
  }

  useEffect(() => {
    console.log("filtredCards", filteredCards.length);
  }, filteredCards);

  return (
    <>
      {/* Фильтры по дате */}
      <div className="mb-4 flex flex-wrap items-center gap-4">
        <div className="flex items-center gap-2">
          <Button
            variant={noPeriod ? "default" : "outline"}
            size="sm"
            onClick={toggleNoPeriod}
            className="flex items-center gap-1"
          >
            {noPeriod ? "Вернуть период" : "Без периода"}
          </Button>

          {!noPeriod && (
            <>
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
            </>
          )}
        </div>
        <div className="text-muted-foreground ml-auto text-sm">
          <span className="font-semibold">Найдено карт:</span>{" "}
          {filteredCards.length} |
          <span className="ml-2 font-semibold">Общая стоимость:</span>{" "}
          {formatAmount(summaryStats.totalCardPrice)}
        </div>
      </div>

      {/* Информация по выбору типа оплаты */}
      <div className="mb-4 flex items-center space-x-2">
        <div className="text-muted-foreground flex items-center space-x-2 text-sm">
          <CreditCard className="mr-1 h-4 w-4 text-green-600" />
          <span>C2C - активно (зеленый)</span>
          <span className="mx-2">|</span>
          <Phone className="mr-1 h-4 w-4 text-red-600" />
          <span>СБП - неактивно (красный)</span>
          <span className="mx-2">|</span>
          <span>
            Нажмите на номер, чтобы сделать его активным методом оплаты
          </span>
        </div>
      </div>

      {/* Кнопка просмотра всей истории изменений */}
      <div className="mb-4 flex justify-end">
        <Button
          variant="outline"
          size="sm"
          className="flex items-center gap-1"
          onClick={openFullAuditLog}
        >
          <History className="h-4 w-4" />
          История всех изменений
        </Button>
      </div>

      {/* Таблица карт */}
      <div className="overflow-hidden rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[70px]">
                <SortableHeader column="externalId" label="ID" />
              </TableHead>
              <TableHead>
                <SortableHeader column="letterCode" label="Код-буква" />
              </TableHead>
              <TableHead>
                <SortableHeader column="bank" label="Банк" />
              </TableHead>
              <TableHead>
                <div className="flex items-center">
                  <CreditCard className="mr-1 h-4 w-4 text-green-600" />
                  <SortableHeader column="cardNumber" label="C2C" />
                </div>
              </TableHead>
              <TableHead>
                <div className="flex items-center">
                  <Phone className="mr-1 h-4 w-4 text-red-600" />
                  <SortableHeader column="phoneNumber" label="СБП" />
                </div>
              </TableHead>
              <TableHead>
                <SortableHeader column="inWork" label="В работе" />
              </TableHead>
              <TableHead className="text-right">
                <SortableHeader
                  column="initialBalance"
                  label="Баланс на начало"
                />
                {filteredCards.length > 0 && (
                  <div className="text-muted-foreground text-xs font-normal">
                    Всего: {formatAmount(summaryStats.totalInitialBalance)}
                  </div>
                )}
              </TableHead>
              <TableHead className="text-right">
                <SortableHeader column="lastBalance" label="Баланс на конец" />
                {filteredCards.length > 0 && (
                  <div className="text-muted-foreground text-xs font-normal">
                    Всего: {formatAmount(summaryStats.totalLastBalance)}
                  </div>
                )}
              </TableHead>
              <TableHead className="text-right">
                <SortableHeader column="totalPoured" label="Пролито" />
                {filteredCards.length > 0 && (
                  <div className="text-muted-foreground text-xs font-normal">
                    Всего: {formatAmount(summaryStats.totalPoured)}
                  </div>
                )}
              </TableHead>
              <TableHead className="text-right">
                <SortableHeader column="withdrawal" label="Сумма выплат" />
                {filteredCards.length > 0 && (
                  <div className="text-muted-foreground text-xs font-normal">
                    Всего: {formatAmount(summaryStats.totalWithdrawal)}
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
                <TableCell>{card.letterCode || "-"}</TableCell>
                <TableCell>{card.bank}</TableCell>
                <TableCell>
                  <button
                    className={`flex items-center ${activePaymentMethods[card.id] === "c2c" ? "text-green-600" : "text-red-600"} hover:underline`}
                    onClick={() => togglePaymentMethod(card.id, "c2c")}
                  >
                    {activePaymentMethods[card.id] === "c2c" && (
                      <Check className="mr-1 h-3 w-3" />
                    )}
                    {card.cardNumber}
                  </button>
                </TableCell>
                <TableCell>
                  <button
                    className={`flex items-center ${activePaymentMethods[card.id] === "sbp" ? "text-green-600" : "text-red-600"} hover:underline`}
                    onClick={() => togglePaymentMethod(card.id, "sbp")}
                  >
                    {activePaymentMethods[card.id] === "sbp" && (
                      <Check className="mr-1 h-3 w-3" />
                    )}
                    {card.phoneNumber}
                  </button>
                </TableCell>
                <TableCell>
                  {card.inWork ? (
                    <span className="font-medium text-green-600">Да</span>
                  ) : (
                    <span className="text-muted-foreground">Нет</span>
                  )}
                </TableCell>
                <TableCell className="text-right font-medium">
                  {formatAmount(card.initialBalance)}
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
                      <WalletCards className="mr-1 h-3 w-3" />
                      <span>История ({card._count.balances})</span>
                    </Button>
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
                      <DollarSign className="mr-1 h-3 w-3" />
                      <span>История ({card._count.cardPouring})</span>
                    </Button>
                  )}
                </TableCell>
                <TableCell className="text-right font-medium">
                  {formatAmount(card.withdrawal)}
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
                            onClick={() => setCardForDetails(card)}
                          >
                            <Info className="h-4 w-4" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>Подробности</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>

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
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent>
                        <DropdownMenuItem
                          onClick={() => setCardForPourings(card)}
                        >
                          <WalletCards className="mr-2 h-4 w-4" />
                          <span>История проливов</span>
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => setCardForBalances(card)}
                        >
                          <DollarSign className="mr-2 h-4 w-4" />
                          <span>Балансы карты</span>
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => {
                            setSelectedCard(card);
                            setAuditLogDialogOpen(true);
                          }}
                        >
                          <ClipboardList className="mr-2 h-4 w-4" />
                          <span>История изменений</span>
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          onClick={() => {
                            setSelectedCard(card);
                            setDeleteDialogOpen(true);
                          }}
                          className="text-destructive"
                        >
                          <Trash className="mr-2 h-4 w-4" />
                          <span className="text-destructive">Удалить</span>
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
      <div className="flex items-center justify-between py-4">
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
              <Button
                variant="ghost"
                size="sm"
                className="h-6 w-auto px-2 py-0 text-xs"
              >
                {pageSize}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuItem onClick={() => onPageSizeChange(10)}>
                10
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onPageSizeChange(20)}>
                20
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onPageSizeChange(50)}>
                50
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Диалог удаления карты */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Вы уверены?</AlertDialogTitle>
            <AlertDialogDescription>
              Это действие нельзя отменить. Карта будет удалена из базы данных.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Отмена</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (selectedCard) {
                  deleteCardMutation.mutate({ id: parseInt(selectedCard.id) });
                }
              }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteCardMutation.isLoading ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : null}
              Удалить
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Диалог истории изменений */}
      <AuditLogDialog
        entityId={selectedCard?.id || "all"}
        entityType="CARD"
        open={auditLogDialogOpen}
        onOpenChange={setAuditLogDialogOpen}
      />

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

      {/* Диалог подробной информации */}
      {cardForDetails && (
        <CardDetailsDialog
          card={cardForDetails}
          open={cardForDetails !== null}
          onOpenChange={(open) => !open && setCardForDetails(null)}
        />
      )}
    </>
  );
}
