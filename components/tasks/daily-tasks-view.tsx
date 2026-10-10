"use client";

import { DndContext, KeyboardSensor, PointerSensor, useSensor, useSensors, type DragEndEvent } from "@dnd-kit/core";
import { arrayMove, SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { ClipboardList, LoaderCircle, Plus, RefreshCw } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import { DailyDateNavigation } from "@/components/tasks/daily-date-navigation";
import { TaskGroupForm } from "@/components/tasks/task-group/task-group-form";
import { TaskGroupSection } from "@/components/tasks/task-group/task-group-section";
import { TaskItemRow } from "@/components/tasks/task-item/task-item-row";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/auth/use-auth";
import { type DailyTaskGroupView, useDailyTasks } from "@/hooks/tasks/use-daily-tasks";
import { updateTaskGroupOrder } from "@/lib/firestore/task-groups";
import type { TaskGroupType } from "@/types/task-group";

function getTodayDate(): string { const date = new Date(); return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`; }
function shiftDate(value: string, days: number): string { const [year, month, day] = value.split("-").map(Number); const date = new Date(year, month - 1, day); date.setDate(date.getDate() + days); return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`; }

export function DailyTasksView({ teamId, memberId }: { teamId: string; memberId: string }) {
  const { user } = useAuth();
  const [selectedDate, setSelectedDate] = useState(getTodayDate);
  const [isChoosingGroupType, setIsChoosingGroupType] = useState(false);
  const [newGroupType, setNewGroupType] = useState<TaskGroupType | null>(null);
  const [orderedIds, setOrderedIds] = useState<string[]>([]);
  const [isReorderingGroups, setIsReorderingGroups] = useState(false);
  const { date, groups, ungroupedTasks, summary, isLoading, error, refresh, nextGroupOrder, getNextTaskOrder, getNextTemplateOrder } = useDailyTasks(teamId, memberId, selectedDate);
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }), useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }));
  const byId = useMemo(() => new Map(groups.map((view) => [view.group.id, view])), [groups]);
  const displayedGroups = orderedIds.map((id) => byId.get(id)).filter((view): view is DailyTaskGroupView => Boolean(view));
  useEffect(() => setOrderedIds(groups.map((view) => view.group.id)), [groups]);

  async function onGroupDragEnd({ active, over }: DragEndEvent): Promise<void> {
    if (!over || active.id === over.id || !user || isReorderingGroups) return;
    const from = displayedGroups.findIndex((view) => `group:${view.group.id}` === active.id);
    const to = displayedGroups.findIndex((view) => `group:${view.group.id}` === over.id);
    if (from < 0 || to < 0) return;
    const reordered = arrayMove(displayedGroups, from, to);
    const updates = reordered.map((view, index) => ({ group: view.group, order: index + 1 })).filter(({ group, order }) => group.order !== order);
    if (!updates.length) return;
    setOrderedIds(reordered.map((view) => view.group.id)); setIsReorderingGroups(true);
    try { await Promise.all(updates.map(({ group, order }) => updateTaskGroupOrder(group.id, order, user.uid))); await refresh(); }
    catch { setOrderedIds(groups.map((view) => view.group.id)); toast.error("تعذر حفظ الترتيب"); }
    finally { setIsReorderingGroups(false); }
  }

  const header = <header className="space-y-3"><div className="flex flex-wrap items-center justify-between gap-3"><div><h2 className="text-base font-bold">المهام اليومية</h2>{!isLoading && !error ? <p className="mt-1 text-sm text-muted-foreground">{summary.total} مهام · {summary.completed} منجزة · {summary.inProgress} جاري العمل عليها · {summary.remaining} متبقية</p> : null}</div><Button type="button" size="sm" className="rounded-xl" onClick={() => setIsChoosingGroupType(true)} disabled={isLoading || Boolean(error)}><Plus className="size-3.5" />إضافة مجموعة مهام</Button></div><DailyDateNavigation date={date} isToday={date === getTodayDate()} onPreviousDay={() => setSelectedDate((current) => shiftDate(current, -1))} onNextDay={() => setSelectedDate((current) => shiftDate(current, 1))} onToday={() => setSelectedDate(getTodayDate())} /></header>;
  const form = newGroupType ? <TaskGroupForm open mode="create" type={newGroupType} teamId={teamId} memberId={memberId} originalDate={date} order={nextGroupOrder} onClose={() => setNewGroupType(null)} onSuccess={refresh} /> : null;
  const choice = isChoosingGroupType ? <div className="fixed inset-0 z-[60] flex items-center justify-center p-4"><button type="button" className="absolute inset-0 bg-black/50" aria-label="إغلاق" onClick={() => setIsChoosingGroupType(false)} /><section role="dialog" aria-modal="true" className="relative z-10 w-full max-w-md rounded-2xl border border-border/70 bg-card p-5 shadow-2xl"><h2 className="text-base font-bold">اختر نوع مجموعة المهام</h2><div className="mt-4 grid gap-2 sm:grid-cols-2">{([ ["DAILY", "مهام يومية"], ["RECURRING", "مهام دورية"], ["ONE_TIME", "مهام غير متكررة"], ["EXTENDED", "مهام ممتدة"] ] as const).map(([type, label]) => <Button key={type} type="button" variant="outline" className="h-auto justify-start rounded-xl py-4" onClick={() => { setNewGroupType(type); setIsChoosingGroupType(false); }}>{label}</Button>)}</div></section></div> : null;
  if (isLoading) return <section className="space-y-4">{header}<div className="flex min-h-48 items-center justify-center rounded-2xl border border-border/70 bg-card"><LoaderCircle className="size-4 animate-spin" /> جارٍ تحميل المهام</div>{choice}{form}</section>;
  if (error) return <section className="space-y-4">{header}<div className="flex min-h-48 flex-col items-center justify-center rounded-2xl border border-border/70 bg-card"><p>تعذر تحميل مهام اليوم</p><Button variant="outline" size="sm" className="mt-3" onClick={() => void refresh()}><RefreshCw className="size-3.5" />إعادة المحاولة</Button></div>{choice}{form}</section>;
  return <section className="space-y-4">{header}{groups.length === 0 && ungroupedTasks.length === 0 ? <div className="flex min-h-48 flex-col items-center justify-center rounded-2xl border border-dashed border-border/80 bg-card/60"><ClipboardList className="size-6 text-muted-foreground" /><h3 className="mt-3 text-sm font-bold">لا توجد مهام لهذا اليوم</h3></div> : <DndContext sensors={sensors} onDragEnd={onGroupDragEnd}><SortableContext items={displayedGroups.map((view) => `group:${view.group.id}`)} strategy={verticalListSortingStrategy}><div className="space-y-3">{displayedGroups.map((view) => <TaskGroupSection key={view.group.id} groupView={view} selectedDate={date} groups={groups} getNextTaskOrder={getNextTaskOrder} getNextTemplateOrder={getNextTemplateOrder} onChanged={refresh} sortable={!isReorderingGroups} isGroupReordering={isReorderingGroups} />)}</div></SortableContext></DndContext>}{ungroupedTasks.length ? <section className="rounded-2xl border border-amber-500/20 bg-card p-4"><h2 className="text-sm font-bold">مهام بدون مجموعة</h2><div className="mt-3 divide-y divide-border/60">{ungroupedTasks.map((task) => <TaskItemRow key={task.id} task={task} selectedDate={date} onChanged={refresh} />)}</div></section> : null}{choice}{form}</section>;
}
