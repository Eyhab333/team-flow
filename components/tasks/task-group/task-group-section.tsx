"use client";

import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { ChevronDown, GripVertical, Plus } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import { TaskForm } from "@/components/tasks/task-form/task-form";
import { TaskGroupActions } from "@/components/tasks/task-group/task-group-actions";
import { TaskTemplateList } from "@/components/tasks/task-template/task-template-list";
import { TaskItemRow } from "@/components/tasks/task-item/task-item-row";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/auth/use-auth";
import type { DailyTaskGroupView } from "@/hooks/tasks/use-daily-tasks";
import { updateTaskOrders } from "@/lib/firestore/tasks";
import type { Task } from "@/types/task";

export function TaskGroupSection({
  groupView,
  selectedDate,
  groups,
  getNextTaskOrder,
  getNextTemplateOrder,
  onChanged,
  sortable = false,
  isGroupReordering = false,
}: {
  groupView: DailyTaskGroupView;
  selectedDate: string;
  groups: DailyTaskGroupView[];
  getNextTaskOrder: (groupId: string) => number;
  getNextTemplateOrder: (groupId: string) => number;
  onChanged: () => void | Promise<void>;
  sortable?: boolean;
  isGroupReordering?: boolean;
}) {
  const { user } = useAuth();
  const { group, tasks, templates } = groupView;
  const groupType = group.type ?? "EXTENDED";
  const isTemplateGroup = groupType === "DAILY" || groupType === "RECURRING";
  const [creatingTask, setCreatingTask] = useState(false);
  const [expanded, setExpanded] = useState(true);
  const [reordering, setReordering] = useState(false);
  const [orderedTaskIds, setOrderedTaskIds] = useState(tasks.map((task) => task.id));
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );
  const {
    attributes,
    listeners,
    setNodeRef,
    setActivatorNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: `group:${group.id}`,
    disabled: !sortable || isGroupReordering || creatingTask,
  });
  const taskById = useMemo(() => new Map(tasks.map((task) => [task.id, task])), [tasks]);
  const shownTasks = orderedTaskIds
    .map((id) => taskById.get(id))
    .filter((task): task is Task => Boolean(task));

  useEffect(() => setOrderedTaskIds(tasks.map((task) => task.id)), [tasks]);

  async function onTaskDragEnd({ active, over }: DragEndEvent): Promise<void> {
    if (!over || active.id === over.id || !user || reordering) return;

    const from = shownTasks.findIndex((task) => task.id === active.id);
    const to = shownTasks.findIndex((task) => task.id === over.id);
    if (from < 0 || to < 0) return;

    const reordered = arrayMove(shownTasks, from, to);
    const updates = reordered
      .map((task, index) => ({ taskId: task.id, order: index + 1 }))
      .filter((update) => taskById.get(update.taskId)?.order !== update.order);
    if (!updates.length) return;

    setOrderedTaskIds(reordered.map((task) => task.id));
    setReordering(true);
    try {
      await updateTaskOrders(updates, user.uid);
      await onChanged();
    } catch {
      setOrderedTaskIds(tasks.map((task) => task.id));
      toast.error("تعذر حفظ الترتيب");
    } finally {
      setReordering(false);
    }
  }

  const badge =
    groupType === "DAILY"
      ? "يومية"
      : groupType === "RECURRING"
        ? "دورية"
        : groupType === "ONE_TIME"
          ? "غير متكررة"
          : null;

  const taskList = shownTasks.length ? (
    <DndContext sensors={sensors} onDragEnd={onTaskDragEnd}>
      <SortableContext
        items={shownTasks.map((task) => task.id)}
        strategy={verticalListSortingStrategy}
      >
        <div className="divide-y divide-border/60">
          {shownTasks.map((task) => (
            <TaskItemRow
              key={task.id}
              task={task}
              selectedDate={selectedDate}
              groups={groups}
              getNextTaskOrder={getNextTaskOrder}
              onChanged={onChanged}
              sortable={!reordering}
            />
          ))}
        </div>
      </SortableContext>
    </DndContext>
  ) : null;

  return (
    <section
      ref={setNodeRef}
      style={sortable ? { transform: CSS.Transform.toString(transform), transition } : undefined}
      className={`rounded-2xl border border-border/70 bg-card p-4 sm:p-5 ${isDragging ? "relative z-10 opacity-50" : ""}`}
    >
      <header className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <h2 className="text-base font-bold">
            <button
              type="button"
              className="flex min-w-0 items-center gap-2 rounded-lg text-right"
              aria-expanded={expanded}
              onClick={() => setExpanded((value) => !value)}
            >
              <ChevronDown
                className={`size-4 shrink-0 transition-transform ${expanded ? "" : "-rotate-90"}`}
              />
              <span className="truncate">{group.title}</span>
              {badge ? (
                <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
                  {badge}
                </span>
              ) : null}
            </button>
          </h2>
          {group.description ? (
            <p className="mt-1 text-sm leading-6 text-muted-foreground">{group.description}</p>
          ) : null}
        </div>
        <div className="flex shrink-0 items-center gap-1">
          {sortable ? (
            <button
              ref={setActivatorNodeRef}
              type="button"
              className="touch-none rounded-lg p-1 text-muted-foreground"
              aria-label={`سحب لترتيب مجموعة المهام: ${group.title}`}
              {...attributes}
              {...listeners}
            >
              <GripVertical className="size-4" />
            </button>
          ) : null}
          {!isTemplateGroup ? (
            <Button
              type="button"
              variant="outline"
              size="xs"
              className="rounded-lg"
              onClick={() => setCreatingTask(true)}
            >
              <Plus className="size-3" />
              إضافة مهمة
            </Button>
          ) : null}
          <TaskGroupActions group={group} onSuccess={onChanged} />
        </div>
      </header>

      {expanded ? (
        <div>
          {isTemplateGroup ? (
            <section className="mt-4">
              <div className="mb-3">
                <h3 className="text-sm font-semibold">مهام اليوم</h3>
              </div>
              {taskList ?? (
                <p className="rounded-xl bg-muted/60 px-3 py-2 text-sm text-muted-foreground">
                  لا توجد مهام مستحقة لهذا اليوم
                </p>
              )}
            </section>
          ) : (
            <div className="mt-3">
              {taskList ?? (
                <p className="rounded-xl bg-muted/60 px-3 py-2 text-sm text-muted-foreground">
                  لا توجد مهام داخل هذه المجموعة
                </p>
              )}
            </div>
          )}

          {isTemplateGroup ? (
            <TaskTemplateList
              group={group}
              templates={templates}
              nextOrder={getNextTemplateOrder(group.id)}
              onChanged={onChanged}
            />
          ) : null}
        </div>
      ) : null}

      <TaskForm
        open={creatingTask}
        mode="create"
        teamId={group.teamId}
        memberId={group.memberId}
        date={selectedDate}
        groupId={group.id}
        groupType={groupType}
        order={getNextTaskOrder(group.id)}
        onClose={() => setCreatingTask(false)}
        onSuccess={onChanged}
      />
    </section>
  );
}
