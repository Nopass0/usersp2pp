"use client";

import { useState } from "react";
import { format } from "date-fns";
import { ru } from "date-fns/locale";
import { Calendar as CalendarIcon } from "lucide-react";
import type { DateRange } from "react-day-picker";

import { Button } from "~/components/ui/button";
import { Calendar } from "~/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "~/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import { cn } from "~/lib/utils";

interface TransactionFilterProps {
  onFilterChange: (dateRange: DateRange | undefined, transactionType: string) => void;
}

export function TransactionFilter({ onFilterChange }: TransactionFilterProps) {
  const [date, setDate] = useState<DateRange | undefined>({
    from: new Date(new Date().setDate(new Date().getDate() - 30)),
    to: new Date(),
  });
  const [transactionType, setTransactionType] = useState<string>("all");

  const handleDateChange = (range: DateRange | undefined) => {
    setDate(range);
    onFilterChange(range, transactionType);
  };

  const handleTypeChange = (value: string) => {
    setTransactionType(value);
    onFilterChange(date, value);
  };

  return (
    <div className="flex flex-col space-y-4 md:flex-row md:items-center md:space-x-4 md:space-y-0">
      <div className="flex-1 space-y-2">
        <p className="text-sm font-medium">Период</p>
        <div className="grid gap-2">
          <Popover>
            <PopoverTrigger asChild>
              <Button
                id="date"
                variant={"outline"}
                className={cn(
                  "w-full justify-start text-left font-normal",
                  !date && "text-muted-foreground"
                )}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {date?.from ? (
                  date.to ? (
                    <>
                      {format(date.from, "dd.MM.yyyy", { locale: ru })} -{" "}
                      {format(date.to, "dd.MM.yyyy", { locale: ru })}
                    </>
                  ) : (
                    format(date.from, "dd.MM.yyyy", { locale: ru })
                  )
                ) : (
                  <span>Выберите период</span>
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                initialFocus
                mode="range"
                defaultMonth={date?.from}
                selected={date}
                onSelect={handleDateChange}
                numberOfMonths={2}
                locale={ru}
              />
            </PopoverContent>
          </Popover>
        </div>
      </div>

      <div className="w-full space-y-2 md:w-[180px]">
        <p className="text-sm font-medium">Тип транзакции</p>
        <Select defaultValue="all" onValueChange={handleTypeChange}>
          <SelectTrigger>
            <SelectValue placeholder="Тип транзакции" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Все</SelectItem>
            <SelectItem value="buy">Покупка</SelectItem>
            <SelectItem value="sell">Продажа</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}