import { useState } from "react";
import { format } from "date-fns";
import { ru } from "date-fns/locale";
import { History, ChevronLeft, ChevronRight, Loader2 } from "lucide-react";
import { api } from "~/trpc/react";
import { Button } from "~/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "~/components/ui/dialog";
import { ScrollArea } from "~/components/ui/scroll-area";
import { Skeleton } from "~/components/ui/skeleton";
import { Badge } from "~/components/ui/badge";
import { Card, CardContent, CardHeader } from "~/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import { Label } from "~/components/ui/label";

interface AuditLogDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  entityType: "CARD" | "CARD_BALANCE" | "CARD_POURING";
  entityId: string;
}

type AuditAction = "CREATE" | "UPDATE" | "DELETE";

// Перевод названий полей для отображения
const fieldTranslations: Record<string, string> = {
  // Карты
  provider: "Поставщик",
  bank: "Банк",
  cardNumber: "Номер карты",
  phoneNumber: "Номер телефона",
  appPin: "PIN приложения",
  terminalPin: "PIN терминала",
  status: "Статус",
  collectorName: "Инкассатор",
  picachu: "Пикачу",
  cardPrice: "Цена карты",
  isPaid: "Оплачено",
  comment: "Комментарий",
  // Проливы
  pouringAmount: "Сумма пролива",
  pouringDate: "Дата пролива",
  initialAmount: "Начальная сумма",
  initialDate: "Начальная дата", 
  finalAmount: "Конечная сумма",
  finalDate: "Конечная дата",
  withdrawalAmount: "Сумма снятия",
  withdrawalDate: "Дата снятия",
  // Балансы
  startBalance: "Начальный баланс",
  endBalance: "Конечный баланс",
  date: "Дата",
  cardId: "ID карты",
};

// Перевод значений для отображения
const translateValue = (field: string, value: any): string => {
  if (field === "status") {
    const statusTranslations: Record<string, string> = {
      "ACTIVE": "Активна",
      "WARNING": "Предупреждение",
      "BLOCKED": "Заблокирована"
    };
    return typeof value === "string" ? statusTranslations[value] || value : String(value);
  }
  
  if (field === "isPaid") {
    return value === true ? "Да" : "Нет";
  }

  if (value instanceof Date || (typeof value === 'string' && !isNaN(Date.parse(value)))) {
    try {
      return format(new Date(value), "dd.MM.yyyy HH:mm", { locale: ru });
    } catch {
      return String(value);
    }
  }
  
  return String(value ?? "—");
};

