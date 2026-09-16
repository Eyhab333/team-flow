"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { getRoadmapGoalsForMember } from "@/lib/firestore/roadmap-goals";
import type { RoadmapGoal, RoadmapHorizon } from "@/types/roadmap";

export interface RoadmapSummary {
  total: number;
  active: number;
  completed: number;
}

const EMPTY_SUMMARY: RoadmapSummary = {
  total: 0,
  active: 0,
  completed: 0,
};

function sortGoals(goals: RoadmapGoal[]): RoadmapGoal[] {
  return [...goals].sort((firstGoal, secondGoal) => {
    const orderDifference = firstGoal.order - secondGoal.order;

    return orderDifference !== 0
      ? orderDifference
      : firstGoal.id.localeCompare(secondGoal.id);
  });
}

function getGoalsForHorizon(
  goals: RoadmapGoal[],
  horizon: RoadmapHorizon,
): RoadmapGoal[] {
  return sortGoals(goals.filter((goal) => goal.horizon === horizon));
}

function toError(error: unknown): Error {
  return error instanceof Error
    ? error
    : new Error("Unable to load roadmap goals.");
}

export function useRoadmap(teamId: string, memberId: string) {
  const [goals, setGoals] = useState<RoadmapGoal[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const requestIdRef = useRef(0);

  const loadRoadmap = useCallback(
    async (showLoading = true): Promise<void> => {
      const requestId = ++requestIdRef.current;

      if (showLoading) {
        setGoals([]);
        setIsLoading(true);
      }
      setError(null);

      try {
        const loadedGoals = await getRoadmapGoalsForMember(teamId, memberId);

        if (requestId !== requestIdRef.current) {
          return;
        }

        setGoals(sortGoals(loadedGoals));
        setIsLoading(false);
      } catch (loadError) {
        if (requestId !== requestIdRef.current) {
          return;
        }

        setError(toError(loadError));
        setIsLoading(false);
      }
    },
    [memberId, teamId],
  );

  const refresh = useCallback(
    (): Promise<void> => loadRoadmap(false),
    [loadRoadmap],
  );

  useEffect(() => {
    void loadRoadmap();

    return () => {
      ++requestIdRef.current;
    };
  }, [loadRoadmap]);

  const shortGoals = useMemo(
    () => getGoalsForHorizon(goals, "SHORT"),
    [goals],
  );
  const mediumGoals = useMemo(
    () => getGoalsForHorizon(goals, "MEDIUM"),
    [goals],
  );
  const longGoals = useMemo(
    () => getGoalsForHorizon(goals, "LONG"),
    [goals],
  );
  const summary = useMemo(
    () => ({
      total: goals.length,
      active: goals.filter((goal) => goal.status === "ACTIVE").length,
      completed: goals.filter((goal) => goal.status === "COMPLETED").length,
    }),
    [goals],
  );

  return {
    goals,
    shortGoals,
    mediumGoals,
    longGoals,
    summary: goals.length === 0 ? EMPTY_SUMMARY : summary,
    isLoading,
    error,
    refresh,
  };
}
