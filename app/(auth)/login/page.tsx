import { ClipboardCheck } from "lucide-react";

import { LoginForm } from "@/components/auth/login-form";

export default function LoginPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-4 py-10">
      <section
        aria-labelledby="login-title"
        className="w-full max-w-md rounded-3xl border border-border/70 bg-card p-6 shadow-2xl shadow-black/10 sm:p-8"
      >
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex size-12 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-lg shadow-primary/20">
            <ClipboardCheck aria-hidden="true" className="size-6" />
          </div>
          <p className="text-sm font-medium text-primary">Team Flow</p>
          <h1
            id="login-title"
            className="mt-2 text-2xl font-bold tracking-tight text-foreground"
          >
            مرحبًا بعودتك
          </h1>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">
            إدارة المهام والرؤية لفريق العمل
          </p>
        </div>

        <LoginForm />

        <p className="mt-6 text-center text-xs leading-5 text-muted-foreground">
          مساحة عمل خاصة. الحسابات تُدار بواسطة قائد النظام.
        </p>
      </section>
    </main>
  );
}
