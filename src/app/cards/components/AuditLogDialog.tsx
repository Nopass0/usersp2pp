import { useState } from "react";
import { Loader2, ChevronLeft, ChevronRight } from "lucide-react";
import { api } from "~/trpc/react";
import { formatDistanceToNow } from "date-fns";
import { ru } from "date-fns/locale";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "~/components/ui/dialog";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "~/components/ui/table";
import { Badge } from "~/components/ui/badge";

type EntityType = "CARD" | "BALANCE" | "POURING";

interface AuditLogEntry {
  id: string;
  entityId: string;
  entityType: EntityType;
  action: string;
  oldValue: string | null;
  newValue: string | null;
  userId: string;
  username: string;
  createdAt: Date;
}

interface AuditLogDialogProps {
  entityId: string | "all";  // "all" для просмотра всех записей
  entityType: EntityType;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function AuditLogDialog({
  entityId,
  entityType,
  open,
  onOpenChange,
}: AuditLogDialogProps) {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  
  // Выбор подходящего API метода в зависимости от entityId
  const { data, isLoading } = 
    entityId === "all" 
      ? api.auditLog.getAll.useQuery(
          { entityType, page, pageSize },
          { enabled: open }
        )
      : api.auditLog.getByEntity.useQuery(
          { entityId, entityType, page, pageSize },
          { enabled: open }
        );
        
  const auditLogs = data?.logs || [];
  const totalCount = data?.totalCount || 0;
  const totalPages = data?.totalPages || 1;

  const formatTimeAgo = (date: Date) => {
    return formatDistanceToNow(new Date(date), {
      addSuffix: true,
      locale: ru,
    });
  };

  const getActionBadge = (action: string) => {
    switch (action) {
      case "CREATE":
        return <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">Создание</Badge>;
      case "UPDATE":
        return <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">Обновление</Badge>;
      case "DELETE":
        return <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">Удаление</Badge>;
      default:
        return <Badge variant="outline">{action}</Badge>;
    }
  };

  const formatValue = (value: string | null) => {
    if (!value) return "—";
    
    try {
      // Попытаться разобрать JSON, если это объект
      const parsedValue = JSON.parse(value);
      if (typeof parsedValue === "object" && parsedValue !== null) {
        return (
          <pre className="max-h-20 overflow-y-auto text-xs whitespace-pre-wrap bg-muted p-2 rounded-md">
            {JSON.stringify(parsedValue, null, 2)}
          </pre>
        );
      }
      // Если это простое значение, просто вернуть его
      return String(parsedValue);
    } catch (e) {
      // Если не удалось разобрать как JSON, вернуть исходную строку
      return value;
    }
  };

  const renderFieldChanges = (oldValue: string | null, newValue: string | null) => {
    if (!oldValue && !newValue) return "Нет данных";
    
    try {
      const oldObj = oldValue ? JSON.parse(oldValue) : {};
      const newObj = newValue ? JSON.parse(newValue) : {};
      
      // Объединяем все ключи из обоих объектов
      const allKeys = new Set([...Object.keys(oldObj), ...Object.keys(newObj)]);
      
      // Если нет изменений или объекты пустые, показываем сообщение
      if (allKeys.size === 0) return "Нет изменений";
      
      return (
        <div className="space-y-2">
          {Array.from(allKeys).map((key) => {
            const oldVal = oldObj[key];
            const newVal = newObj[key];
            
            // Пропускаем, если значения идентичны
            if (JSON.stringify(oldVal) === JSON.stringify(newVal)) return null;
            
            return (
              <div key={key} className="text-xs">
                <div className="font-medium">{key}:</div>
                <div className="grid grid-cols-2 gap-2">
                  <div className="bg-red-50 p-1 rounded">
                    {oldVal !== undefined ? String(oldVal) : "—"}
                  </div>
                  <div className="bg-green-50 p-1 rounded">
                    {newVal !== undefined ? String(newVal) : "—"}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      );
    } catch (e) {
      // Если не удалось разобрать JSON, показываем старые и новые значения как есть
      return (
        <div className="grid grid-cols-2 gap-2 text-xs">
          <div className="bg-red-50 p-1 rounded">{oldValue || "—"}</div>
          <div className="bg-green-50 p-1 rounded">{newValue || "—"}</div>
        </div>
      );
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[800px]">
        <DialogHeader>
          <DialogTitle>История изменений</DialogTitle>
          <DialogDescription>
            {entityId === "all" 
              ? "Просмотр всех операций в системе" 
              : "Просмотр всех операций, выполненных с этой записью"}
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="flex justify-center items-center h-40">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : !auditLogs || auditLogs.length === 0 ? (
          <div className="py-8 text-center">
            <p className="text-muted-foreground">Нет записей в истории изменений</p>
          </div>
        ) : (
          <div className="max-h-[500px] overflow-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Действие</TableHead>
                  <TableHead>Тип</TableHead>
                  <TableHead>Изменения</TableHead>
                  <TableHead>Пользователь</TableHead>
                  <TableHead>Время</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {auditLogs.map((log) => (
                  <TableRow key={log.id}>
                    <TableCell>{getActionBadge(log.action)}</TableCell>
                    <TableCell>
                      {log.entityType === "CARD" && (
                        <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">Карта</Badge>
                      )}
                      {log.entityType === "BALANCE" && (
                        <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">Баланс</Badge>
                      )}
                      {log.entityType === "POURING" && (
                        <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200">Пролив</Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      {log.action === "CREATE" ? (
                        formatValue(log.newValue)
                      ) : log.action === "DELETE" ? (
                        formatValue(log.oldValue)
                      ) : (
                        renderFieldChanges(log.oldValue, log.newValue)
                      )}
                    </TableCell>
                    <TableCell>{log.username}</TableCell>
                    <TableCell>
                      <div className="text-sm">{formatTimeAgo(log.createdAt)}</div>
                      <div className="text-xs text-muted-foreground">
                        {new Date(log.createdAt).toLocaleString("ru-RU")}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            
            {/* Пагинация */}
            <div className="flex items-center justify-between mt-4">
              <div className="flex-1 text-sm text-muted-foreground">
                Показано {auditLogs.length} из {totalCount} записей
              </div>
              <div className="flex items-center space-x-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage(page - 1)}
                  disabled={page <= 1}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <div className="text-sm font-medium">
                  Страница {page} из {totalPages || 1}
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage(page + 1)}
                  disabled={page >= totalPages}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
                <select 
                  className="h-8 rounded-md border border-input px-3 py-1 text-sm"
                  value={pageSize}
                  onChange={(e) => {
                    setPageSize(Number(e.target.value));
                    setPage(1);
                  }}
                >
                  <option value="10">10</option>
                  <option value="20">20</option>
                  <option value="50">50</option>
                </select>
              </div>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
