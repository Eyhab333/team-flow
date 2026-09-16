"use client";

import { CalendarDays, ChevronLeft, ChevronRight, RotateCcw } from "lucide-react";

import { Button } from "@/components/ui/button";

interface DailyDateNavigationProps {
  date: string;
  isToday: boolean;
  onPreviousDay: () => void;
  onNextDay: () => void;
  onToday: () => void;
}

function formatArabicDate(dateValue: string): string {
  const [year, month, day] = dateValue.split("-").map(Number);

  return new Intl.DateTimeFormat("ar-EG-u-ca-gregory", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(new Date(year, month - 1, day));
}

export function DailyDateNavigation({
  date,
  isToday,
  onPreviousDay,
  onNextDay,
  onToday,
}: DailyDateNavigationProps) {
  return (
    <div className="flex flex-wrap items-center gap-1 rounded-xl border border-border/70 bg-card px-1.5 py-1">
      <Button
        type="button"
        variant="ghost"
        size="icon-sm"
        className="rounded-lg"
        aria-label="اليوم السابق"
        onClick={onPreviousDay}
      >
        <ChevronRight aria-hidden="true" className="size-4" />
      </Button>
      <div className="flex min-w-48 flex-1 items-center justify-center gap-2 px-2 text-center text-sm font-medium text-foreground">
        <CalendarDays aria-hidden="true" className="size-4 shrink-0 text-muted-foreground" />
        <span>{formatArabicDate(date)}</span>
      </div>
      <Button
        type="button"
        variant="ghost"
        size="icon-sm"
        className="rounded-lg"
        aria-label="اليوم التالي"
        onClick={onNextDay}
      >
        <ChevronLeft aria-hidden="true" className="size-4" />
      </Button>
      {!isToday ? (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="rounded-lg text-xs"
          onClick={onToday}
        >
          <RotateCcw aria-hidden="true" className="size-3.5" />
          اليوم
        </Button>
      ) : null}
    </div>
  );
}
