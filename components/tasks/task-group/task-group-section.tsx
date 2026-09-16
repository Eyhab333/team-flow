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
import { TaskItemRow } from "@/components/tasks/task-item/task-item-row";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/auth/use-auth";
import type { DailyTaskGroupView } from "@/hooks/tasks/use-daily-tasks";
import { updateTaskOrders } from "@/lib/firestore/tasks";
import type { Task } from "@/types/task";

interface TaskGroupSectionProps {
  groupView: DailyTaskGroupView;
  selectedDate: string;
  groups: DailyTaskGroupView[];
  getNextTaskOrder: (groupId: string) => number;
  onChanged: () => void | Promise<void>;
  sortable?: boolean;
  isGroupReordering?: boolean;
}

export function TaskGroupSection({
  groupView,
  selectedDate,
  groups,
  getNextTaskOrder,
  onChanged,
  sortable = false,
  isGroupReordering = false,
}: TaskGroupSectionProps) {
  const { user } = useAuth();
  const { group, tasks } = groupView;
  const [isCreatingTask, setIsCreatingTask] = useState(false);
  const [isExpanded, setIsExpanded] = useState(true);
  const [isReorderingTasks, setIsReorderingTasks] = useState(false);
  const [orderedTaskIds, setOrderedTaskIds] = useState<string[]>(() =>
    tasks.map((task) => task.id),
  );
  const taskOrderKey = tasks
    .map((task) => `${task.id}:${task.order}`)
    .join("|");
  const taskSensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 8 },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );
  const {
    attributes: groupAttributes,
    listeners: groupListeners,
    setNodeRef: setGroupNodeRef,
    setActivatorNodeRef: setGroupActivatorNodeRef,
    transform: groupTransform,
    transition: groupTransition,
    isDragging: isGroupDragging,
  } = useSortable({
    id: `group:${group.id}`,
    disabled: !sortable || isGroupReordering || isCreatingTask,
  });
  const tasksId = `task-group-tasks-${group.id}`;
  const tasksById = useMemo(
    () => new Map(tasks.map((task) => [task.id, task])),
    [tasks],
  );
  const displayedTasks = orderedTaskIds
    .map((taskId) => tasksById.get(taskId))
    .filter((task): task is Task => task !== undefined);

  useEffect(() => {
    setOrderedTaskIds(tasks.map((task) => task.id));
  }, [taskOrderKey, tasks]);

  async function handleTaskDragEnd({ active, over }: DragEndEvent): Promise<void> {
    if (!over || active.id === over.id || !user || isReorderingTasks) {
      return;
    }

    const oldIndex = displayedTasks.findIndex((task) => task.id === active.id);
    const newIndex = displayedTasks.findIndex((task) => task.id === over.id);

    if (oldIndex < 0 || newIndex < 0) {
      return;
    }

    const reorderedTasks = arrayMove(displayedTasks, oldIndex, newIndex);
    const updates = reorderedTasks
      .map((task, index) => ({ taskId: task.id, order: index + 1 }))
      .filter((update) => {
        const task = tasksById.get(update.taskId);

        return task?.order !== update.order;
      });

    if (updates.length === 0) {
      return;
    }

    setOrderedTaskIds(reorderedTasks.map((task) => task.id));
    setIsReorderingTasks(true);

    try {
      await updateTaskOrders(updates, user.uid);
      await onChanged();
    } catch {
      setOrderedTaskIds(tasks.map((task) => task.id));
      toast.error("تعذر حفظ الترتيب");
    } finally {
      setIsReorderingTasks(false);
    }
  }

  return (
    <section
      ref={setGroupNodeRef}
      style={
        sortable
          ? {
              transform: CSS.Transform.toString(groupTransform),
              transition: groupTransition,
            }
          : undefined
      }
      className={`rounded-2xl border border-border/70 bg-card p-4 sm:p-5 ${
        isGroupDragging ? "relative z-10 opacity-50" : ""
      }`}
    >
      <header className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <h2 className="text-base font-bold text-foreground">
            <button
              type="button"
              className="flex min-w-0 items-center gap-2 rounded-lg text-right outline-none transition-colors hover:text-primary focus-visible:ring-3 focus-visible:ring-ring/30"
              aria-expanded={isExpanded}
              aria-controls={tasksId}
              onClick={() => setIsExpanded((expanded) => !expanded)}
            >
              <ChevronDown
                aria-hidden="true"
                className={`size-4 shrink-0 transition-transform ${
                  isExpanded ? "" : "-rotate-90"
                }`}
              />
              <span className="truncate">{group.title}</span>
            </button>
          </h2>
          {group.description ? (
            <p className="mt-1 text-sm leading-6 text-muted-foreground">
              {group.description}
            </p>
          ) : null}
        </div>

        <div className="flex shrink-0 items-center gap-1">
          {sortable ? (
            <button
              ref={setGroupActivatorNodeRef}
              type="button"
              className="touch-none rounded-lg p-1 text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/30"
              aria-label={`سحب لترتيب مجموعة المهام: ${group.title}`}
              {...groupAttributes}
              {...groupListeners}
            >
              <GripVertical aria-hidden="true" className="size-4" />
            </button>
          ) : null}
          <Button
            type="button"
            variant="outline"
            size="xs"
            className="rounded-lg"
            onClick={() => setIsCreatingTask(true)}
          >
            <Plus aria-hidden="true" className="size-3" />
            إضافة مهمة
          </Button>
          <TaskGroupActions group={group} onSuccess={onChanged} />
        </div>
      </header>

      {isExpanded ? (
        <div id={tasksId}>
          {displayedTasks.length > 0 ? (
            <DndContext sensors={taskSensors} onDragEnd={handleTaskDragEnd}>
              <SortableContext
                items={displayedTasks.map((task) => task.id)}
                strategy={verticalListSortingStrategy}
              >
                <div className="mt-3 divide-y divide-border/60">
                  {displayedTasks.map((task) => (
                    <TaskItemRow
                      key={task.id}
                      task={task}
                      selectedDate={selectedDate}
                      groups={groups}
                      getNextTaskOrder={getNextTaskOrder}
                      onChanged={onChanged}
                      sortable={!isReorderingTasks}
                    />
                  ))}
                </div>
              </SortableContext>
            </DndContext>
          ) : (
            <p className="mt-4 rounded-xl bg-muted/60 px-3 py-2 text-sm text-muted-foreground">
              لا توجد مهام داخل هذه المجموعة
            </p>
          )}
        </div>
      ) : null}

      <TaskForm
        open={isCreatingTask}
        mode="create"
        teamId={group.teamId}
        memberId={group.memberId}
        originalDate={group.originalDate}
        groupId={group.id}
        order={getNextTaskOrder(group.id)}
        onClose={() => setIsCreatingTask(false)}
        onSuccess={onChanged}
      />
    </section>
  );
}
