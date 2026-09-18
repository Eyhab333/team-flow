import {
  collection,
  doc,
  getDoc,
  getDocs,
  orderBy,
  query,
  runTransaction,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
  writeBatch,
  type UpdateData,
  type WithFieldValue,
} from "firebase/firestore";

import { db } from "@/lib/firebase/client";
import type { Task } from "@/types/task";

const TASKS_COLLECTION = "tasks";
const TASK_ORDER_BATCH_SIZE = 500;

export type CreateTaskInput = Pick<
  Task,
  | "teamId"
  | "memberId"
  | "groupId"
  | "title"
  | "description"
  | "originalDate"
  | "workDate"
  | "order"
  | "roadmapGoalId"
  | "createdBy"
  | "createdByName"
>;

export type UpdateTaskData = Pick<Task, "updatedBy"> &
  Partial<
    Pick<
      Task,
      "title" | "description" | "groupId" | "order" | "roadmapGoalId"
    >
  >;

export interface TaskOrderUpdate {
  taskId: string;
  order: number;
}

export async function getTaskById(taskId: string): Promise<Task | null> {
  const taskSnapshot = await getDoc(doc(db, TASKS_COLLECTION, taskId));

  return taskSnapshot.exists() ? (taskSnapshot.data() as Task) : null;
}

export async function getTasksForGroup(groupId: string): Promise<Task[]> {
  const tasksQuery = query(
    collection(db, TASKS_COLLECTION),
    where("groupId", "==", groupId),
    where("active", "==", true),
    orderBy("order", "asc"),
  );
  const tasksSnapshot = await getDocs(tasksQuery);

  return tasksSnapshot.docs.map(
    (taskDocument) => taskDocument.data() as Task,
  );
}

export async function getTasksForMemberDay(
  teamId: string,
  memberId: string,
  workDate: string,
): Promise<Task[]> {
  const tasksQuery = query(
    collection(db, TASKS_COLLECTION),
    where("teamId", "==", teamId),
    where("memberId", "==", memberId),
    where("workDate", "==", workDate),
    where("active", "==", true),
    orderBy("order", "asc"),
  );
  const tasksSnapshot = await getDocs(tasksQuery);

  return tasksSnapshot.docs.map(
    (taskDocument) => taskDocument.data() as Task,
  );
}

export async function createTask(input: CreateTaskInput): Promise<string> {
  const title = input.title.trim();
  const originalDate = input.originalDate.trim();
  const workDate = input.workDate.trim();
  const groupId = input.groupId.trim();

  if (!title) {
    throw new Error("Task title cannot be empty.");
  }

  if (!originalDate) {
    throw new Error("Task original date cannot be empty.");
  }

  if (!workDate) {
    throw new Error("Task work date cannot be empty.");
  }

  if (!groupId) {
    throw new Error("Task group ID cannot be empty.");
  }

  const taskReference = doc(collection(db, TASKS_COLLECTION));
  const taskData: WithFieldValue<Task> = {
    id: taskReference.id,
    teamId: input.teamId,
    memberId: input.memberId,
    groupId,
    title,
    description: input.description.trim(),
    originalDate,
    workDate,
    status: "ACTIVE",
    order: input.order,
    roadmapGoalId: input.roadmapGoalId,
    active: true,
    createdBy: input.createdBy,
    createdByName: input.createdByName.trim(),
    createdAt: serverTimestamp(),
    updatedBy: input.createdBy,
    updatedAt: serverTimestamp(),
    startedBy: null,
    startedAt: null,
    completedBy: null,
    completedAt: null,
  };

  await setDoc(taskReference, taskData);

  return taskReference.id;
}

export async function updateTask(
  taskId: string,
  data: UpdateTaskData,
): Promise<void> {
  const updateData: UpdateData<Task> = {
    updatedBy: data.updatedBy,
    updatedAt: serverTimestamp(),
  };

  if (data.title !== undefined) {
    const title = data.title.trim();

    if (!title) {
      throw new Error("Task title cannot be empty.");
    }

    updateData.title = title;
  }

  if (data.description !== undefined) {
    updateData.description = data.description.trim();
  }

  if (data.groupId !== undefined) {
    updateData.groupId = data.groupId;
  }

  if (data.order !== undefined) {
    updateData.order = data.order;
  }

  if (data.roadmapGoalId !== undefined) {
    updateData.roadmapGoalId = data.roadmapGoalId;
  }

  await updateDoc(doc(db, TASKS_COLLECTION, taskId), updateData);
}

