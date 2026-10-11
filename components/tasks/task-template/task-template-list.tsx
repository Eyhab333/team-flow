"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { ChevronDown, LoaderCircle, Pause, Pencil, Play, Plus } from "lucide-react";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/auth/use-auth";
import {
  createTaskTemplate,
  setTaskTemplateActive,
  updateTaskTemplate,
} from "@/lib/firestore/task-templates";
import type { TaskGroup, WorkdayCode } from "@/types/task-group";
import type { TaskTemplate, TaskTemplateRecurrence } from "@/types/task-template";

const schema = z.object({
  title: z.string().trim().min(1, "المهمة مطلوبة."),
  description: z.string(),
  kind: z.enum(["WEEKLY", "MONTHLY"]).optional(),
  weekdays: z.array(z.string()).optional(),
  firstDueDate: z.string().optional(),
});

type FormInput = z.input<typeof schema>;
type FormValues = z.output<typeof schema>;

const DAYS = [
  ["SUN", "الأحد"],
  ["MON", "الاثنين"],
  ["TUE", "الثلاثاء"],
  ["WED", "الأربعاء"],
  ["THU", "الخميس"],
  ["FRI", "الجمعة"],
  ["SAT", "السبت"],
] as const;

function getRiyadhDate(): string {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Riyadh",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());
  const part = (type: Intl.DateTimeFormatPartTypes): string =>
    parts.find((item) => item.type === type)?.value ?? "";

  return `${part("year")}-${part("month")}-${part("day")}`;
}

