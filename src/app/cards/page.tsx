"use client";

import { useState } from "react";
import { useDebounceValue } from "usehooks-ts"; 
import { PlusIcon, CreditCard } from "lucide-react";

import { api } from "~/trpc/react";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Separator } from "~/components/ui/separator";
import { Skeleton } from "~/components/ui/skeleton";
import { TooltipProvider } from "~/components/ui/tooltip";

// Импортируем компоненты из корректной директории
import CardFilters from "~/app/cards/components/CardFilters";
import CardStatsCards from "~/app/cards/components/CardStatsCards";
import CardTable from "~/app/cards/components/CardTable";
import CardCreateDialog from "~/app/cards/components/CardCreateDialog";

export default function CardsPage() {
  // Pagination state
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  
  // Sorting state
  const [sortBy, setSortBy] = useState<string>("createdAt");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc");
  
  // Search and filter state
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearchQuery] = useDebounceValue(searchQuery, 300); // Исправлено на useDebounceValue
  
  const [filters, setFilters] = useState({
    provider: "all",
    bank: "all",
    status: "all",
    collectorName: "all",
    picachu: "all",
  });

  // Dialog state
  const [createDialogOpen, setCreateDialogOpen] = useState(false);

  // Запрос для получения статистики карт
  const statsQuery = api.cards.getStats.useQuery(undefined, {
    staleTime: 1000 * 60 * 1, // Кешируем результат на 1 минуту
  });

  // Filter options query
  const filterOptionsQuery = api.cards.getFilterOptions.useQuery(undefined, {
    staleTime: 1000 * 60 * 5, // Cache for 5 minutes
  });

  // Cards query
  const cardsQuery = api.cards.getAll.useQuery(
    {
      page,
      pageSize,
      searchQuery: debouncedSearchQuery || undefined,
      sortBy,
      sortDirection,
      provider: filters.provider !== "all" ? filters.provider : undefined,
      bank: filters.bank !== "all" ? filters.bank : undefined, 
      status: filters.status !== "all" ? filters.status : undefined,
      collectorName: filters.collectorName !== "all" ? filters.collectorName : undefined,
      picachu: filters.picachu !== "all" ? filters.picachu : undefined,
    },
    {
      keepPreviousData: true,
    }
  );

  // Handle sort change
  const handleSort = (column: string) => {
    setSortBy(column);
    setSortDirection((prev) => (prev === "asc" ? "desc" : "asc"));
    setPage(1);
  };

  // Handle filter change
  const handleFilterChange = (filterName: keyof typeof filters, value: string) => {
    setFilters((prev) => ({ ...prev, [filterName]: value }));
    setPage(1);
  };

  // Clear all filters
  const clearFilters = () => {
    setFilters({
      provider: "all",
      bank: "all",
      status: "all",
      collectorName: "all",
      picachu: "all",
    });
    setSearchQuery("");
    setPage(1);
  };

  // Общее состояние загрузки для страницы
  const isLoading = cardsQuery.isLoading && !cardsQuery.isFetchingPreviousData;

  // Loading state
  if (isLoading) {
    return (
      <div className="w-full mx-auto px-4 py-8 space-y-6">
        <div className="flex justify-between items-center">
          <Skeleton className="h-10 w-48" />
          <div className="flex gap-2">
            <Skeleton className="h-10 w-32" />
            <Skeleton className="h-10 w-32" />
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Skeleton className="h-32" />
          <Skeleton className="h-32" />
          <Skeleton className="h-32" />
        </div>
        <Skeleton className="h-96" />
      </div>
    );
  }

  // Error state
  if (cardsQuery.isError) {
    return (
      <div className="w-full mx-auto px-4 py-8">
        <div className="bg-destructive/20 text-destructive p-4 rounded-md">
          <h2 className="font-bold text-lg">Ошибка загрузки данных</h2>
          <p>{cardsQuery.error.message}</p>
        </div>
      </div>
    );
  }

  return (
    <TooltipProvider>
      <div className="w-full mx-auto px-4 py-8 space-y-6">
        {/* Заголовок и основные действия */}
        <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <CreditCard className="h-7 w-7" />
            Карты
          </h1>
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative flex items-center">
              <Input
                className="pl-9 w-full sm:w-64"
                placeholder="Поиск..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="absolute left-3 h-4 w-4 text-muted-foreground"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                />
              </svg>
            </div>

            {/* Фильтры */}
            <CardFilters
              filters={filters}
              onFilterChange={handleFilterChange}
              onClearFilters={clearFilters}
              filterOptions={filterOptionsQuery.data}
            />

            {/* Кнопка добавления карты */}
            <Button onClick={() => setCreateDialogOpen(true)}>
              <PlusIcon size={18} className="mr-2" />
              Добавить карту
            </Button>
          </div>
        </div>

        <Separator />

        {/* Карточки статистики */}
        <CardStatsCards
          totalCardPrice={statsQuery.data?.totalCardPrice ?? 0}
          totalPaidSum={statsQuery.data?.totalPaidSum ?? 0}
          totalUnpaidSum={statsQuery.data?.totalUnpaidSum ?? 0}
          totalCardCount={statsQuery.data?.totalCardCount ?? 0}
          isLoading={statsQuery.isLoading}
        />

        {/* Таблица карт */}
        <div className="mt-6">
          <CardTable
            cards={cardsQuery.data?.cards || []}
            isLoading={cardsQuery.isLoading && !cardsQuery.isFetchingPreviousData}
            sortBy={sortBy}
            sortDirection={sortDirection}
            onSort={handleSort}
            onCardDeleted={cardsQuery.refetch}
            onCardUpdated={() => {
              // При обновлении карты обновляем и статистику тоже
              void cardsQuery.refetch();
              void statsQuery.refetch();
            }}
            page={page}
            pageSize={pageSize}
            totalItems={cardsQuery.data?.metadata?.totalCount || 0}
            onPageChange={setPage}
            onPageSizeChange={(newPageSize) => {
              setPageSize(newPageSize);
              setPage(1); // Сбрасываем на первую страницу при изменении размера
            }}
          />
        </div>

        {/* Диалог создания карты */}
        <CardCreateDialog 
          open={createDialogOpen} 
          onOpenChange={setCreateDialogOpen} 
        />
      </div>
    </TooltipProvider>
  );
}