"use client";

import { useDroppable } from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { Plus } from "lucide-react";
import { useState } from "react";

import { RoadmapGoalForm } from "@/components/roadmap/roadmap-goal-form/roadmap-goal-form";
import { RoadmapGoalCard } from "@/components/roadmap/roadmap-goal/roadmap-goal-card";
import { Button } from "@/components/ui/button";
import type { RoadmapGoal, RoadmapHorizon } from "@/types/roadmap";

interface RoadmapSectionProps {
  horizon: RoadmapHorizon;
  title: string;
  emptyMessage: string;
  goals: RoadmapGoal[];
  teamId: string;
  memberId: string;
  getNextGoalOrder: (horizon: RoadmapHorizon) => number;
  onChanged: () => void | Promise<void>;
  isReordering: boolean;
}

export function RoadmapSection({
  horizon,
  title,
  emptyMessage,
  goals,
  teamId,
  memberId,
  getNextGoalOrder,
  onChanged,
  isReordering,
}: RoadmapSectionProps) {
  const [isCreatingGoal, setIsCreatingGoal] = useState(false);
  const { setNodeRef, isOver } = useDroppable({
    id: `horizon:${horizon}`,
  });

  return (
    <section
      ref={setNodeRef}
      className={`rounded-2xl border bg-muted/25 p-3 transition-colors sm:p-4 ${
        isOver ? "border-primary/60 bg-primary/5" : "border-border/70"
      }`}
    >
      <header className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <h2 className="text-sm font-bold text-foreground">{title}</h2>
          <span className="rounded-full bg-background px-2 py-0.5 text-xs text-muted-foreground">
            {goals.length}
          </span>
        </div>
        <Button
          type="button"
          variant="outline"
          size="xs"
          className="rounded-lg"
          onClick={() => setIsCreatingGoal(true)}
        >
          <Plus aria-hidden="true" className="size-3" />
          إضافة هدف
        </Button>
      </header>

      <SortableContext
        items={goals.map((goal) => goal.id)}
        strategy={verticalListSortingStrategy}
      >
        <div className="mt-3 min-h-20 space-y-2">
          {goals.length > 0 ? (
            goals.map((goal) => (
              <RoadmapGoalCard
                key={goal.id}
                goal={goal}
                getNextGoalOrder={getNextGoalOrder}
                onChanged={onChanged}
                sortable={!isReordering}
              />
            ))
          ) : (
            <p className="flex min-h-20 items-center justify-center rounded-xl border border-dashed border-border/80 px-3 py-4 text-center text-sm text-muted-foreground">
              {emptyMessage}
            </p>
          )}
        </div>
      </SortableContext>

      <RoadmapGoalForm
        open={isCreatingGoal}
        mode="create"
        teamId={teamId}
        memberId={memberId}
        horizon={horizon}
        getNextGoalOrder={getNextGoalOrder}
        onClose={() => setIsCreatingGoal(false)}
        onSuccess={onChanged}
      />
    </section>
  );
}
