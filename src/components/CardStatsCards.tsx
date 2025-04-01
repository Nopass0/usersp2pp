import { DollarSign, CreditCard, Check, X } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";

interface CardStatsCardsProps {
  totalCardPrice?: number;
  paidCardsSum?: number;
  unpaidCardsSum?: number;
  totalCount?: number;
}

export default function CardStatsCards({
  totalCardPrice = 0,
  paidCardsSum = 0,
  unpaidCardsSum = 0,
  totalCount = 0,
}: CardStatsCardsProps) {
  const formatCurrency = (amount: number) => {
    return amount.toLocaleString("ru-RU", {
      style: "currency",
      currency: "RUB",
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Общая сумма</CardTitle>
          <DollarSign className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{formatCurrency(totalCardPrice)}</div>
          <p className="text-xs text-muted-foreground">
            Всего карт: {totalCount}
          </p>
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Оплаченные карты</CardTitle>
          <Check className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{formatCurrency(paidCardsSum)}</div>
          <p className="text-xs text-muted-foreground">
            {((paidCardsSum / totalCardPrice) * 100 || 0).toFixed(1)}% от общей суммы
          </p>
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Неоплаченные карты</CardTitle>
          <X className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{formatCurrency(unpaidCardsSum)}</div>
          <p className="text-xs text-muted-foreground">
            {((unpaidCardsSum / totalCardPrice) * 100 || 0).toFixed(1)}% от общей суммы
          </p>
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Всего карт</CardTitle>
          <CreditCard className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{totalCount}</div>
          <p className="text-xs text-muted-foreground">
            {formatCurrency(totalCardPrice / (totalCount || 1))} средняя стоимость
          </p>
        </CardContent>
      </Card>
    </div>
  );
}