function formatArabicDate(dateValue: string): string {
  const [year, month, day] = dateValue.split("-").map(Number);

  return new Intl.DateTimeFormat("ar-EG-u-ca-gregory", {
    timeZone: "Asia/Riyadh",
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(new Date(Date.UTC(year, month - 1, day, 12)));
}

function nextMonthlyDueDate(recurrence: Extract<TaskTemplateRecurrence, { kind: "MONTHLY" }>): string {
  const today = getRiyadhDate();
  const firstDueDate = recurrence.firstDueDate;
  const threshold = firstDueDate && firstDueDate > today ? firstDueDate : today;
  const [initialYear, initialMonth] = threshold.split("-").map(Number);

  for (let offset = 0; offset < 24; offset += 1) {
    const monthIndex = initialMonth - 1 + offset;
    const year = initialYear + Math.floor(monthIndex / 12);
    const month = (monthIndex % 12) + 1;
    const daysInMonth = new Date(Date.UTC(year, month, 0)).getUTCDate();

    if (recurrence.dayOfMonth > daysInMonth) continue;

    const candidate = `${year}-${String(month).padStart(2, "0")}-${String(recurrence.dayOfMonth).padStart(2, "0")}`;
    if (candidate >= threshold) return candidate;
  }

  return threshold;
}

function recurrenceSummary(recurrence: TaskTemplateRecurrence): string {
  if (recurrence.kind === "DAILY") return "كل يوم عمل";
  if (recurrence.kind === "MONTHLY") {
    return `شهريًا · الاستحقاق القادم: ${formatArabicDate(nextMonthlyDueDate(recurrence))}`;
  }

  const weekdayNames = recurrence.weekdays.reduce<string[]>((names, weekday) => {
    const weekdayName = DAYS.find(([code]) => code === weekday)?.[1];
    if (weekdayName) names.push(weekdayName);
    return names;
  }, []);

  return weekdayNames.length ? `أسبوعيًا — ${weekdayNames.join("، ")}` : "أسبوعيًا";
}

export function TaskTemplateList({
  group,
  templates,
  nextOrder,
  onChanged,
}: {
  group: TaskGroup;
  templates: TaskTemplate[];
  nextOrder: number;
  onChanged: () => void | Promise<void>;
}) {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<TaskTemplate | null>(null);
  const [isExpanded, setIsExpanded] = useState(false);
  const type = group.type ?? "EXTENDED";
  const {
    register,
    handleSubmit,
    reset,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<FormInput, unknown, FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      title: "",
      description: "",
      kind: "WEEKLY",
      weekdays: [],
      firstDueDate: "",
    },
  });
  const isRecurring = type === "RECURRING";
  const current = editing ?? undefined;
  const chosenWeekdays = watch("weekdays") ?? [];
  const contentId = `task-template-settings-${group.id}`;

  function begin(template?: TaskTemplate): void {
    setEditing(template ?? null);
    reset({
      title: template?.title ?? "",
      description: template?.description ?? "",
      kind: template?.recurrence.kind === "MONTHLY" ? "MONTHLY" : "WEEKLY",
      weekdays: template?.recurrence.kind === "WEEKLY" ? template.recurrence.weekdays : [],
      firstDueDate:
        template?.recurrence.kind === "MONTHLY"
          ? template.recurrence.firstDueDate ?? nextMonthlyDueDate(template.recurrence)
          : "",
    });
    setOpen(true);
  }

  async function submit(values: FormValues): Promise<void> {
    if (!user) return;

    let recurrence: TaskTemplateRecurrence;

    if (type === "DAILY") {
      recurrence = { kind: "DAILY" };
    } else if (values.kind === "MONTHLY") {
      const firstDueDate = values.firstDueDate?.trim() ?? "";

      if (!/^\d{4}-\d{2}-\d{2}$/.test(firstDueDate)) {
        toast.error("اختر تاريخ أول استحقاق صحيحًا");
        return;
      }

      recurrence = {
        kind: "MONTHLY",
        dayOfMonth: Number(firstDueDate.slice(-2)),
        firstDueDate,
      };
    } else {
      recurrence = { kind: "WEEKLY", weekdays: (values.weekdays ?? []) as WorkdayCode[] };
    }

    if (recurrence.kind === "WEEKLY" && recurrence.weekdays.length === 0) {
      toast.error("اختر يومًا واحدًا على الأقل");
      return;
    }

    try {
      if (current) {
        await updateTaskTemplate(current.id, {
          title: values.title,
          description: values.description,
          recurrence,
          updatedBy: user.uid,
        });
      } else {
        await createTaskTemplate({
          teamId: group.teamId,
          memberId: group.memberId,
          groupId: group.id,
          title: values.title,
          description: values.description,
          recurrence,
          order: nextOrder,
          createdBy: user.uid,
          createdByName: user.displayName,
        });
      }

      await onChanged();
      toast.success(current ? "تم تحديث المهمة المتكررة" : "تمت إضافة المهمة المتكررة");
      setOpen(false);
    } catch {
      toast.error("تعذر حفظ المهمة المتكررة");
    }
  }

  async function toggle(template: TaskTemplate): Promise<void> {
    if (!user) return;

    try {
      await setTaskTemplateActive(template.id, !template.active, user.uid);
      await onChanged();
      toast.success(template.active ? "تم إيقاف المهمة المتكررة" : "تمت إعادة تفعيل المهمة المتكررة");
    } catch {
      toast.error("تعذر تحديث المهمة المتكررة");
    }
  }

  return (
    <div className="mt-4 rounded-xl border border-dashed border-border/80 bg-muted/30 p-3">
      <button
        type="button"
        className="flex w-full items-center justify-between gap-2 rounded-lg text-right outline-none transition-colors hover:text-primary focus-visible:ring-3 focus-visible:ring-ring/30"
        aria-expanded={isExpanded}
        aria-controls={contentId}
        onClick={() => setIsExpanded((value) => !value)}
      >
        <span className="text-sm font-semibold">إعداد المهام المتكررة</span>
        <ChevronDown
          aria-hidden="true"
          className={`size-4 shrink-0 text-muted-foreground transition-transform ${isExpanded ? "" : "-rotate-90"}`}
        />
      </button>

      {isExpanded ? (
        <div id={contentId} className="mt-3">
          <div className="flex items-start justify-between gap-2">
            <p className="text-xs text-muted-foreground">
              هذه التعريفات تُنشئ مهامًا تلقائيًا عند موعد الاستحقاق.
            </p>
            <Button
              type="button"
              variant="outline"
              size="xs"
              className="shrink-0 rounded-lg"
              onClick={() => begin()}
            >
              <Plus className="size-3" />
              إضافة مهمة متكررة
            </Button>
          </div>

          <div className="mt-3 space-y-2">
            {templates.length ? (
              templates.map((template) => (
                <div
                  key={template.id}
                  className={`flex items-center justify-between gap-2 rounded-lg border border-border/60 px-3 py-2 text-sm ${template.active ? "" : "opacity-60"}`}
                >
                  <div className="min-w-0">
                    <span className="block truncate font-medium">{template.title}</span>
                    <span className="text-xs text-muted-foreground">
                      {recurrenceSummary(template.recurrence)}
                    </span>
                  </div>
                  <div className="flex shrink-0 items-center gap-1">
                    <Button
                      type="button"
                      variant="ghost"
                      size="xs"
                      onClick={() => begin(template)}
                      aria-label={`تعديل المهمة المتكررة: ${template.title}`}
                    >
                      <Pencil className="size-3.5" />
                      تعديل
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-sm"
                      onClick={() => void toggle(template)}
                      aria-label={template.active ? "إيقاف" : "إعادة تفعيل"}
                    >
                      {template.active ? <Pause className="size-3.5" /> : <Play className="size-3.5" />}
                    </Button>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-xs text-muted-foreground">لا توجد مهام متكررة بعد.</p>
            )}
          </div>
        </div>
      ) : null}

      {open ? (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
          <button
            type="button"
            className="absolute inset-0 bg-black/50"
            onClick={() => setOpen(false)}
            aria-label="إغلاق"
          />
          <section
            role="dialog"
            aria-modal="true"
            className="relative z-10 w-full max-w-md rounded-2xl border border-border/70 bg-card p-5 shadow-2xl"
          >
            <h2 className="text-base font-bold">
              {current ? "تعديل مهمة متكررة" : "إضافة مهمة متكررة"}
            </h2>
            <form className="mt-4 space-y-3" onSubmit={handleSubmit(submit)}>
              <input
                className="h-10 w-full rounded-xl border border-input bg-background px-3 text-sm"
                placeholder="عنوان المهمة"
                {...register("title")}
              />
              {errors.title ? <p className="text-xs text-destructive">{errors.title.message}</p> : null}
              <textarea
                rows={3}
                className="w-full rounded-xl border border-input bg-background px-3 py-2 text-sm"
                placeholder="وصف اختياري"
                {...register("description")}
              />
              {isRecurring ? (
                <>
                  <select
                    className="h-10 w-full rounded-xl border border-input bg-background px-3 text-sm"
                    {...register("kind")}
                  >
                    <option value="WEEKLY">أسبوعيًا</option>
                    <option value="MONTHLY">شهريًا</option>
                  </select>
                  {watch("kind") === "MONTHLY" ? (
                    <label className="block text-sm">
                      تاريخ أول استحقاق
                      <input
                        type="date"
                        className="mt-1 h-10 w-full rounded-xl border border-input bg-background px-3 text-sm"
                        {...register("firstDueDate")}
                      />
                    </label>
                  ) : (
                    <div className="flex flex-wrap gap-2">
                      {DAYS.map(([code, label]) => (
                        <label key={code} className="flex items-center gap-1 text-xs">
                          <input
                            type="checkbox"
                            value={code}
                            checked={chosenWeekdays.includes(code)}
                            {...register("weekdays")}
                          />
                          {label}
                        </label>
                      ))}
                    </div>
                  )}
                </>
              ) : null}
              <div className="flex justify-end gap-2">
                <Button type="button" variant="ghost" size="sm" onClick={() => setOpen(false)}>
                  إلغاء
                </Button>
                <Button type="submit" size="sm" disabled={isSubmitting}>
                  {isSubmitting ? <LoaderCircle className="size-3.5 animate-spin" /> : "حفظ"}
                </Button>
              </div>
            </form>
          </section>
        </div>
      ) : null}
    </div>
  );
}
