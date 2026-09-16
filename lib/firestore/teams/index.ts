import {
  collection,
  doc,
  documentId,
  getDoc,
  getDocs,
  query,
  runTransaction,
  serverTimestamp,
  updateDoc,
  where,
  type UpdateData,
  type WithFieldValue,
} from "firebase/firestore";

import { db } from "@/lib/firebase/client";
import type { Team } from "@/types/team";

const TEAMS_COLLECTION = "teams";
const TEAMS_BY_IDS_BATCH_SIZE = 30;

export type CreateTeamInput = Pick<
  Team,
  "id" | "name" | "description" | "createdBy"
>;

export type UpdateTeamData = Partial<
  Pick<Team, "name" | "description" | "active">
>;

export async function getTeamById(teamId: string): Promise<Team | null> {
  const teamSnapshot = await getDoc(doc(db, TEAMS_COLLECTION, teamId));

  return teamSnapshot.exists() ? (teamSnapshot.data() as Team) : null;
}

export async function getTeamsByIds(teamIds: string[]): Promise<Team[]> {
  const uniqueTeamIds = [...new Set(teamIds)];

  if (uniqueTeamIds.length === 0) {
    return [];
  }

  const teams: Team[] = [];

  for (
    let index = 0;
    index < uniqueTeamIds.length;
    index += TEAMS_BY_IDS_BATCH_SIZE
  ) {
    const teamIdBatch = uniqueTeamIds.slice(
      index,
      index + TEAMS_BY_IDS_BATCH_SIZE,
    );
    const teamsQuery = query(
      collection(db, TEAMS_COLLECTION),
      where(documentId(), "in", teamIdBatch),
    );
    const teamsSnapshot = await getDocs(teamsQuery);

    teams.push(
      ...teamsSnapshot.docs.map((teamDocument) => teamDocument.data() as Team),
    );
  }

  return teams;
}

export async function createTeam(input: CreateTeamInput): Promise<void> {
  const name = input.name.trim();

  if (!name) {
    throw new Error("Team name cannot be empty.");
  }

  const teamReference = doc(db, TEAMS_COLLECTION, input.id);
  const teamData: WithFieldValue<Team> = {
    id: input.id,
    name,
    description: input.description.trim(),
    active: true,
    createdBy: input.createdBy,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };

  await runTransaction(db, async (transaction) => {
    const existingTeam = await transaction.get(teamReference);

    if (existingTeam.exists()) {
      throw new Error(`Team with ID "${input.id}" already exists.`);
    }

    transaction.set(teamReference, teamData);
  });
}

export async function updateTeam(
  teamId: string,
  data: UpdateTeamData,
): Promise<void> {
  const updateData: UpdateData<Team> = {
    updatedAt: serverTimestamp(),
  };

  if (data.name !== undefined) {
    const name = data.name.trim();

    if (!name) {
      throw new Error("Team name cannot be empty.");
    }

    updateData.name = name;
  }

  if (data.description !== undefined) {
    updateData.description = data.description.trim();
  }

  if (data.active !== undefined) {
    updateData.active = data.active;
  }

  await updateDoc(doc(db, TEAMS_COLLECTION, teamId), updateData);
}

export async function setTeamActive(
  teamId: string,
  active: boolean,
): Promise<void> {
  const updateData: UpdateData<Team> = {
    active,
    updatedAt: serverTimestamp(),
  };

  await updateDoc(doc(db, TEAMS_COLLECTION, teamId), updateData);
}
