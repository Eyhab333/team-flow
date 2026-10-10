"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import {
  getPersistentTaskGroupsForMember,
  getTaskGroupById,
  getTaskGroupsForMemberDay,
} from "@/lib/firestore/task-groups";
import { getTaskTemplatesForMember } from "@/lib/firestore/task-templates";
import { getTasksForMemberDay } from "@/lib/firestore/tasks";
import type { Task } from "@/types/task";
import type { TaskGroup, TaskGroupType } from "@/types/task-group";
import type { TaskTemplate } from "@/types/task-template";

export interface DailyTaskGroupView {
  group: TaskGroup;
  tasks: Task[];
  templates: TaskTemplate[];
  isHistorical: boolean;
}
export interface DailyTasksSummary { total: number; completed: number; inProgress: number; remaining: number; }
const EMPTY_SUMMARY: DailyTasksSummary = { total: 0, completed: 0, inProgress: 0, remaining: 0 };

function getTodayDate(): string { const today = new Date(); return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`; }
function toError(error: unknown): Error { return error instanceof Error ? error : new Error("Unable to load daily tasks."); }
function groupType(group: TaskGroup): TaskGroupType { return group.type ?? "EXTENDED"; }
function sortTasks(tasks: Task[]): Task[] { return [...tasks].sort((a, b) => a.order - b.order || a.id.localeCompare(b.id)); }
function buildSummary(tasks: Task[]): DailyTasksSummary { const completed = tasks.filter((task) => task.status === "COMPLETED").length; const inProgress = tasks.filter((task) => task.status === "IN_PROGRESS").length; return { total: tasks.length, completed, inProgress, remaining: tasks.length - completed }; }

export function useDailyTasks(teamId: string, memberId: string, date = getTodayDate()) {
  const [groups, setGroups] = useState<DailyTaskGroupView[]>([]);
  const [ungroupedTasks, setUngroupedTasks] = useState<Task[]>([]);
  const [summary, setSummary] = useState<DailyTasksSummary>(EMPTY_SUMMARY);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const requestIdRef = useRef(0);

  const loadDailyTasks = useCallback(async (showLoading = true): Promise<void> => {
    const requestId = ++requestIdRef.current;
    if (showLoading) { setGroups([]); setUngroupedTasks([]); setSummary(EMPTY_SUMMARY); setIsLoading(true); }
    setError(null);
    try {
      const [visibleTasks, dateGroups, persistentGroups, templates] = await Promise.all([
        getTasksForMemberDay(teamId, memberId, date),
        getTaskGroupsForMemberDay(teamId, memberId, date),
        getPersistentTaskGroupsForMember(teamId, memberId),
        getTaskTemplatesForMember(teamId, memberId),
      ]);
      if (requestId !== requestIdRef.current) return;
      const groupsById = new Map<string, TaskGroup>();
      [...dateGroups, ...persistentGroups].forEach((group) => groupsById.set(group.id, group));
      const missingIds = [...new Set(visibleTasks.map((task) => task.groupId))].filter((id) => !groupsById.has(id));
      const referenced = await Promise.all(missingIds.map((id) => getTaskGroupById(id)));
      if (requestId !== requestIdRef.current) return;
      referenced.forEach((group) => { if (group?.active && group.teamId === teamId && group.memberId === memberId) groupsById.set(group.id, group); });
      const tasksByGroup = new Map<string, Task[]>();
      const ungrouped: Task[] = [];
      visibleTasks.forEach((task) => {
        if (!groupsById.has(task.groupId)) { ungrouped.push(task); return; }
        const tasks = tasksByGroup.get(task.groupId) ?? []; tasks.push(task); tasksByGroup.set(task.groupId, tasks);
      });
      const templatesByGroup = new Map<string, TaskTemplate[]>();
      templates.filter((template) => groupsById.has(template.groupId)).forEach((template) => {
        const groupTemplates = templatesByGroup.get(template.groupId) ?? []; groupTemplates.push(template); templatesByGroup.set(template.groupId, groupTemplates);
      });
      const nextGroups = [...groupsById.values()]
        .map((group) => ({ group, tasks: sortTasks(tasksByGroup.get(group.id) ?? []), templates: [...(templatesByGroup.get(group.id) ?? [])].sort((a, b) => a.order - b.order), isHistorical: group.originalDate < date }))
        .sort((a, b) => a.group.order - b.group.order || a.group.id.localeCompare(b.group.id));
      setGroups(nextGroups); setUngroupedTasks(sortTasks(ungrouped)); setSummary(buildSummary(visibleTasks)); setIsLoading(false);
    } catch (loadError) { if (requestId !== requestIdRef.current) return; setError(toError(loadError)); setIsLoading(false); }
  }, [date, memberId, teamId]);

  const refresh = useCallback(() => loadDailyTasks(false), [loadDailyTasks]);
  const getNextTaskOrder = useCallback((groupId: string) => Math.max(0, ...(groups.find(({ group }) => group.id === groupId)?.tasks ?? []).map((task) => task.order)) + 1, [groups]);
  const getNextTemplateOrder = useCallback((groupId: string) => Math.max(0, ...(groups.find(({ group }) => group.id === groupId)?.templates ?? []).map((template) => template.order)) + 1, [groups]);
  useEffect(() => { void loadDailyTasks(); return () => { ++requestIdRef.current; }; }, [loadDailyTasks]);
  return { date, groups, ungroupedTasks, summary, isLoading, error, refresh, getNextTaskOrder, getNextTemplateOrder, nextGroupOrder: Math.max(0, ...groups.filter(({ group }) => group.originalDate === date).map(({ group }) => group.order)) + 1, groupType };
}
