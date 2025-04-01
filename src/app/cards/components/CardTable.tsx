import { useState } from "react";
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
  ChevronRight
} from "lucide-react";
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
    
    return new Intl.NumberFormat("ru-RU", {
      style: "currency",
      currency: "RUB",
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value);
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
      <div className="rounded-md border overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[60px]">
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
              <TableHead>
                <SortableHeader column="appPin" label="PIN прил." />
              </TableHead>
              <TableHead>
                <SortableHeader column="terminalPin" label="PIN терм." />
              </TableHead>
              <TableHead>
                <SortableHeader column="status" label="Статус" />
              </TableHead>
              <TableHead>
                <SortableHeader column="collectorName" label="Инкассатор" />
              </TableHead>
              <TableHead>
                <SortableHeader column="picachu" label="Пикачу" />
              </TableHead>
              <TableHead className="text-right">
                <SortableHeader column="initialBalance" label="Нач. баланс" />
              </TableHead>
              <TableHead className="text-right">
                <SortableHeader column="totalPoured" label="Пролито" />
              </TableHead>
              <TableHead className="text-right">
                <SortableHeader column="lastBalance" label="Кон. баланс" />
              </TableHead>
              <TableHead className="text-right">
                <SortableHeader column="withdrawal" label="Снято" />
              </TableHead>
              <TableHead className="text-right">
                <SortableHeader column="cardPrice" label="Стоимость" />
              </TableHead>
              <TableHead>
                <SortableHeader column="isPaid" label="Оплачена" />
              </TableHead>
              <TableHead>
                <SortableHeader column="createdAt" label="Создана" />
              </TableHead>
              <TableHead className="w-[100px]">
                <span className="sr-only">Действия</span>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {cards.map((card) => (
              <TableRow key={card.id}>
                <TableCell>{card.externalId}</TableCell>
                <TableCell>{card.provider}</TableCell>
                <TableCell>{card.bank}</TableCell>
                <TableCell>{card.cardNumber}</TableCell>
                <TableCell>{card.phoneNumber}</TableCell>
                <TableCell>{card.appPin}</TableCell>
                <TableCell>{card.terminalPin}</TableCell>
                <TableCell>
                  <StatusBadge status={card.status} />
                </TableCell>
                <TableCell>{card.collectorName || "-"}</TableCell>
                <TableCell>{card.picachu || "-"}</TableCell>
                <TableCell className="text-right font-medium">
                  {formatAmount(card.initialBalance)}
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
                <TableCell className="text-right font-medium">
                  {formatAmount(card.withdrawal)}
                </TableCell>
                <TableCell className="text-right font-medium">
                  {formatAmount(card.cardPrice)}
                </TableCell>
                <TableCell>
                  {card.isPaid ? (
                    <span className="text-green-600 font-medium">Да</span>
                  ) : (
                    <span className="text-red-600 font-medium">Нет</span>
                  )}
                </TableCell>
                <TableCell>{formatDate(card.createdAt)}</TableCell>
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

                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => setCardForPourings(card)}
                          >
                            <DollarSign className="h-4 w-4" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>История проливов</p>
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
                            onClick={() => setCardForBalances(card)}
                          >
                            <WalletCards className="h-4 w-4" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>История балансов</p>
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
                            onClick={() => setCardForAuditLog(card.id)}
                          >
                            <History className="h-4 w-4" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>История изменений</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>

                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-red-500"
                            onClick={() => setCardToDelete(card.id)}
                          >
                            <Trash className="h-4 w-4" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>Удалить карту</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
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
