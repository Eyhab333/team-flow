import { onDocumentCreated, onDocumentUpdated } from "firebase-functions/v2/firestore";

import { createAndSendNotification } from "./send-notification.js";
import type { NotificationType, TaskRecord } from "./types.js";

function taskLink(memberId: string, taskId: string): string {
  return `/workspace/${memberId}?tab=tasks&task=${taskId}`;
}

function messageForTask(type: NotificationType, task: TaskRecord): { title: string; body: string } {
  const label = task.title || "مهمة";
  switch (type) {
    case "TASK_CREATED": return { title: "مهمة جديدة", body: `تمت إضافة المهمة: ${label}` };
    case "TASK_STARTED": return { title: "بدء العمل على مهمة", body: `بدأ العمل على المهمة: ${label}` };
    case "TASK_COMPLETED": return { title: "تم إنجاز مهمة", body: `تم إنجاز المهمة: ${label}` };
    case "TASK_REOPENED": return { title: "إعادة فتح مهمة", body: `تمت إعادة فتح المهمة: ${label}` };
    case "TASK_DELETED": return { title: "حذف مهمة", body: `تم إخفاء المهمة: ${label}` };
    default: return { title: "تحديث مهمة", body: `تم تحديث المهمة: ${label}` };
  }
}

function getUpdateType(before: TaskRecord, after: TaskRecord): NotificationType | null {
  if (before.active && !after.active) return "TASK_DELETED";
  if (before.status !== after.status) {
    if (after.status === "IN_PROGRESS") return "TASK_STARTED";
    if (after.status === "COMPLETED") return "TASK_COMPLETED";
    if (after.status === "ACTIVE" && (before.status === "COMPLETED" || before.status === "IN_PROGRESS")) return "TASK_REOPENED";
  }
  return ["title", "description", "groupId"].some(
    (field) => before[field as keyof TaskRecord] !== after[field as keyof TaskRecord],
  ) ? "TASK_UPDATED" : null;
}

export const notifyTaskCreated = onDocumentCreated("tasks/{taskId}", async (event) => {
  const task = event.data?.data() as TaskRecord | undefined;
  if (!task) return;
  const type = "TASK_CREATED";
  const message = messageForTask(type, task);
  await createAndSendNotification({
    eventId: event.id,
    actorUserId: task.createdBy,
    teamId: task.teamId,
    memberId: task.memberId,
    type,
    entityKind: "TASK",
    entityId: event.params.taskId,
    title: message.title,
    body: message.body,
    link: taskLink(task.memberId, event.params.taskId),
  });
});

export const notifyTaskUpdated = onDocumentUpdated("tasks/{taskId}", async (event) => {
  const before = event.data?.before.data() as TaskRecord | undefined;
  const after = event.data?.after.data() as TaskRecord | undefined;
  if (!before || !after) return;
  const type = getUpdateType(before, after);
  if (!type) return;
  const message = messageForTask(type, after);
  await createAndSendNotification({
    eventId: event.id,
    actorUserId: after.updatedBy || after.createdBy,
    teamId: after.teamId,
    memberId: after.memberId,
    type,
    entityKind: "TASK",
    entityId: event.params.taskId,
    title: message.title,
    body: message.body,
    link: taskLink(after.memberId, event.params.taskId),
  });
});
