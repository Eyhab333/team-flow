import type { Timestamp } from "firebase/firestore";

export type NotificationType =
  | "TASK_CREATED"
  | "TASK_UPDATED"
  | "TASK_STARTED"
  | "TASK_COMPLETED"
  | "TASK_REOPENED"
  | "TASK_DELETED"
  | "ROADMAP_CREATED"
  | "ROADMAP_UPDATED"
  | "ROADMAP_COMPLETED"
  | "ROADMAP_REOPENED"
  | "ROADMAP_DELETED";

export type NotificationEntityKind = "TASK" | "ROADMAP_GOAL";

export interface AppNotification {
  id: string;
  recipientUserId: string;
  actorUserId: string;
  actorName: string;
  teamId: string;
  memberId: string;
  type: NotificationType;
  entityKind: NotificationEntityKind;
  entityId: string;
  title: string;
  body: string;
  link: string;
  readAt: Timestamp | null;
  createdAt: Timestamp;
}
