import { useState } from "react";
import { format } from "date-fns";
import { ru } from "date-fns/locale";
import {
  ArrowUpDown,
  MoreHorizontal,
  History,
  Edit,
  Trash2,
} from "lucide-react";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "~/components/ui/table";
import { Button } from "~/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "~/components/ui/dropdown-menu";

import StatusBadge from "./StatusBadge";
import CardEditDialog from "./CardEditDialog";
import AuditLogDialog from "./AuditLogDialog";

// Типы определяем на основе данных API
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
  createdAt: string;
  updatedAt: string;
  balances: BalanceType[];
  pourings: PouringType[];
}

interface BalanceType {
  id: number;
  cardId: number;
  date: string;
  startBalance: number;
  endBalance: number;
}

interface PouringType {
  id: number;
  cardId: number;
  pouringDate: string;
  initialAmount: number;
  initialDate: string;
  pouringAmount: number;
  collectorName?: string | null;
  status: "ACTIVE" | "WARNING" | "BLOCKED";
}

interface CardTableProps {
  cards: CardType[];
  sortBy: string;
  sortDirection: "asc" | "desc";
  onSort: (column: string) => void;
  page: number;
  pageSize: number;
  totalPages: number;
  setPage: (page: number) => void;
  isLoading: boolean;
}

export default function CardTable({
  cards,
  sortBy,
  sortDirection,
  onSort,
  page,
  pageSize,
  totalPages,
  setPage,
  isLoading,
}: CardTableProps) {
  // Состояние для диалоговых окон
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [auditLogDialogOpen, setAuditLogDialogOpen] = useState(false);
  const [selectedCard, setSelectedCard] = useState<CardType | null>(null);

  // Форматирование данных
  const formatDate = (dateString: string | null | undefined) => {
    if (!dateString) return "—";
    return format(new Date(dateString), "dd.MM.yyyy", { locale: ru });
  };

  const formatCurrency = (amount: number | null | undefined) => {
    if (amount === null || amount === undefined) return "—";
    return amount.toLocaleString("ru-RU", {
      style: "currency",
      currency: "RUB",
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  };

  // Обработчики действий
  const handleEditCard = (card: CardType) => {
    setSelectedCard(card);
    setEditDialogOpen(true);
  };

  const handleViewAuditLog = (card: CardType) => {
    setSelectedCard(card);
    setAuditLogDialogOpen(true);
  };

  const handleDeleteCard = (card: CardType) => {
    // Тут будет вызов мутации для удаления карты
    if (window.confirm(`Вы уверены, что хотите удалить карту ${card.cardNumber}?`)) {
      console.log("Удаление карты", card.id);
      // deleteCardMutation.mutate({ id: card.id });
    }
  };

  // Функция сортировки колонок
  const SortableHeader = ({ column, label }: { column: string; label: string }) => (
    <div
      className="flex items-center cursor-pointer"
      onClick={() => onSort(column)}
    >
      {label}
      <ArrowUpDown
        size={14}
        className={`ml-2 ${
          sortBy === column
            ? "text-foreground"
            : "text-muted-foreground"
        }`}
      />
    </div>
  );

  return (
    <div className="rounded-md border">
      <div className="relative overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>
                <SortableHeader column="externalId" label="ID" />
              </TableHead>
              <TableHead>
                <SortableHeader column="provider" label="Поставщик" />
              </TableHead>
              <TableHead>
                <SortableHeader column="cardNumber" label="Номер карты" />
              </TableHead>
              <TableHead>
                <SortableHeader column="bank" label="Банк" />
              </TableHead>
              <TableHead>
                <SortableHeader column="status" label="Статус" />
              </TableHead>
              <TableHead>
                <SortableHeader column="cardPrice" label="Цена" />
              </TableHead>
              <TableHead>
                <SortableHeader column="isPaid" label="Оплачена" />
              </TableHead>
              <TableHead className="text-right">Действия</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading && cards.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-4">
                  Загрузка данных...
                </TableCell>
              </TableRow>
            ) : cards.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-4">
                  Нет данных для отображения
                </TableCell>
              </TableRow>
            ) : (
              cards.map((card) => (
                <TableRow key={card.id}>
                  <TableCell>{card.externalId}</TableCell>
                  <TableCell>{card.provider}</TableCell>
                  <TableCell>{card.cardNumber}</TableCell>
                  <TableCell>{card.bank}</TableCell>
                  <TableCell>
                    <StatusBadge status={card.status} />
                  </TableCell>
                  <TableCell>{formatCurrency(card.cardPrice)}</TableCell>
                  <TableCell>
                    {card.isPaid ? (
                      <span className="text-green-500">Да</span>
                    ) : (
                      <span className="text-red-500">Нет</span>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuLabel>Действия</DropdownMenuLabel>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={() => handleEditCard(card)}>
                          <Edit className="mr-2 h-4 w-4" />
                          Редактировать
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleDeleteCard(card)}>
                          <Trash2 className="mr-2 h-4 w-4" />
                          Удалить
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={() => handleViewAuditLog(card)}>
                          <History className="mr-2 h-4 w-4" />
                          История изменений
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
      
      {/* Пагинация */}
      <div className="flex items-center justify-between p-4 border-t">
        <div className="text-sm text-muted-foreground">
          Страница {page} из {totalPages}
        </div>
        <div className="flex items-center space-x-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage(page - 1)}
            disabled={page === 1 || isLoading}
          >
            Назад
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage(page + 1)}
            disabled={page >= totalPages || isLoading}
          >
            Вперед
          </Button>
        </div>
      </div>
      
      {/* Диалоговые окна */}
      {selectedCard && (
        <>
          <CardEditDialog
            open={editDialogOpen}
            onOpenChange={setEditDialogOpen}
            card={selectedCard}
          />
          <AuditLogDialog
            open={auditLogDialogOpen}
            onOpenChange={setAuditLogDialogOpen}
            entityType="Card"
            entityId={selectedCard.id}
          />
        </>
      )}
    </div>
  );
}