"use client";

import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  CheckCircle2,
  Circle,
  CircleDot,
  Clock3,
  Forward,
  GripVertical,
  LoaderCircle,
} from "lucide-react";
import { useRef, useState } from "react";
import { toast } from "sonner";

import { TaskActions } from "@/components/tasks/task-item/task-actions";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/auth/use-auth";
import type { DailyTaskGroupView } from "@/hooks/tasks/use-daily-tasks";
import { completeTask, reopenTask, startTask } from "@/lib/firestore/tasks";
import type { Task } from "@/types/task";

type TaskWorkflowAction = "start" | "complete" | "reopen";

interface TaskItemRowProps {
  task: Task;
  selectedDate: string;
  groups?: DailyTaskGroupView[];
  getNextTaskOrder?: (groupId: string) => number;
  onChanged?: () => void | Promise<void>;
  sortable?: boolean;
}

function formatArabicDate(dateValue: string): string {
  const [year, month, day] = dateValue.split("-").map(Number);

  return new Intl.DateTimeFormat("ar-EG-u-ca-gregory", {
    day: "numeric",
    month: "long",
  }).format(new Date(year, month - 1, day));
}

function formatArabicTime(timestamp: Task["startedAt"]): string | null {
  if (!timestamp) {
    return null;
  }

  return new Intl.DateTimeFormat("ar-EG", {
    hour: "numeric",
    minute: "2-digit",
  }).format(timestamp.toDate());
}

function getCheckboxLabel(task: Task): string {
  return task.status === "COMPLETED"
    ? `إعادة فتح المهمة: ${task.title}`
    : `إنجاز المهمة: ${task.title}`;
}

export function TaskItemRow({
  task,
  selectedDate,
  groups,
  getNextTaskOrder,
  onChanged,
  sortable = false,
}: TaskItemRowProps) {
  const { user } = useAuth();
  const [workflowAction, setWorkflowAction] =
    useState<TaskWorkflowAction | null>(null);
  const workflowPendingRef = useRef(false);
  const isWorkflowPending = workflowAction !== null;
  const {
    attributes,
    listeners,
    setNodeRef,
    setActivatorNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: task.id,
    disabled: !sortable || isWorkflowPending,
  });
  const isCompleted = task.status === "COMPLETED";
  const isInProgress = task.status === "IN_PROGRESS";
  const isCarriedForward = task.originalDate < selectedDate;
  const startedAt = formatArabicTime(task.startedAt);
  const completedAt = formatArabicTime(task.completedAt);
  const taskActionContext =
    groups && getNextTaskOrder && onChanged &&
    groups.some(({ group }) => group.id === task.groupId)
      ? { groups, getNextTaskOrder, onChanged }
      : null;

  async function runWorkflow(action: TaskWorkflowAction): Promise<void> {
    if (!user || !onChanged || workflowPendingRef.current) {
      return;
    }

    workflowPendingRef.current = true;
    setWorkflowAction(action);

    try {
      if (action === "start") {
        await startTask(task.id, user.uid);
        toast.success("تم بدء العمل على المهمة");
      } else if (action === "complete") {
        await completeTask(task.id, user.uid);
        toast.success("تم إنجاز المهمة");
      } else {
        await reopenTask(task.id, user.uid);
        toast.success("تمت إعادة فتح المهمة");
      }

      await onChanged();
    } catch {
      toast.error("تعذر تحديث حالة المهمة");
    } finally {
      workflowPendingRef.current = false;
      setWorkflowAction(null);
    }
  }

  function handleCheckboxClick(): void {
    void runWorkflow(isCompleted ? "reopen" : "complete");
  }

  return (
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
      className={`flex gap-3 py-3 first:pt-0 last:pb-0 ${
        isDragging ? "relative z-10 opacity-50" : ""
      }`}
    >
      {sortable ? (
        <button
          ref={setActivatorNodeRef}
          type="button"
          className="mt-0.5 shrink-0 touch-none rounded-md p-0.5 text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/30"
          aria-label={`سحب لترتيب المهمة: ${task.title}`}
          {...attributes}
          {...listeners}
        >
          <GripVertical aria-hidden="true" className="size-4" />
        </button>
      ) : null}

      <Button
        type="button"
        variant="ghost"
        size="icon-sm"
        className="mt-0.5 shrink-0 rounded-full"
        aria-label={getCheckboxLabel(task)}
        disabled={!onChanged || isWorkflowPending}
        aria-busy={isWorkflowPending}
        onClick={handleCheckboxClick}
      >
        {isWorkflowPending ? (
          <LoaderCircle aria-hidden="true" className="size-5 animate-spin" />
        ) : isCompleted ? (
          <CheckCircle2
            aria-hidden="true"
            className="size-5 text-emerald-600 dark:text-emerald-400"
          />
        ) : isInProgress ? (
          <CircleDot aria-hidden="true" className="size-5 text-primary" />
        ) : (
          <Circle aria-hidden="true" className="size-5 text-muted-foreground" />
        )}
      </Button>

      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-2">
          <div className="flex min-w-0 flex-wrap items-center gap-2">
            <h3
              className={`text-sm font-semibold text-foreground ${
                isCompleted ? "decoration-muted-foreground/60 line-through" : ""
              }`}
            >
              {task.title}
            </h3>
            {isInProgress ? (
              <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
                <Clock3 aria-hidden="true" className="size-3" />
                جاري العمل عليها
              </span>
            ) : null}
          </div>
          {taskActionContext ? (
            <TaskActions
              task={task}
              groups={taskActionContext.groups}
              getNextTaskOrder={taskActionContext.getNextTaskOrder}
              onSuccess={taskActionContext.onChanged}
              onStart={() => runWorkflow("start")}
              onComplete={() => runWorkflow("complete")}
              onReopen={() => runWorkflow("reopen")}
              isWorkflowPending={isWorkflowPending}
            />
          ) : null}
        </div>

        {task.description ? (
          <p className="mt-1 text-sm leading-6 text-muted-foreground">
            {task.description}
          </p>
        ) : null}

        <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
          <span>أضافها: {task.createdByName}</span>
          {isCarriedForward ? (
            <span className="inline-flex items-center gap-1 text-amber-700 dark:text-amber-300">
              <Forward aria-hidden="true" className="size-3" />
              مرحّلة من {formatArabicDate(task.originalDate)}
            </span>
          ) : null}
          {isInProgress && startedAt ? <span>بدأت {startedAt}</span> : null}
          {isCompleted && completedAt ? <span>تمت {completedAt}</span> : null}
        </div>
      </div>
    </article>
  );
}
