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
import type { TaskGroup } from "@/types/task-group";

const TASK_GROUPS_COLLECTION = "taskGroups";

export type CreateTaskGroupInput = Pick<
  TaskGroup,
  | "teamId"
  | "memberId"
  | "title"
  | "description"
  | "originalDate"
  | "order"
  | "createdBy"
  | "createdByName"
>;

export type UpdateTaskGroupData = Pick<TaskGroup, "updatedBy"> &
  Partial<
    Pick<
      TaskGroup,
      "title" | "description" | "originalDate" | "order" | "active"
    >
  >;

export async function getTaskGroupById(
  groupId: string,
): Promise<TaskGroup | null> {
  const taskGroupSnapshot = await getDoc(
    doc(db, TASK_GROUPS_COLLECTION, groupId),
  );

  return taskGroupSnapshot.exists()
    ? (taskGroupSnapshot.data() as TaskGroup)
    : null;
}

export async function getTaskGroupsForMemberDay(
  teamId: string,
  memberId: string,
  originalDate: string,
): Promise<TaskGroup[]> {
  const taskGroupsQuery = query(
    collection(db, TASK_GROUPS_COLLECTION),
    where("teamId", "==", teamId),
    where("memberId", "==", memberId),
    where("originalDate", "==", originalDate),
    where("active", "==", true),
    orderBy("order", "asc"),
  );
  const taskGroupsSnapshot = await getDocs(taskGroupsQuery);

  return taskGroupsSnapshot.docs.map(
    (taskGroupDocument) => taskGroupDocument.data() as TaskGroup,
  );
}

export async function createTaskGroup(
  input: CreateTaskGroupInput,
): Promise<string> {
  const title = input.title.trim();
  const originalDate = input.originalDate.trim();

  if (!title) {
    throw new Error("Task group title cannot be empty.");
  }

  if (!originalDate) {
    throw new Error("Task group original date cannot be empty.");
  }

  const taskGroupReference = doc(collection(db, TASK_GROUPS_COLLECTION));
  const taskGroupData: WithFieldValue<TaskGroup> = {
    id: taskGroupReference.id,
    teamId: input.teamId,
    memberId: input.memberId,
    title,
    description: input.description.trim(),
    originalDate,
    order: input.order,
    active: true,
    createdBy: input.createdBy,
    createdByName: input.createdByName.trim(),
    createdAt: serverTimestamp(),
    updatedBy: input.createdBy,
    updatedAt: serverTimestamp(),
  };

  await setDoc(taskGroupReference, taskGroupData);

  return taskGroupReference.id;
}

export async function updateTaskGroup(
  groupId: string,
  data: UpdateTaskGroupData,
): Promise<void> {
  const updateData: UpdateData<TaskGroup> = {
    updatedBy: data.updatedBy,
    updatedAt: serverTimestamp(),
  };

  if (data.title !== undefined) {
    const title = data.title.trim();

    if (!title) {
      throw new Error("Task group title cannot be empty.");
    }

    updateData.title = title;
  }

  if (data.description !== undefined) {
    updateData.description = data.description.trim();
  }

  if (data.originalDate !== undefined) {
    const originalDate = data.originalDate.trim();

    if (!originalDate) {
      throw new Error("Task group original date cannot be empty.");
    }

    updateData.originalDate = originalDate;
  }

  if (data.order !== undefined) {
    updateData.order = data.order;
  }

  if (data.active !== undefined) {
    updateData.active = data.active;
  }

  await updateDoc(doc(db, TASK_GROUPS_COLLECTION, groupId), updateData);
}

export async function setTaskGroupActive(
  groupId: string,
  active: boolean,
  updatedBy: string,
): Promise<void> {
  const updateData: UpdateData<TaskGroup> = {
    active,
    updatedBy,
    updatedAt: serverTimestamp(),
  };

  await updateDoc(doc(db, TASK_GROUPS_COLLECTION, groupId), updateData);
}

export async function updateTaskGroupOrder(
  groupId: string,
  order: number,
  updatedBy: string,
): Promise<void> {
  const updateData: UpdateData<TaskGroup> = {
    order,
    updatedBy,
    updatedAt: serverTimestamp(),
  };

  await updateDoc(doc(db, TASK_GROUPS_COLLECTION, groupId), updateData);
}

export async function getTaskGroupsForMember(
  teamId: string,
  memberId: string,
): Promise<TaskGroup[]> {
  const taskGroupsQuery = query(
    collection(db, TASK_GROUPS_COLLECTION),
    where("teamId", "==", teamId),
    where("memberId", "==", memberId),
    where("active", "==", true),
    orderBy("originalDate", "desc"),
    orderBy("order", "asc"),
  );
  const taskGroupsSnapshot = await getDocs(taskGroupsQuery);

  return taskGroupsSnapshot.docs.map(
    (taskGroupDocument) => taskGroupDocument.data() as TaskGroup,
  );
}
