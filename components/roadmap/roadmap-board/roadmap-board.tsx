"use client";

import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import { sortableKeyboardCoordinates } from "@dnd-kit/sortable";
import { LoaderCircle, Map, RefreshCw } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import { RoadmapSection } from "@/components/roadmap/roadmap-section/roadmap-section";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/auth/use-auth";
import { useRoadmap } from "@/hooks/roadmap/use-roadmap";
import {
  updateRoadmapGoal,
  updateRoadmapGoalOrders,
} from "@/lib/firestore/roadmap-goals";
import type { RoadmapGoal, RoadmapHorizon } from "@/types/roadmap";

interface RoadmapBoardProps {
  teamId: string;
  memberId: string;
}

type GoalsByHorizon = Record<RoadmapHorizon, RoadmapGoal[]>;

const HORIZONS: RoadmapHorizon[] = ["SHORT", "MEDIUM", "LONG"];

const HORIZON_SECTIONS: Array<{
  horizon: RoadmapHorizon;
  title: string;
  emptyMessage: string;
}> = [
  {
    horizon: "SHORT",
    title: "قريب المدى",
    emptyMessage: "لا توجد أهداف قريبة المدى بعد",
  },
  {
    horizon: "MEDIUM",
    title: "متوسط المدى",
    emptyMessage: "لا توجد أهداف متوسطة المدى بعد",
  },
  {
    horizon: "LONG",
    title: "بعيد المدى",
    emptyMessage: "لا توجد أهداف بعيدة المدى بعد",
  },
];

function sortGoals(goals: RoadmapGoal[]): RoadmapGoal[] {
  return [...goals].sort((firstGoal, secondGoal) => {
    const orderDifference = firstGoal.order - secondGoal.order;

    return orderDifference !== 0
      ? orderDifference
      : firstGoal.id.localeCompare(secondGoal.id);
  });
}

function groupGoalsByHorizon(goals: RoadmapGoal[]): GoalsByHorizon {
  return {
    SHORT: sortGoals(goals.filter((goal) => goal.horizon === "SHORT")),
    MEDIUM: sortGoals(goals.filter((goal) => goal.horizon === "MEDIUM")),
    LONG: sortGoals(goals.filter((goal) => goal.horizon === "LONG")),
  };
}

function findGoal(
  goalsByHorizon: GoalsByHorizon,
  goalId: string,
): { goal: RoadmapGoal; horizon: RoadmapHorizon; index: number } | null {
  for (const horizon of HORIZONS) {
    const index = goalsByHorizon[horizon].findIndex((goal) => goal.id === goalId);

    if (index >= 0) {
      return { goal: goalsByHorizon[horizon][index], horizon, index };
    }
  }

  return null;
}

function getHorizonFromDropTarget(
  targetId: string,
  goalsByHorizon: GoalsByHorizon,
): RoadmapHorizon | null {
  const horizonId = targetId.replace(/^horizon:/, "");

  if (HORIZONS.includes(horizonId as RoadmapHorizon)) {
    return horizonId as RoadmapHorizon;
  }

  return findGoal(goalsByHorizon, targetId)?.horizon ?? null;
}

function getGoalsKey(goals: RoadmapGoal[]): string {
  return goals
    .map((goal) => `${goal.id}:${goal.horizon}:${goal.order}:${goal.status}`)
    .join("|");
}

