import {
  collection,
  doc,
  documentId,
  getDoc,
  getDocs,
  query,
  serverTimestamp,
  updateDoc,
  where,
  type UpdateData,
} from "firebase/firestore";

import { db } from "@/lib/firebase/client";
import type { User } from "@/types/user";

const USERS_COLLECTION = "users";
const USERS_BY_IDS_BATCH_SIZE = 30;

export type UpdateUserData = Partial<
  Pick<User, "displayName" | "photoURL" | "active">
>;

export async function getUserById(uid: string): Promise<User | null> {
  const userSnapshot = await getDoc(doc(db, USERS_COLLECTION, uid));

  return userSnapshot.exists() ? (userSnapshot.data() as User) : null;
}

export async function getUsersByIds(userIds: string[]): Promise<User[]> {
  const uniqueUserIds = [...new Set(userIds)];

  if (uniqueUserIds.length === 0) {
    return [];
  }

  const users: User[] = [];

  for (
    let index = 0;
    index < uniqueUserIds.length;
    index += USERS_BY_IDS_BATCH_SIZE
  ) {
    const userIdBatch = uniqueUserIds.slice(
      index,
      index + USERS_BY_IDS_BATCH_SIZE,
    );
    const usersQuery = query(
      collection(db, USERS_COLLECTION),
      where(documentId(), "in", userIdBatch),
    );
    const usersSnapshot = await getDocs(usersQuery);

    users.push(
      ...usersSnapshot.docs.map((userDocument) => userDocument.data() as User),
    );
  }

  return users;
}

export async function updateUser(
  uid: string,
  data: UpdateUserData,
): Promise<void> {
  const updateData: UpdateData<User> = {
    ...data,
    updatedAt: serverTimestamp(),
  };

  await updateDoc(doc(db, USERS_COLLECTION, uid), updateData);
}

export async function setUserLastLogin(uid: string): Promise<void> {
  const updateData: UpdateData<User> = {
    lastLoginAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };

  await updateDoc(doc(db, USERS_COLLECTION, uid), updateData);
}
