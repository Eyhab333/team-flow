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
  createTaskGroup,
  updateTaskGroup,
} from "@/lib/firestore/task-groups";
import type { TaskGroup } from "@/types/task-group";

const taskGroupSchema = z.object({
  title: z.string().trim().min(1, "اسم المجموعة مطلوب."),
  description: z.string(),
});

type TaskGroupFormValues = z.infer<typeof taskGroupSchema>;

interface TaskGroupFormCommonProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void | Promise<void>;
}

interface CreateTaskGroupFormProps extends TaskGroupFormCommonProps {
  mode: "create";
  teamId: string;
  memberId: string;
  originalDate: string;
  order: number;
}

interface EditTaskGroupFormProps extends TaskGroupFormCommonProps {
  mode: "edit";
  group: TaskGroup;
}

type TaskGroupFormProps =
  | CreateTaskGroupFormProps
  | EditTaskGroupFormProps;

export function TaskGroupForm(props: TaskGroupFormProps) {
  const { user } = useAuth();
  const initialTitle = props.mode === "edit" ? props.group.title : "";
  const initialDescription =
    props.mode === "edit" ? props.group.description : "";
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<TaskGroupFormValues>({
    resolver: zodResolver(taskGroupSchema),
    defaultValues: {
      title: initialTitle,
      description: initialDescription,
    },
  });

  useEffect(() => {
    if (!props.open) {
      return;
    }

    reset({
      title: initialTitle,
      description: initialDescription,
    });
  }, [initialDescription, initialTitle, props.open, reset]);

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

  async function onSubmit(values: TaskGroupFormValues): Promise<void> {
    if (!user) {
      toast.error(
        isEditing ? "تعذر تحديث مجموعة المهام" : "تعذر إضافة مجموعة المهام",
      );
      return;
    }

    try {
      if (props.mode === "edit") {
        await updateTaskGroup(props.group.id, {
          title: values.title,
          description: values.description,
          updatedBy: user.uid,
        });
      } else {
        await createTaskGroup({
          teamId: props.teamId,
          memberId: props.memberId,
          title: values.title,
          description: values.description,
          originalDate: props.originalDate,
          order: props.order,
          createdBy: user.uid,
          createdByName: user.displayName,
        });
      }

      await props.onSuccess();
      toast.success(
        isEditing ? "تم تحديث مجموعة المهام" : "تمت إضافة مجموعة المهام",
      );
      props.onClose();
    } catch {
      toast.error(
        isEditing ? "تعذر تحديث مجموعة المهام" : "تعذر إضافة مجموعة المهام",
      );
    }
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      <button
        type="button"
        className="absolute inset-0 bg-black/50"
        aria-label="إغلاق نموذج مجموعة المهام"
        onClick={props.onClose}
        disabled={isSubmitting}
      />
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="task-group-form-title"
        className="relative z-10 w-full max-w-md rounded-2xl border border-border/70 bg-card p-5 shadow-2xl"
      >
        <header className="flex items-center justify-between gap-3">
          <h2 id="task-group-form-title" className="text-base font-bold text-foreground">
            {isEditing ? "تعديل مجموعة المهام" : "إضافة مجموعة"}
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
            <label className="text-sm font-medium text-foreground" htmlFor="task-group-title">
              اسم المجموعة
            </label>
            <input
              id="task-group-title"
              autoFocus
              aria-invalid={Boolean(errors.title)}
              aria-describedby={errors.title ? "task-group-title-error" : undefined}
              className="h-10 w-full rounded-xl border border-input bg-background px-3 text-sm text-foreground outline-none transition-colors focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/30 aria-[invalid=true]:border-destructive aria-[invalid=true]:ring-3 aria-[invalid=true]:ring-destructive/20"
              placeholder="مثال: مهام جروب واتساب المدرسة"
              {...register("title")}
            />
            {errors.title ? (
              <p id="task-group-title-error" className="text-sm text-destructive" role="alert">
                {errors.title.message}
              </p>
            ) : null}
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground" htmlFor="task-group-description">
              الوصف
            </label>
            <textarea
              id="task-group-description"
              rows={3}
              className="w-full resize-y rounded-xl border border-input bg-background px-3 py-2 text-sm text-foreground outline-none transition-colors placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/30"
              placeholder="وصف مختصر للمجموعة - اختياري"
              {...register("description")}
            />
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
                "إضافة المجموعة"
              )}
            </Button>
          </div>
        </form>
      </section>
    </div>
  );
}
