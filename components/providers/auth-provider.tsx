"use client";

import {
  createContext,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { onAuthStateChanged, type User as FirebaseUser } from "firebase/auth";

import { signOutCurrentUser } from "@/lib/auth";
import { auth } from "@/lib/firebase/client";
import { getMembershipsForUser } from "@/lib/firestore/memberships";
import { getUserById, setUserLastLogin } from "@/lib/firestore/users";
import type { Membership } from "@/types/membership";
import type { User } from "@/types/user";

export interface AuthContextValue {
  firebaseUser: FirebaseUser | null;
  user: User | null;
  memberships: Membership[];
  leaderMemberships: Membership[];
  isAuthenticated: boolean;
  hasAppAccess: boolean;
  isLoading: boolean;
  error: Error | null;
  leadsAnyTeam: boolean;
  refreshCurrentUser: () => Promise<void>;
  signOut: () => Promise<void>;
}

export const AuthContext = createContext<AuthContextValue | undefined>(
  undefined,
);

function toError(error: unknown): Error {
  return error instanceof Error
    ? error
    : new Error("Unable to load the current user.");
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [memberships, setMemberships] = useState<Membership[]>([]);
  const [hasAppAccess, setHasAppAccess] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const requestIdRef = useRef(0);

  const clearCurrentUser = useCallback(() => {
    setFirebaseUser(null);
    setUser(null);
    setMemberships([]);
    setHasAppAccess(false);
    setIsLoading(false);
    setError(null);
  }, []);

  const loadCurrentUser = useCallback(
    async (
      nextFirebaseUser: FirebaseUser,
      requestId: number,
      shouldUpdateLastLogin: boolean,
    ): Promise<void> => {
      try {
        const applicationUser = await getUserById(nextFirebaseUser.uid);

        if (requestId !== requestIdRef.current) {
          return;
        }

        if (!applicationUser || !applicationUser.active) {
          setUser(null);
          setMemberships([]);
          setHasAppAccess(false);
          setIsLoading(false);
          return;
        }

        const activeMemberships = await getMembershipsForUser(
          nextFirebaseUser.uid,
        );

        if (requestId !== requestIdRef.current) {
          return;
        }

        setUser(applicationUser);
        setMemberships(activeMemberships);
        setHasAppAccess(true);
        setIsLoading(false);

        if (shouldUpdateLastLogin) {
          void setUserLastLogin(nextFirebaseUser.uid).catch((lastLoginError) => {
            if (requestId === requestIdRef.current) {
              setError(toError(lastLoginError));
            }
          });
        }
      } catch (loadError) {
        if (requestId !== requestIdRef.current) {
          return;
        }

        setUser(null);
        setMemberships([]);
        setHasAppAccess(false);
        setError(toError(loadError));
        setIsLoading(false);
      }
    },
    [],
  );

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (nextFirebaseUser) => {
      const requestId = ++requestIdRef.current;

      if (!nextFirebaseUser) {
        clearCurrentUser();
        return;
      }

      setFirebaseUser(nextFirebaseUser);
      setUser(null);
      setMemberships([]);
      setHasAppAccess(false);
      setIsLoading(true);
      setError(null);
      void loadCurrentUser(nextFirebaseUser, requestId, true);
    });

    return () => {
      ++requestIdRef.current;
      unsubscribe();
    };
  }, [clearCurrentUser, loadCurrentUser]);

  const refreshCurrentUser = useCallback(async (): Promise<void> => {
    const currentFirebaseUser = auth.currentUser;
    const requestId = ++requestIdRef.current;

    if (!currentFirebaseUser) {
      clearCurrentUser();
      return;
    }

    setFirebaseUser(currentFirebaseUser);
    setUser(null);
    setMemberships([]);
    setHasAppAccess(false);
    setIsLoading(true);
    setError(null);

    await loadCurrentUser(currentFirebaseUser, requestId, false);
  }, [clearCurrentUser, loadCurrentUser]);

  const signOut = useCallback(async (): Promise<void> => {
    try {
      await signOutCurrentUser();
    } catch (signOutError) {
      setError(toError(signOutError));
      throw signOutError;
    }
  }, []);

  const leaderMemberships = useMemo(
    () => memberships.filter((membership) => membership.role === "LEADER"),
    [memberships],
  );
  const isAuthenticated = firebaseUser !== null;

  const value = useMemo<AuthContextValue>(
    () => ({
      firebaseUser,
      user,
      memberships,
      leaderMemberships,
      isAuthenticated,
      hasAppAccess,
      isLoading,
      error,
      leadsAnyTeam: leaderMemberships.length > 0,
      refreshCurrentUser,
      signOut,
    }),
    [
      error,
      firebaseUser,
      hasAppAccess,
      isAuthenticated,
      isLoading,
      leaderMemberships,
      memberships,
      refreshCurrentUser,
      signOut,
      user,
    ],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
