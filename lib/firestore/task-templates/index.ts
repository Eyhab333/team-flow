import {
  collection,
  doc,
  getDocs,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
  type UpdateData,
  type WithFieldValue,
} from "firebase/firestore";
import { httpsCallable } from "firebase/functions";

import { db, functions } from "@/lib/firebase/client";
import type { TaskTemplate, TaskTemplateRecurrence } from "@/types/task-template";

const COLLECTION = "taskTemplates";

export type CreateTaskTemplateInput = Pick<TaskTemplate, "teamId" | "memberId" | "groupId" | "title" | "description" | "order" | "createdBy"> & {
  createdByName: string;
  recurrence: TaskTemplateRecurrence;
};
export type UpdateTaskTemplateData = Pick<TaskTemplate, "updatedBy"> & Partial<Pick<TaskTemplate, "title" | "description" | "recurrence" | "order" | "active">>;

export async function getTaskTemplatesForMember(teamId: string, memberId: string): Promise<TaskTemplate[]> {
  const templatesQuery = query(collection(db, COLLECTION), where("teamId", "==", teamId), where("memberId", "==", memberId), orderBy("groupId", "asc"), orderBy("order", "asc"));
  const templates = (await getDocs(templatesQuery)).docs.map((document) => document.data() as TaskTemplate);
  return templates.sort((first, second) => first.groupId.localeCompare(second.groupId) || first.order - second.order || first.id.localeCompare(second.id));
}

export async function createTaskTemplate(input: CreateTaskTemplateInput): Promise<string> {
  const title = input.title.trim();
  if (!title) throw new Error("Task template title cannot be empty.");
  const reference = doc(collection(db, COLLECTION));
  const data: WithFieldValue<TaskTemplate> = {
    id: reference.id, teamId: input.teamId, memberId: input.memberId, groupId: input.groupId,
    title, description: input.description.trim(), recurrence: input.recurrence, active: true, order: input.order,
    createdBy: input.createdBy, createdByName: input.createdByName.trim(), createdAt: serverTimestamp(), updatedBy: input.createdBy, updatedAt: serverTimestamp(),
  };
  await setDoc(reference, data);
  await ensureDueTaskTemplateOccurrence(reference.id);
  return reference.id;
}

export async function updateTaskTemplate(templateId: string, data: UpdateTaskTemplateData): Promise<void> {
  const update: UpdateData<TaskTemplate> = { updatedBy: data.updatedBy, updatedAt: serverTimestamp() };
  if (data.title !== undefined) { const title = data.title.trim(); if (!title) throw new Error("Task template title cannot be empty."); update.title = title; }
  if (data.description !== undefined) update.description = data.description.trim();
  if (data.recurrence !== undefined) update.recurrence = data.recurrence;
  if (data.order !== undefined) update.order = data.order;
  if (data.active !== undefined) update.active = data.active;
  await updateDoc(doc(db, COLLECTION, templateId), update);
  if (data.active !== false) await ensureDueTaskTemplateOccurrence(templateId);
}

export async function setTaskTemplateActive(templateId: string, active: boolean, updatedBy: string): Promise<void> {
  await updateTaskTemplate(templateId, { active, updatedBy });
}

export async function ensureDueTaskTemplateOccurrence(templateId: string): Promise<void> {
  await httpsCallable<{ templateId: string }, void>(functions, "ensureDueTaskTemplateOccurrence")({ templateId });
}






