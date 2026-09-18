"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createAndSendNotification = createAndSendNotification;
const node_crypto_1 = require("node:crypto");
const firestore_1 = require("firebase-admin/firestore");
const messaging_1 = require("firebase-admin/messaging");
const firebase_admin_js_1 = require("../firebase-admin.js");
const recipients_js_1 = require("./recipients.js");
function notificationIdFor(eventId, recipientUserId) {
    return (0, node_crypto_1.createHash)("sha256")
        .update(`${eventId}:${recipientUserId}`)
        .digest("hex");
}
function chunks(values, chunkSize) {
    const result = [];
    for (let index = 0; index < values.length; index += chunkSize) {
        result.push(values.slice(index, index + chunkSize));
    }
    return result;
}
function isInvalidInstallationError(code) {
    return code === "messaging/registration-token-not-registered"
        || code === "messaging/invalid-registration-token"
        || code === "messaging/invalid-argument";
}
function webPushLink(link) {
    return link.startsWith("/") && !link.startsWith("//") ? link : "/";
}
async function deactivateInstallations(installationIds) {
    await Promise.all(installationIds.map(async (installationId) => {
        const registrations = await firebase_admin_js_1.db
            .collection("deviceRegistrations")
            .where("installationId", "==", installationId)
            .get();
        const batch = firebase_admin_js_1.db.batch();
        registrations.docs.forEach((registration) => {
            batch.update(registration.ref, {
                active: false,
                updatedAt: firestore_1.FieldValue.serverTimestamp(),
            });
        });
        if (!registrations.empty)
            await batch.commit();
    }));
}
async function sendPush(recipientUserId, notificationId, notification) {
    const registrations = await firebase_admin_js_1.db
        .collection("deviceRegistrations")
        .where("userId", "==", recipientUserId)
        .where("active", "==", true)
        .get();
    const installationIds = [
        ...new Set(registrations.docs
            .map((registration) => registration.data().installationId)
            .filter((installationId) => typeof installationId === "string")),
    ];
    for (const installationChunk of chunks(installationIds, 500)) {
        try {
            const response = await (0, messaging_1.getMessaging)().sendEachForMulticast({
                fids: installationChunk,
                data: {
                    notificationId,
                    type: notification.type,
                    title: notification.title,
                    body: notification.body,
                    link: notification.link,
                    entityId: notification.entityId,
                    entityKind: notification.entityKind,
                },
                webpush: {
                    notification: {
                        title: notification.title,
                        body: notification.body,
                        icon: "/icons/team-flow-192.svg",
                    },
                    fcmOptions: {
                        link: webPushLink(notification.link),
                    },
                },
            });
            const invalidInstallations = response.responses.flatMap((result, index) => !result.success && isInvalidInstallationError(result.error?.code)
                ? [installationChunk[index]]
                : []);
            if (invalidInstallations.length > 0) {
                await deactivateInstallations(invalidInstallations);
            }
        }
        catch (error) {
            console.error("Push notification delivery failed", { recipientUserId, error });
        }
    }
}
function resolveTaskNotificationTitle(input, actorName) {
    const actorIsKnown = actorName !== recipients_js_1.ACTOR_NAME_FALLBACK;
    switch (input.type) {
        case "TASK_CREATED":
            return actorIsKnown ? `${actorName} أضاف مهمة` : "تمت إضافة مهمة";
        case "TASK_STARTED":
            return actorIsKnown ? `${actorName} بدأ العمل على مهمة` : "بدأ العمل على مهمة";
        case "TASK_COMPLETED":
            return actorIsKnown ? `${actorName} أنجز مهمة` : "تم إنجاز مهمة";
        case "TASK_REOPENED":
            return actorIsKnown ? `${actorName} أعاد فتح مهمة` : "تمت إعادة فتح مهمة";
        case "TASK_UPDATED":
            return actorIsKnown ? `${actorName} عدّل مهمة` : "تم تعديل مهمة";
        case "TASK_DELETED":
            return actorIsKnown ? `${actorName} حذف مهمة` : "تم حذف مهمة";
        default:
            return input.title;
    }
}
async function createAndSendNotification(input) {
    const [actorName, recipients] = await Promise.all([
        (0, recipients_js_1.getActorName)(input.actorUserId),
        (0, recipients_js_1.getNotificationRecipients)(input.teamId, input.memberId, input.actorUserId),
    ]);
    const title = resolveTaskNotificationTitle(input, actorName);
    const notification = { ...input, title };
    await Promise.all(recipients.map(async (recipientUserId) => {
        const notificationId = notificationIdFor(input.eventId, recipientUserId);
        const notificationRef = firebase_admin_js_1.db.collection("notifications").doc(notificationId);
        const wasCreated = await firebase_admin_js_1.db.runTransaction(async (transaction) => {
            const existing = await transaction.get(notificationRef);
            if (existing.exists)
                return false;
            transaction.create(notificationRef, {
                id: notificationId,
                recipientUserId,
                actorUserId: notification.actorUserId,
                actorName,
                teamId: notification.teamId,
                memberId: notification.memberId,
                type: notification.type,
                entityKind: notification.entityKind,
                entityId: notification.entityId,
                title: notification.title,
                body: notification.body,
                link: notification.link,
                readAt: null,
                createdAt: firestore_1.FieldValue.serverTimestamp(),
            });
            return true;
        });
        if (wasCreated) {
            await sendPush(recipientUserId, notificationId, notification);
        }
    }));
}
