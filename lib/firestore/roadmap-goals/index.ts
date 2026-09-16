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
import type { RoadmapGoal, RoadmapHorizon } from "@/types/roadmap";

const ROADMAP_GOALS_COLLECTION = "roadmapGoals";
const ROADMAP_GOAL_ORDER_BATCH_SIZE = 500;

export type CreateRoadmapGoalInput = Pick<
  RoadmapGoal,
  | "teamId"
  | "memberId"
  | "title"
  | "description"
  | "horizon"
  | "targetYear"
  | "targetDate"
  | "order"
  | "createdBy"
  | "createdByName"
>;

export type UpdateRoadmapGoalData = Pick<RoadmapGoal, "updatedBy"> &
  Partial<
    Pick<
      RoadmapGoal,
      "title" | "description" | "horizon" | "targetYear" | "targetDate" | "order"
    >
  >;

export interface RoadmapGoalOrderUpdate {
  goalId: string;
  order: number;
}

export async function getRoadmapGoalById(
  goalId: string,
): Promise<RoadmapGoal | null> {
  const goalSnapshot = await getDoc(
    doc(db, ROADMAP_GOALS_COLLECTION, goalId),
  );

  return goalSnapshot.exists() ? (goalSnapshot.data() as RoadmapGoal) : null;
}

export async function getRoadmapGoalsForMember(
  teamId: string,
  memberId: string,
): Promise<RoadmapGoal[]> {
  const goalsQuery = query(
    collection(db, ROADMAP_GOALS_COLLECTION),
    where("teamId", "==", teamId),
    where("memberId", "==", memberId),
    where("active", "==", true),
    orderBy("order", "asc"),
  );
  const goalsSnapshot = await getDocs(goalsQuery);

  return goalsSnapshot.docs.map(
    (goalDocument) => goalDocument.data() as RoadmapGoal,
  );
}

export async function getRoadmapGoalsByHorizon(
  teamId: string,
  memberId: string,
  horizon: RoadmapHorizon,
): Promise<RoadmapGoal[]> {
  const goalsQuery = query(
    collection(db, ROADMAP_GOALS_COLLECTION),
    where("teamId", "==", teamId),
    where("memberId", "==", memberId),
    where("horizon", "==", horizon),
    where("active", "==", true),
    orderBy("order", "asc"),
  );
  const goalsSnapshot = await getDocs(goalsQuery);

  return goalsSnapshot.docs.map(
    (goalDocument) => goalDocument.data() as RoadmapGoal,
  );
}

export async function createRoadmapGoal(
  input: CreateRoadmapGoalInput,
): Promise<string> {
  const title = input.title.trim();

  if (!title) {
    throw new Error("Roadmap goal title cannot be empty.");
  }

  if (
    input.horizon !== "SHORT" &&
    input.horizon !== "MEDIUM" &&
    input.horizon !== "LONG"
  ) {
    throw new Error("Roadmap goal horizon is invalid.");
  }

  const goalReference = doc(collection(db, ROADMAP_GOALS_COLLECTION));
  const goalData: WithFieldValue<RoadmapGoal> = {
    id: goalReference.id,
    teamId: input.teamId,
    memberId: input.memberId,
    title,
    description: input.description.trim(),
    horizon: input.horizon,
    targetYear: input.targetYear,
    targetDate: input.targetDate,
    status: "ACTIVE",
    order: input.order,
    active: true,
    createdBy: input.createdBy,
    createdByName: input.createdByName.trim(),
    createdAt: serverTimestamp(),
    updatedBy: input.createdBy,
    updatedAt: serverTimestamp(),
  };

  await setDoc(goalReference, goalData);

  return goalReference.id;
}

