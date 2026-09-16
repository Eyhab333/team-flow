"use client";

import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  Check,
  CheckCircle2,
  Circle,
  Ellipsis,
  GripVertical,
  LoaderCircle,
  Pencil,
  RotateCcw,
  Target,
  Trash2,
  X,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";

import { RoadmapGoalForm } from "@/components/roadmap/roadmap-goal-form/roadmap-goal-form";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/auth/use-auth";
import {
  completeRoadmapGoal,
  reopenRoadmapGoal,
  setRoadmapGoalActive,
} from "@/lib/firestore/roadmap-goals";
import type { RoadmapGoal, RoadmapHorizon } from "@/types/roadmap";

interface RoadmapGoalCardProps {
  goal: RoadmapGoal;
  getNextGoalOrder: (horizon: RoadmapHorizon) => number;
  onChanged: () => void | Promise<void>;
  sortable?: boolean;
}

function formatArabicDate(dateValue: string): string {
  const [year, month, day] = dateValue.split("-").map(Number);

  return new Intl.DateTimeFormat("ar-EG-u-ca-gregory", {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(new Date(year, month - 1, day));
}

export function RoadmapGoalCard({
  goal,
  getNextGoalOrder,
  onChanged,
  sortable = false,
}: RoadmapGoalCardProps) {
  const { user } = useAuth();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [isConfirmingDelete, setIsConfirmingDelete] = useState(false);
  const [mutation, setMutation] = useState<"complete" | "reopen" | "delete" | null>(
    null,
  );
  const mutationRef = useRef(false);
  const isCompleted = goal.status === "COMPLETED";
  const isMutating = mutation !== null;
  const {
    attributes,
    listeners,
    setNodeRef,
    setActivatorNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: goal.id,
    data: { horizon: goal.horizon },
    disabled: !sortable || isMutating,
  });

  useEffect(() => {
    if (!isConfirmingDelete) {
      return;
    }

    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === "Escape" && !isMutating) {
        setIsConfirmingDelete(false);
      }
    }

    window.addEventListener("keydown", closeOnEscape);

    return () => {
      window.removeEventListener("keydown", closeOnEscape);
    };
  }, [isConfirmingDelete, isMutating]);

  async function runMutation(
    nextMutation: "complete" | "reopen" | "delete",
  ): Promise<void> {
    if (!user || mutationRef.current) {
      return;
    }

    mutationRef.current = true;
    setMutation(nextMutation);

    try {
      if (nextMutation === "complete") {
        await completeRoadmapGoal(goal.id, user.uid);
      } else if (nextMutation === "reopen") {
        await reopenRoadmapGoal(goal.id, user.uid);
      } else {
        await setRoadmapGoalActive(goal.id, false, user.uid);
      }

      await onChanged();
      toast.success(
        nextMutation === "complete"
          ? "تم إكمال الهدف"
          : nextMutation === "reopen"
            ? "تمت إعادة فتح الهدف"
            : "تم حذف الهدف",
      );
      setIsConfirmingDelete(false);
    } catch {
      toast.error(
        nextMutation === "delete"
          ? "تعذر حذف الهدف"
          : "تعذر تحديث حالة الهدف",
      );
    } finally {
      mutationRef.current = false;
      setMutation(null);
    }
  }

  return (
    <>
      <article
        ref={setNodeRef}
        style={
          sortable
            ? {
                transform: CSS.Transform.toString(transform),
                transition,
              }
            : undefined
        }
        className={`rounded-xl border border-border/70 bg-card p-3 shadow-sm ${
          isDragging ? "relative z-10 opacity-50" : ""
        }`}
      >
        <div className="flex items-start gap-2">
          {sortable ? (
            <button
              ref={setActivatorNodeRef}
              type="button"
              className="mt-0.5 shrink-0 touch-none rounded-md p-0.5 text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/30"
              aria-label={`سحب لترتيب الهدف: ${goal.title}`}
              {...attributes}
              {...listeners}
            >
              <GripVertical aria-hidden="true" className="size-4" />
            </button>
          ) : null}
          {isCompleted ? (
            <CheckCircle2
              aria-label="مكتمل"
              className="mt-0.5 size-5 shrink-0 text-emerald-600 dark:text-emerald-400"
            />
          ) : (
            <Circle aria-hidden="true" className="mt-0.5 size-5 shrink-0 text-muted-foreground" />
          )}
          <div className="min-w-0 flex-1">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <h3
                  className={`text-sm font-bold text-foreground ${
                    isCompleted
                      ? "decoration-muted-foreground/60 line-through"
                      : ""
                  }`}
                >
                  {goal.title}
                </h3>
                {isCompleted ? (
                  <span className="mt-1 inline-flex rounded-full bg-emerald-500/10 px-2 py-0.5 text-xs font-medium text-emerald-700 dark:text-emerald-300">
                    مكتمل
                  </span>
                ) : null}
              </div>
              <div className="relative shrink-0">
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  className="rounded-lg"
                  aria-label={`إجراءات الهدف: ${goal.title}`}
                  aria-expanded={isMenuOpen}
                  aria-haspopup="menu"
                  disabled={isMutating}
                  onClick={() => setIsMenuOpen((open) => !open)}
                >
                  {isMutating ? (
                    <LoaderCircle aria-hidden="true" className="size-4 animate-spin" />
                  ) : (
                    <Ellipsis aria-hidden="true" className="size-4" />
                  )}
                </Button>

                {isMenuOpen ? (
                  <>
                    <button
                      type="button"
                      className="fixed inset-0 z-10 cursor-default"
                      aria-label="إغلاق إجراءات الهدف"
                      onClick={() => setIsMenuOpen(false)}
                    />
                    <div
                      role="menu"
                      className="absolute left-0 top-full z-20 mt-1 w-36 rounded-xl border border-border/70 bg-popover p-1 shadow-lg"
                    >
                      {isCompleted ? (
                        <button
                          type="button"
                          role="menuitem"
                          className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-right text-sm text-popover-foreground outline-none transition-colors hover:bg-muted focus-visible:ring-3 focus-visible:ring-ring/30"
                          onClick={() => {
                            setIsMenuOpen(false);
                            void runMutation("reopen");
                          }}
                        >
                          <RotateCcw aria-hidden="true" className="size-3.5" />
                          إعادة فتح
                        </button>
                      ) : (
                        <button
                          type="button"
                          role="menuitem"
                          className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-right text-sm text-popover-foreground outline-none transition-colors hover:bg-muted focus-visible:ring-3 focus-visible:ring-ring/30"
                          onClick={() => {
                            setIsMenuOpen(false);
                            void runMutation("complete");
                          }}
                        >
                          <Check aria-hidden="true" className="size-3.5" />
                          إكمال الهدف
                        </button>
                      )}
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
            </div>

            {goal.description ? (
              <p className="mt-2 text-sm leading-6 text-muted-foreground">
                {goal.description}
              </p>
            ) : null}

            <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
              <span>أضافه: {goal.createdByName}</span>
              {goal.targetYear !== null ? <span>مستهدف: {goal.targetYear}</span> : null}
              {goal.targetDate ? (
                <span className="inline-flex items-center gap-1">
                  <Target aria-hidden="true" className="size-3" />
                  تاريخ مستهدف: {formatArabicDate(goal.targetDate)}
                </span>
              ) : null}
            </div>
          </div>
        </div>
      </article>

      <RoadmapGoalForm
        open={isEditing}
        mode="edit"
        goal={goal}
        getNextGoalOrder={getNextGoalOrder}
        onClose={() => setIsEditing(false)}
        onSuccess={onChanged}
      />

      {isConfirmingDelete ? (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
          <button
            type="button"
            className="absolute inset-0 bg-black/50"
            aria-label="إغلاق تأكيد الحذف"
            onClick={() => setIsConfirmingDelete(false)}
            disabled={isMutating}
          />
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="roadmap-goal-delete-title"
            className="relative z-10 w-full max-w-sm rounded-2xl border border-border/70 bg-card p-5 shadow-2xl"
          >
            <header className="flex items-center justify-between gap-3">
              <h2 id="roadmap-goal-delete-title" className="text-base font-bold text-foreground">
                حذف الهدف؟
              </h2>
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                className="rounded-xl"
                aria-label="إغلاق"
                onClick={() => setIsConfirmingDelete(false)}
                disabled={isMutating}
              >
                <X aria-hidden="true" className="size-4" />
              </Button>
            </header>
            <p className="mt-3 text-sm leading-6 text-muted-foreground">
              سيتم إخفاء الهدف مع الاحتفاظ بسجله.
            </p>
            <div className="mt-5 flex items-center justify-end gap-2">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setIsConfirmingDelete(false)}
                disabled={isMutating}
              >
                إلغاء
              </Button>
              <Button
                type="button"
                variant="destructive"
                size="sm"
                disabled={isMutating}
                aria-busy={isMutating}
                onClick={() => void runMutation("delete")}
              >
                {mutation === "delete" ? (
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
