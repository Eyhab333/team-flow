"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.unregisterDeviceInstallation = exports.registerDeviceInstallation = void 0;
const firestore_1 = require("firebase-admin/firestore");
const https_1 = require("firebase-functions/v2/https");
const firebase_admin_js_1 = require("./firebase-admin.js");
function registrationId(installationId) {
    // Firestore-safe deterministic key. The original FID remains a field for FCM.
    return Buffer.from(installationId).toString("base64url");
}
function getInstallationId(data) {
    if (typeof data.installationId !== "string" ||
        data.installationId.length === 0 ||
        data.installationId.length > 512) {
        throw new https_1.HttpsError("invalid-argument", "A valid installation ID is required.");
    }
    return data.installationId;
}
exports.registerDeviceInstallation = (0, https_1.onCall)(async (request) => {
    if (!request.auth) {
        throw new https_1.HttpsError("unauthenticated", "Authentication is required.");
    }
    const userId = request.auth.uid;
    const installationId = getInstallationId(request.data);
    const ref = firebase_admin_js_1.db.collection("deviceRegistrations").doc(registrationId(installationId));
    const userAgent = typeof request.data.userAgent === "string"
        ? request.data.userAgent.slice(0, 512)
        : undefined;
    await firebase_admin_js_1.db.runTransaction(async (transaction) => {
        const existing = await transaction.get(ref);
        transaction.set(ref, {
            id: ref.id,
            userId,
            installationId,
            platform: "WEB",
            active: true,
            ...(userAgent ? { userAgent } : {}),
            ...(existing.exists ? {} : { createdAt: firestore_1.FieldValue.serverTimestamp() }),
            updatedAt: firestore_1.FieldValue.serverTimestamp(),
            lastSeenAt: firestore_1.FieldValue.serverTimestamp(),
        }, { merge: true });
    });
});
exports.unregisterDeviceInstallation = (0, https_1.onCall)(async (request) => {
    if (!request.auth) {
        throw new https_1.HttpsError("unauthenticated", "Authentication is required.");
    }
    const installationId = getInstallationId(request.data);
    const ref = firebase_admin_js_1.db.collection("deviceRegistrations").doc(registrationId(installationId));
    await firebase_admin_js_1.db.runTransaction(async (transaction) => {
        const existing = await transaction.get(ref);
        if (!existing.exists || existing.data()?.userId !== request.auth?.uid)
            return;
        transaction.update(ref, {
            active: false,
            updatedAt: firestore_1.FieldValue.serverTimestamp(),
            lastSeenAt: firestore_1.FieldValue.serverTimestamp(),
        });
    });
});
