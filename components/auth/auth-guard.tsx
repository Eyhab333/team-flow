"use client";

import { LoaderCircle, LogOut, ShieldAlert, TriangleAlert } from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/auth/use-auth";

function StatusScreen({
  icon,
  title,
  description,
  children,
}: {
  icon: ReactNode;
  title: string;
  description: string;
  children?: ReactNode;
}) {
  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-4 py-10">
      <section className="w-full max-w-sm rounded-3xl border border-border/70 bg-card p-6 text-center shadow-xl shadow-black/10 sm:p-8">
        <div className="mx-auto mb-4 flex size-12 items-center justify-center rounded-2xl bg-muted text-muted-foreground">
          {icon}
        </div>
        <h1 className="text-xl font-bold text-foreground">{title}</h1>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">
          {description}
        </p>
        {children}
      </section>
    </main>
  );
}

function LoadingScreen() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="flex items-center gap-3 text-sm text-muted-foreground">
        <LoaderCircle aria-hidden="true" className="size-5 animate-spin" />
        جارٍ تجهيز مساحة العمل
      </div>
    </main>
  );
}

export function AuthGuard({ children }: { children: ReactNode }) {
  const router = useRouter();
  const {
    error,
    hasAppAccess,
    isAuthenticated,
    isLoading,
    signOut,
  } = useAuth();
  const [isSigningOut, setIsSigningOut] = useState(false);

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.replace("/login");
    }
  }, [isAuthenticated, isLoading, router]);

  async function handleSignOut(): Promise<void> {
    setIsSigningOut(true);

    try {
      await signOut();
    } catch {
      // AuthProvider exposes the failure through its generic error state.
    } finally {
      setIsSigningOut(false);
    }
  }

  if (isLoading) {
    return <LoadingScreen />;
  }

  if (!isAuthenticated) {
    return <LoadingScreen />;
  }

  if (!hasAppAccess && error) {
    return (
      <StatusScreen
        icon={<TriangleAlert aria-hidden="true" className="size-6" />}
        title="تعذر تجهيز مساحة العمل"
        description="حدثت مشكلة أثناء التحقق من صلاحية الحساب. حاول تسجيل الدخول مرة أخرى."
      >
        <Button
          type="button"
          variant="outline"
          className="mt-6 h-10 rounded-xl"
          disabled={isSigningOut}
          onClick={handleSignOut}
        >
          <LogOut aria-hidden="true" className="size-4" />
          {isSigningOut ? "جارٍ تسجيل الخروج" : "تسجيل الخروج"}
        </Button>
      </StatusScreen>
    );
  }

  if (!hasAppAccess) {
    return (
      <StatusScreen
        icon={<ShieldAlert aria-hidden="true" className="size-6" />}
        title="لا توجد صلاحية للوصول"
        description="حسابك مسجل، لكنه غير مفعل لاستخدام هذه المساحة."
      >
        <Button
          type="button"
          variant="outline"
          className="mt-6 h-10 rounded-xl"
          disabled={isSigningOut}
          onClick={handleSignOut}
        >
          <LogOut aria-hidden="true" className="size-4" />
          {isSigningOut ? "جارٍ تسجيل الخروج" : "تسجيل الخروج"}
        </Button>
      </StatusScreen>
    );
  }

  return <>{children}</>;
}