export async function updateRoadmapGoal(
  goalId: string,
  data: UpdateRoadmapGoalData,
): Promise<void> {
  const updateData: UpdateData<RoadmapGoal> = {
    updatedBy: data.updatedBy,
    updatedAt: serverTimestamp(),
  };

  if (data.title !== undefined) {
    const title = data.title.trim();

    if (!title) {
      throw new Error("Roadmap goal title cannot be empty.");
    }

    updateData.title = title;
  }

  if (data.description !== undefined) {
    updateData.description = data.description.trim();
  }

  if (data.horizon !== undefined) {
    updateData.horizon = data.horizon;
  }

  if (data.targetYear !== undefined) {
    updateData.targetYear = data.targetYear;
  }

  if (data.targetDate !== undefined) {
    updateData.targetDate = data.targetDate;
  }

  if (data.order !== undefined) {
    updateData.order = data.order;
  }

  await updateDoc(doc(db, ROADMAP_GOALS_COLLECTION, goalId), updateData);
}

export async function completeRoadmapGoal(
  goalId: string,
  updatedBy: string,
): Promise<void> {
  const goalReference = doc(db, ROADMAP_GOALS_COLLECTION, goalId);

  await runTransaction(db, async (transaction) => {
    const goalSnapshot = await transaction.get(goalReference);

    if (!goalSnapshot.exists()) {
      throw new Error(`Roadmap goal with ID "${goalId}" does not exist.`);
    }

    const goal = goalSnapshot.data() as RoadmapGoal;

    if (goal.status === "COMPLETED") {
      return;
    }

    const updateData: UpdateData<RoadmapGoal> = {
      status: "COMPLETED",
      updatedBy,
      updatedAt: serverTimestamp(),
    };

    transaction.update(goalReference, updateData);
  });
}

export async function reopenRoadmapGoal(
  goalId: string,
  updatedBy: string,
): Promise<void> {
  const goalReference = doc(db, ROADMAP_GOALS_COLLECTION, goalId);

  await runTransaction(db, async (transaction) => {
    const goalSnapshot = await transaction.get(goalReference);

    if (!goalSnapshot.exists()) {
      throw new Error(`Roadmap goal with ID "${goalId}" does not exist.`);
    }

    const goal = goalSnapshot.data() as RoadmapGoal;

    if (goal.status === "ACTIVE") {
      return;
    }

    const updateData: UpdateData<RoadmapGoal> = {
      status: "ACTIVE",
      updatedBy,
      updatedAt: serverTimestamp(),
    };

    transaction.update(goalReference, updateData);
  });
}

export async function setRoadmapGoalActive(
  goalId: string,
  active: boolean,
  updatedBy: string,
): Promise<void> {
  const updateData: UpdateData<RoadmapGoal> = {
    active,
    updatedBy,
    updatedAt: serverTimestamp(),
  };

  await updateDoc(doc(db, ROADMAP_GOALS_COLLECTION, goalId), updateData);
}

export async function updateRoadmapGoalOrder(
  goalId: string,
  order: number,
  updatedBy: string,
): Promise<void> {
  const updateData: UpdateData<RoadmapGoal> = {
    order,
    updatedBy,
    updatedAt: serverTimestamp(),
  };

  await updateDoc(doc(db, ROADMAP_GOALS_COLLECTION, goalId), updateData);
}

export async function updateRoadmapGoalOrders(
  updates: RoadmapGoalOrderUpdate[],
  updatedBy: string,
): Promise<void> {
  if (updates.length === 0) {
    return;
  }

  const updatesByGoalId = new Map<string, RoadmapGoalOrderUpdate>();

  for (const update of updates) {
    updatesByGoalId.set(update.goalId, update);
  }

  const uniqueUpdates = [...updatesByGoalId.values()];

  for (
    let index = 0;
    index < uniqueUpdates.length;
    index += ROADMAP_GOAL_ORDER_BATCH_SIZE
  ) {
    const batch = writeBatch(db);
    const goalUpdates = uniqueUpdates.slice(
      index,
      index + ROADMAP_GOAL_ORDER_BATCH_SIZE,
    );

    for (const goalUpdate of goalUpdates) {
      const updateData: UpdateData<RoadmapGoal> = {
        order: goalUpdate.order,
        updatedBy,
        updatedAt: serverTimestamp(),
      };

      batch.update(
        doc(db, ROADMAP_GOALS_COLLECTION, goalUpdate.goalId),
        updateData,
      );
    }

    await batch.commit();
  }
}
