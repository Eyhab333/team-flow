"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getActorName = getActorName;
exports.getNotificationRecipients = getNotificationRecipients;
const firebase_admin_js_1 = require("../firebase-admin.js");
const ACTOR_NAME_FALLBACK = "أحد أعضاء الفريق";
async function getActorName(actorUserId) {
    const actor = await firebase_admin_js_1.db.collection("users").doc(actorUserId).get();
    const displayName = actor.data()?.displayName;
    return typeof displayName === "string" && displayName.trim()
        ? displayName.trim()
        : ACTOR_NAME_FALLBACK;
}
async function getNotificationRecipients(teamId, memberId, actorUserId) {
    const leaders = await firebase_admin_js_1.db
        .collection("teamMemberships")
        .where("teamId", "==", teamId)
        .where("role", "==", "LEADER")
        .where("active", "==", true)
        .get();
    const recipients = new Set([memberId]);
    leaders.docs.forEach((membership) => {
        const userId = membership.data().userId;
        if (typeof userId === "string")
            recipients.add(userId);
    });
    recipients.delete(actorUserId);
    return [...recipients];
}
