import type { Timestamp } from "firebase/firestore";

export interface DeviceRegistration {
  id: string;
  userId: string;
  installationId: string;
  platform: "WEB";
  active: boolean;
  createdAt: Timestamp;
  updatedAt: Timestamp;
  lastSeenAt: Timestamp;
  userAgent?: string;
}
