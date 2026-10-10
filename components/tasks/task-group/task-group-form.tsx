"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { LoaderCircle, X } from "lucide-react";
import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/auth/use-auth";
import { createTaskGroup, updateTaskGroup } from "@/lib/firestore/task-groups";
import { DEFAULT_WORKDAYS, type TaskGroup, type TaskGroupType, type WorkdayCode } from "@/types/task-group";

const schema = z.object({ title: z.string().trim().min(1, "اسم المجموعة مطلوب."), description: z.string(), workdays: z.array(z.string()).optional() });
type Values = z.infer<typeof schema>;
const WORKDAYS: Array<{ code: WorkdayCode; label: string }> = [{ code: "SUN", label: "الأحد" }, { code: "MON", label: "الاثنين" }, { code: "TUE", label: "الثلاثاء" }, { code: "WED", label: "الأربعاء" }, { code: "THU", label: "الخميس" }, { code: "FRI", label: "الجمعة" }, { code: "SAT", label: "السبت" }];

interface Common { open: boolean; onClose: () => void; onSuccess: () => void | Promise<void>; }
interface CreateProps extends Common { mode: "create"; teamId: string; memberId: string; originalDate: string; order: number; type: TaskGroupType; }
interface EditProps extends Common { mode: "edit"; group: TaskGroup; }
type Props = CreateProps | EditProps;

export function TaskGroupForm(props: Props) {
  const { user } = useAuth();
  const isEditing = props.mode === "edit";
  const type: TaskGroupType = props.mode === "edit" ? props.group.type ?? "EXTENDED" : props.type;
  const { register, handleSubmit, reset, watch, formState: { errors, isSubmitting } } = useForm<Values>({ resolver: zodResolver(schema), defaultValues: { title: props.mode === "edit" ? props.group.title : "", description: props.mode === "edit" ? props.group.description : "", workdays: props.mode === "edit" ? props.group.workdays ?? DEFAULT_WORKDAYS : DEFAULT_WORKDAYS } });
  const selectedWorkdays = watch("workdays") ?? [];
  useEffect(() => { if (props.open) reset({ title: props.mode === "edit" ? props.group.title : "", description: props.mode === "edit" ? props.group.description : "", workdays: props.mode === "edit" ? props.group.workdays ?? DEFAULT_WORKDAYS : DEFAULT_WORKDAYS }); }, [isEditing, props, reset]);
  useEffect(() => { if (!props.open) return; const close = (event: KeyboardEvent) => { if (event.key === "Escape" && !isSubmitting) props.onClose(); }; window.addEventListener("keydown", close); return () => window.removeEventListener("keydown", close); }, [isSubmitting, props]);
  if (!props.open) return null;
  async function submit(values: Values): Promise<void> {
    if (!user) { toast.error("تعذر حفظ مجموعة المهام"); return; }
    try {
      if (props.mode === "edit") await updateTaskGroup(props.group.id, { title: values.title, description: values.description, ...(type === "DAILY" ? { workdays: values.workdays as WorkdayCode[] } : {}), updatedBy: user.uid });
      else await createTaskGroup({ teamId: props.teamId, memberId: props.memberId, title: values.title, description: values.description, originalDate: props.originalDate, order: props.order, type, ...(type === "DAILY" ? { workdays: values.workdays as WorkdayCode[] } : {}), createdBy: user.uid, createdByName: user.displayName });
      await props.onSuccess(); toast.success(isEditing ? "تم تحديث مجموعة المهام" : "تمت إضافة مجموعة المهام"); props.onClose();
    } catch { toast.error(isEditing ? "تعذر تحديث مجموعة المهام" : "تعذر إضافة مجموعة المهام"); }
  }
  return <div className="fixed inset-0 z-[60] flex items-center justify-center p-4"><button type="button" className="absolute inset-0 bg-black/50" onClick={props.onClose} disabled={isSubmitting} aria-label="إغلاق" /><section role="dialog" aria-modal="true" className="relative z-10 w-full max-w-md rounded-2xl border border-border/70 bg-card p-5 shadow-2xl"><header className="flex items-center justify-between gap-3"><h2 className="text-base font-bold">{isEditing ? "تعديل مجموعة المهام" : "إضافة مجموعة"}</h2><Button type="button" variant="ghost" size="icon-sm" onClick={props.onClose} disabled={isSubmitting}><X className="size-4" /></Button></header><form className="mt-5 space-y-4" onSubmit={handleSubmit(submit)} noValidate><div className="space-y-2"><label htmlFor="task-group-title" className="text-sm font-medium">اسم المجموعة</label><input id="task-group-title" autoFocus className="h-10 w-full rounded-xl border border-input bg-background px-3 text-sm" {...register("title")} />{errors.title ? <p className="text-sm text-destructive">{errors.title.message}</p> : null}</div><div className="space-y-2"><label htmlFor="task-group-description" className="text-sm font-medium">الوصف</label><textarea id="task-group-description" rows={3} className="w-full rounded-xl border border-input bg-background px-3 py-2 text-sm" {...register("description")} /></div>{type === "DAILY" ? <fieldset className="space-y-2"><legend className="text-sm font-medium">أيام العمل</legend><div className="flex flex-wrap gap-2">{WORKDAYS.map(({ code, label }) => <label key={code} className="flex items-center gap-1.5 rounded-lg border border-border px-2 py-1.5 text-sm"><input type="checkbox" value={code} checked={selectedWorkdays.includes(code)} {...register("workdays")} />{label}</label>)}</div></fieldset> : null}<div className="flex justify-end gap-2"><Button type="button" variant="ghost" size="sm" onClick={props.onClose} disabled={isSubmitting}>إلغاء</Button><Button type="submit" size="sm" disabled={isSubmitting}>{isSubmitting ? <><LoaderCircle className="size-3.5 animate-spin" />جارٍ الحفظ</> : isEditing ? "حفظ التعديلات" : "إضافة المجموعة"}</Button></div></form></section></div>;
}

