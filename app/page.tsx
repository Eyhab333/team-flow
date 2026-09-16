"use client";

import { LoaderCircle } from "lucide-react";
import { useEffect } from "react";
import { useRouter } from "next/navigation";

import { AuthGuard } from "@/components/auth/auth-guard";
import { useAuth } from "@/hooks/auth/use-auth";

function RootRouter() {
  const router = useRouter();
  const { leaderMemberships, user } = useAuth();

  useEffect(() => {
    if (!user) {
      return;
    }

    router.replace(
      leaderMemberships.length > 0 ? "/workspace" : `/workspace/${user.uid}`,
    );
  }, [leaderMemberships.length, router, user]);

  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="flex items-center gap-3 text-sm text-muted-foreground">
        <LoaderCircle aria-hidden="true" className="size-5 animate-spin" />
        جارٍ تجهيز مساحة العمل
      </div>
    </main>
  );
}

export default function Home() {
  return (
    <AuthGuard>
      <RootRouter />
    </AuthGuard>
  );
}
