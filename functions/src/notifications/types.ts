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

export type EntityKind = "TASK" | "ROADMAP_GOAL";

export interface TaskRecord {
  teamId: string;
  memberId: string;
  title: string;
  description: string;
  groupId: string;
  status: "ACTIVE" | "IN_PROGRESS" | "COMPLETED";
  active: boolean;
  createdBy: string;
  updatedBy?: string;
}

export interface RoadmapGoalRecord {
  teamId: string;
  memberId: string;
  title: string;
  description: string;
  horizon: "SHORT" | "MEDIUM" | "LONG";
  targetYear: number | null;
  targetDate: string | null;
  status: "ACTIVE" | "COMPLETED";
  active: boolean;
  createdBy: string;
  updatedBy?: string;
}

export interface NotificationInput {
  eventId: string;
  actorUserId: string;
  teamId: string;
  memberId: string;
  type: NotificationType;
  entityKind: EntityKind;
  entityId: string;
  title: string;
  body: string;
  link: string;
}
