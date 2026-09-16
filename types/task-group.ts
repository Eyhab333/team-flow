import type { Timestamp } from "firebase/firestore";

export interface TaskGroup {
  id: string;
  teamId: string;
  memberId: string;
  title: string;
  description: string;
  originalDate: string;
  order: number;
  active: boolean;
  createdBy: string;
  createdByName: string;
  createdAt: Timestamp;
  updatedBy: string;
  updatedAt: Timestamp;
}
