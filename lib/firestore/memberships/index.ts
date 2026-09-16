import {
  collection,
  doc,
  getDoc,
  getDocs,
  orderBy,
  query,
  runTransaction,
  serverTimestamp,
  updateDoc,
  where,
  type UpdateData,
  type WithFieldValue,
} from "firebase/firestore";

import { db } from "@/lib/firebase/client";
import type { Membership } from "@/types/membership";

const MEMBERSHIPS_COLLECTION = "teamMemberships";

export type CreateMembershipInput = Pick<
  Membership,
  "teamId" | "userId" | "role" | "order"
>;

export type UpdateMembershipData = Partial<
  Pick<Membership, "role" | "order" | "active">
>;

export function getMembershipId(teamId: string, userId: string): string {
  return `${teamId}__${userId}`;
}

export async function getMembershipById(
  teamId: string,
  userId: string,
): Promise<Membership | null> {
  const membershipId = getMembershipId(teamId, userId);
  const membershipSnapshot = await getDoc(
    doc(db, MEMBERSHIPS_COLLECTION, membershipId),
  );

  return membershipSnapshot.exists()
    ? (membershipSnapshot.data() as Membership)
    : null;
}

export async function getMembershipsForUser(
  userId: string,
): Promise<Membership[]> {
  const membershipsQuery = query(
    collection(db, MEMBERSHIPS_COLLECTION),
    where("userId", "==", userId),
    where("active", "==", true),
  );
  const membershipsSnapshot = await getDocs(membershipsQuery);

  return membershipsSnapshot.docs.map(
    (membershipDocument) => membershipDocument.data() as Membership,
  );
}

export async function getLeaderMemberships(
  userId: string,
): Promise<Membership[]> {
  const membershipsQuery = query(
    collection(db, MEMBERSHIPS_COLLECTION),
    where("userId", "==", userId),
    where("role", "==", "LEADER"),
    where("active", "==", true),
  );
  const membershipsSnapshot = await getDocs(membershipsQuery);

  return membershipsSnapshot.docs.map(
    (membershipDocument) => membershipDocument.data() as Membership,
  );
}

export async function getTeamMemberships(
  teamId: string,
): Promise<Membership[]> {
  const membershipsQuery = query(
    collection(db, MEMBERSHIPS_COLLECTION),
    where("teamId", "==", teamId),
    where("active", "==", true),
    orderBy("order", "asc"),
  );
  const membershipsSnapshot = await getDocs(membershipsQuery);

  return membershipsSnapshot.docs.map(
    (membershipDocument) => membershipDocument.data() as Membership,
  );
}

export async function getTeamMembers(teamId: string): Promise<Membership[]> {
  const membershipsQuery = query(
    collection(db, MEMBERSHIPS_COLLECTION),
    where("teamId", "==", teamId),
    where("role", "==", "MEMBER"),
    where("active", "==", true),
    orderBy("order", "asc"),
  );
  const membershipsSnapshot = await getDocs(membershipsQuery);

  return membershipsSnapshot.docs.map(
    (membershipDocument) => membershipDocument.data() as Membership,
  );
}

export async function createMembership(
  input: CreateMembershipInput,
): Promise<void> {
  const id = getMembershipId(input.teamId, input.userId);
  const membershipReference = doc(db, MEMBERSHIPS_COLLECTION, id);
  const membershipData: WithFieldValue<Membership> = {
    id,
    teamId: input.teamId,
    userId: input.userId,
    role: input.role,
    active: true,
    order: input.order,
    joinedAt: serverTimestamp(),
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };

  await runTransaction(db, async (transaction) => {
    const existingMembership = await transaction.get(membershipReference);

    if (existingMembership.exists()) {
      throw new Error(`Membership with ID "${id}" already exists.`);
    }

    transaction.set(membershipReference, membershipData);
  });
}

export async function updateMembership(
  teamId: string,
  userId: string,
  data: UpdateMembershipData,
): Promise<void> {
  const updateData: UpdateData<Membership> = {
    ...data,
    updatedAt: serverTimestamp(),
  };

  await updateDoc(
    doc(db, MEMBERSHIPS_COLLECTION, getMembershipId(teamId, userId)),
    updateData,
  );
}

export async function setMembershipActive(
  teamId: string,
  userId: string,
  active: boolean,
): Promise<void> {
  const updateData: UpdateData<Membership> = {
    active,
    updatedAt: serverTimestamp(),
  };

  await updateDoc(
    doc(db, MEMBERSHIPS_COLLECTION, getMembershipId(teamId, userId)),
    updateData,
  );
}

export async function updateMembershipOrder(
  teamId: string,
  userId: string,
  order: number,
): Promise<void> {
  const updateData: UpdateData<Membership> = {
    order,
    updatedAt: serverTimestamp(),
  };

  await updateDoc(
    doc(db, MEMBERSHIPS_COLLECTION, getMembershipId(teamId, userId)),
    updateData,
  );
}
