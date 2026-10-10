import { FieldValue } from "firebase-admin/firestore";
import { HttpsError, onCall } from "firebase-functions/v2/https";
import { onSchedule } from "firebase-functions/v2/scheduler";

import { db } from "../firebase-admin.js";

type WorkdayCode = "SUN" | "MON" | "TUE" | "WED" | "THU" | "FRI" | "SAT";
type TemplateRecurrence =
  | { kind: "DAILY" }
  | { kind: "WEEKLY"; weekdays: WorkdayCode[] }
  | { kind: "MONTHLY"; dayOfMonth: number };

interface TaskTemplateRecord {
  id: string;
  teamId: string;
  memberId: string;
  groupId: string;
  title: string;
  description: string;
  recurrence: TemplateRecurrence;
  active: boolean;
  order: number;
  createdBy: string;
  createdByName: string;
}

interface TaskGroupRecord {
  type?: "EXTENDED" | "DAILY" | "RECURRING" | "ONE_TIME";
  workdays?: WorkdayCode[];
  active: boolean;
}

const RIYADH_TIME_ZONE = "Asia/Riyadh";

function getRiyadhParts(date = new Date()): { date: string; weekday: WorkdayCode; dayOfMonth: number } {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: RIYADH_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    weekday: "short",
  }).formatToParts(date);
  const get = (type: string): string => {
    const value = parts.find((part) => part.type === type)?.value;
    if (!value) throw new Error(`Unable to resolve Riyadh ${type}.`);
    return value;
  };
  const weekdayMap: Record<string, WorkdayCode> = { Sun: "SUN", Mon: "MON", Tue: "TUE", Wed: "WED", Thu: "THU", Fri: "FRI", Sat: "SAT" };
  return { date: `${get("year")}-${get("month")}-${get("day")}`, weekday: weekdayMap[get("weekday")], dayOfMonth: Number(get("day")) };
}

function taskOccurrenceId(templateId: string, scheduledDate: string): string {
  return `${templateId}__${scheduledDate}`;
}

function isDue(template: TaskTemplateRecord, group: TaskGroupRecord, today: ReturnType<typeof getRiyadhParts>): boolean {
  if (!template.active || !group.active) return false;
  if (template.recurrence.kind === "DAILY") {
    return group.type === "DAILY" && (group.workdays ?? []).includes(today.weekday);
  }
  if (group.type !== "RECURRING") return false;
  if (template.recurrence.kind === "WEEKLY") return template.recurrence.weekdays.includes(today.weekday);
  return template.recurrence.dayOfMonth === today.dayOfMonth;
}
export async function ensureDueTaskTemplateOccurrence(template: TaskTemplateRecord, scheduledDate = getRiyadhParts().date): Promise<boolean> {
  const today = getRiyadhParts();
  if (scheduledDate !== today.date) return false;
  const groupSnapshot = await db.collection("taskGroups").doc(template.groupId).get();
  if (!groupSnapshot.exists) return false;
  const group = groupSnapshot.data() as TaskGroupRecord;
  if (!isDue(template, group, today)) return false;

  const taskReference = db.collection("tasks").doc(taskOccurrenceId(template.id, scheduledDate));
  return db.runTransaction(async (transaction) => {
    const existing = await transaction.get(taskReference);
    if (existing.exists) return false;
    transaction.create(taskReference, {
      id: taskReference.id,
      teamId: template.teamId,
      memberId: template.memberId,
      groupId: template.groupId,
      title: template.title,
      description: template.description,
      originalDate: scheduledDate,
      workDate: scheduledDate,
      templateId: template.id,
      scheduledDate,
      generationSource: "SCHEDULE",
      status: "ACTIVE",
      order: template.order,
      roadmapGoalId: null,
      active: true,
      createdBy: template.createdBy,
      createdByName: template.createdByName,
      createdAt: FieldValue.serverTimestamp(),
      updatedBy: "SYSTEM_SCHEDULE",
      updatedAt: FieldValue.serverTimestamp(),
      startedBy: null,
      startedAt: null,
      completedBy: null,
      completedAt: null,
    });
    return true;
  });
}

function membershipId(teamId: string, userId: string): string { return `${teamId}__${userId}`; }

async function canManageTemplate(uid: string, template: TaskTemplateRecord): Promise<boolean> {
  const user = await db.collection("users").doc(uid).get();
  if (!user.exists || user.data()?.active !== true) return false;
  if (uid === template.memberId) {
    const membership = await db.collection("teamMemberships").doc(membershipId(template.teamId, uid)).get();
    return membership.exists && membership.data()?.active === true;
  }
  const membership = await db.collection("teamMemberships").doc(membershipId(template.teamId, uid)).get();
  return membership.exists && membership.data()?.active === true && membership.data()?.role === "LEADER";
}

export const ensureDueTaskTemplateOccurrenceCallable = onCall<{ templateId?: unknown }>(async (request) => {
  if (!request.auth) throw new HttpsError("unauthenticated", "Authentication is required.");
  const templateId = typeof request.data?.templateId === "string" ? request.data.templateId.trim() : "";
  if (!templateId) throw new HttpsError("invalid-argument", "templateId is required.");
  const snapshot = await db.collection("taskTemplates").doc(templateId).get();
  if (!snapshot.exists) throw new HttpsError("not-found", "Task template does not exist.");
  const template = snapshot.data() as TaskTemplateRecord;
  if (!(await canManageTemplate(request.auth.uid, template))) throw new HttpsError("permission-denied", "Team-scoped access is required.");
  await ensureDueTaskTemplateOccurrence(template);
});

export const generateDueTaskTemplateOccurrences = onSchedule(
  { schedule: "10 0 * * *", timeZone: RIYADH_TIME_ZONE },
  async () => {
    const templates = await db.collection("taskTemplates").where("active", "==", true).get();
    for (const document of templates.docs) {
      const template = document.data() as TaskTemplateRecord;
      await ensureDueTaskTemplateOccurrence(template);
    }
  },
);






