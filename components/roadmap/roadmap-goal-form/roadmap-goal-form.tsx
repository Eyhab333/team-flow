"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { LoaderCircle, X } from "lucide-react";
import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/auth/use-auth";
import {
  createRoadmapGoal,
  updateRoadmapGoal,
} from "@/lib/firestore/roadmap-goals";
import type { RoadmapGoal, RoadmapHorizon } from "@/types/roadmap";

const roadmapGoalSchema = z.object({
  title: z.string().trim().min(1, "الهدف مطلوب."),
  description: z.string(),
  horizon: z.enum(["SHORT", "MEDIUM", "LONG"]),
});

type RoadmapGoalFormValues = z.infer<typeof roadmapGoalSchema>;

interface RoadmapGoalFormCommonProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void | Promise<void>;
  getNextGoalOrder: (horizon: RoadmapHorizon) => number;
}

interface CreateRoadmapGoalFormProps extends RoadmapGoalFormCommonProps {
  mode: "create";
  teamId: string;
  memberId: string;
  horizon: RoadmapHorizon;
}

interface EditRoadmapGoalFormProps extends RoadmapGoalFormCommonProps {
  mode: "edit";
  goal: RoadmapGoal;
}

type RoadmapGoalFormProps =
  | CreateRoadmapGoalFormProps
  | EditRoadmapGoalFormProps;

export function RoadmapGoalForm(props: RoadmapGoalFormProps) {
  const { user } = useAuth();
  const initialTitle = props.mode === "edit" ? props.goal.title : "";
  const initialDescription = props.mode === "edit" ? props.goal.description : "";
  const initialHorizon = props.mode === "edit" ? props.goal.horizon : props.horizon;
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<RoadmapGoalFormValues>({
    resolver: zodResolver(roadmapGoalSchema),
    defaultValues: {
      title: initialTitle,
      description: initialDescription,
      horizon: initialHorizon,
    },
  });

  useEffect(() => {
    if (!props.open) {
      return;
    }

    reset({
      title: initialTitle,
      description: initialDescription,
      horizon: initialHorizon,
    });
  }, [
    initialDescription,
    initialHorizon,
    initialTitle,
    props.open,
    reset,
  ]);

  useEffect(() => {
    if (!props.open) {
      return;
    }

    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === "Escape" && !isSubmitting) {
        props.onClose();
      }
    }

    window.addEventListener("keydown", closeOnEscape);

    return () => {
      window.removeEventListener("keydown", closeOnEscape);
    };
  }, [isSubmitting, props.onClose, props.open]);

  if (!props.open) {
    return null;
  }

  const isEditing = props.mode === "edit";

  async function onSubmit(values: RoadmapGoalFormValues): Promise<void> {
    if (!user) {
      toast.error(isEditing ? "تعذر تحديث الهدف" : "تعذر إضافة الهدف");
      return;
    }

    try {
      if (props.mode === "edit") {
        const horizonChanged = values.horizon !== props.goal.horizon;

        await updateRoadmapGoal(props.goal.id, {
          title: values.title,
          description: values.description,
          horizon: values.horizon,
          targetYear: null,
          targetDate: null,
          order: horizonChanged
            ? props.getNextGoalOrder(values.horizon)
            : props.goal.order,
          updatedBy: user.uid,
        });
      } else {
        await createRoadmapGoal({
          teamId: props.teamId,
          memberId: props.memberId,
          title: values.title,
          description: values.description,
          horizon: values.horizon,
          targetYear: null,
          targetDate: null,
          order: props.getNextGoalOrder(values.horizon),
          createdBy: user.uid,
          createdByName: user.displayName,
        });
      }

      await props.onSuccess();
      toast.success(isEditing ? "تم تحديث الهدف" : "تمت إضافة الهدف");
      props.onClose();
    } catch {
      toast.error(isEditing ? "تعذر تحديث الهدف" : "تعذر إضافة الهدف");
    }
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      <button
        type="button"
        className="absolute inset-0 bg-black/50"
        aria-label="إغلاق نموذج الهدف"
        onClick={props.onClose}
        disabled={isSubmitting}
      />
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="roadmap-goal-form-title"
        className="relative z-10 w-full max-w-md rounded-2xl border border-border/70 bg-card p-5 shadow-2xl"
      >
        <header className="flex items-center justify-between gap-3">
          <h2 id="roadmap-goal-form-title" className="text-base font-bold text-foreground">
            {isEditing ? "تعديل الهدف" : "إضافة هدف"}
          </h2>
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            className="rounded-xl"
            aria-label="إغلاق"
            onClick={props.onClose}
            disabled={isSubmitting}
          >
            <X aria-hidden="true" className="size-4" />
          </Button>
        </header>

        <form className="mt-5 space-y-4" onSubmit={handleSubmit(onSubmit)} noValidate>
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground" htmlFor="roadmap-goal-title">
              الهدف
            </label>
            <input
              id="roadmap-goal-title"
              autoFocus
              aria-invalid={Boolean(errors.title)}
              aria-describedby={errors.title ? "roadmap-goal-title-error" : undefined}
              className="h-10 w-full rounded-xl border border-input bg-background px-3 text-sm text-foreground outline-none transition-colors focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/30 aria-[invalid=true]:border-destructive aria-[invalid=true]:ring-3 aria-[invalid=true]:ring-destructive/20"
              placeholder="مثال: تطوير نظام متابعة متكامل للفريق"
              {...register("title")}
            />
            {errors.title ? (
              <p id="roadmap-goal-title-error" className="text-sm text-destructive" role="alert">
                {errors.title.message}
              </p>
            ) : null}
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground" htmlFor="roadmap-goal-description">
              الوصف
            </label>
            <textarea
              id="roadmap-goal-description"
              rows={3}
              className="w-full resize-y rounded-xl border border-input bg-background px-3 py-2 text-sm text-foreground outline-none transition-colors placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/30"
              placeholder="تفاصيل إضافية - اختياري"
              {...register("description")}
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground" htmlFor="roadmap-goal-horizon">
              المدى
            </label>
            <select
              id="roadmap-goal-horizon"
              className="h-10 w-full rounded-xl border border-input bg-background px-3 text-sm text-foreground outline-none transition-colors focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/30"
              {...register("horizon")}
            >
              <option value="SHORT">قريب المدى</option>
              <option value="MEDIUM">متوسط المدى</option>
              <option value="LONG">بعيد المدى</option>
            </select>
          </div>

          <div className="flex items-center justify-end gap-2 pt-1">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={props.onClose}
              disabled={isSubmitting}
            >
              إلغاء
            </Button>
            <Button type="submit" size="sm" disabled={isSubmitting} aria-busy={isSubmitting}>
              {isSubmitting ? (
                <>
                  <LoaderCircle aria-hidden="true" className="size-3.5 animate-spin" />
                  جارٍ الحفظ
                </>
              ) : isEditing ? (
                "حفظ التعديلات"
              ) : (
                "إضافة الهدف"
              )}
            </Button>
          </div>
        </form>
      </section>
    </div>
  );
}
