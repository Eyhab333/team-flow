import type { Timestamp } from "firebase/firestore";

export type RoadmapHorizon = "SHORT" | "MEDIUM" | "LONG";

export type RoadmapGoalStatus = "ACTIVE" | "COMPLETED";

export interface RoadmapGoal {
  id: string;
  teamId: string;
  memberId: string;
  title: string;
  description: string;
  horizon: RoadmapHorizon;
  targetYear: number | null;
  targetDate: string | null;
  status: RoadmapGoalStatus;
  order: number;
  active: boolean;
  createdBy: string;
  createdByName: string;
  createdAt: Timestamp;
  updatedBy: string;
  updatedAt: Timestamp;
}
