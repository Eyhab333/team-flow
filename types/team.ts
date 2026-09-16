import type { Timestamp } from "firebase/firestore";

export interface Team {
  id: string;
  name: string;
  description: string;
  active: boolean;
  createdBy: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}
