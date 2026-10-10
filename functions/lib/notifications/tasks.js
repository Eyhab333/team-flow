"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.notifyTaskUpdated = exports.notifyTaskCreated = void 0;
const firestore_1 = require("firebase-functions/v2/firestore");
const send_notification_js_1 = require("./send-notification.js");
function taskLink(memberId, taskId) {
    return `/workspace/${memberId}?tab=tasks&task=${taskId}`;
}
function messageForTask(type, task) {
    const label = task.title || "Ù…Ù‡Ù…Ø©";
    switch (type) {
        case "TASK_CREATED": return { title: "Ù…Ù‡Ù…Ø© Ø¬Ø¯ÙŠØ¯Ø©", body: `ØªÙ…Øª Ø¥Ø¶Ø§ÙØ© Ø§Ù„Ù…Ù‡Ù…Ø©: ${label}` };
        case "TASK_STARTED": return { title: "Ø¨Ø¯Ø¡ Ø§Ù„Ø¹Ù…Ù„ Ø¹Ù„Ù‰ Ù…Ù‡Ù…Ø©", body: `Ø¨Ø¯Ø£ Ø§Ù„Ø¹Ù…Ù„ Ø¹Ù„Ù‰ Ø§Ù„Ù…Ù‡Ù…Ø©: ${label}` };
        case "TASK_COMPLETED": return { title: "ØªÙ… Ø¥Ù†Ø¬Ø§Ø² Ù…Ù‡Ù…Ø©", body: `ØªÙ… Ø¥Ù†Ø¬Ø§Ø² Ø§Ù„Ù…Ù‡Ù…Ø©: ${label}` };
        case "TASK_REOPENED": return { title: "Ø¥Ø¹Ø§Ø¯Ø© ÙØªØ­ Ù…Ù‡Ù…Ø©", body: `ØªÙ…Øª Ø¥Ø¹Ø§Ø¯Ø© ÙØªØ­ Ø§Ù„Ù…Ù‡Ù…Ø©: ${label}` };
        case "TASK_DELETED": return { title: "Ø­Ø°Ù Ù…Ù‡Ù…Ø©", body: `ØªÙ… Ø¥Ø®ÙØ§Ø¡ Ø§Ù„Ù…Ù‡Ù…Ø©: ${label}` };
        default: return { title: "ØªØ­Ø¯ÙŠØ« Ù…Ù‡Ù…Ø©", body: `ØªÙ… ØªØ­Ø¯ÙŠØ« Ø§Ù„Ù…Ù‡Ù…Ø©: ${label}` };
    }
}
function getUpdateType(before, after) {
    if (before.active && !after.active)
        return "TASK_DELETED";
    if (before.status !== after.status) {
        if (after.status === "IN_PROGRESS")
            return "TASK_STARTED";
        if (after.status === "COMPLETED")
            return "TASK_COMPLETED";
        if (after.status === "ACTIVE" && (before.status === "COMPLETED" || before.status === "IN_PROGRESS"))
            return "TASK_REOPENED";
    }
    return ["title", "description", "groupId"].some((field) => before[field] !== after[field]) ? "TASK_UPDATED" : null;
}
exports.notifyTaskCreated = (0, firestore_1.onDocumentCreated)("tasks/{taskId}", async (event) => {
    const task = event.data?.data();
    if (!task || task.generationSource === "SCHEDULE")
        return;
    const type = "TASK_CREATED";
    const message = messageForTask(type, task);
    await (0, send_notification_js_1.createAndSendNotification)({
        eventId: event.id,
        actorUserId: task.createdBy,
        teamId: task.teamId,
        memberId: task.memberId,
        type,
        entityKind: "TASK",
        entityId: event.params.taskId,
        title: message.title,
        body: message.body,
        link: taskLink(task.memberId, event.params.taskId),
    });
});
exports.notifyTaskUpdated = (0, firestore_1.onDocumentUpdated)("tasks/{taskId}", async (event) => {
    const before = event.data?.before.data();
    const after = event.data?.after.data();
    if (!before || !after)
        return;
    const type = getUpdateType(before, after);
    if (!type)
        return;
    const message = messageForTask(type, after);
    await (0, send_notification_js_1.createAndSendNotification)({
        eventId: event.id,
        actorUserId: after.updatedBy || after.createdBy,
        teamId: after.teamId,
        memberId: after.memberId,
        type,
        entityKind: "TASK",
        entityId: event.params.taskId,
        title: message.title,
        body: message.body,
        link: taskLink(after.memberId, event.params.taskId),
    });
});
