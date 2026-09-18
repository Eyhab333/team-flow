"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { LoaderCircle, X } from "lucide-react";
import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/auth/use-auth";
import type { DailyTaskGroupView } from "@/hooks/tasks/use-daily-tasks";
import { createTask, updateTask } from "@/lib/firestore/tasks";
import type { Task } from "@/types/task";

const taskSchema = z.object({
  title: z.string().trim().min(1, "المهمة مطلوبة."),
  description: z.string(),
  groupId: z.string().min(1, "اختر مجموعة المهام."),
});

type TaskFormValues = z.infer<typeof taskSchema>;

interface TaskFormCommonProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void | Promise<void>;
}

interface CreateTaskFormProps extends TaskFormCommonProps {
  mode: "create";
  teamId: string;
  memberId: string;
  date: string;
  groupId: string;
  order: number;
}

interface EditTaskFormProps extends TaskFormCommonProps {
  mode: "edit";
  task: Task;
  groups: DailyTaskGroupView[];
  getNextTaskOrder: (groupId: string) => number;
}

type TaskFormProps = CreateTaskFormProps | EditTaskFormProps;

export function TaskForm(props: TaskFormProps) {
  const { user } = useAuth();
  const initialTitle = props.mode === "edit" ? props.task.title : "";
  const initialDescription = props.mode === "edit" ? props.task.description : "";
  const initialGroupId = props.mode === "edit" ? props.task.groupId : props.groupId;
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<TaskFormValues>({
    resolver: zodResolver(taskSchema),
    defaultValues: {
      title: initialTitle,
      description: initialDescription,
      groupId: initialGroupId,
    },
  });

  useEffect(() => {
    if (!props.open) {
      return;
    }

    reset({
      title: initialTitle,
      description: initialDescription,
      groupId: initialGroupId,
    });
  }, [initialDescription, initialGroupId, initialTitle, props.open, reset]);

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

  async function onSubmit(values: TaskFormValues): Promise<void> {
    if (!user) {
      toast.error(isEditing ? "تعذر تحديث المهمة" : "تعذر إضافة المهمة");
      return;
    }

    try {
      if (props.mode === "edit") {
        const groupChanged = values.groupId !== props.task.groupId;

        await updateTask(props.task.id, {
          title: values.title,
          description: values.description,
          groupId: values.groupId,
          order: groupChanged
            ? props.getNextTaskOrder(values.groupId)
            : props.task.order,
          updatedBy: user.uid,
        });
      } else {
        await createTask({
          teamId: props.teamId,
          memberId: props.memberId,
          groupId: props.groupId,
          title: values.title,
          description: values.description,
          originalDate: props.date,
          workDate: props.date,
          order: props.order,
          roadmapGoalId: null,
          createdBy: user.uid,
          createdByName: user.displayName,
        });
      }

      await props.onSuccess();
      toast.success(isEditing ? "تم تحديث المهمة" : "تمت إضافة المهمة");
      props.onClose();
    } catch {
      toast.error(isEditing ? "تعذر تحديث المهمة" : "تعذر إضافة المهمة");
    }
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      <button
        type="button"
        className="absolute inset-0 bg-black/50"
        aria-label="إغلاق نموذج المهمة"
        onClick={props.onClose}
        disabled={isSubmitting}
      />
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="task-form-title"
        className="relative z-10 w-full max-w-md rounded-2xl border border-border/70 bg-card p-5 shadow-2xl"
      >
        <header className="flex items-center justify-between gap-3">
          <h2 id="task-form-title" className="text-base font-bold text-foreground">
            {isEditing ? "تعديل المهمة" : "إضافة مهمة"}
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
            <label className="text-sm font-medium text-foreground" htmlFor="task-title">
              المهمة
            </label>
            <input
              id="task-title"
              autoFocus
              aria-invalid={Boolean(errors.title)}
              aria-describedby={errors.title ? "task-title-error" : undefined}
              className="h-10 w-full rounded-xl border border-input bg-background px-3 text-sm text-foreground outline-none transition-colors focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/30 aria-[invalid=true]:border-destructive aria-[invalid=true]:ring-3 aria-[invalid=true]:ring-destructive/20"
              placeholder="اكتب المهمة المطلوبة"
              {...register("title")}
            />
            {errors.title ? (
              <p id="task-title-error" className="text-sm text-destructive" role="alert">
                {errors.title.message}
              </p>
            ) : null}
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground" htmlFor="task-description">
              الوصف
            </label>
            <textarea
              id="task-description"
              rows={3}
              className="w-full resize-y rounded-xl border border-input bg-background px-3 py-2 text-sm text-foreground outline-none transition-colors placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/30"
              placeholder="تفاصيل إضافية - اختياري"
              {...register("description")}
            />
          </div>

          {props.mode === "edit" ? (
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground" htmlFor="task-group">
                مجموعة المهام
              </label>
              <select
                id="task-group"
                className="h-10 w-full rounded-xl border border-input bg-background px-3 text-sm text-foreground outline-none transition-colors focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/30"
                {...register("groupId")}
              >
                {props.groups.map(({ group }) => (
                  <option key={group.id} value={group.id}>
                    {group.title}
                  </option>
                ))}
              </select>
              {errors.groupId ? (
                <p className="text-sm text-destructive" role="alert">
                  {errors.groupId.message}
                </p>
              ) : null}
            </div>
          ) : null}

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
                "إضافة المهمة"
              )}
            </Button>
          </div>
        </form>
      </section>
    </div>
  );
}
