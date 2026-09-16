"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { FirebaseError } from "firebase/app";
import { Eye, EyeOff, LoaderCircle, LogIn } from "lucide-react";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";
import { useRouter } from "next/navigation";

import { signInWithEmail } from "@/lib/auth";
import { Button } from "@/components/ui/button";

const loginSchema = z.object({
  email: z
    .string()
    .trim()
    .min(1, "البريد الإلكتروني مطلوب.")
    .email("أدخل بريدًا إلكترونيًا صحيحًا."),
  password: z.string().min(1, "كلمة المرور مطلوبة."),
  rememberMe: z.boolean(),
});

type LoginFormValues = z.infer<typeof loginSchema>;

function getLoginErrorMessage(error: unknown): string {
  if (!(error instanceof FirebaseError)) {
    return "تعذر تسجيل الدخول. حاول مرة أخرى.";
  }

  switch (error.code) {
    case "auth/invalid-credential":
    case "auth/user-not-found":
    case "auth/wrong-password":
      return "البريد الإلكتروني أو كلمة المرور غير صحيحة.";
    case "auth/invalid-email":
      return "أدخل بريدًا إلكترونيًا صحيحًا.";
    case "auth/too-many-requests":
      return "تمت محاولات كثيرة. حاول مرة أخرى بعد قليل.";
    case "auth/network-request-failed":
      return "تعذر الاتصال بالشبكة. تحقق من الإنترنت ثم حاول مرة أخرى.";
    default:
      return "تعذر تسجيل الدخول. حاول مرة أخرى.";
  }
}

export function LoginForm() {
  const router = useRouter();
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: "",
      rememberMe: true,
    },
  });

  async function onSubmit(values: LoginFormValues): Promise<void> {
    try {
      await signInWithEmail(values.email, values.password, values.rememberMe);
      router.push("/");
    } catch (error) {
      toast.error("تعذر تسجيل الدخول", {
        description: getLoginErrorMessage(error),
      });
    }
  }

  return (
    <form className="space-y-5" onSubmit={handleSubmit(onSubmit)} noValidate>
      <div className="space-y-2">
        <label className="text-sm font-medium text-foreground" htmlFor="email">
          البريد الإلكتروني
        </label>
        <input
          id="email"
          type="email"
          dir="ltr"
          autoComplete="email"
          autoCapitalize="none"
          spellCheck={false}
          aria-invalid={Boolean(errors.email)}
          aria-describedby={errors.email ? "email-error" : undefined}
          className="h-11 w-full rounded-xl border border-input bg-background px-3 text-left text-sm text-foreground outline-none transition-colors placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/30 aria-[invalid=true]:border-destructive aria-[invalid=true]:ring-3 aria-[invalid=true]:ring-destructive/20"
          placeholder="name@example.com"
          {...register("email")}
        />
        {errors.email && (
          <p id="email-error" className="text-sm text-destructive" role="alert">
            {errors.email.message}
          </p>
        )}
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium text-foreground" htmlFor="password">
          كلمة المرور
        </label>
        <div className="relative">
          <input
            id="password"
            type={isPasswordVisible ? "text" : "password"}
            autoComplete="current-password"
            aria-invalid={Boolean(errors.password)}
            aria-describedby={errors.password ? "password-error" : undefined}
            className="h-11 w-full rounded-xl border border-input bg-background py-2 pr-3 pl-11 text-sm text-foreground outline-none transition-colors placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/30 aria-[invalid=true]:border-destructive aria-[invalid=true]:ring-3 aria-[invalid=true]:ring-destructive/20"
            {...register("password")}
          />
          <button
            type="button"
            className="absolute inset-y-0 left-0 flex w-11 items-center justify-center rounded-s-xl text-muted-foreground outline-none transition-colors hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/30"
            onClick={() => setIsPasswordVisible((visible) => !visible)}
            aria-label={
              isPasswordVisible ? "إخفاء كلمة المرور" : "إظهار كلمة المرور"
            }
            aria-pressed={isPasswordVisible}
          >
            {isPasswordVisible ? (
              <EyeOff aria-hidden="true" className="size-4" />
            ) : (
              <Eye aria-hidden="true" className="size-4" />
            )}
          </button>
        </div>
        {errors.password && (
          <p
            id="password-error"
            className="text-sm text-destructive"
            role="alert"
          >
            {errors.password.message}
          </p>
        )}
      </div>

      <label className="flex w-fit cursor-pointer items-center gap-2 text-sm text-muted-foreground">
        <input
          type="checkbox"
          className="size-4 rounded border-input accent-primary outline-none focus-visible:ring-3 focus-visible:ring-ring/30"
          {...register("rememberMe")}
        />
        تذكرني
      </label>

      <Button
        type="submit"
        size="lg"
        className="h-11 w-full rounded-xl"
        disabled={isSubmitting}
        aria-busy={isSubmitting}
      >
        {isSubmitting ? (
          <>
            <LoaderCircle aria-hidden="true" className="size-4 animate-spin" />
            جارٍ تسجيل الدخول
          </>
        ) : (
          <>
            <LogIn aria-hidden="true" className="size-4" />
            تسجيل الدخول
          </>
        )}
      </Button>
    </form>
  );
}
