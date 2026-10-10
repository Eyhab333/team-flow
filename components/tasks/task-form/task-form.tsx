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
import type { TaskGroupType } from "@/types/task-group";

const schema = z.object({ title: z.string().trim().min(1, "المهمة مطلوبة."), description: z.string(), groupId: z.string().min(1, "اختر مجموعة المهام."), startDate: z.string().optional(), dueDate: z.string().optional() }).superRefine((values, context) => { if (values.startDate && values.dueDate && values.dueDate < values.startDate) context.addIssue({ code: "custom", path: ["dueDate"], message: "تاريخ الاستحقاق يجب أن يكون بعد تاريخ البدء أو مساويًا له." }); });
type Values = z.infer<typeof schema>;
type Common = { open: boolean; onClose: () => void; onSuccess: () => void | Promise<void>; };
type CreateProps = Common & { mode: "create"; teamId: string; memberId: string; date: string; groupId: string; groupType?: TaskGroupType; order: number; };
type EditProps = Common & { mode: "edit"; task: Task; groups: DailyTaskGroupView[]; getNextTaskOrder: (groupId: string) => number; };

export function TaskForm(props: CreateProps | EditProps) {
  const { user } = useAuth(); const editing = props.mode === "edit"; const currentGroupType = props.mode === "edit" ? (props.groups.find(({ group }) => group.id === props.task.groupId)?.group.type ?? "EXTENDED") : props.groupType ?? "EXTENDED"; const isOneTime = currentGroupType === "ONE_TIME";
  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<Values>({ resolver: zodResolver(schema), defaultValues: { title: props.mode === "edit" ? props.task.title : "", description: props.mode === "edit" ? props.task.description : "", groupId: props.mode === "edit" ? props.task.groupId : props.groupId, startDate: props.mode === "edit" ? props.task.startDate ?? "" : props.date, dueDate: props.mode === "edit" ? props.task.dueDate ?? "" : "" } });
  useEffect(() => { if (props.open) reset({ title: props.mode === "edit" ? props.task.title : "", description: props.mode === "edit" ? props.task.description : "", groupId: props.mode === "edit" ? props.task.groupId : props.groupId, startDate: props.mode === "edit" ? props.task.startDate ?? "" : props.date, dueDate: props.mode === "edit" ? props.task.dueDate ?? "" : "" }); }, [editing, props, reset]);
  if (!props.open) return null;
  async function submit(values: Values): Promise<void> { if (!user) return; try { if (props.mode === "edit") { const moved = values.groupId !== props.task.groupId; await updateTask(props.task.id, { title: values.title, description: values.description, groupId: values.groupId, order: moved ? props.getNextTaskOrder(values.groupId) : props.task.order, ...(isOneTime ? { startDate: values.startDate || undefined, dueDate: values.dueDate || undefined } : {}), updatedBy: user.uid }); } else { const startDate = isOneTime ? values.startDate || props.date : props.date; await createTask({ teamId: props.teamId, memberId: props.memberId, groupId: props.groupId, title: values.title, description: values.description, originalDate: startDate, workDate: startDate, ...(isOneTime ? { startDate, dueDate: values.dueDate || undefined } : {}), order: props.order, roadmapGoalId: null, createdBy: user.uid, createdByName: user.displayName }); } await props.onSuccess(); toast.success(editing ? "تم تحديث المهمة" : "تمت إضافة المهمة"); props.onClose(); } catch { toast.error(editing ? "تعذر تحديث المهمة" : "تعذر إضافة المهمة"); } }
  return <div className="fixed inset-0 z-[60] flex items-center justify-center p-4"><button type="button" className="absolute inset-0 bg-black/50" onClick={props.onClose} aria-label="إغلاق" /><section role="dialog" aria-modal="true" className="relative z-10 w-full max-w-md rounded-2xl border border-border/70 bg-card p-5 shadow-2xl"><header className="flex justify-between"><h2 className="text-base font-bold">{editing ? "تعديل المهمة" : "إضافة مهمة"}</h2><Button type="button" variant="ghost" size="icon-sm" onClick={props.onClose}><X className="size-4" /></Button></header><form className="mt-5 space-y-4" onSubmit={handleSubmit(submit)}><input className="h-10 w-full rounded-xl border border-input bg-background px-3 text-sm" placeholder="اكتب المهمة المطلوبة" {...register("title")} />{errors.title ? <p className="text-xs text-destructive">{errors.title.message}</p> : null}<textarea rows={3} className="w-full rounded-xl border border-input bg-background px-3 py-2 text-sm" placeholder="تفاصيل إضافية - اختياري" {...register("description")} />{editing ? <select className="h-10 w-full rounded-xl border border-input bg-background px-3 text-sm" {...register("groupId")}>{props.groups.filter(({ group }) => group.id === props.task.groupId || ((group.type ?? "EXTENDED") !== "DAILY" && (group.type ?? "EXTENDED") !== "RECURRING")).map(({ group }) => <option key={group.id} value={group.id}>{group.title}</option>)}</select> : null}{isOneTime ? <div className="grid gap-3 sm:grid-cols-2"><label className="text-sm">تاريخ البدء<input type="date" className="mt-1 h-10 w-full rounded-xl border border-input bg-background px-3" {...register("startDate")} /></label><label className="text-sm">تاريخ الاستحقاق<input type="date" className="mt-1 h-10 w-full rounded-xl border border-input bg-background px-3" {...register("dueDate")} /></label>{errors.dueDate ? <p className="text-xs text-destructive sm:col-span-2">{errors.dueDate.message}</p> : null}</div> : null}<div className="flex justify-end gap-2"><Button type="button" variant="ghost" size="sm" onClick={props.onClose}>إلغاء</Button><Button type="submit" size="sm" disabled={isSubmitting}>{isSubmitting ? <LoaderCircle className="size-3.5 animate-spin" /> : "حفظ"}</Button></div></form></section></div>;
}

