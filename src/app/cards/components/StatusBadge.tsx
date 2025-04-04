import { AlertCircle, CheckCircle, XCircle } from "lucide-react";
import { Badge } from "~/components/ui/badge";

type CardStatus = "ACTIVE" | "WARNING" | "BLOCKED";

interface StatusBadgeProps {
  status: CardStatus | string | undefined;
}

export default function StatusBadge({ status }: StatusBadgeProps) {
  switch (status) {
    case "ACTIVE":
      return (
        <Badge variant="success" className="flex items-center gap-1 whitespace-nowrap">
          <CheckCircle size={14} /> в офисе
        </Badge>
      );
    case "WARNING":
      return (
        <Badge variant="warning" className="flex items-center gap-1 whitespace-nowrap">
          <AlertCircle size={14} /> у пикачу
        </Badge>
      );
    case "BLOCKED":
      return (
        <Badge variant="destructive" className="flex items-center gap-1 whitespace-nowrap">
          <XCircle size={14} /> заблокирована
        </Badge>
      );
    default:
      return <Badge variant="secondary">Неизвестно</Badge>;
  }
}
