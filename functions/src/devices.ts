import { FieldValue } from "firebase-admin/firestore";
import { HttpsError, onCall } from "firebase-functions/v2/https";

import { db } from "./firebase-admin.js";

interface DeviceRegistrationData {
  installationId?: unknown;
  userAgent?: unknown;
}

function registrationId(installationId: string): string {
  // Firestore-safe deterministic key. The original FID remains a field for FCM.
  return Buffer.from(installationId).toString("base64url");
}

function getInstallationId(data: DeviceRegistrationData): string {
  if (
    typeof data.installationId !== "string" ||
    data.installationId.length === 0 ||
    data.installationId.length > 512
  ) {
    throw new HttpsError("invalid-argument", "A valid installation ID is required.");
  }
  return data.installationId;
}

export const registerDeviceInstallation = onCall<DeviceRegistrationData>(
  async (request) => {
    if (!request.auth) {
      throw new HttpsError("unauthenticated", "Authentication is required.");
    }

    const userId = request.auth.uid;
    const installationId = getInstallationId(request.data);
    const ref = db.collection("deviceRegistrations").doc(registrationId(installationId));
    const userAgent =
      typeof request.data.userAgent === "string"
        ? request.data.userAgent.slice(0, 512)
        : undefined;

    await db.runTransaction(async (transaction) => {
      const existing = await transaction.get(ref);
      transaction.set(
        ref,
        {
          id: ref.id,
          userId,
          installationId,
          platform: "WEB",
          active: true,
          ...(userAgent ? { userAgent } : {}),
          ...(existing.exists ? {} : { createdAt: FieldValue.serverTimestamp() }),
          updatedAt: FieldValue.serverTimestamp(),
          lastSeenAt: FieldValue.serverTimestamp(),
        },
        { merge: true },
      );
    });
  },
);

export const unregisterDeviceInstallation = onCall<DeviceRegistrationData>(
  async (request) => {
    if (!request.auth) {
      throw new HttpsError("unauthenticated", "Authentication is required.");
    }

    const installationId = getInstallationId(request.data);
    const ref = db.collection("deviceRegistrations").doc(registrationId(installationId));
    await db.runTransaction(async (transaction) => {
      const existing = await transaction.get(ref);
      if (!existing.exists || existing.data()?.userId !== request.auth?.uid) return;
      transaction.update(ref, {
        active: false,
        updatedAt: FieldValue.serverTimestamp(),
        lastSeenAt: FieldValue.serverTimestamp(),
      });
    });
  },
);
