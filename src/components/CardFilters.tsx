import { Filter } from "lucide-react";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "~/components/ui/dropdown-menu";
import { Label } from "~/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";

type FilterOptionsType = {
  providers?: string[];
  banks?: string[];
  collectorNames?: string[];
  picachus?: string[];
};

interface CardFiltersProps {
  filters: {
    provider: string;
    bank: string;
    status: string;
    collectorName: string;
    picachu: string;
  };
  onFilterChange: (filterName: keyof typeof filters, value: string) => void;
  onClearFilters: () => void;
  filterOptions?: FilterOptionsType;
}

export default function CardFilters({
  filters,
  onFilterChange,
  onClearFilters,
  filterOptions,
}: CardFiltersProps) {
  const activeFiltersCount = Object.values(filters).filter(Boolean).length;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" className="flex items-center gap-2">
          <Filter size={16} />
          Фильтры
          {activeFiltersCount > 0 && (
            <Badge variant="secondary" className="ml-1">
              {activeFiltersCount}
            </Badge>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-64 p-4 space-y-4" align="end">
        <DropdownMenuLabel>Фильтровать по:</DropdownMenuLabel>
        <DropdownMenuSeparator />
        
        <div>
          <Label htmlFor="filter-provider">Поставщик</Label>
          <Select
            value={filters.provider}
            onValueChange={(v) => onFilterChange("provider", v)}
          >
            <SelectTrigger id="filter-provider">
              <SelectValue placeholder="Все" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">Все</SelectItem>
              {filterOptions?.providers?.map((p) => (
                <SelectItem key={p} value={p}>
                  {p}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        
        <div>
          <Label htmlFor="filter-bank">Банк</Label>
          <Select
            value={filters.bank}
            onValueChange={(v) => onFilterChange("bank", v)}
          >
            <SelectTrigger id="filter-bank">
              <SelectValue placeholder="Все" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">Все</SelectItem>
              {filterOptions?.banks?.map((b) => (
                <SelectItem key={b} value={b}>
                  {b}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        
        <div>
          <Label htmlFor="filter-status">Статус</Label>
          <Select
            value={filters.status}
            onValueChange={(v) => onFilterChange("status", v)}
          >
            <SelectTrigger id="filter-status">
              <SelectValue placeholder="Все" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">Все</SelectItem>
              <SelectItem value="ACTIVE">Активна</SelectItem>
              <SelectItem value="WARNING">Внимание</SelectItem>
              <SelectItem value="BLOCKED">Заблокирована</SelectItem>
            </SelectContent>
          </Select>
        </div>
        
        <div>
          <Label htmlFor="filter-collector">Инкассатор</Label>
          <Select
            value={filters.collectorName}
            onValueChange={(v) => onFilterChange("collectorName", v)}
          >
            <SelectTrigger id="filter-collector">
              <SelectValue placeholder="Все" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">Все</SelectItem>
              {filterOptions?.collectorNames?.map((n) => (
                <SelectItem key={n} value={n}>
                  {n}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        
        <div>
          <Label htmlFor="filter-picachu">Пикачу</Label>
          <Select
            value={filters.picachu}
            onValueChange={(v) => onFilterChange("picachu", v)}
          >
            <SelectTrigger id="filter-picachu">
              <SelectValue placeholder="Все" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">Все</SelectItem>
              {filterOptions?.picachus?.map((p) => (
                <SelectItem key={p} value={p}>
                  {p}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        
        <DropdownMenuSeparator />
        <Button
          variant="ghost"
          className="w-full"
          onClick={onClearFilters}
          disabled={!activeFiltersCount}
        >
          Сбросить все фильтры
        </Button>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}