"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateDueTaskTemplateOccurrences = exports.ensureDueTaskTemplateOccurrenceCallable = void 0;
exports.ensureDueTaskTemplateOccurrence = ensureDueTaskTemplateOccurrence;
const firestore_1 = require("firebase-admin/firestore");
const https_1 = require("firebase-functions/v2/https");
const scheduler_1 = require("firebase-functions/v2/scheduler");
const firebase_admin_js_1 = require("../firebase-admin.js");
const RIYADH_TIME_ZONE = "Asia/Riyadh";
function getRiyadhParts(date = new Date()) {
    const parts = new Intl.DateTimeFormat("en-US", {
        timeZone: RIYADH_TIME_ZONE,
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        weekday: "short",
    }).formatToParts(date);
    const get = (type) => {
        const value = parts.find((part) => part.type === type)?.value;
        if (!value)
            throw new Error(`Unable to resolve Riyadh ${type}.`);
        return value;
    };
    const weekdayMap = { Sun: "SUN", Mon: "MON", Tue: "TUE", Wed: "WED", Thu: "THU", Fri: "FRI", Sat: "SAT" };
    return { date: `${get("year")}-${get("month")}-${get("day")}`, weekday: weekdayMap[get("weekday")], dayOfMonth: Number(get("day")) };
}
function taskOccurrenceId(templateId, scheduledDate) {
    return `${templateId}__${scheduledDate}`;
}
function isDue(template, group, today) {
    if (!template.active || !group.active)
        return false;
    if (template.recurrence.kind === "DAILY") {
        return group.type === "DAILY" && (group.workdays ?? []).includes(today.weekday);
    }
    if (group.type !== "RECURRING")
        return false;
    if (template.recurrence.kind === "WEEKLY")
        return template.recurrence.weekdays.includes(today.weekday);
    return template.recurrence.dayOfMonth === today.dayOfMonth;
}
async function ensureDueTaskTemplateOccurrence(template, scheduledDate = getRiyadhParts().date) {
    const today = getRiyadhParts();
    if (scheduledDate !== today.date)
        return false;
    const groupSnapshot = await firebase_admin_js_1.db.collection("taskGroups").doc(template.groupId).get();
    if (!groupSnapshot.exists)
        return false;
    const group = groupSnapshot.data();
    if (!isDue(template, group, today))
        return false;
    const taskReference = firebase_admin_js_1.db.collection("tasks").doc(taskOccurrenceId(template.id, scheduledDate));
    return firebase_admin_js_1.db.runTransaction(async (transaction) => {
        const existing = await transaction.get(taskReference);
        if (existing.exists)
            return false;
        transaction.create(taskReference, {
            id: taskReference.id,
            teamId: template.teamId,
            memberId: template.memberId,
            groupId: template.groupId,
            title: template.title,
            description: template.description,
            originalDate: scheduledDate,
            workDate: scheduledDate,
            templateId: template.id,
            scheduledDate,
            generationSource: "SCHEDULE",
            status: "ACTIVE",
            order: template.order,
            roadmapGoalId: null,
            active: true,
            createdBy: template.createdBy,
            createdByName: template.createdByName,
            createdAt: firestore_1.FieldValue.serverTimestamp(),
            updatedBy: "SYSTEM_SCHEDULE",
            updatedAt: firestore_1.FieldValue.serverTimestamp(),
            startedBy: null,
            startedAt: null,
            completedBy: null,
            completedAt: null,
        });
        return true;
    });
}
function membershipId(teamId, userId) { return `${teamId}__${userId}`; }
async function canManageTemplate(uid, template) {
    const user = await firebase_admin_js_1.db.collection("users").doc(uid).get();
    if (!user.exists || user.data()?.active !== true)
        return false;
    if (uid === template.memberId) {
        const membership = await firebase_admin_js_1.db.collection("teamMemberships").doc(membershipId(template.teamId, uid)).get();
        return membership.exists && membership.data()?.active === true;
    }
    const membership = await firebase_admin_js_1.db.collection("teamMemberships").doc(membershipId(template.teamId, uid)).get();
    return membership.exists && membership.data()?.active === true && membership.data()?.role === "LEADER";
}
exports.ensureDueTaskTemplateOccurrenceCallable = (0, https_1.onCall)(async (request) => {
    if (!request.auth)
        throw new https_1.HttpsError("unauthenticated", "Authentication is required.");
    const templateId = typeof request.data?.templateId === "string" ? request.data.templateId.trim() : "";
    if (!templateId)
        throw new https_1.HttpsError("invalid-argument", "templateId is required.");
    const snapshot = await firebase_admin_js_1.db.collection("taskTemplates").doc(templateId).get();
    if (!snapshot.exists)
        throw new https_1.HttpsError("not-found", "Task template does not exist.");
    const template = snapshot.data();
    if (!(await canManageTemplate(request.auth.uid, template)))
        throw new https_1.HttpsError("permission-denied", "Team-scoped access is required.");
    await ensureDueTaskTemplateOccurrence(template);
});
exports.generateDueTaskTemplateOccurrences = (0, scheduler_1.onSchedule)({ schedule: "10 0 * * *", timeZone: RIYADH_TIME_ZONE }, async () => {
    const templates = await firebase_admin_js_1.db.collection("taskTemplates").where("active", "==", true).get();
    for (const document of templates.docs) {
        const template = document.data();
        await ensureDueTaskTemplateOccurrence(template);
    }
});
