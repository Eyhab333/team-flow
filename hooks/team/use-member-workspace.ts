"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { getMembershipById } from "@/lib/firestore/memberships";
import { getUserById } from "@/lib/firestore/users";
import { useAuth } from "@/hooks/auth/use-auth";
import type { User } from "@/types/user";

function toError(error: unknown): Error {
  return error instanceof Error
    ? error
    : new Error("Unable to load member workspace.");
}

export function useMemberWorkspace(memberId: string) {
  const { user: currentUser, leaderMemberships } = useAuth();
  const [member, setMember] = useState<User | null>(null);
  const [isSelf, setIsSelf] = useState(false);
  const [canAccess, setCanAccess] = useState(false);
  const [sharedTeamId, setSharedTeamId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const requestIdRef = useRef(0);

  const loadMemberWorkspace = useCallback(async (): Promise<void> => {
    const requestId = ++requestIdRef.current;
    const currentUserId = currentUser?.uid;
    const accessingSelf = currentUserId === memberId;

    setMember(null);
    setIsSelf(accessingSelf);
    setCanAccess(false);
    setSharedTeamId(null);
    setIsLoading(true);
    setError(null);

    if (!currentUserId) {
      setIsLoading(false);
      return;
    }

    try {
      const targetMember = await getUserById(memberId);

      if (requestId !== requestIdRef.current) {
        return;
      }

      if (!targetMember || !targetMember.active) {
        setMember(targetMember);
        setIsLoading(false);
        return;
      }

      if (accessingSelf) {
        setMember(targetMember);
        setCanAccess(true);
        setIsLoading(false);
        return;
      }

      const leaderTeamIds = [
        ...new Set(
          leaderMemberships
            .filter((membership) => membership.active)
            .map((membership) => membership.teamId),
        ),
      ];
      let validSharedTeamId: string | null = null;

      for (const teamId of leaderTeamIds) {
        const targetMembership = await getMembershipById(teamId, memberId);

        if (requestId !== requestIdRef.current) {
          return;
        }

        if (
          targetMembership?.active &&
          targetMembership.role === "MEMBER"
        ) {
          validSharedTeamId = teamId;
          break;
        }
      }

      if (requestId !== requestIdRef.current) {
        return;
      }

      setMember(targetMember);
      setCanAccess(validSharedTeamId !== null);
      setSharedTeamId(validSharedTeamId);
      setIsLoading(false);
    } catch (loadError) {
      if (requestId !== requestIdRef.current) {
        return;
      }

      setMember(null);
      setCanAccess(false);
      setSharedTeamId(null);
      setError(toError(loadError));
      setIsLoading(false);
    }
  }, [currentUser?.uid, leaderMemberships, memberId]);

  useEffect(() => {
    void loadMemberWorkspace();

    return () => {
      ++requestIdRef.current;
    };
  }, [loadMemberWorkspace]);

  return {
    member,
    isSelf,
    canAccess,
    sharedTeamId,
    isLoading,
    error,
    refresh: loadMemberWorkspace,
  };
}
