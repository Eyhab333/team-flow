import type { Timestamp } from "firebase/firestore";

export type TeamRole = "LEADER" | "MEMBER";

export interface Membership {
  id: string;
  teamId: string;
  userId: string;
  role: TeamRole;
  active: boolean;
  order: number;
  joinedAt: Timestamp;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}
