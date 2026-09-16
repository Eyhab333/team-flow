"use client";

import { Moon, Sun } from "lucide-react";
import { useEffect, useState } from "react";
import { useTheme } from "next-themes";

import { Button } from "@/components/ui/button";

export function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme();
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  if (!isMounted || !resolvedTheme) {
    return <span className="inline-block size-7" aria-hidden="true" />;
  }

  const isDarkTheme = resolvedTheme === "dark";
  const nextTheme = isDarkTheme ? "light" : "dark";
  const label = isDarkTheme ? "تفعيل الوضع الفاتح" : "تفعيل الوضع الداكن";

  return (
    <Button
      type="button"
      variant="ghost"
      size="icon-sm"
      className="rounded-xl"
      onClick={() => setTheme(nextTheme)}
      aria-label={label}
      title={label}
    >
      {isDarkTheme ? (
        <Sun aria-hidden="true" className="size-4" />
      ) : (
        <Moon aria-hidden="true" className="size-4" />
      )}
    </Button>
  );
}
