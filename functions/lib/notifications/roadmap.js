"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.notifyRoadmapGoalUpdated = exports.notifyRoadmapGoalCreated = void 0;
const firestore_1 = require("firebase-functions/v2/firestore");
const send_notification_js_1 = require("./send-notification.js");
function roadmapLink(memberId, goalId) {
    return `/workspace/${memberId}?tab=roadmap&goal=${goalId}`;
}
function messageForGoal(type, goal) {
    const label = goal.title || "هدف";
    switch (type) {
        case "ROADMAP_CREATED": return { title: "هدف جديد", body: `تمت إضافة الهدف: ${label}` };
        case "ROADMAP_COMPLETED": return { title: "تم إكمال هدف", body: `تم إكمال الهدف: ${label}` };
        case "ROADMAP_REOPENED": return { title: "إعادة فتح هدف", body: `تمت إعادة فتح الهدف: ${label}` };
        case "ROADMAP_DELETED": return { title: "حذف هدف", body: `تم إخفاء الهدف: ${label}` };
        default: return { title: "تحديث هدف", body: `تم تحديث الهدف: ${label}` };
    }
}
function getUpdateType(before, after) {
    if (before.active && !after.active)
        return "ROADMAP_DELETED";
    if (before.status !== after.status) {
        if (after.status === "COMPLETED")
            return "ROADMAP_COMPLETED";
        if (after.status === "ACTIVE" && before.status === "COMPLETED")
            return "ROADMAP_REOPENED";
    }
    return ["title", "description", "horizon", "targetYear", "targetDate"].some((field) => before[field] !== after[field]) ? "ROADMAP_UPDATED" : null;
}
exports.notifyRoadmapGoalCreated = (0, firestore_1.onDocumentCreated)("roadmapGoals/{goalId}", async (event) => {
    const goal = event.data?.data();
    if (!goal)
        return;
    const type = "ROADMAP_CREATED";
    const message = messageForGoal(type, goal);
    await (0, send_notification_js_1.createAndSendNotification)({
        eventId: event.id,
        actorUserId: goal.createdBy,
        teamId: goal.teamId,
        memberId: goal.memberId,
        type,
        entityKind: "ROADMAP_GOAL",
        entityId: event.params.goalId,
        title: message.title,
        body: message.body,
        link: roadmapLink(goal.memberId, event.params.goalId),
    });
});
exports.notifyRoadmapGoalUpdated = (0, firestore_1.onDocumentUpdated)("roadmapGoals/{goalId}", async (event) => {
    const before = event.data?.before.data();
    const after = event.data?.after.data();
    if (!before || !after)
        return;
    const type = getUpdateType(before, after);
    if (!type)
        return;
    const message = messageForGoal(type, after);
    await (0, send_notification_js_1.createAndSendNotification)({
        eventId: event.id,
        actorUserId: after.updatedBy || after.createdBy,
        teamId: after.teamId,
        memberId: after.memberId,
        type,
        entityKind: "ROADMAP_GOAL",
        entityId: event.params.goalId,
        title: message.title,
        body: message.body,
        link: roadmapLink(after.memberId, event.params.goalId),
    });
});
