"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.notifyTaskUpdated = exports.notifyTaskCreated = void 0;
const firestore_1 = require("firebase-functions/v2/firestore");
const send_notification_js_1 = require("./send-notification.js");
function taskLink(memberId, taskId) {
    return `/workspace/${memberId}?tab=tasks&task=${taskId}`;
}
function messageForTask(type, task) {
    const label = task.title || "مهمة";
    switch (type) {
        case "TASK_CREATED": return { title: "مهمة جديدة", body: `تمت إضافة المهمة: ${label}` };
        case "TASK_STARTED": return { title: "بدء العمل على مهمة", body: `بدأ العمل على المهمة: ${label}` };
        case "TASK_COMPLETED": return { title: "تم إنجاز مهمة", body: `تم إنجاز المهمة: ${label}` };
        case "TASK_REOPENED": return { title: "إعادة فتح مهمة", body: `تمت إعادة فتح المهمة: ${label}` };
        case "TASK_DELETED": return { title: "حذف مهمة", body: `تم إخفاء المهمة: ${label}` };
        default: return { title: "تحديث مهمة", body: `تم تحديث المهمة: ${label}` };
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
    if (!task)
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
