"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  ArrowRight,
  ArrowUpRight,
  Bell,
  Building2,
  CheckSquare,
  FolderKanban,
  Sparkles,
  Clock3,
  Plus,
} from "lucide-react";
import { useAuth } from "@/context/auth-context";
import { workspaceService } from "@/services/workspace.service";
import { projectService } from "@/services/project.service";
import { taskService } from "@/services/task.service";
import { activityService } from "@/services/activity.service";
import { CreateWorkspaceModal } from "@/components/workspace/create-workspace-modal";
import WeeklyChart from "@/components/dashboard/weekly-chart";
import TaskStatusChart from "@/components/dashboard/task-status-chart";

type WorkspaceItem = any;
type ProjectItem = any;
type TaskItem = any;
type ActivityItem = any;

function normalizeStatus(status?: string) {
  return String(status || "")
    .toLowerCase()
    .replace(/[_\s-]/g, "");
}

function formatTimeAgo(value?: string) {
  if (!value) return "Recently";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Recently";

  const diffMs = Date.now() - date.getTime();
  const mins = Math.floor(diffMs / 60000);
  const hours = Math.floor(diffMs / 3600000);
  const days = Math.floor(diffMs / 86400000);

  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins} min ago`;
  if (hours < 24) return `${hours} hour${hours > 1 ? "s" : ""} ago`;
  return `${days} day${days > 1 ? "s" : ""} ago`;
}

function getProjectCardMeta(project: any, tasks: any[]) {
  const projectId = project?._id;

  const projectTasks = tasks.filter((task) => {
    const taskProjectId =
      task?.project?._id || task?.project || task?.projectId || "";
    return String(taskProjectId) === String(projectId);
  });

  const total = projectTasks.length;
  const done = projectTasks.filter(
    (task) => normalizeStatus(task?.status) === "done",
  ).length;

  const progress = total > 0 ? Math.round((done / total) * 100) : 0;

  const inProgress = projectTasks.filter(
    (task) => normalizeStatus(task?.status) === "inprogress",
  ).length;

  return {
    totalTasks: total,
    doneTasks: done,
    inProgressTasks: inProgress,
    progress,
  };
}

function getProjectStatusLabel(project: any, tasks: any[]) {
  const status = normalizeStatus(project?.status);

  if (status === "done") return "Completed";
  if (status === "inprogress") return "In Progress";

  const meta = getProjectCardMeta(project, tasks);
  if (meta.progress === 100 && meta.totalTasks > 0) return "Completed";
  if (meta.inProgressTasks > 0) return "In Progress";
  if (meta.totalTasks > 0) return "Planning";
  return "New";
}

function getProjectStatusStyle(label: string) {
  switch (label) {
    case "Completed":
      return "border-emerald-500/20 bg-emerald-500/10 text-emerald-300";
    case "In Progress":
      return "border-sky-500/20 bg-sky-500/10 text-sky-300";
    case "Planning":
      return "border-amber-500/20 bg-amber-500/10 text-amber-300";
    default:
      return "border-slate-700 bg-slate-800 text-slate-300";
  }
}

function getWeeklyBars(activities: any[]) {
  const labels = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const normalizedActivities = activities
    .map((item) => {
      const value = item?.createdAt ? new Date(item.createdAt) : null;
      if (!value || Number.isNaN(value.getTime())) return null;
      value.setHours(0, 0, 0, 0);
      return value.getTime();
    })
    .filter((value): value is number => typeof value === "number");

  return Array.from({ length: 7 }).map((_, offset) => {
    const dayDate = new Date(today);
    dayDate.setDate(today.getDate() - (6 - offset));

    const dayStartMs = dayDate.getTime();

    const total = normalizedActivities.filter(
      (timestamp) => timestamp === dayStartMs,
    ).length;

    return {
      day: labels[dayDate.getDay()],
      total,
    };
  });
}

export default function DashboardPage() {
  const { user } = useAuth();

  const [workspaces, setWorkspaces] = useState<WorkspaceItem[]>([]);
  const [allProjects, setAllProjects] = useState<ProjectItem[]>([]);
  const [allTasks, setAllTasks] = useState<TaskItem[]>([]);
  const [allActivities, setAllActivities] = useState<ActivityItem[]>([]);
  const [notificationCount, setNotificationCount] = useState(0);

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  const loadDashboard = async () => {
    try {
      setIsLoading(true);
      setError("");

      const workspaceRes = await workspaceService.getWorkspaces();
      const workspaceItems = Array.isArray(workspaceRes?.data)
        ? workspaceRes.data
        : [];

      setWorkspaces(workspaceItems);

      const normalizedWorkspaces = workspaceItems.map(
        (item: any) => item.workspace || item,
      );

      const workspaceResults = await Promise.all(
        normalizedWorkspaces.map(async (workspace: any) => {
          try {
            const [projectsRes, tasksRes, activityRes] = await Promise.all([
              projectService.getProjectsByWorkspace(workspace._id),
              taskService.getWorkspaceTasks(workspace._id, { limit: 200 }),
              activityService.getWorkspaceActivity(workspace._id, 200),
            ]);

            const projects = Array.isArray(projectsRes?.data)
              ? projectsRes.data
              : [];

            const tasks = Array.isArray(tasksRes?.data?.items)
              ? tasksRes.data.items
              : [];

            const activities = Array.isArray(activityRes?.data)
              ? activityRes.data
              : [];

            return {
              workspaceId: workspace._id,
              projects: projects.map((projectItem: any) => ({
                ...(projectItem.project || projectItem),
                workspaceId: workspace._id,
                workspaceName: workspace.name,
                role: projectItem.role,
              })),
              tasks,
              activities,
            };
          } catch (innerErr) {
            console.error(
              `Failed to load workspace dashboard data for ${workspace._id}`,
              innerErr,
            );

            return {
              workspaceId: workspace._id,
              projects: [],
              tasks: [],
              activities: [],
            };
          }
        }),
      );

      setAllProjects(workspaceResults.flatMap((item) => item.projects));
      setAllTasks(workspaceResults.flatMap((item) => item.tasks));
      setAllActivities(
        workspaceResults
          .flatMap((item) => item.activities)
          .sort(
            (a: any, b: any) =>
              new Date(b?.createdAt || 0).getTime() -
              new Date(a?.createdAt || 0).getTime(),
          ),
      );
    } catch (err: any) {
      console.error(err);
      setError(err?.response?.data?.message || "Failed to load dashboard");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadDashboard();
  }, []);

  useEffect(() => {
    const value = Number(
      localStorage.getItem("teamforge_notification_unread_count") || "0",
    );
    setNotificationCount(value);

    const syncNotifications = (event: Event) => {
      const customEvent = event as CustomEvent<{ unreadCount?: number }>;
      const count = Number(customEvent.detail?.unreadCount) || 0;
      setNotificationCount(count);
    };

    window.addEventListener(
      "teamforge-notifications-updated",
      syncNotifications,
    );

    return () => {
      window.removeEventListener(
        "teamforge-notifications-updated",
        syncNotifications,
      );
    };
  }, []);

  const displayName =
    user?.fullName || user?.fullname || user?.username || "User";

  const recentProjects = useMemo(() => {
    return [...allProjects]
      .sort(
        (a: any, b: any) =>
          new Date(b?.updatedAt || b?.createdAt || 0).getTime() -
          new Date(a?.updatedAt || a?.createdAt || 0).getTime(),
      )
      .slice(0, 4);
  }, [allProjects]);

  const weeklyBars = useMemo(
    () => getWeeklyBars(allActivities),
    [allActivities],
  );

  const taskStatusData = useMemo(() => {
    const todo = allTasks.filter(
      (item) => normalizeStatus(item?.status) === "todo",
    ).length;

    const inProgress = allTasks.filter(
      (item) => normalizeStatus(item?.status) === "inprogress",
    ).length;

    const done = allTasks.filter(
      (item) => normalizeStatus(item?.status) === "done",
    ).length;

    return [
      { name: "Todo", value: todo },
      { name: "In Progress", value: inProgress },
      { name: "Done", value: done },
    ];
  }, [allTasks]);

  const stats = useMemo(
    () => [
      {
        title: "Workspaces",
        value: workspaces.length,
        subtitle: "active spaces",
        icon: Building2,
        chip: `+${workspaces.length}`,
        chipStyle: "bg-sky-500/10 text-sky-300 border border-sky-500/15",
        iconWrap: "bg-sky-500/10 text-sky-300 border border-sky-500/15",
      },
      {
        title: "Projects",
        value: allProjects.length,
        subtitle: "tracked projects",
        icon: FolderKanban,
        chip: `+${recentProjects.length}`,
        chipStyle:
          "bg-violet-500/10 text-violet-300 border border-violet-500/15",
        iconWrap:
          "bg-violet-500/10 text-violet-300 border border-violet-500/15",
      },
      {
        title: "Open Tasks",
        value: allTasks.filter(
          (item) => normalizeStatus(item?.status) !== "done",
        ).length,
        subtitle: "need attention",
        icon: CheckSquare,
        chip: `${allTasks.filter((item) => normalizeStatus(item?.status) === "done").length} done`,
        chipStyle:
          "bg-emerald-500/10 text-emerald-300 border border-emerald-500/15",
        iconWrap:
          "bg-emerald-500/10 text-emerald-300 border border-emerald-500/15",
      },
      {
        title: "Notifications",
        value: notificationCount,
        subtitle: "unread items",
        icon: Bell,
        chip: notificationCount > 0 ? "new" : "0",
        chipStyle: "bg-amber-500/10 text-amber-300 border border-amber-500/15",
        iconWrap: "bg-amber-500/10 text-amber-300 border border-amber-500/15",
      },
    ],
    [
      workspaces.length,
      allProjects.length,
      allTasks,
      recentProjects.length,
      notificationCount,
    ],
  );

  if (isLoading) {
    return (
      <div className="text-white">
        <h1 className="text-3xl font-semibold">Dashboard</h1>
        <p className="mt-4 text-slate-400">Loading dashboard...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-white">
        <h1 className="text-3xl font-semibold">Dashboard</h1>
        <p className="mt-4 text-red-400">{error}</p>
      </div>
    );
  }

  return (
    <>
      <div className="space-y-6 text-[var(--app-text)]">
        <section className="rounded-3xl border border-slate-200 bg-[linear-gradient(180deg,var(--app-surface),var(--app-surface-2))] px-6 py-6 shadow-[0_20px_60px_rgba(15,23,42,0.08)]">
          <div className="flex flex-col gap-5 xl:flex-row xl:items-center xl:justify-between">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-sky-500/20 bg-sky-500/10 px-3 py-1 text-xs font-medium uppercase tracking-[0.22em] text-sky-300">
                <Sparkles className="size-3.5" />
                Overview
              </div>

              <h1 className="mt-3 text-3xl font-semibold tracking-tight text-[var(--app-text)] sm:text-5xl">
                Welcome back, {displayName}
              </h1>

              <p className="mt-3 max-w-2xl text-sm leading-6 text-[var(--app-muted)] sm:text-base">
                Track projects, monitor workspaces, and keep your team moving
                from one clean overview.
              </p>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={() => setIsCreateModalOpen(true)}
                className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-sky-500 to-indigo-500 px-5 py-3 text-sm font-medium text-white shadow-[0_8px_20px_rgba(59,130,246,0.12)] transition hover:brightness-105"
              >
                <Plus className="size-4" />
                New Workspace
              </button>
            </div>
          </div>
        </section>

        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {stats.map((item) => {
            const Icon = item.icon;

            return (
              <div
                key={item.title}
                className="group overflow-hidden rounded-3xl border border-slate-200 bg-[linear-gradient(180deg,var(--app-surface),var(--app-surface-2))] p-5 transition duration-300 hover:border-slate-300"
              >
                <div className="flex items-start justify-between gap-3">
                  <div
                    className={`flex h-12 w-12 items-center justify-center rounded-2xl ${item.iconWrap}`}
                  >
                    <Icon className="size-5" />
                  </div>

                  <span
                    className={`rounded-full px-2.5 py-1 text-[11px] font-medium ${item.chipStyle}`}
                  >
                    {item.chip}
                  </span>
                </div>

                <p className="mt-6 text-4xl font-semibold tracking-tight text-[var(--app-text)]">
                  {item.value}
                </p>
                <p className="mt-2 text-base font-medium text-[var(--app-text)]">
                  {item.title}
                </p>
                <p className="mt-1 text-xs text-[var(--app-muted)]">
                  {item.subtitle}
                </p>
              </div>
            );
          })}
        </section>

        <section className="grid gap-6 xl:grid-cols-2">
          <div className="rounded-3xl border border-slate-200 bg-[linear-gradient(180deg,var(--app-surface),var(--app-surface-2))] p-6 shadow-[0_20px_60px_rgba(15,23,42,0.08)]">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="text-2xl font-semibold text-[var(--app-text)]">
                  Weekly Activity
                </h2>
                <p className="mt-1 text-sm text-[var(--app-muted)]">
                  Your team&apos;s activity over the past week
                </p>
              </div>

              <span className="rounded-full border border-sky-500/20 bg-sky-500/10 px-3 py-1 text-xs font-medium text-sky-300">
                {allActivities.length} logs
              </span>
            </div>

            <div className="mt-6 rounded-3xl border border-slate-200 bg-[var(--app-surface)] p-4">
              <WeeklyChart data={weeklyBars} />
            </div>

            <div className="mt-4 grid grid-cols-7 gap-2 border-t border-slate-200 pt-4">
              {weeklyBars.map((item) => (
                <div key={item.day} className="text-center">
                  <p className="text-xs text-[var(--app-muted)]">{item.day}</p>
                  <p className="mt-1 text-sm font-semibold text-[var(--app-text)]">
                    {item.total}
                  </p>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-3xl border border-slate-200 bg-[linear-gradient(180deg,var(--app-surface),var(--app-surface-2))] p-6 shadow-[0_20px_60px_rgba(15,23,42,0.08)]">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="text-2xl font-semibold text-[var(--app-text)]">
                  Task Status Breakdown
                </h2>
                <p className="mt-1 text-sm text-[var(--app-muted)]">
                  Current distribution of task statuses
                </p>
              </div>

              <span className="rounded-full border border-emerald-500/20 bg-emerald-500/10 px-3 py-1 text-xs font-medium text-emerald-300">
                {allTasks.length} tasks
              </span>
            </div>

            <div className="mt-6 rounded-3xl border border-slate-200 bg-[var(--app-surface)] p-4">
              <TaskStatusChart data={taskStatusData} />
            </div>
          </div>
        </section>

        <section className="grid gap-6 xl:grid-cols-[1.25fr_0.75fr]">
          <div className="rounded-3xl border border-slate-200 bg-[linear-gradient(180deg,var(--app-surface),var(--app-surface-2))] p-6 shadow-[0_20px_60px_rgba(15,23,42,0.08)]">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h2 className="text-2xl font-semibold text-[var(--app-text)]">
                  Recent Projects
                </h2>
                <p className="mt-1 text-sm text-[var(--app-muted)]">
                  Track your ongoing work
                </p>
              </div>

              <Link
                href={
                  workspaces[0]?.workspace?._id || workspaces[0]?._id
                    ? `/workspaces/${workspaces[0]?.workspace?._id || workspaces[0]?._id}/projects`
                    : "/workspaces"
                }
                className="inline-flex items-center gap-1 text-sm font-medium text-sky-600 transition hover:text-sky-500"
              >
                View all
                <ArrowRight className="size-4" />
              </Link>
            </div>

            <div className="mt-6 space-y-4">
              {recentProjects.length === 0 ? (
                <div className="rounded-3xl border border-dashed border-slate-200 bg-[var(--app-surface)] px-6 py-12 text-center text-[var(--app-muted)]">
                  No recent projects found.
                </div>
              ) : (
                recentProjects.map((project: any, index: number) => {
                  const meta = getProjectCardMeta(project, allTasks);
                  const label = getProjectStatusLabel(project, allTasks);
                  const statusStyle = getProjectStatusStyle(label);
                  const accent = [
                    "border-l-sky-400",
                    "border-l-violet-400",
                    "border-l-amber-400",
                    "border-l-emerald-400",
                  ][index % 4];

                  return (
                    <Link
                      key={project._id || index}
                      href={`/workspaces/${project.workspaceId}/projects/${project._id}`}
                      className={`block rounded-2xl border border-slate-200 border-l-4 ${accent} bg-[var(--app-surface)] p-5 transition hover:border-slate-300 hover:bg-[var(--app-surface-2)]`}
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-3">
                            <h3 className="truncate text-2xl font-semibold text-[var(--app-text)]">
                              {project.name}
                            </h3>

                            <span
                              className={`rounded-full border px-3 py-1 text-xs font-medium ${statusStyle}`}
                            >
                              {label}
                            </span>
                          </div>

                          <p className="mt-2 overflow-hidden text-sm text-[var(--app-muted)] break-words [overflow-wrap:anywhere] [display:-webkit-box] [-webkit-box-orient:vertical] [-webkit-line-clamp:4]">
                            {project.description || "No description provided"}
                          </p>

                          <div className="mt-5 max-w-sm">
                            <div className="mb-2 flex items-center justify-between text-xs text-[var(--app-muted)]">
                              <span>Progress</span>
                              <span>{meta.progress}%</span>
                            </div>
                            <div
                              className="h-2 overflow-hidden rounded-full"
                              style={{
                                backgroundColor:
                                  "color-mix(in srgb, var(--app-muted) 26%, transparent)",
                              }}
                            >
                              <div
                                className="h-full rounded-full"
                                style={{
                                  width: `${meta.progress}%`,
                                  backgroundImage:
                                    "linear-gradient(90deg, #22d3ee 0%, #3b82f6 100%)",
                                }}
                              />
                            </div>
                          </div>
                        </div>

                        <div className="shrink-0 text-right">
                          <p className="text-xs text-[var(--app-muted)]">
                            {meta.totalTasks} tasks
                          </p>
                          <p className="mt-2 text-xs text-[var(--app-muted)]">
                            Updated{" "}
                            {formatTimeAgo(
                              project.updatedAt || project.createdAt,
                            )}
                          </p>
                        </div>
                      </div>
                    </Link>
                  );
                })
              )}
            </div>
          </div>

          <div className="rounded-3xl border border-slate-200 bg-[linear-gradient(180deg,var(--app-surface),var(--app-surface-2))] p-6 shadow-[0_20px_60px_rgba(15,23,42,0.08)]">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h2 className="text-2xl font-semibold text-[var(--app-text)]">
                  Workspaces
                </h2>
                <p className="mt-1 text-sm text-[var(--app-muted)]">
                  Jump into active collaboration
                </p>
              </div>

              <button
                className="rounded-xl border border-sky-500/15 bg-sky-500/10 px-4 py-2.5 text-sm font-medium text-sky-600 transition hover:bg-sky-500/15"
                onClick={() => setIsCreateModalOpen(true)}
              >
                + New
              </button>
            </div>

            {workspaces.length === 0 ? (
              <div className="mt-6 rounded-3xl border border-dashed border-slate-200 bg-[var(--app-surface)] px-6 py-10 text-center">
                <p className="text-base font-medium text-[var(--app-text)]">
                  No workspaces found yet
                </p>
                <p className="mt-2 text-sm text-[var(--app-muted)]">
                  Create your first workspace to start organizing projects.
                </p>
              </div>
            ) : (
              <div className="mt-6 space-y-4">
                {workspaces.slice(0, 3).map((item: any, index: number) => {
                  const workspace = item.workspace || item;

                  return (
                    <div
                      key={workspace._id || index}
                      className="overflow-hidden rounded-2xl border border-slate-200 bg-[var(--app-surface)] transition hover:border-slate-300"
                    >
                      <div className="p-5">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <div className="flex items-center gap-3">
                              <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-slate-200 bg-[var(--app-surface-2)] text-sky-600">
                                <Building2 className="size-5" />
                              </div>

                              <div className="min-w-0">
                                <h3 className="truncate text-2xl font-semibold text-[var(--app-text)]">
                                  {workspace.name}
                                </h3>
                                <p className="mt-1 text-sm text-[var(--app-muted)]">
                                  {workspace.slug}
                                </p>
                              </div>
                            </div>
                          </div>

                          <span className="rounded-full border border-slate-200 bg-[var(--app-surface-2)] px-3 py-1 text-xs text-[var(--app-muted)]">
                            {workspace.plan || "free"}
                          </span>
                        </div>

                        <div className="mt-5 flex items-center justify-between">
                          <div className="inline-flex items-center gap-2 text-xs text-[var(--app-muted)]">
                            <Clock3 className="size-4" />
                            Updated recently
                          </div>

                          <Link
                            href={`/workspaces/${workspace._id}`}
                            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-medium text-[var(--app-text)] transition hover:bg-[var(--app-surface-2)]"
                          >
                            Open
                            <ArrowUpRight className="size-4" />
                          </Link>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </section>
      </div>

      <CreateWorkspaceModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onCreated={loadDashboard}
      />
    </>
  );
}
