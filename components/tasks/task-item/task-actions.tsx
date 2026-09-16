"use client";

import {
  Check,
  Ellipsis,
  LoaderCircle,
  Pencil,
  Play,
  RotateCcw,
  Trash2,
  X,
} from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { TaskForm } from "@/components/tasks/task-form/task-form";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/auth/use-auth";
import type { DailyTaskGroupView } from "@/hooks/tasks/use-daily-tasks";
import { setTaskActive } from "@/lib/firestore/tasks";
import type { Task } from "@/types/task";

interface TaskActionsProps {
  task: Task;
  groups: DailyTaskGroupView[];
  getNextTaskOrder: (groupId: string) => number;
  onSuccess: () => void | Promise<void>;
  onStart: () => Promise<void>;
  onComplete: () => Promise<void>;
  onReopen: () => Promise<void>;
  isWorkflowPending: boolean;
}

export function TaskActions({
  task,
  groups,
  getNextTaskOrder,
  onSuccess,
  onStart,
  onComplete,
  onReopen,
  isWorkflowPending,
}: TaskActionsProps) {
  const { user } = useAuth();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [isConfirmingDelete, setIsConfirmingDelete] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    if (!isConfirmingDelete) {
      return;
    }

    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === "Escape" && !isDeleting) {
        setIsConfirmingDelete(false);
      }
    }

    window.addEventListener("keydown", closeOnEscape);

    return () => {
      window.removeEventListener("keydown", closeOnEscape);
    };
  }, [isConfirmingDelete, isDeleting]);

  async function handleDelete(): Promise<void> {
    if (isDeleting) {
      return;
    }

    if (!user) {
      toast.error("تعذر حذف المهمة");
      return;
    }

    setIsDeleting(true);

    try {
      await setTaskActive(task.id, false, user.uid);
      await onSuccess();
      toast.success("تم حذف المهمة");
      setIsConfirmingDelete(false);
    } catch {
      toast.error("تعذر حذف المهمة");
    } finally {
      setIsDeleting(false);
    }
  }

  return (
    <>
      <div className="relative shrink-0">
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          className="rounded-xl"
          aria-label={`إجراءات المهمة ${task.title}`}
          aria-expanded={isMenuOpen}
          aria-haspopup="menu"
          onClick={() => setIsMenuOpen((open) => !open)}
          disabled={isWorkflowPending || isDeleting}
        >
          <Ellipsis aria-hidden="true" className="size-4" />
        </Button>

        {isMenuOpen ? (
          <>
            <button
              type="button"
              className="fixed inset-0 z-10 cursor-default"
              aria-label="إغلاق إجراءات المهمة"
              onClick={() => setIsMenuOpen(false)}
            />
            <div
              className="absolute left-0 top-full z-20 mt-1 w-36 rounded-xl border border-border/70 bg-popover p-1 shadow-lg"
              role="menu"
            >
              {task.status === "ACTIVE" ? (
                <>
                  <button
                    type="button"
                    role="menuitem"
                    className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-right text-sm text-popover-foreground outline-none transition-colors hover:bg-muted focus-visible:ring-3 focus-visible:ring-ring/30"
                    onClick={() => {
                      setIsMenuOpen(false);
                      void onStart();
                    }}
                  >
                    <Play aria-hidden="true" className="size-3.5" />
                    بدء العمل
                  </button>
                  <button
                    type="button"
                    role="menuitem"
                    className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-right text-sm text-popover-foreground outline-none transition-colors hover:bg-muted focus-visible:ring-3 focus-visible:ring-ring/30"
                    onClick={() => {
                      setIsMenuOpen(false);
                      void onComplete();
                    }}
                  >
                    <Check aria-hidden="true" className="size-3.5" />
                    إنجاز المهمة
                  </button>
                </>
              ) : null}
              {task.status === "IN_PROGRESS" ? (
                <>
                  <button
                    type="button"
                    role="menuitem"
                    className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-right text-sm text-popover-foreground outline-none transition-colors hover:bg-muted focus-visible:ring-3 focus-visible:ring-ring/30"
                    onClick={() => {
                      setIsMenuOpen(false);
                      void onComplete();
                    }}
                  >
                    <Check aria-hidden="true" className="size-3.5" />
                    إنجاز المهمة
                  </button>
                  <button
                    type="button"
                    role="menuitem"
                    className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-right text-sm text-popover-foreground outline-none transition-colors hover:bg-muted focus-visible:ring-3 focus-visible:ring-ring/30"
                    onClick={() => {
                      setIsMenuOpen(false);
                      void onReopen();
                    }}
                  >
                    <RotateCcw aria-hidden="true" className="size-3.5" />
                    إعادة إلى الانتظار
                  </button>
                </>
              ) : null}
              {task.status === "COMPLETED" ? (
                <button
                  type="button"
                  role="menuitem"
                  className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-right text-sm text-popover-foreground outline-none transition-colors hover:bg-muted focus-visible:ring-3 focus-visible:ring-ring/30"
                  onClick={() => {
                    setIsMenuOpen(false);
                    void onReopen();
                  }}
                >
                  <RotateCcw aria-hidden="true" className="size-3.5" />
                  إعادة فتح
                </button>
              ) : null}
              <button
                type="button"
                role="menuitem"
                className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-right text-sm text-popover-foreground outline-none transition-colors hover:bg-muted focus-visible:ring-3 focus-visible:ring-ring/30"
                onClick={() => {
                  setIsMenuOpen(false);
                  setIsEditing(true);
                }}
              >
                <Pencil aria-hidden="true" className="size-3.5" />
                تعديل
              </button>
              <button
                type="button"
                role="menuitem"
                className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-right text-sm text-destructive outline-none transition-colors hover:bg-destructive/10 focus-visible:ring-3 focus-visible:ring-destructive/20"
                onClick={() => {
                  setIsMenuOpen(false);
                  setIsConfirmingDelete(true);
                }}
              >
                <Trash2 aria-hidden="true" className="size-3.5" />
                حذف
              </button>
            </div>
          </>
        ) : null}
      </div>

      <TaskForm
        open={isEditing}
        mode="edit"
        task={task}
        groups={groups}
        getNextTaskOrder={getNextTaskOrder}
        onClose={() => setIsEditing(false)}
        onSuccess={onSuccess}
      />

      {isConfirmingDelete ? (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
          <button
            type="button"
            className="absolute inset-0 bg-black/50"
            aria-label="إغلاق تأكيد الحذف"
            onClick={() => setIsConfirmingDelete(false)}
            disabled={isDeleting}
          />
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="task-delete-title"
            className="relative z-10 w-full max-w-sm rounded-2xl border border-border/70 bg-card p-5 shadow-2xl"
          >
            <header className="flex items-center justify-between gap-3">
              <h2 id="task-delete-title" className="text-base font-bold text-foreground">
                حذف المهمة؟
              </h2>
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                className="rounded-xl"
                aria-label="إغلاق"
                onClick={() => setIsConfirmingDelete(false)}
                disabled={isDeleting}
              >
                <X aria-hidden="true" className="size-4" />
              </Button>
            </header>
            <p className="mt-3 text-sm leading-6 text-muted-foreground">
              سيتم إخفاء المهمة من العرض مع الاحتفاظ بسجلها.
            </p>
            <div className="mt-5 flex items-center justify-end gap-2">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setIsConfirmingDelete(false)}
                disabled={isDeleting}
              >
                إلغاء
              </Button>
              <Button
                type="button"
                variant="destructive"
                size="sm"
                onClick={() => void handleDelete()}
                disabled={isDeleting}
                aria-busy={isDeleting}
              >
                {isDeleting ? (
                  <>
                    <LoaderCircle aria-hidden="true" className="size-3.5 animate-spin" />
                    جارٍ الحذف
                  </>
                ) : (
                  "حذف"
                )}
              </Button>
            </div>
          </section>
        </div>
      ) : null}
    </>
  );
}
