"use client";

import { CalendarDays, UserRound } from "lucide-react";
import { useEffect, useState } from "react";

import type { User } from "@/types/user";

function getInitials(displayName: string): string {
  const initials = displayName
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((name) => name.charAt(0))
    .join("");

  return initials || "؟";
}

function formatCurrentDate(): string {
  return new Intl.DateTimeFormat("ar-EG-u-ca-gregory", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  }).format(new Date());
}

export function MemberWorkspaceHeader({ member }: { member: User }) {
  const [today, setToday] = useState<string | null>(null);

  useEffect(() => {
    setToday(formatCurrentDate());
  }, []);

  return (
    <header className="flex flex-col gap-4 border-b border-border/70 pb-5 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex min-w-0 items-center gap-3">
        {member.photoURL ? (
          <img
            src={member.photoURL}
            alt=""
            className="size-11 shrink-0 rounded-2xl border border-border object-cover"
          />
        ) : (
          <div className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-primary/15 text-sm font-bold text-primary">
            {member.displayName ? (
              getInitials(member.displayName)
            ) : (
              <UserRound aria-hidden="true" className="size-5" />
            )}
          </div>
        )}
        <div className="min-w-0">
          <h1 className="truncate text-xl font-bold text-foreground">
            {member.displayName}
          </h1>
          <p className="mt-1 truncate text-sm text-muted-foreground" dir="ltr">
            {member.email}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <CalendarDays aria-hidden="true" className="size-4 text-primary" />
        <span>{today ?? "تاريخ اليوم"}</span>
      </div>
    </header>
  );
}
