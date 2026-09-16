import { onDocumentCreated, onDocumentUpdated } from "firebase-functions/v2/firestore";

import { createAndSendNotification } from "./send-notification.js";
import type { NotificationType, RoadmapGoalRecord } from "./types.js";

function roadmapLink(memberId: string, goalId: string): string {
  return `/workspace/${memberId}?tab=roadmap&goal=${goalId}`;
}

function messageForGoal(type: NotificationType, goal: RoadmapGoalRecord): { title: string; body: string } {
  const label = goal.title || "هدف";
  switch (type) {
    case "ROADMAP_CREATED": return { title: "هدف جديد", body: `تمت إضافة الهدف: ${label}` };
    case "ROADMAP_COMPLETED": return { title: "تم إكمال هدف", body: `تم إكمال الهدف: ${label}` };
    case "ROADMAP_REOPENED": return { title: "إعادة فتح هدف", body: `تمت إعادة فتح الهدف: ${label}` };
    case "ROADMAP_DELETED": return { title: "حذف هدف", body: `تم إخفاء الهدف: ${label}` };
    default: return { title: "تحديث هدف", body: `تم تحديث الهدف: ${label}` };
  }
}

function getUpdateType(before: RoadmapGoalRecord, after: RoadmapGoalRecord): NotificationType | null {
  if (before.active && !after.active) return "ROADMAP_DELETED";
  if (before.status !== after.status) {
    if (after.status === "COMPLETED") return "ROADMAP_COMPLETED";
    if (after.status === "ACTIVE" && before.status === "COMPLETED") return "ROADMAP_REOPENED";
  }
  return ["title", "description", "horizon", "targetYear", "targetDate"].some(
    (field) => before[field as keyof RoadmapGoalRecord] !== after[field as keyof RoadmapGoalRecord],
  ) ? "ROADMAP_UPDATED" : null;
}

export const notifyRoadmapGoalCreated = onDocumentCreated("roadmapGoals/{goalId}", async (event) => {
  const goal = event.data?.data() as RoadmapGoalRecord | undefined;
  if (!goal) return;
  const type = "ROADMAP_CREATED";
  const message = messageForGoal(type, goal);
  await createAndSendNotification({
    eventId: event.id,
    actorUserId: goal.createdBy,
    teamId: goal.teamId,
    memberId: goal.memberId,
    type,
    entityKind: "ROADMAP_GOAL",
    entityId: event.params.goalId,
    title: message.title,
    body: message.body,
    link: roadmapLink(goal.memberId, event.params.goalId),
  });
});

export const notifyRoadmapGoalUpdated = onDocumentUpdated("roadmapGoals/{goalId}", async (event) => {
  const before = event.data?.before.data() as RoadmapGoalRecord | undefined;
  const after = event.data?.after.data() as RoadmapGoalRecord | undefined;
  if (!before || !after) return;
  const type = getUpdateType(before, after);
  if (!type) return;
  const message = messageForGoal(type, after);
  await createAndSendNotification({
    eventId: event.id,
    actorUserId: after.updatedBy || after.createdBy,
    teamId: after.teamId,
    memberId: after.memberId,
    type,
    entityKind: "ROADMAP_GOAL",
    entityId: event.params.goalId,
    title: message.title,
    body: message.body,
    link: roadmapLink(after.memberId, event.params.goalId),
  });
});
