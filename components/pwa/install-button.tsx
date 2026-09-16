"use client";

import { Download } from "lucide-react";
import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

interface InstallButtonProps {
  className?: string;
  showLabel?: boolean;
}

export function InstallButton({
  className,
  showLabel = false,
}: InstallButtonProps) {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);

  useEffect(() => {
    const handleBeforeInstallPrompt = (event: Event): void => {
      event.preventDefault();
      setDeferredPrompt(event as BeforeInstallPromptEvent);
    };
    const handleAppInstalled = (): void => setDeferredPrompt(null);
    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    window.addEventListener("appinstalled", handleAppInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
      window.removeEventListener("appinstalled", handleAppInstalled);
    };
  }, []);

  if (!deferredPrompt) return null;

  async function install(): Promise<void> {
    const prompt = deferredPrompt;
    if (!prompt) return;

    await prompt.prompt();
    await prompt.userChoice;
    setDeferredPrompt(null);
  }

  return (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      className={`gap-1.5 rounded-xl ${className ?? ""}`}
      title="تثبيت التطبيق"
      onClick={() => void install()}
    >
      <Download aria-hidden="true" className="size-3.5" />
      {showLabel ? (
        <span>تثبيت التطبيق</span>
      ) : (
        <>
          <span className="hidden sm:inline">تثبيت التطبيق</span>
          <span className="sr-only sm:hidden">تثبيت التطبيق</span>
        </>
      )}
    </Button>
  );
}
