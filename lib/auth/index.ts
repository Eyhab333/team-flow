import {
  browserLocalPersistence,
  browserSessionPersistence,
  setPersistence,
  signInWithEmailAndPassword,
  signOut,
  type UserCredential,
} from "firebase/auth";

import { auth } from "@/lib/firebase/client";

export async function signInWithEmail(
  email: string,
  password: string,
  rememberMe = true,
): Promise<UserCredential> {
  const persistence = rememberMe
    ? browserLocalPersistence
    : browserSessionPersistence;

  await setPersistence(auth, persistence);

  return signInWithEmailAndPassword(auth, email.trim().toLowerCase(), password);
}

export async function signOutCurrentUser(): Promise<void> {
  await signOut(auth);
}
