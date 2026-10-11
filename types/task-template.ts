import type { Timestamp } from "firebase/firestore";
import type { WorkdayCode } from "./task-group";

export type TaskTemplateRecurrence =
  | { kind: "DAILY" }
  | { kind: "WEEKLY"; weekdays: WorkdayCode[] }
  | { kind: "MONTHLY"; dayOfMonth: number; firstDueDate?: string };

export interface TaskTemplate {
  id: string;
  teamId: string;
  memberId: string;
  groupId: string;
  title: string;
  description: string;
  recurrence: TaskTemplateRecurrence;
  active: boolean;
  order: number;
  createdBy: string;
  createdByName: string;
  createdAt: Timestamp;
  updatedBy: string;
  updatedAt: Timestamp;
}

