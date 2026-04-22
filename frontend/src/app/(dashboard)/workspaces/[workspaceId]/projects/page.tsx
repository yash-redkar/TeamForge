"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import toast from "react-hot-toast";
import {
  Plus,
  Search,
  Users,
  CheckSquare,
  CalendarDays,
  ArrowRight,
  Lock,
} from "lucide-react";
import {
  DragDropContext,
  Droppable,
  Draggable,
  DropResult,
} from "@hello-pangea/dnd";
import { projectService } from "@/services/project.service";
import { workspaceService } from "@/services/workspace.service";
import { CreateProjectModal } from "@/components/project/create-project-modal";

type ProjectStatus = "todo" | "in_progress" | "done";

export default function ProjectsPage() {
  const params = useParams();

  const workspaceId =
    typeof params.workspaceId === "string"
      ? params.workspaceId
      : Array.isArray(params.workspaceId)
        ? params.workspaceId[0]
        : "";

  const [projects, setProjects] = useState<any[]>([]);
  const [workspaceName, setWorkspaceName] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | ProjectStatus>(
    "all",
  );
  const [isLoading, setIsLoading] = useState(true);
  const [isStatusUpdating, setIsStatusUpdating] = useState(false);
  const [error, setError] = useState("");
  const [isCreateProjectModalOpen, setIsCreateProjectModalOpen] =
    useState(false);

  const normalizeStatus = (value?: string): ProjectStatus => {
    const normalized = (value || "").toLowerCase().trim();

    if (normalized === "done") return "done";
    if (normalized === "in_progress" || normalized === "in progress") {
      return "in_progress";
    }

    return "todo";
  };

  const getColumnStatus = (droppableId: string): ProjectStatus => {
    if (droppableId === "in_progress") return "in_progress";
    if (droppableId === "done") return "done";
    return "todo";
  };

  const formatDate = (value?: string) => {
    if (!value) return "N/A";
    return new Date(value).toLocaleDateString();
  };

  const getProjectFromItem = (item: any) => item?.project || item;
  const getProjectRole = (item: any) => item?.role || "member";
  const canManageProject = (item: any) => getProjectRole(item) === "admin";

  const getMembersCount = (item: any) => {
    const project = getProjectFromItem(item);

    return (
      project?.membersCount ??
      project?.memberCount ??
      project?.members ??
      item?.membersCount ??
      item?.memberCount ??
      0
    );
  };

  const getTaskSummary = (item: any) => {
    const project = getProjectFromItem(item);

    const total =
      project?.tasksCount ??
      project?.taskCount ??
      project?.totalTasks ??
      item?.tasksCount ??
      item?.taskCount ??
      item?.totalTasks ??
      0;

    const completed =
      project?.completedTasksCount ??
      project?.completedTasks ??
      item?.completedTasksCount ??
      item?.completedTasks ??
      0;

    return {
      total,
      completed,
    };
  };

  const getProgress = (item: any) => {
    const { total, completed } = getTaskSummary(item);
    if (!total) return 0;
    return Math.min(100, Math.round((completed / total) * 100));
  };

  const loadProjects = async () => {
    try {
      setIsLoading(true);
      setError("");

      const [projectsRes, workspaceRes] = await Promise.all([
        projectService.getProjectsByWorkspace(workspaceId),
        workspaceService.getWorkspaces(),
      ]);

      const items = Array.isArray(projectsRes?.data)
        ? projectsRes.data
        : Array.isArray(projectsRes)
          ? projectsRes
          : [];

      const workspaces = Array.isArray(workspaceRes?.data)
        ? workspaceRes.data
        : Array.isArray(workspaceRes)
          ? workspaceRes
          : [];

      const currentWorkspace = workspaces.find((item: any) => {
        const workspace = item?.workspace || item;
        return String(workspace?._id) === String(workspaceId);
      });

      setProjects(items);
      setWorkspaceName(
        currentWorkspace?.workspace?.name || currentWorkspace?.name || "",
      );
    } catch (err: any) {
      console.error(err);
      const message = err?.response?.data?.message || "Failed to load projects";
      setError(message);
      toast.error(message);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (workspaceId) {
      loadProjects();
    }
  }, [workspaceId]);

  const filteredProjects = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();

    return projects.filter((item: any) => {
      const project = getProjectFromItem(item);
      const projectName = (project?.name || "").toLowerCase();
      const projectStatus = normalizeStatus(project?.status);

      const matchesSearch = !term || projectName.includes(term);
      const matchesStatus =
        statusFilter === "all" ? true : projectStatus === statusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [projects, searchTerm, statusFilter]);

  const groupedProjects = useMemo(() => {
    return {
      todo: filteredProjects.filter((item: any) => {
        const project = getProjectFromItem(item);
        return normalizeStatus(project?.status) === "todo";
      }),
      inProgress: filteredProjects.filter((item: any) => {
        const project = getProjectFromItem(item);
        return normalizeStatus(project?.status) === "in_progress";
      }),
      done: filteredProjects.filter((item: any) => {
        const project = getProjectFromItem(item);
        return normalizeStatus(project?.status) === "done";
      }),
    };
  }, [filteredProjects]);

  const totalProjects = projects.length;
  const todoCount = projects.filter((item: any) => {
    const project = getProjectFromItem(item);
    return normalizeStatus(project?.status) === "todo";
  }).length;

  const inProgressCount = projects.filter((item: any) => {
    const project = getProjectFromItem(item);
    return normalizeStatus(project?.status) === "in_progress";
  }).length;

  const doneCount = projects.filter((item: any) => {
    const project = getProjectFromItem(item);
    return normalizeStatus(project?.status) === "done";
  }).length;

  const handleProjectStatusChange = async (
    projectId: string,
    nextStatus: ProjectStatus,
  ) => {
    if (!projectId) return;

    try {
      setIsStatusUpdating(true);

      await projectService.updateProject(workspaceId, projectId, {
        status: nextStatus,
      });

      toast.success("Project status updated");
      await loadProjects();
    } catch (err: any) {
      console.error(err);
      toast.error(
        err?.response?.data?.message || "Failed to update project status",
      );
    } finally {
      setIsStatusUpdating(false);
    }
  };

  const onDragEnd = async (result: DropResult) => {
    const { destination, source, draggableId } = result;

    if (!destination) return;

    if (
      destination.droppableId === source.droppableId &&
      destination.index === source.index
    ) {
      return;
    }

    const draggedItem = filteredProjects.find((item: any) => {
      const project = getProjectFromItem(item);
      return String(project?._id) === String(draggableId);
    });

    if (!draggedItem) return;

    if (!canManageProject(draggedItem)) {
      toast.error("Only project admins can move project status");
      return;
    }

    const nextStatus = getColumnStatus(destination.droppableId);
    const previousProjects = [...projects];

    setProjects((prev) =>
      prev.map((item: any) => {
        const project = getProjectFromItem(item);

        if (String(project?._id) === String(draggableId)) {
          if (item?.project) {
            return {
              ...item,
              project: {
                ...item.project,
                status: nextStatus,
              },
            };
          }

          return {
            ...item,
            status: nextStatus,
          };
        }

        return item;
      }),
    );

    try {
      setIsStatusUpdating(true);

      await projectService.updateProject(workspaceId, draggableId, {
        status: nextStatus,
      });

      toast.success("Project moved successfully");
      await loadProjects();
    } catch (err: any) {
      console.error(err);
      setProjects(previousProjects);
      toast.error(
        err?.response?.data?.message || "Failed to update project status",
      );
    } finally {
      setIsStatusUpdating(false);
    }
  };

  const getReadableStatus = (status?: string) => {
    const normalized = normalizeStatus(status);

    if (normalized === "in_progress") return "In Progress";
    if (normalized === "done") return "Done";
    return "Todo";
  };

  const renderProjectCard = (item: any, index: number) => {
    const project = getProjectFromItem(item);
    const role = getProjectRole(item);
    const membersCount = getMembersCount(item);
    const { total, completed } = getTaskSummary(item);
    const progress = getProgress(item);
    const isAdmin = canManageProject(item);

    return (
      <Draggable
        key={project?._id}
        draggableId={String(project?._id)}
        index={index}
        isDragDisabled={!isAdmin || isStatusUpdating}
      >
        {(provided, snapshot) => (
          <div
            ref={provided.innerRef}
            {...provided.draggableProps}
            {...(isAdmin ? provided.dragHandleProps : {})}
            className={`group flex min-h-[385px] flex-col rounded-2xl border border-slate-200 bg-[var(--app-surface)] p-4 transition-all duration-200 hover:border-cyan-400/60 hover:bg-[var(--app-surface-2)] hover:shadow-[0_0_0_1px_rgba(34,211,238,0.18),0_10px_30px_rgba(8,145,178,0.08)] ${
              snapshot.isDragging ? "shadow-lg ring-1 ring-cyan-400" : ""
            }`}
          >
            <div className="min-w-0">
              <h3 className="overflow-hidden text-base font-semibold text-[var(--app-text)] transition group-hover:text-cyan-600 wrap-anywhere [display:-webkit-box] [-webkit-box-orient:vertical] [-webkit-line-clamp:2]">
                {project?.name || "Untitled Project"}
              </h3>

              <div className="mt-2 flex items-center gap-2">
                <span
                  className={`rounded-full border px-2.5 py-1 text-[11px] font-medium capitalize ${
                    role === "admin"
                      ? "border-cyan-500/30 bg-cyan-500/10 text-cyan-300"
                      : "border-slate-200 bg-[var(--app-surface-2)] text-[var(--app-text)]"
                  }`}
                >
                  {role}
                </span>

                {isAdmin ? (
                  <div className="relative">
                    <select
                      value={normalizeStatus(project?.status)}
                      onChange={(e) =>
                        handleProjectStatusChange(
                          project?._id,
                          e.target.value as ProjectStatus,
                        )
                      }
                      disabled={isStatusUpdating}
                      className="h-8 appearance-none rounded-full border border-slate-200 bg-[var(--app-surface-2)] px-3 pr-10 text-[11px] font-medium text-[var(--app-text)] outline-none transition hover:border-slate-300 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      <option value="todo">Todo</option>
                      <option value="in_progress">In Progress</option>
                      <option value="done">Done</option>
                    </select>

                    <div className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[var(--app-muted)]">
                      ▾
                    </div>
                  </div>
                ) : (
                  <span className="rounded-full border border-slate-200 bg-[var(--app-surface-2)] px-3 py-1 text-[11px] text-[var(--app-text)]">
                    {getReadableStatus(project?.status)}
                  </span>
                )}
              </div>
            </div>

            <div className="mt-3 min-h-[96px]">
              <p className="overflow-hidden text-sm leading-6 text-[var(--app-muted)] wrap-anywhere [display:-webkit-box] [-webkit-box-orient:vertical] [-webkit-line-clamp:4]">
                {project?.description?.trim()
                  ? project.description
                  : "No description available."}
              </p>
            </div>

            {!isAdmin ? (
              <div className="mt-3 flex items-center gap-2 text-[11px] text-[var(--app-muted)]">
                <Lock className="h-3.5 w-3.5" />
                <span>Only admins can move this project</span>
              </div>
            ) : (
              <div className="mt-3 h-[18px]" />
            )}

            <div className="mt-4 grid grid-cols-2 gap-3">
              <div className="rounded-xl border border-slate-200 bg-[var(--app-surface-2)] p-3">
                <div className="flex items-center gap-2 text-xs text-[var(--app-muted)]">
                  <Users className="h-3.5 w-3.5" />
                  <span>Members</span>
                </div>
                <p className="mt-2 text-lg font-semibold text-[var(--app-text)]">
                  {membersCount}
                </p>
              </div>

              <div className="rounded-xl border border-slate-200 bg-[var(--app-surface-2)] p-3">
                <div className="flex items-center gap-2 text-xs text-[var(--app-muted)]">
                  <CheckSquare className="h-3.5 w-3.5" />
                  <span>Tasks</span>
                </div>
                <p className="mt-2 text-lg font-semibold text-[var(--app-text)]">
                  {total}
                </p>
              </div>
            </div>

            <div className="mt-4">
              <div className="mb-2 flex items-center justify-between text-xs">
                <span className="text-[var(--app-muted)]">Progress</span>
                <span className="text-[var(--app-text)]">{progress}%</span>
              </div>

              <div
                className="h-2 overflow-hidden rounded-full"
                style={{
                  backgroundColor:
                    "color-mix(in srgb, var(--app-muted) 26%, transparent)",
                }}
              >
                <div
                  className="h-full rounded-full transition-all"
                  style={{
                    width: `${progress}%`,
                    backgroundImage:
                      "linear-gradient(90deg, #22d3ee 0%, #3b82f6 100%)",
                  }}
                />
              </div>

              <p className="mt-2 text-xs text-[var(--app-muted)]">
                {completed} of {total} tasks completed
              </p>
            </div>

            <div className="mt-auto pt-4">
              <div className="flex items-center justify-between border-t border-slate-200 pt-4">
                <div className="flex items-center gap-2 text-xs text-[var(--app-muted)]">
                  <CalendarDays className="h-3.5 w-3.5" />
                  <span>{formatDate(project?.createdAt)}</span>
                </div>

                <Link
                  href={`/workspaces/${workspaceId}/projects/${project?._id}`}
                  className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-xs font-medium text-[var(--app-text)] transition hover:border-cyan-500/40 hover:bg-[var(--app-surface-2)]"
                >
                  Open
                  <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </div>
            </div>
          </div>
        )}
      </Draggable>
    );
  };

  const renderColumn = (
    title: string,
    count: number,
    items: any[],
    tone: "slate" | "cyan" | "emerald",
    keyName: string,
  ) => {
    const toneStyles = {
      slate: {
        dot: "bg-slate-400",
        badge: "bg-slate-900 text-slate-300",
        ring: "ring-slate-500",
      },
      cyan: {
        dot: "bg-cyan-400",
        badge: "bg-cyan-500/10 text-cyan-300",
        ring: "ring-cyan-400",
      },
      emerald: {
        dot: "bg-emerald-400",
        badge: "bg-emerald-500/10 text-emerald-300",
        ring: "ring-emerald-400",
      },
    };

    return (
      <Droppable droppableId={keyName} key={keyName}>
        {(provided, snapshot) => (
          <div className="flex min-w-[340px] flex-1 flex-col">
            <div className="mb-4 flex items-center justify-between gap-3 px-1">
              <div className="flex items-center gap-2">
                <div
                  className={`h-2.5 w-2.5 rounded-full ${toneStyles[tone].dot}`}
                />
                <h2 className="text-sm font-semibold text-[var(--app-text)]">
                  {title}
                </h2>
                <span
                  className={`rounded-full px-2.5 py-1 text-[11px] font-medium ${toneStyles[tone].badge}`}
                >
                  {count}
                </span>
              </div>

              <button
                onClick={() => setIsCreateProjectModalOpen(true)}
                className="rounded-lg p-1.5 text-[var(--app-muted)] transition hover:bg-[var(--app-surface-2)] hover:text-[var(--app-text)]"
              >
                <Plus className="h-4 w-4" />
              </button>
            </div>

            <div
              ref={provided.innerRef}
              {...provided.droppableProps}
              className={`min-h-[500px] space-y-3 rounded-2xl ${
                snapshot.isDraggingOver ? `ring-1 ${toneStyles[tone].ring}` : ""
              }`}
            >
              {items.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-slate-200 bg-[var(--app-surface)] p-5 text-sm text-[var(--app-muted)]">
                  No projects in {title.toLowerCase()}.
                </div>
              ) : (
                items.map((item, index) => renderProjectCard(item, index))
              )}

              {provided.placeholder}

              <button
                onClick={() => setIsCreateProjectModalOpen(true)}
                className="flex w-full items-center justify-center gap-2 rounded-2xl border border-dashed border-slate-200 bg-[var(--app-surface)] px-4 py-3 text-sm font-medium text-[var(--app-muted)] transition hover:border-cyan-500/30 hover:text-[var(--app-text)]"
              >
                <Plus className="h-4 w-4" />
                Add project
              </button>
            </div>
          </div>
        )}
      </Droppable>
    );
  };

  if (isLoading) {
    return (
      <div className="space-y-6 text-white">
        <div>
          <h1 className="text-3xl font-semibold">Projects</h1>
          <p className="mt-2 text-slate-400">Loading projects...</p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <div
              key={index}
              className="animate-pulse rounded-2xl border border-slate-800 bg-slate-900/70 p-5"
            >
              <div className="h-4 w-24 rounded bg-slate-800" />
              <div className="mt-4 h-8 w-20 rounded bg-slate-800" />
            </div>
          ))}
        </div>

        <div className="flex gap-6 overflow-x-auto pb-2">
          {Array.from({ length: 3 }).map((_, index) => (
            <div key={index} className="min-w-[340px] flex-1 animate-pulse">
              <div className="mb-4 h-5 w-28 rounded bg-slate-800" />
              <div className="h-32 rounded-2xl bg-slate-800" />
              <div className="mt-3 h-32 rounded-2xl bg-slate-800" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-4 text-white">
        <h1 className="text-3xl font-semibold">Projects</h1>
        <p className="text-red-400">{error}</p>

        <div className="flex flex-wrap gap-3">
          <button
            onClick={loadProjects}
            className="inline-flex rounded-xl border border-slate-700 px-4 py-2 text-sm text-slate-200 transition hover:bg-slate-800"
          >
            Retry
          </button>

          <Link
            href={`/workspaces/${workspaceId}`}
            className="inline-flex rounded-xl border border-slate-700 px-4 py-2 text-sm text-slate-200 transition hover:bg-slate-800"
          >
            Back to Workspace
          </Link>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="space-y-6 text-[var(--app-text)]">
        <div className="rounded-3xl border border-slate-200 bg-[linear-gradient(180deg,var(--app-surface),var(--app-surface-2))] p-6 shadow-[0_20px_60px_rgba(15,23,42,0.08)] sm:p-7">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
            <div className="max-w-2xl">
              <div className="inline-flex items-center rounded-full border border-cyan-500/20 bg-cyan-500/10 px-3 py-1 text-xs font-medium text-cyan-300">
                Workspace Projects
              </div>

              <h1 className="mt-4 text-3xl font-semibold tracking-tight text-[var(--app-text)] sm:text-4xl">
                Projects
              </h1>

              <p className="mt-3 text-sm leading-6 text-[var(--app-muted)] sm:text-base">
                Track and manage all projects inside{" "}
                <span className="font-medium text-[var(--app-text)]">
                  {workspaceName || "this workspace"}
                </span>{" "}
                with a cleaner board view.
              </p>
            </div>

            <div className="flex flex-wrap gap-3">
              <Link
                href={`/workspaces/${workspaceId}`}
                className="inline-flex rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-medium text-[var(--app-text)] transition hover:bg-[var(--app-surface-2)]"
              >
                Back
              </Link>

              <button
                onClick={() => setIsCreateProjectModalOpen(true)}
                className="inline-flex items-center gap-2 rounded-xl bg-cyan-500 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-cyan-400"
              >
                <Plus className="h-4 w-4" />
                New Project
              </button>
            </div>
          </div>

          <div className="mt-6 flex flex-col gap-3 xl:flex-row xl:items-center">
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
              <input
                type="text"
                placeholder="Search projects by name..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full rounded-2xl border border-slate-200 bg-[var(--app-surface)] py-3 pl-10 pr-4 text-sm text-[var(--app-text)] outline-none transition placeholder:text-[var(--app-muted)] focus:border-cyan-500/40"
              />
            </div>

            <div className="flex flex-wrap gap-2">
              {[
                { label: "All", value: "all" },
                { label: "Todo", value: "todo" },
                { label: "In Progress", value: "in_progress" },
                { label: "Done", value: "done" },
              ].map((item) => (
                <button
                  key={item.value}
                  onClick={() =>
                    setStatusFilter(item.value as "all" | ProjectStatus)
                  }
                  className={`rounded-xl border px-4 py-2 text-sm font-medium transition ${
                    statusFilter === item.value
                      ? "border-cyan-500/30 bg-cyan-500/10 text-cyan-300"
                      : "border-slate-200 bg-[var(--app-surface)] text-[var(--app-text)] hover:bg-[var(--app-surface-2)]"
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {isStatusUpdating ? (
          <p className="text-sm text-cyan-300">Updating project status...</p>
        ) : null}

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-2xl border border-slate-200 bg-[var(--app-surface)] p-5">
            <p className="text-sm text-[var(--app-muted)]">Total Projects</p>
            <p className="mt-3 text-2xl font-semibold text-[var(--app-text)]">
              {totalProjects}
            </p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-[var(--app-surface)] p-5">
            <p className="text-sm text-[var(--app-muted)]">Todo</p>
            <p className="mt-3 text-2xl font-semibold text-[var(--app-text)]">
              {todoCount}
            </p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-[var(--app-surface)] p-5">
            <p className="text-sm text-[var(--app-muted)]">In Progress</p>
            <p className="mt-3 text-2xl font-semibold text-[var(--app-text)]">
              {inProgressCount}
            </p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-[var(--app-surface)] p-5">
            <p className="text-sm text-[var(--app-muted)]">Done</p>
            <p className="mt-3 text-2xl font-semibold text-[var(--app-text)]">
              {doneCount}
            </p>
          </div>
        </div>

        {filteredProjects.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-slate-200 bg-[var(--app-surface)] p-10 text-center">
            <h2 className="text-xl font-semibold text-[var(--app-text)]">
              {projects.length === 0
                ? "No projects yet"
                : "No matching projects found"}
            </h2>

            <p className="mt-3 text-sm text-[var(--app-muted)]">
              {projects.length === 0
                ? "Create your first project to start managing work."
                : "Try another project name or clear the status filter."}
            </p>

            <div className="mt-6 flex justify-center gap-3">
              {projects.length === 0 ? (
                <button
                  onClick={() => setIsCreateProjectModalOpen(true)}
                  className="rounded-xl bg-cyan-500 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-cyan-400"
                >
                  Create Project
                </button>
              ) : (
                <button
                  onClick={() => {
                    setSearchTerm("");
                    setStatusFilter("all");
                  }}
                  className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-medium text-[var(--app-text)] transition hover:bg-[var(--app-surface-2)]"
                >
                  Clear Filters
                </button>
              )}
            </div>
          </div>
        ) : (
          <DragDropContext onDragEnd={onDragEnd}>
            <div className="flex items-start gap-6 overflow-x-auto pb-2">
              {renderColumn(
                "Todo",
                groupedProjects.todo.length,
                groupedProjects.todo,
                "slate",
                "todo",
              )}
              {renderColumn(
                "In Progress",
                groupedProjects.inProgress.length,
                groupedProjects.inProgress,
                "cyan",
                "in_progress",
              )}
              {renderColumn(
                "Done",
                groupedProjects.done.length,
                groupedProjects.done,
                "emerald",
                "done",
              )}
            </div>
          </DragDropContext>
        )}
      </div>

      <CreateProjectModal
        workspaceId={workspaceId}
        isOpen={isCreateProjectModalOpen}
        onClose={() => setIsCreateProjectModalOpen(false)}
        onCreated={async () => {
          await loadProjects();
        }}
      />
    </>
  );
}