export async function startTask(taskId: string, userId: string): Promise<void> {
  const taskReference = doc(db, TASKS_COLLECTION, taskId);

  await runTransaction(db, async (transaction) => {
    const taskSnapshot = await transaction.get(taskReference);

    if (!taskSnapshot.exists()) {
      throw new Error(`Task with ID "${taskId}" does not exist.`);
    }

    const task = taskSnapshot.data() as Task;

    if (task.status === "COMPLETED") {
      throw new Error("Cannot start a completed task.");
    }

    if (task.status === "IN_PROGRESS") {
      return;
    }

    const updateData: UpdateData<Task> = {
      status: "IN_PROGRESS",
      startedBy: userId,
      startedAt: serverTimestamp(),
      updatedBy: userId,
      updatedAt: serverTimestamp(),
    };

    transaction.update(taskReference, updateData);
  });
}

export async function completeTask(
  taskId: string,
  userId: string,
): Promise<void> {
  const taskReference = doc(db, TASKS_COLLECTION, taskId);

  await runTransaction(db, async (transaction) => {
    const taskSnapshot = await transaction.get(taskReference);

    if (!taskSnapshot.exists()) {
      throw new Error(`Task with ID "${taskId}" does not exist.`);
    }

    const task = taskSnapshot.data() as Task;

    if (task.status === "COMPLETED") {
      return;
    }

    const updateData: UpdateData<Task> = {
      status: "COMPLETED",
      completedBy: userId,
      completedAt: serverTimestamp(),
      updatedBy: userId,
      updatedAt: serverTimestamp(),
    };

    if (task.status === "ACTIVE" && task.startedAt === null) {
      updateData.startedBy = userId;
      updateData.startedAt = serverTimestamp();
    }

    transaction.update(taskReference, updateData);
  });
}

export async function reopenTask(taskId: string, userId: string): Promise<void> {
  const taskReference = doc(db, TASKS_COLLECTION, taskId);

  await runTransaction(db, async (transaction) => {
    const taskSnapshot = await transaction.get(taskReference);

    if (!taskSnapshot.exists()) {
      throw new Error(`Task with ID "${taskId}" does not exist.`);
    }

    const task = taskSnapshot.data() as Task;

    if (task.status === "ACTIVE") {
      return;
    }

    const updateData: UpdateData<Task> = {
      status: "ACTIVE",
      startedBy: null,
      startedAt: null,
      completedBy: null,
      completedAt: null,
      updatedBy: userId,
      updatedAt: serverTimestamp(),
    };

    transaction.update(taskReference, updateData);
  });
}

export async function setTaskActive(
  taskId: string,
  active: boolean,
  updatedBy: string,
): Promise<void> {
  const updateData: UpdateData<Task> = {
    active,
    updatedBy,
    updatedAt: serverTimestamp(),
  };

  await updateDoc(doc(db, TASKS_COLLECTION, taskId), updateData);
}

export async function updateTaskOrder(
  taskId: string,
  order: number,
  updatedBy: string,
): Promise<void> {
  const updateData: UpdateData<Task> = {
    order,
    updatedBy,
    updatedAt: serverTimestamp(),
  };

  await updateDoc(doc(db, TASKS_COLLECTION, taskId), updateData);
}

export async function updateTaskOrders(
  updates: TaskOrderUpdate[],
  updatedBy: string,
): Promise<void> {
  if (updates.length === 0) {
    return;
  }

  const updatesByTaskId = new Map<string, TaskOrderUpdate>();

  for (const update of updates) {
    updatesByTaskId.set(update.taskId, update);
  }

  const uniqueUpdates = [...updatesByTaskId.values()];

  for (
    let index = 0;
    index < uniqueUpdates.length;
    index += TASK_ORDER_BATCH_SIZE
  ) {
    const batch = writeBatch(db);
    const taskUpdates = uniqueUpdates.slice(
      index,
      index + TASK_ORDER_BATCH_SIZE,
    );

    for (const taskUpdate of taskUpdates) {
      const updateData: UpdateData<Task> = {
        order: taskUpdate.order,
        updatedBy,
        updatedAt: serverTimestamp(),
      };

      batch.update(
        doc(db, TASKS_COLLECTION, taskUpdate.taskId),
        updateData,
      );
    }

    await batch.commit();
  }
}
