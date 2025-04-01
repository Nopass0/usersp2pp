import { CreditCard, Wallet, WalletCards } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "~/components/ui/card";
import { Skeleton } from "~/components/ui/skeleton";
import { cn } from "~/lib/utils";

interface CardStatsCardsProps {
  totalCardPrice: number;
  totalPaidSum: number;
  totalUnpaidSum: number;
  totalCardCount: number;
  isLoading?: boolean;
}

export default function CardStatsCards({
  totalCardPrice,
  totalPaidSum,
  totalUnpaidSum,
  totalCardCount,
  isLoading = false,
}: CardStatsCardsProps) {
  const formatCurrency = (value: number | string | null | undefined) => {
    // Убедимся, что value - это число; при необходимости преобразуем или используем 0
    const numericValue = value !== undefined && value !== null
      ? typeof value === 'number' 
        ? value 
        : Number(value) || 0  // Преобразуем строки, и если NaN, то 0
      : 0;

    return new Intl.NumberFormat("ru-RU", {
      style: "currency",
      currency: "RUB",
    }).format(numericValue);
  };

  if (isLoading) {
    return (
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Card key={i} className={cn("overflow-hidden", i === 0 ? "col-span-2" : "")}>
            <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
              <CardTitle className="text-sm font-medium">
                <Skeleton className="h-4 w-20" />
              </CardTitle>
              <Skeleton className="h-5 w-5 rounded-full" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-6 w-24 mb-1" />
              <Skeleton className="h-4 w-16" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      <Card className="col-span-2 overflow-hidden">
        <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
          <CardTitle className="text-sm font-medium">Общая стоимость карт</CardTitle>
          <Wallet className="h-5 w-5 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{formatCurrency(totalCardPrice)}</div>
          <p className="text-xs text-muted-foreground">
            Сумма стоимости всех карт в системе
          </p>
        </CardContent>
      </Card>
      
      <Card className="overflow-hidden">
        <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
          <CardTitle className="text-sm font-medium">Оплаченная сумма</CardTitle>
          <CreditCard className="h-5 w-5 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{formatCurrency(totalPaidSum)}</div>
          <p className="text-xs text-muted-foreground">
            Сумма оплаченных карт
          </p>
        </CardContent>
      </Card>
      
      <Card className="overflow-hidden">
        <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
          <CardTitle className="text-sm font-medium">Неоплаченная сумма</CardTitle>
          <WalletCards className="h-5 w-5 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{formatCurrency(totalUnpaidSum)}</div>
          <p className="text-xs text-muted-foreground">
            Сумма неоплаченных карт <strong>({totalCardCount} шт.)</strong>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
