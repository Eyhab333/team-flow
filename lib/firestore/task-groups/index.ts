import {
  collection,
  doc,
  getDoc,
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

import { db } from "@/lib/firebase/client";
import type { TaskGroup, TaskGroupType, WorkdayCode } from "@/types/task-group";

const TASK_GROUPS_COLLECTION = "taskGroups";

export type CreateTaskGroupInput = Pick<TaskGroup,
  "teamId" | "memberId" | "title" | "description" | "originalDate" | "order" | "createdBy" | "createdByName"
> & { type?: TaskGroupType; workdays?: WorkdayCode[] };

export type UpdateTaskGroupData = Pick<TaskGroup, "updatedBy"> & Partial<
  Pick<TaskGroup, "title" | "description" | "originalDate" | "order" | "active" | "workdays">
>;

export async function getTaskGroupById(groupId: string): Promise<TaskGroup | null> {
  const snapshot = await getDoc(doc(db, TASK_GROUPS_COLLECTION, groupId));
  return snapshot.exists() ? (snapshot.data() as TaskGroup) : null;
}

export async function getTaskGroupsForMemberDay(teamId: string, memberId: string, originalDate: string): Promise<TaskGroup[]> {
  const groupsQuery = query(collection(db, TASK_GROUPS_COLLECTION), where("teamId", "==", teamId), where("memberId", "==", memberId), where("originalDate", "==", originalDate), where("active", "==", true), orderBy("order", "asc"));
  return (await getDocs(groupsQuery)).docs.map((document) => document.data() as TaskGroup);
}

/** DAILY and RECURRING definitions remain visible even when a date has no occurrence. */
export async function getPersistentTaskGroupsForMember(teamId: string, memberId: string): Promise<TaskGroup[]> {
  const groupsQuery = query(collection(db, TASK_GROUPS_COLLECTION), where("teamId", "==", teamId), where("memberId", "==", memberId), where("active", "==", true), where("type", "in", ["DAILY", "RECURRING"]), orderBy("order", "asc"));
  return (await getDocs(groupsQuery)).docs.map((document) => document.data() as TaskGroup);
}

export async function createTaskGroup(input: CreateTaskGroupInput): Promise<string> {
  const title = input.title.trim();
  const originalDate = input.originalDate.trim();
  if (!title) throw new Error("Task group title cannot be empty.");
  if (!originalDate) throw new Error("Task group original date cannot be empty.");
  const reference = doc(collection(db, TASK_GROUPS_COLLECTION));
  const taskGroupData: WithFieldValue<TaskGroup> = {
    id: reference.id, teamId: input.teamId, memberId: input.memberId, title,
    description: input.description.trim(), originalDate, order: input.order, active: true,
    ...(input.type ? { type: input.type } : {}),
    ...(input.type === "DAILY" ? { workdays: input.workdays ?? [] } : {}),
    createdBy: input.createdBy, createdByName: input.createdByName.trim(),
    createdAt: serverTimestamp(), updatedBy: input.createdBy, updatedAt: serverTimestamp(),
  };
  await setDoc(reference, taskGroupData);
  return reference.id;
}

export async function updateTaskGroup(groupId: string, data: UpdateTaskGroupData): Promise<void> {
  const updateData: UpdateData<TaskGroup> = { updatedBy: data.updatedBy, updatedAt: serverTimestamp() };
  if (data.title !== undefined) { const title = data.title.trim(); if (!title) throw new Error("Task group title cannot be empty."); updateData.title = title; }
  if (data.description !== undefined) updateData.description = data.description.trim();
  if (data.originalDate !== undefined) { const originalDate = data.originalDate.trim(); if (!originalDate) throw new Error("Task group original date cannot be empty."); updateData.originalDate = originalDate; }
  if (data.order !== undefined) updateData.order = data.order;
  if (data.active !== undefined) updateData.active = data.active;
  if (data.workdays !== undefined) updateData.workdays = data.workdays;
  await updateDoc(doc(db, TASK_GROUPS_COLLECTION, groupId), updateData);
}

export async function setTaskGroupActive(groupId: string, active: boolean, updatedBy: string): Promise<void> {
  await updateDoc(doc(db, TASK_GROUPS_COLLECTION, groupId), { active, updatedBy, updatedAt: serverTimestamp() } as UpdateData<TaskGroup>);
}

export async function updateTaskGroupOrder(groupId: string, order: number, updatedBy: string): Promise<void> {
  await updateDoc(doc(db, TASK_GROUPS_COLLECTION, groupId), { order, updatedBy, updatedAt: serverTimestamp() } as UpdateData<TaskGroup>);
}

export async function getTaskGroupsForMember(teamId: string, memberId: string): Promise<TaskGroup[]> {
  const groupsQuery = query(collection(db, TASK_GROUPS_COLLECTION), where("teamId", "==", teamId), where("memberId", "==", memberId), where("active", "==", true), orderBy("originalDate", "desc"), orderBy("order", "asc"));
  return (await getDocs(groupsQuery)).docs.map((document) => document.data() as TaskGroup);
}