export function RoadmapBoard({ teamId, memberId }: RoadmapBoardProps) {
  const { user } = useAuth();
  const {
    goals,
    summary,
    isLoading,
    error,
    refresh,
  } = useRoadmap(teamId, memberId);
  const [goalsByHorizon, setGoalsByHorizon] = useState<GoalsByHorizon>(() =>
    groupGoalsByHorizon([]),
  );
  const [isReordering, setIsReordering] = useState(false);
  const goalsKey = getGoalsKey(goals);
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 8 },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  useEffect(() => {
    setGoalsByHorizon(groupGoalsByHorizon(goals));
  }, [goals, goalsKey]);

  const getNextGoalOrder = useCallback(
    (horizon: RoadmapHorizon): number =>
      Math.max(0, ...goalsByHorizon[horizon].map((goal) => goal.order)) + 1,
    [goalsByHorizon],
  );

  async function handleDragEnd({ active, over }: DragEndEvent): Promise<void> {
    if (!over || active.id === over.id || !user || isReordering) {
      return;
    }

    const activeGoal = findGoal(goalsByHorizon, String(active.id));
    const targetHorizon = getHorizonFromDropTarget(
      String(over.id),
      goalsByHorizon,
    );

    if (!activeGoal || !targetHorizon) {
      return;
    }

    const previousGoals = goalsByHorizon;
    const nextGoals: GoalsByHorizon = {
      SHORT: [...previousGoals.SHORT],
      MEDIUM: [...previousGoals.MEDIUM],
      LONG: [...previousGoals.LONG],
    };
    const isCrossHorizonMove = activeGoal.horizon !== targetHorizon;
    const targetIsHorizon = String(over.id) === `horizon:${targetHorizon}`;

    if (isCrossHorizonMove) {
      nextGoals[activeGoal.horizon].splice(activeGoal.index, 1);
      const destinationIndex = targetIsHorizon
        ? nextGoals[targetHorizon].length
        : Math.max(
            0,
            nextGoals[targetHorizon].findIndex(
              (goal) => goal.id === String(over.id),
            ),
          );

      nextGoals[targetHorizon].splice(destinationIndex, 0, activeGoal.goal);
    } else {
      const destinationIndex = targetIsHorizon
        ? nextGoals[targetHorizon].length - 1
        : nextGoals[targetHorizon].findIndex(
            (goal) => goal.id === String(over.id),
          );

      if (destinationIndex < 0 || destinationIndex === activeGoal.index) {
        return;
      }

      const [movedGoal] = nextGoals[targetHorizon].splice(activeGoal.index, 1);
      nextGoals[targetHorizon].splice(destinationIndex, 0, movedGoal);
    }

    const activeGoalDestinationIndex = nextGoals[targetHorizon].findIndex(
      (goal) => goal.id === activeGoal.goal.id,
    );
    const orderUpdates = HORIZONS.flatMap((horizon) =>
      nextGoals[horizon]
        .map((goal, index) => ({ goal, order: index + 1 }))
        .filter(({ goal, order }) => {
          if (isCrossHorizonMove && goal.id === activeGoal.goal.id) {
            return false;
          }

          const previousGoal = findGoal(previousGoals, goal.id)?.goal;

          return previousGoal?.order !== order;
        }),
    );

    setGoalsByHorizon(nextGoals);
    setIsReordering(true);

    try {
      if (isCrossHorizonMove) {
        await updateRoadmapGoal(activeGoal.goal.id, {
          horizon: targetHorizon,
          order: activeGoalDestinationIndex + 1,
          updatedBy: user.uid,
        });
      }

      await updateRoadmapGoalOrders(
        orderUpdates.map(({ goal, order }) => ({
          goalId: goal.id,
          order,
        })),
        user.uid,
      );
      await refresh();
    } catch {
      setGoalsByHorizon(previousGoals);
      await refresh();
      toast.error("تعذر حفظ ترتيب الأهداف");
    } finally {
      setIsReordering(false);
    }
  }

  if (isLoading) {
    return (
      <section className="flex min-h-52 items-center justify-center rounded-2xl border border-border/70 bg-card p-5">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <LoaderCircle aria-hidden="true" className="size-4 animate-spin" />
          جارٍ تحميل خارطة الطريق
        </div>
      </section>
    );
  }

  if (error) {
    return (
      <section className="flex min-h-52 flex-col items-center justify-center rounded-2xl border border-border/70 bg-card p-5 text-center">
        <p className="text-sm font-semibold text-foreground">
          تعذر تحميل خارطة الطريق
        </p>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="mt-3"
          onClick={() => void refresh()}
        >
          <RefreshCw aria-hidden="true" className="size-3.5" />
          إعادة المحاولة
        </Button>
      </section>
    );
  }

  return (
    <section className="space-y-4">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <Map aria-hidden="true" className="size-4 text-muted-foreground" />
            <h2 className="text-base font-bold text-foreground">الرؤية / خارطة الطريق</h2>
          </div>
          <p className="mt-1 text-sm leading-6 text-muted-foreground">
            خطط وأهداف تمتد من الأولويات القريبة إلى الرؤية بعيدة المدى.
          </p>
        </div>
        <p className="text-sm text-muted-foreground">
          {summary.total} أهداف · {summary.active} نشطة · {summary.completed} مكتملة
        </p>
      </header>

      <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
        <div className="grid gap-3 lg:grid-cols-3">
          {HORIZON_SECTIONS.map(({ horizon, title, emptyMessage }) => (
            <RoadmapSection
              key={horizon}
              horizon={horizon}
              title={title}
              emptyMessage={emptyMessage}
              goals={goalsByHorizon[horizon]}
              teamId={teamId}
              memberId={memberId}
              getNextGoalOrder={getNextGoalOrder}
              onChanged={refresh}
              isReordering={isReordering}
            />
          ))}
        </div>
      </DndContext>
    </section>
  );
}