export default function AuditLogDialog({
  open,
  onOpenChange,
  entityType,
  entityId,
}: AuditLogDialogProps) {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  
  // Запрос на получение журнала изменений
  const auditLogsQuery = api.auditLog.getEntityLogs.useQuery(
    {
      entityType,
      entityId,
      page,
      pageSize,
    },
    {
      enabled: open,
    }
  );

  // Переход на следующую страницу
  const handleNextPage = () => {
    if (auditLogsQuery.data && page < auditLogsQuery.data.totalPages) {
      setPage(page + 1);
    }
  };

  // Переход на предыдущую страницу
  const handlePrevPage = () => {
    if (page > 1) {
      setPage(page - 1);
    }
  };

  // Форматирование для отображения различий между старым и новым значением
  const formatDiff = (oldValue: any, newValue: any) => {
    if (!oldValue && !newValue) {
      return <div>Данные не доступны для сравнения</div>;
    }

    // Если есть только одно значение (создание или удаление)
    const valueToDisplay = oldValue || newValue;
    
    // Если это массив изменений с полями from/to
    if (newValue && Array.isArray(newValue) && newValue[0]?.field) {
      return (
        <div className="space-y-1">
          {newValue.map((change, index) => (
            <div key={index} className="grid grid-cols-3 gap-2">
              <span className="text-sm font-medium">
                {change.field}:
              </span>
              <span className="text-sm line-through text-red-500">
                {translateValue(change.field, change.from)}
              </span>
              <span className="text-sm text-green-500">
                {translateValue(change.field, change.to)}
              </span>
            </div>
          ))}
        </div>
      );
    }
    
    // Собираем все ключи из обоих объектов
    const allKeys = [...new Set([
      ...(oldValue ? Object.keys(oldValue) : []), 
      ...(newValue ? Object.keys(newValue) : [])
    ])];
    
    return (
      <div className="space-y-1">
        {allKeys.map((key) => {
          // Пропускаем служебные поля
          if (["id", "createdAt", "updatedAt"].includes(key)) return null;
          
          const oldVal = oldValue?.[key];
          const newVal = newValue?.[key];
          const displayKey = fieldTranslations[key] || key;
          
          // Если значения одинаковые или это просто отображение данных без сравнения
          if (!oldValue || !newValue || JSON.stringify(oldVal) === JSON.stringify(newVal)) {
            return (
              <div key={key} className="grid grid-cols-1 gap-2">
                <div className="flex justify-between">
                  <span className="text-sm font-medium">{displayKey}:</span>
                  <span className="text-sm">
                    {translateValue(key, newVal ?? oldVal)}
                  </span>
                </div>
              </div>
            );
          }
          
          // Если значения разные, показываем изменение
          return (
            <div key={key} className="grid grid-cols-1 gap-1">
              <span className="text-sm font-medium">{displayKey}:</span>
              <div className="grid grid-cols-2 gap-2">
                <div className="flex flex-col">
                  <span className="text-xs text-muted-foreground">Было:</span>
                  <span className="text-sm line-through text-red-500">
                    {translateValue(key, oldVal)}
                  </span>
                </div>
                <div className="flex flex-col">
                  <span className="text-xs text-muted-foreground">Стало:</span>
                  <span className="text-sm text-green-500">
                    {translateValue(key, newVal)}
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  // Статус для отображения лейбла действия
  const getActionLabel = (action: AuditAction) => {
    switch (action) {
      case "CREATE":
        return { label: "Создание", variant: "success" };
      case "UPDATE":
        return { label: "Изменение", variant: "warning" };
      case "DELETE":
        return { label: "Удаление", variant: "destructive" };
      default:
        return { label: "Неизвестно", variant: "secondary" };
    }
  };

  const getEntityTypeLabel = (type: string) => {
    switch (type) {
      case "CARD":
        return "Карта";
      case "CARD_BALANCE":
        return "Баланс карты";
      case "CARD_POURING":
        return "Пролив карты";
      default:
        return type;
    }
  };

  // Определяем текущую страницу и общее количество страниц
  const totalPages = auditLogsQuery.data?.totalPages || 1;
  const currentPage = page;

  // Формируем строку с информацией о пагинации
  const paginationInfo = auditLogsQuery.data
    ? `Страница ${currentPage} из ${totalPages} (всего ${auditLogsQuery.data.totalCount} записей)`
    : "Загрузка...";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>История изменений</DialogTitle>
          <DialogDescription>
            Просмотр истории действий с "{getEntityTypeLabel(entityType)}" (ID: {entityId})
          </DialogDescription>
        </DialogHeader>
        
        {/* Фильтры и пагинация */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Select
              value={pageSize.toString()}
              onValueChange={(value) => {
                setPageSize(Number(value));
                setPage(1);
              }}
            >
              <SelectTrigger className="w-[100px]">
                <SelectValue placeholder="10 записей" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="5">5 записей</SelectItem>
                <SelectItem value="10">10 записей</SelectItem>
                <SelectItem value="20">20 записей</SelectItem>
                <SelectItem value="50">50 записей</SelectItem>
              </SelectContent>
            </Select>
            <Label>записей на странице</Label>
          </div>
          
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">
              {paginationInfo}
            </span>
            <div className="flex gap-1">
              <Button
                variant="outline"
                size="icon"
                onClick={handlePrevPage}
                disabled={page <= 1 || auditLogsQuery.isLoading}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="icon"
                onClick={handleNextPage}
                disabled={
                  !auditLogsQuery.data ||
                  page >= auditLogsQuery.data.totalPages ||
                  auditLogsQuery.isLoading
                }
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
        
        {/* Контент журнала изменений */}
        <ScrollArea className="flex-grow">
          {auditLogsQuery.isLoading ? (
            <div className="space-y-4">
              {Array.from({ length: 3 }).map((_, i) => (
                <Card key={i}>
                  <CardHeader>
                    <Skeleton className="h-5 w-32" />
                  </CardHeader>
                  <CardContent>
                    <Skeleton className="h-20 w-full" />
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : !auditLogsQuery.data || auditLogsQuery.data.logs.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <History className="h-12 w-12 mx-auto mb-2 opacity-20" />
              <p>История изменений отсутствует</p>
            </div>
          ) : (
            <div className="space-y-4">
              {auditLogsQuery.data.logs.map((log) => {
                const actionInfo = getActionLabel(log.action as AuditAction);
                return (
                  <Card key={log.id} className="border">
                    <CardHeader className="p-4 pb-2">
                      <div className="flex justify-between items-center">
                        <div className="flex items-center gap-2">
                          <Badge variant={actionInfo.variant as any}>
                            {actionInfo.label}
                          </Badge>
                          <span className="text-sm text-muted-foreground">
                            {format(new Date(log.timestamp), "dd.MM.yyyy HH:mm:ss", { locale: ru })}
                          </span>
                        </div>
                        <span className="text-sm">
                          Пользователь: {log.user?.name || "Система"}
                        </span>
                      </div>
                    </CardHeader>
                    <CardContent className="p-4 pt-0">
                      {log.action === "CREATE" && (
                        <div>
                          <h4 className="text-sm font-medium mb-2">Созданы следующие данные:</h4>
                          {formatDiff(null, log.newValue)}
                        </div>
                      )}
                      {log.action === "UPDATE" && (
                        <div>
                          <h4 className="text-sm font-medium mb-2">Внесены следующие изменения:</h4>
                          {formatDiff(log.oldValue, log.newValue)}
                        </div>
                      )}
                      {log.action === "DELETE" && (
                        <div>
                          <h4 className="text-sm font-medium mb-2">Удалены следующие данные:</h4>
                          {formatDiff(log.oldValue, null)}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </ScrollArea>

        <DialogFooter className="mt-4">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Закрыть
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}