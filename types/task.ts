import type { Timestamp } from "firebase/firestore";

export type TaskStatus = "ACTIVE" | "IN_PROGRESS" | "COMPLETED";

export interface Task {
  id: string;
  teamId: string;
  memberId: string;
  groupId: string;
  title: string;
  description: string;
  originalDate: string;
  status: TaskStatus;
  order: number;
  roadmapGoalId: string | null;
  active: boolean;
  createdBy: string;
  createdByName: string;
  createdAt: Timestamp;
  updatedBy: string;
  updatedAt: Timestamp;
  startedBy: string | null;
  startedAt: Timestamp | null;
  completedBy: string | null;
  completedAt: Timestamp | null;
}
