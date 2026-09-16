"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { getTeamMembers } from "@/lib/firestore/memberships";
import { getTeamsByIds } from "@/lib/firestore/teams";
import { getUsersByIds } from "@/lib/firestore/users";
import { useAuth } from "@/hooks/auth/use-auth";
import type { Membership } from "@/types/membership";
import type { Team } from "@/types/team";
import type { User } from "@/types/user";

export interface LeaderTeamMember {
  membership: Membership;
  user: User;
}

export interface LeaderTeamView {
  team: Team;
  members: LeaderTeamMember[];
}

function toError(error: unknown): Error {
  return error instanceof Error
    ? error
    : new Error("Unable to load leader teams.");
}

export function useLeaderTeams() {
  const { leaderMemberships } = useAuth();
  const [teams, setTeams] = useState<LeaderTeamView[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const requestIdRef = useRef(0);

  const loadLeaderTeams = useCallback(async (): Promise<void> => {
    const requestId = ++requestIdRef.current;
    const leaderTeamIds = [
      ...new Set(
        leaderMemberships
          .filter((membership) => membership.active)
          .map((membership) => membership.teamId),
      ),
    ];

    if (leaderTeamIds.length === 0) {
      setTeams([]);
      setError(null);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);
    setTeams([]);

    try {
      const teamDocuments = await getTeamsByIds(leaderTeamIds);

      if (requestId !== requestIdRef.current) {
        return;
      }

      const teamsById = new Map(
        teamDocuments.map((team) => [team.id, team]),
      );
      const orderedTeams = leaderTeamIds
        .map((teamId) => teamsById.get(teamId))
        .filter(
          (team): team is Team => team !== undefined && team.active,
        );
      const membershipsByTeam = await Promise.all(
        orderedTeams.map(async (team) => ({
          team,
          memberships: await getTeamMembers(team.id),
        })),
      );

      if (requestId !== requestIdRef.current) {
        return;
      }

      const memberUserIds = [
        ...new Set(
          membershipsByTeam.flatMap(({ memberships }) =>
            memberships.map((membership) => membership.userId),
          ),
        ),
      ];
      const users = await getUsersByIds(memberUserIds);

      if (requestId !== requestIdRef.current) {
        return;
      }

      const usersById = new Map(users.map((user) => [user.uid, user]));
      const teamViews: LeaderTeamView[] = [];

      for (const { team, memberships } of membershipsByTeam) {
        const members: LeaderTeamMember[] = [];

        for (const membership of [...memberships].sort(
          (first, second) => first.order - second.order,
        )) {
          const user = usersById.get(membership.userId);

          if (user) {
            members.push({ membership, user });
          }
        }

        teamViews.push({ team, members });
      }

      setTeams(teamViews);
      setIsLoading(false);
    } catch (loadError) {
      console.error("useLeaderTeams failed:", loadError);
      if (requestId !== requestIdRef.current) {
        return;
      }

      setTeams([]);
      setError(toError(loadError));
      setIsLoading(false);
    }
  }, [leaderMemberships]);

  useEffect(() => {
    void loadLeaderTeams();

    return () => {
      ++requestIdRef.current;
    };
  }, [loadLeaderTeams]);

  return {
    teams,
    isLoading,
    error,
    refresh: loadLeaderTeams,
  };
}
