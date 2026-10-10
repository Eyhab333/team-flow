import type { Timestamp } from "firebase/firestore";

export type TaskGroupType = "EXTENDED" | "DAILY" | "RECURRING" | "ONE_TIME";
export type WorkdayCode = "SUN" | "MON" | "TUE" | "WED" | "THU" | "FRI" | "SAT";
export const DEFAULT_WORKDAYS: WorkdayCode[] = ["SUN", "MON", "TUE", "WED", "THU"];

export interface TaskGroup {
  id: string;
  teamId: string;
  memberId: string;
  title: string;
  description: string;
  originalDate: string;
  /** Missing on legacy documents means EXTENDED. */
  type?: TaskGroupType;
  /** Used only by DAILY groups. */
  workdays?: WorkdayCode[];
  order: number;
  active: boolean;
  createdBy: string;
  createdByName: string;
  createdAt: Timestamp;
  updatedBy: string;
  updatedAt: Timestamp;
}
