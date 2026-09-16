"use client";

import { CalendarDays, LoaderCircle, Map } from "lucide-react";
import { useParams, useRouter, useSearchParams } from "next/navigation";

import { RoadmapBoard } from "@/components/roadmap/roadmap-board/roadmap-board";
import { DailyTasksView } from "@/components/tasks/daily-tasks-view";
import { useAuth } from "@/hooks/auth/use-auth";
import { useMemberWorkspace } from "@/hooks/team/use-member-workspace";

type WorkspaceTab = "daily-tasks" | "roadmap";

function WorkspaceTabPanel({ activeTab }: { activeTab: WorkspaceTab }) {
  const { memberId } = useParams<{ memberId: string }>();
  const { memberships } = useAuth();
  const { isLoading, isSelf, sharedTeamId } = useMemberWorkspace(memberId);
  const selfTeamIds = [
    ...new Set(
      memberships
        .filter((membership) => membership.active)
        .map((membership) => membership.teamId),
    ),
  ];
  const selfTeamId = isSelf && selfTeamIds.length === 1 ? selfTeamIds[0] : null;
  const teamId = sharedTeamId ?? selfTeamId;

  if (isLoading) {
    return (
      <section className="flex min-h-48 items-center justify-center rounded-2xl border border-border/70 bg-card p-5">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <LoaderCircle aria-hidden="true" className="size-4 animate-spin" />
          جارٍ تجهيز مساحة العمل
        </div>
      </section>
    );
  }

  if (!teamId) {
    return (
      <section className="rounded-2xl border border-border/70 bg-card p-5 text-center">
        <h2 className="text-sm font-bold text-foreground">تعذر تحديد الفريق</h2>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">
          تحتاج مساحة العمل إلى فريق محدد لعرض البيانات دون خلط بيانات الفرق.
        </p>
      </section>
    );
  }

  return activeTab === "daily-tasks" ? (
    <DailyTasksView teamId={teamId} memberId={memberId} />
  ) : (
    <RoadmapBoard teamId={teamId} memberId={memberId} />
  );
}

export function MemberWorkspaceTabs() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { memberId } = useParams<{ memberId: string }>();
  const activeTab: WorkspaceTab =
    searchParams.get("tab") === "roadmap" ? "roadmap" : "daily-tasks";

  function selectTab(tab: WorkspaceTab): void {
    const nextParams = new URLSearchParams(searchParams.toString());
    nextParams.set("tab", tab === "roadmap" ? "roadmap" : "tasks");
    router.replace(`/workspace/${memberId}?${nextParams.toString()}`);
  }

  return (
    <section className="mt-6">
      <div
        className="flex w-full gap-1 overflow-x-auto rounded-2xl bg-muted/70 p-1"
        role="tablist"
        aria-label="محتوى مساحة العمل"
      >
        <button
          id="daily-tasks-tab"
          type="button"
          role="tab"
          aria-selected={activeTab === "daily-tasks"}
          aria-controls="daily-tasks-panel"
          className={`flex min-w-40 flex-1 items-center justify-center gap-2 rounded-xl px-3 py-2.5 text-sm font-semibold outline-none transition-colors focus-visible:ring-3 focus-visible:ring-ring/30 ${
            activeTab === "daily-tasks"
              ? "bg-card text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground"
          }`}
          onClick={() => selectTab("daily-tasks")}
        >
          <CalendarDays aria-hidden="true" className="size-4" />
          المهام اليومية
        </button>
        <button
          id="roadmap-tab"
          type="button"
          role="tab"
          aria-selected={activeTab === "roadmap"}
          aria-controls="roadmap-panel"
          className={`flex min-w-40 flex-1 items-center justify-center gap-2 rounded-xl px-3 py-2.5 text-sm font-semibold outline-none transition-colors focus-visible:ring-3 focus-visible:ring-ring/30 ${
            activeTab === "roadmap"
              ? "bg-card text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground"
          }`}
          onClick={() => selectTab("roadmap")}
        >
          <Map aria-hidden="true" className="size-4" />
          الرؤية / خارطة الطريق
        </button>
      </div>

      <div
        id={activeTab === "daily-tasks" ? "daily-tasks-panel" : "roadmap-panel"}
        role="tabpanel"
        aria-labelledby={activeTab === "daily-tasks" ? "daily-tasks-tab" : "roadmap-tab"}
        className="mt-5"
      >
        <WorkspaceTabPanel activeTab={activeTab} />
      </div>
    </section>
  );
}
