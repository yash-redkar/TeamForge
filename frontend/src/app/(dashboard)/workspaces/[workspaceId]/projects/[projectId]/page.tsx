"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import toast from "react-hot-toast";
import {
  DragDropContext,
  Droppable,
  Draggable,
  DropResult,
} from "@hello-pangea/dnd";
import { MessageSquare, ChevronDown, Trash2 } from "lucide-react";
import { workspaceService } from "@/services/workspace.service";
import { projectService } from "@/services/project.service";
import { taskService } from "@/services/task.service";
import { activityService } from "@/services/activity.service";
import { useAuth } from "@/context/auth-context";
import { CreateTaskModal } from "@/components/task/create-task-modal";
import { InviteProjectMemberModal } from "@/components/project/invite-project-member-modal";

export default function ProjectDetailsPage() {
  const params = useParams();
  const router = useRouter();

  const workspaceId =
    typeof params.workspaceId === "string"
      ? params.workspaceId
      : Array.isArray(params.workspaceId)
        ? params.workspaceId[0]
        : "";

  const projectId =
    typeof params.projectId === "string"
      ? params.projectId
      : Array.isArray(params.projectId)
        ? params.projectId[0]
        : "";

  const [projectItem, setProjectItem] = useState<any>(null);
  const [workspaceName, setWorkspaceName] = useState("");
  const { user: currentUser } = useAuth();

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  const [tasks, setTasks] = useState<any[]>([]);
  const [activities, setActivities] = useState<any[]>([]);
  const [members, setMembers] = useState<any[]>([]);
  const [pendingInvites, setPendingInvites] = useState<any[]>([]);

  const [isCreateTaskModalOpen, setIsCreateTaskModalOpen] = useState(false);
  const [isInviteProjectModalOpen, setIsInviteProjectModalOpen] =
    useState(false);
  const [isUpdatingTask, setIsUpdatingTask] = useState(false);
  const [isDeletingProject, setIsDeletingProject] = useState(false);

  const normalizeStatus = (status: string) =>
    (status || "").toLowerCase().replace(/[_\s-]/g, "");

  const getBackendStatusFromColumn = (columnId: string) => {
    switch (columnId) {
      case "todo":
        return "todo";
      case "inProgress":
        return "in_progress";
      case "done":
        return "done";
      default:
        return "todo";
    }
  };

  const getPriorityColor = (priority: string) => {
    switch ((priority || "").toLowerCase()) {
      case "low":
        return "border-slate-700 bg-slate-800 text-slate-300";
      case "medium":
        return "border-blue-800 bg-blue-900/40 text-blue-300";
      case "high":
        return "border-orange-800 bg-orange-900/40 text-orange-300";
      case "urgent":
        return "border-red-800 bg-red-900/40 text-red-300";
      default:
        return "border-slate-700 bg-slate-800 text-slate-300";
    }
  };

  const formatDateTime = (value: string) => {
    if (!value) return "";
    return new Date(value).toLocaleString();
  };

  const loadTasks = async (
    workspaceIdValue: string,
    projectIdValue: string,
  ) => {
    try {
      const taskRes = await taskService.getTasks(
        workspaceIdValue,
        projectIdValue,
      );
      setTasks(Array.isArray(taskRes.data?.items) ? taskRes.data.items : []);
    } catch (err) {
      console.error("Failed to load tasks:", err);
      toast.error("Failed to load tasks");
    }
  };

  const loadActivity = async (projectIdValue: string) => {
    try {
      const res = await activityService.getProjectActivity(projectIdValue, 8);

      const items = Array.isArray(res.data) ? res.data : [];

      const filtered = items
        .filter((activity: any) => {
          const action = (activity.action || "").toLowerCase();
          const message = (activity.message || "").toLowerCase();

          return !(
            action === "comment_updated" || message.includes("comment updated")
          );
        })
        .slice(0, 5);

      setActivities(filtered);
    } catch (err) {
      console.error("Failed to load activity:", err);
      toast.error("Failed to load activity");
    }
  };

  const loadProjectCollaborationData = async (
    workspaceIdValue: string,
    projectIdValue: string,
    isAdminValue: boolean,
  ) => {
    try {
      const membersRes = await projectService.getProjectMembers(
        workspaceIdValue,
        projectIdValue,
      );
      setMembers(membersRes.data || []);

      if (isAdminValue) {
        const invitesRes = await projectService.getPendingProjectInvites(
          workspaceIdValue,
          projectIdValue,
        );
        setPendingInvites(invitesRes.data || []);
      } else {
        setPendingInvites([]);
      }
    } catch (err: any) {
      console.error(err);
      toast.error(
        err?.response?.data?.message ||
          "Failed to load project members and invites",
      );
    }
  };

  useEffect(() => {
    const loadProject = async () => {
      try {
        setIsLoading(true);
        setError("");

        const [projectRes, workspaceRes] = await Promise.all([
          projectService.getProjectById(workspaceId, projectId),
          workspaceService.getWorkspaces(),
        ]);

        const allWorkspaces = Array.isArray(workspaceRes.data)
          ? workspaceRes.data
          : [];

        const foundWorkspace = allWorkspaces.find((item: any) => {
          const workspace = item.workspace || item;
          return workspace._id === workspaceId;
        });

        const projectData = projectRes.data;
        setProjectItem(projectData);
        setWorkspaceName(
          foundWorkspace?.workspace?.name || foundWorkspace?.name || "",
        );

        const projectRole = projectData?.role || "member";
        const isAdminValue = projectRole === "admin";

        await Promise.all([
          loadTasks(workspaceId, projectId),
          loadActivity(projectId),
          loadProjectCollaborationData(workspaceId, projectId, isAdminValue),
        ]);
      } catch (err: any) {
        console.error(err);
        const message =
          err?.response?.data?.message || "Failed to load project details";
        setError(message);
        toast.error(message);
      } finally {
        setIsLoading(false);
      }
    };

    if (workspaceId && projectId) {
      loadProject();
    }
  }, [workspaceId, projectId]);

  const groupedTasks = useMemo(() => {
    return {
      todo: tasks.filter((item: any) => {
        const task = item.task || item;
        return normalizeStatus(task.status || "todo") === "todo";
      }),
      inProgress: tasks.filter((item: any) => {
        const task = item.task || item;
        return normalizeStatus(task.status || "") === "inprogress";
      }),
      done: tasks.filter((item: any) => {
        const task = item.task || item;
        return normalizeStatus(task.status || "") === "done";
      }),
    };
  }, [tasks]);

  const onDragEnd = async (result: DropResult) => {
    const { destination, source, draggableId } = result;

    if (!destination) return;

    if (
      destination.droppableId === source.droppableId &&
      destination.index === source.index
    ) {
      return;
    }

    if (!workspaceId || !projectId) return;

    const newStatus = getBackendStatusFromColumn(destination.droppableId);
    const previousTasks = tasks;

    setTasks((prev) =>
      prev.map((item: any) => {
        const task = item.task || item;
        if (task._id === draggableId) {
          if (item.task) {
            return {
              ...item,
              task: {
                ...item.task,
                status: newStatus,
              },
            };
          }

          return {
            ...item,
            status: newStatus,
          };
        }

        return item;
      }),
    );

    try {
      setIsUpdatingTask(true);

      await taskService.updateTask(workspaceId, projectId, draggableId, {
        status: newStatus,
      });

      toast.success("Task status updated");

      await Promise.all([
        loadTasks(workspaceId, projectId),
        loadActivity(projectId),
      ]);
    } catch (err: any) {
      console.error("Drag update failed:", err?.response?.data || err);
      setTasks(previousTasks);

      const message =
        err?.response?.data?.errors?.[0]?.msg ||
        err?.response?.data?.message ||
        "Failed to update task status";

      toast.error(message);
    } finally {
      setIsUpdatingTask(false);
    }
  };

  const handleDeleteProject = async () => {
    if (!isProjectAdmin || isDeletingProject || !workspaceId || !projectId) {
      return;
    }

    const shouldDelete = window.confirm(
      "Delete this project? This action cannot be undone.",
    );

    if (!shouldDelete) return;

    try {
      setIsDeletingProject(true);
      await projectService.deleteProject(workspaceId, projectId);
      toast.success("Project deleted successfully");
      router.push(`/workspaces/${workspaceId}/projects`);
    } catch (err: any) {
      console.error("Delete project failed:", err);
      toast.error(err?.response?.data?.message || "Failed to delete project");
    } finally {
      setIsDeletingProject(false);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-4 text-[var(--app-text)]">
        <h1 className="text-3xl font-semibold">Project</h1>
        <p className="text-[var(--app-muted)]">Loading project details...</p>
      </div>
    );
  }

  if (error || !projectItem) {
    return (
      <div className="space-y-4 text-[var(--app-text)]">
        <h1 className="text-3xl font-semibold">Project</h1>
        <p className="text-red-400">{error || "Project not found"}</p>
        <Link
          href="/workspaces"
          className="inline-flex rounded-xl border border-slate-200 px-4 py-2 text-sm text-[var(--app-text)] transition hover:bg-slate-100 dark:border-slate-800 dark:hover:bg-slate-800"
        >
          Back to Workspaces
        </Link>
      </div>
    );
  }

  const project = projectItem.project || projectItem;
  const role = projectItem.role || "member";
  const isProjectAdmin = role === "admin";

  const sortedMembers = [...members].sort((a: any, b: any) => {
    const userA = a.user || a.member || a;
    const userB = b.user || b.member || b;

    const isSelfA =
      currentUser?._id && userA?._id
        ? String(currentUser._id) === String(userA._id)
        : false;

    const isSelfB =
      currentUser?._id && userB?._id
        ? String(currentUser._id) === String(userB._id)
        : false;

    if (isSelfA && !isSelfB) return -1;
    if (!isSelfA && isSelfB) return 1;

    const rolePriority: Record<string, number> = {
      admin: 1,
      member: 2,
    };

    const roleA = a.role || "member";
    const roleB = b.role || "member";

    if (rolePriority[roleA] !== rolePriority[roleB]) {
      return rolePriority[roleA] - rolePriority[roleB];
    }

    const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
    const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;

    return dateA - dateB;
  });

  const renderTaskCard = (item: any, index: number) => {
    const task = item.task || item;

    return (
      <Draggable key={task._id || index} draggableId={task._id} index={index}>
        {(provided, snapshot) => (
          <div
            ref={provided.innerRef}
            {...provided.draggableProps}
            {...provided.dragHandleProps}
            className={`rounded-xl border border-slate-200 bg-[var(--app-surface)] p-4 transition hover:border-slate-300 dark:border-slate-800 dark:hover:border-slate-700 ${
              snapshot.isDragging ? "shadow-lg ring-1 ring-cyan-400" : ""
            }`}
          >
            <Link
              href={`/tasks/${task._id}?workspaceId=${workspaceId}&projectId=${project._id}`}
              className="block"
            >
              <div className="flex items-start justify-between gap-3">
                <h5 className="text-sm font-semibold text-[var(--app-text)]">
                  {task.title || "Untitled Task"}
                </h5>

                <span
                  className={`rounded-full border px-2.5 py-1 text-[10px] font-medium capitalize ${getPriorityColor(task.priority)}`}
                >
                  {task.priority || "medium"}
                </span>
              </div>

              <p className="mt-2 text-xs leading-5 text-[var(--app-muted)]">
                {task.description || "No description"}
              </p>
            </Link>
          </div>
        )}
      </Draggable>
    );
  };

  return (
    <>
      <div className="space-y-6 text-[var(--app-text)]">
        <div className="flex flex-col gap-4 border-b border-slate-200 pb-6 sm:flex-row sm:items-start sm:justify-between dark:border-slate-800">
          <div className="min-w-0 flex-1">
            <h1 className="text-3xl font-semibold text-[var(--app-text)]">
              {project.name || "Untitled Project"}
            </h1>

            <p className="mt-2 overflow-hidden text-sm text-[var(--app-muted)] wrap-anywhere [display:-webkit-box] [-webkit-box-orient:vertical] [-webkit-line-clamp:4]">
              {project.description ||
                "Project details, tasks, members, and pending invites."}
            </p>

            <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-[var(--app-muted)]">
              <span>Workspace: {workspaceName || "Unknown"}</span>
              <span>•</span>
              <span className="capitalize">Role: {role}</span>
              <span>•</span>
              <span>{members.length} Members</span>
            </div>
          </div>

          <div className="shrink-0 self-start">
            <div className="flex flex-wrap items-center justify-end gap-3">
              <Link
                href={`/workspaces/${workspaceId}`}
                className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-4 py-2 text-sm text-[var(--app-text)] transition hover:bg-slate-100 dark:border-slate-800 dark:hover:bg-slate-800"
              >
                Back
              </Link>

              <Link
                href={`/workspaces/${workspaceId}/projects/${projectId}/chat`}
                className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-cyan-500 to-indigo-500 px-4 py-2 text-sm font-medium text-white shadow transition hover:opacity-90"
              >
                <MessageSquare className="size-4" />
                Project Chat
              </Link>

              {isProjectAdmin ? (
                <button
                  type="button"
                  onClick={handleDeleteProject}
                  disabled={isDeletingProject}
                  className="inline-flex items-center gap-2 rounded-xl border border-slate-300 bg-[var(--app-surface)] px-4 py-2 text-sm font-medium text-[var(--app-text)] transition hover:border-red-500/40 hover:bg-red-500/10 hover:text-red-400 disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-700 dark:hover:text-red-300"
                >
                  <Trash2 className="size-4" />
                  {isDeletingProject ? "Deleting..." : "Delete Project"}
                </button>
              ) : null}
            </div>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-2xl border border-slate-200 bg-[var(--app-surface)] p-5 dark:border-slate-800">
            <p className="text-sm text-[var(--app-muted)]">Project Name</p>
            <p className="mt-3 text-xl font-semibold">
              {project.name || "Untitled Project"}
            </p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-[var(--app-surface)] p-5 dark:border-slate-800">
            <p className="text-sm text-[var(--app-muted)]">Workspace</p>
            <p className="mt-3 text-xl font-semibold">
              {workspaceName || "Unknown"}
            </p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-[var(--app-surface)] p-5 dark:border-slate-800">
            <p className="text-sm text-[var(--app-muted)]">Your Role</p>
            <p className="mt-3 text-xl font-semibold capitalize">{role}</p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-[var(--app-surface)] p-5 dark:border-slate-800">
            <p className="text-sm text-[var(--app-muted)]">Members</p>
            <p className="mt-3 text-xl font-semibold">{members.length}</p>
          </div>
        </div>

        <div className="rounded-3xl border border-slate-200 bg-[var(--app-surface)] p-6 dark:border-slate-800">
          <h2 className="text-2xl font-semibold text-[var(--app-text)]">
            Project Overview
          </h2>
          <p className="mt-2 text-sm text-[var(--app-muted)]">
            Manage tasks, members, invites, and activity for this project.
          </p>

          <div className="mt-6 space-y-5">
            <div className="rounded-2xl border border-slate-200 bg-[var(--app-surface-2)] p-5 dark:border-slate-800">
              <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h3 className="text-xl font-semibold text-[var(--app-text)]">
                    Kanban Board
                  </h3>
                  <p className="mt-1 text-sm text-[var(--app-muted)]">
                    Drag tasks across workflow status.
                  </p>
                </div>

                <button
                  onClick={() => setIsCreateTaskModalOpen(true)}
                  className="rounded-xl bg-cyan-500 px-4 py-2 text-sm font-medium text-white transition hover:bg-cyan-400"
                >
                  Create Task
                </button>
              </div>

              {isUpdatingTask ? (
                <p className="mb-4 text-sm text-cyan-600 dark:text-cyan-300">
                  Updating task...
                </p>
              ) : null}

              <DragDropContext onDragEnd={onDragEnd}>
                <div className="grid gap-4 xl:grid-cols-3">
                  <Droppable droppableId="todo">
                    {(provided, snapshot) => (
                      <div
                        ref={provided.innerRef}
                        {...provided.droppableProps}
                        className={`rounded-2xl border border-slate-200 bg-[var(--app-surface)] p-4 ${
                          snapshot.isDraggingOver
                            ? "ring-1 ring-slate-300 dark:ring-slate-500"
                            : ""
                        }`}
                      >
                        <div className="mb-4 flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <div className="h-2.5 w-2.5 rounded-full bg-slate-400" />
                            <h4 className="text-sm font-semibold text-[var(--app-text)]">
                              Todo
                            </h4>
                          </div>
                          <span className="rounded-full border border-slate-200 bg-[var(--app-surface-2)] px-2.5 py-1 text-xs text-[var(--app-text)] dark:border-slate-800 dark:text-slate-300">
                            {groupedTasks.todo.length}
                          </span>
                        </div>

                        <div className="space-y-3">
                          {groupedTasks.todo.length === 0 ? (
                            <div className="rounded-xl border border-dashed border-slate-300 p-4 text-sm text-[var(--app-muted)] dark:border-slate-700">
                              No todo tasks
                            </div>
                          ) : (
                            groupedTasks.todo.map(renderTaskCard)
                          )}
                          {provided.placeholder}
                        </div>
                      </div>
                    )}
                  </Droppable>

                  <Droppable droppableId="inProgress">
                    {(provided, snapshot) => (
                      <div
                        ref={provided.innerRef}
                        {...provided.droppableProps}
                        className={`rounded-2xl border border-slate-200 bg-[var(--app-surface)] p-4 ${
                          snapshot.isDraggingOver
                            ? "ring-1 ring-yellow-300 dark:ring-yellow-400"
                            : ""
                        }`}
                      >
                        <div className="mb-4 flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <div className="h-2.5 w-2.5 rounded-full bg-yellow-400" />
                            <h4 className="text-sm font-semibold text-[var(--app-text)]">
                              In Progress
                            </h4>
                          </div>
                          <span className="rounded-full border border-slate-200 bg-[var(--app-surface-2)] px-2.5 py-1 text-xs text-[var(--app-text)] dark:border-slate-800 dark:text-slate-300">
                            {groupedTasks.inProgress.length}
                          </span>
                        </div>

                        <div className="space-y-3">
                          {groupedTasks.inProgress.length === 0 ? (
                            <div className="rounded-xl border border-dashed border-slate-300 p-4 text-sm text-[var(--app-muted)] dark:border-slate-700">
                              No in-progress tasks
                            </div>
                          ) : (
                            groupedTasks.inProgress.map(renderTaskCard)
                          )}
                          {provided.placeholder}
                        </div>
                      </div>
                    )}
                  </Droppable>

                  <Droppable droppableId="done">
                    {(provided, snapshot) => (
                      <div
                        ref={provided.innerRef}
                        {...provided.droppableProps}
                        className={`rounded-2xl border border-slate-200 bg-[var(--app-surface)] p-4 ${
                          snapshot.isDraggingOver
                            ? "ring-1 ring-green-300 dark:ring-green-400"
                            : ""
                        }`}
                      >
                        <div className="mb-4 flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <div className="h-2.5 w-2.5 rounded-full bg-green-400" />
                            <h4 className="text-sm font-semibold text-[var(--app-text)]">
                              Done
                            </h4>
                          </div>
                          <span className="rounded-full border border-slate-200 bg-[var(--app-surface-2)] px-2.5 py-1 text-xs text-[var(--app-text)] dark:border-slate-800 dark:text-slate-300">
                            {groupedTasks.done.length}
                          </span>
                        </div>

                        <div className="space-y-3">
                          {groupedTasks.done.length === 0 ? (
                            <div className="rounded-xl border border-dashed border-slate-300 p-4 text-sm text-[var(--app-muted)] dark:border-slate-700">
                              No completed tasks
                            </div>
                          ) : (
                            groupedTasks.done.map(renderTaskCard)
                          )}
                          {provided.placeholder}
                        </div>
                      </div>
                    )}
                  </Droppable>
                </div>
              </DragDropContext>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="rounded-2xl border border-slate-200 bg-[var(--app-surface-2)] p-5 dark:border-slate-800">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-semibold text-[var(--app-text)]">
                      Members
                    </h3>
                    <p className="text-sm text-[var(--app-muted)]">
                      Manage project members and access.
                    </p>
                  </div>

                  {isProjectAdmin && (
                    <button
                      onClick={() => setIsInviteProjectModalOpen(true)}
                      className="rounded-lg bg-cyan-500 px-3 py-1.5 text-xs font-medium text-white transition hover:bg-cyan-400"
                    >
                      Invite Member
                    </button>
                  )}
                </div>

                <div className="mt-5">
                  <h4 className="text-sm font-semibold text-[var(--app-text)]">
                    Current Members ({members.length})
                  </h4>

                  {members.length === 0 ? (
                    <p className="mt-3 text-sm text-[var(--app-muted)]">
                      No members found in this project.
                    </p>
                  ) : (
                    <div className="mt-4 space-y-3">
                      {sortedMembers.map((item: any, index: number) => {
                        const user = item.user || item.member || item;
                        const displayName =
                          user?.fullName ||
                          user?.fullname ||
                          user?.name ||
                          user?.username ||
                          "Unknown User";
                        const email = user?.email || "No email";
                        const memberRole = item.role || "member";
                        const joinedAt = item.createdAt
                          ? new Date(item.createdAt).toLocaleDateString()
                          : "N/A";

                        const isSelf =
                          currentUser?._id && user?._id
                            ? String(currentUser._id) === String(user._id)
                            : false;

                        const canChangeRole = isProjectAdmin && !isSelf;
                        const canRemoveMember = isProjectAdmin && !isSelf;

                        return (
                          <div
                            key={user?._id || index}
                            className="rounded-2xl border border-slate-200 bg-[var(--app-surface)] p-4 transition hover:border-slate-300 dark:border-slate-800 dark:hover:border-slate-700"
                          >
                            <div className="flex items-start gap-4">
                              <div className="flex min-w-0 flex-1 items-center gap-3">
                                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-cyan-500/20 text-sm font-semibold text-cyan-300">
                                  {displayName?.charAt(0)?.toUpperCase() || "U"}
                                </div>

                                <div className="min-w-0">
                                  <p className="truncate text-sm font-semibold text-[var(--app-text)]">
                                    {displayName}
                                    {isSelf && (
                                      <span className="ml-2 text-xs text-cyan-400">
                                        (You)
                                      </span>
                                    )}
                                  </p>

                                  <p className="truncate text-xs text-[var(--app-muted)]">
                                    {email}
                                  </p>

                                  <p className="mt-1 text-xs text-[var(--app-muted)]">
                                    Joined: {joinedAt}
                                  </p>
                                </div>
                              </div>

                              <div className="shrink-0 self-start pt-0.5">
                                {canChangeRole ? (
                                  <div className="relative">
                                    <select
                                      value={memberRole}
                                      onChange={async (e) => {
                                        const nextRole = e.target.value;

                                        if (!user?._id) return;

                                        try {
                                          const data =
                                            await projectService.updateProjectMemberRole(
                                              workspaceId,
                                              project._id,
                                              user._id,
                                              { role: nextRole },
                                            );

                                          toast.success(
                                            data?.message ||
                                              "Project member role updated successfully",
                                          );

                                          await loadProjectCollaborationData(
                                            workspaceId,
                                            project._id,
                                            isProjectAdmin,
                                          );
                                        } catch (err: any) {
                                          console.error(err);
                                          toast.error(
                                            err?.response?.data?.message ||
                                              "Failed to update member role",
                                          );
                                        }
                                      }}
                                      className="appearance-none rounded-full border border-slate-200 bg-[var(--app-surface-2)] py-1 pl-3 pr-8 text-[11px] capitalize text-[var(--app-text)] outline-none transition hover:border-slate-300 dark:border-slate-800 dark:text-slate-300 dark:hover:border-slate-600"
                                    >
                                      <option value="member">Member</option>
                                      <option value="admin">Admin</option>
                                    </select>

                                    <ChevronDown className="pointer-events-none absolute right-2 top-1/2 size-3 -translate-y-1/2 text-[var(--app-muted)]" />
                                  </div>
                                ) : (
                                  <span className="rounded-full border border-slate-200 bg-[var(--app-surface-2)] px-3 py-1 text-[11px] capitalize text-[var(--app-text)] dark:border-slate-800 dark:text-slate-300">
                                    {memberRole}
                                  </span>
                                )}
                              </div>
                            </div>

                            {canRemoveMember && (
                              <div className="mt-3">
                                <button
                                  onClick={async () => {
                                    if (!user?._id) return;

                                    const confirmed = window.confirm(
                                      "Remove this member from project?",
                                    );
                                    if (!confirmed) return;

                                    try {
                                      const data =
                                        await projectService.removeProjectMember(
                                          workspaceId,
                                          project._id,
                                          user._id,
                                        );

                                      toast.success(
                                        data?.message ||
                                          "Project member removed successfully",
                                      );

                                      await loadProjectCollaborationData(
                                        workspaceId,
                                        project._id,
                                        isProjectAdmin,
                                      );
                                    } catch (err: any) {
                                      console.error(err);
                                      toast.error(
                                        err?.response?.data?.message ||
                                          "Failed to remove project member",
                                      );
                                    }
                                  }}
                                  className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-1 text-xs text-red-700 transition hover:bg-red-500/20 dark:text-red-300"
                                >
                                  Remove
                                </button>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                {isProjectAdmin && (
                  <div className="mt-6">
                    <h4 className="text-sm font-semibold text-[var(--app-text)]">
                      Pending Invites ({pendingInvites.length})
                    </h4>

                    {pendingInvites.length === 0 ? (
                      <p className="mt-3 text-sm text-[var(--app-muted)]">
                        No pending invites.
                      </p>
                    ) : (
                      <div className="mt-4 space-y-3">
                        {pendingInvites.map((invite: any, index: number) => {
                          const email =
                            invite.user?.email ||
                            invite.email ||
                            invite.invitedEmail ||
                            invite.memberEmail ||
                            "No email";

                          const inviteUserName =
                            invite.user?.fullName ||
                            invite.user?.fullname ||
                            invite.user?.name ||
                            invite.user?.username ||
                            null;

                          const inviteRole = invite.role || "member";

                          const invitedBy =
                            invite.invitedBy?.fullName ||
                            invite.invitedBy?.fullname ||
                            invite.invitedBy?.name ||
                            invite.invitedBy?.username ||
                            "Unknown";

                          const expiresAt = invite.inviteExpiresAt
                            ? new Date(
                                invite.inviteExpiresAt,
                              ).toLocaleDateString()
                            : "N/A";

                          const inviteId = invite._id;

                          return (
                            <div
                              key={invite._id || index}
                              className="rounded-xl border border-slate-200 bg-[var(--app-surface)] p-4 dark:border-slate-800"
                            >
                              <div className="flex items-start justify-between gap-3">
                                <div className="min-w-0">
                                  <p className="truncate text-sm font-semibold text-[var(--app-text)]">
                                    {inviteUserName || email}
                                  </p>

                                  {inviteUserName && (
                                    <p className="mt-1 text-xs text-[var(--app-muted)]">
                                      {email}
                                    </p>
                                  )}

                                  <p className="mt-1 text-xs text-[var(--app-muted)]">
                                    Role:{" "}
                                    <span className="capitalize">
                                      {inviteRole}
                                    </span>
                                  </p>

                                  <p className="mt-1 text-xs text-[var(--app-muted)]">
                                    Invited by: {invitedBy}
                                  </p>

                                  <p className="mt-1 text-xs text-[var(--app-muted)]">
                                    Expires: {expiresAt}
                                  </p>
                                </div>

                                <span className="rounded-full border border-amber-500/30 bg-amber-500/10 px-2.5 py-1 text-[11px] text-amber-300">
                                  Pending
                                </span>
                              </div>

                              <div className="mt-3 flex items-center gap-2">
                                <button
                                  onClick={async () => {
                                    if (!inviteId) return;

                                    try {
                                      const data =
                                        await projectService.resendProjectInvite(
                                          workspaceId,
                                          project._id,
                                          inviteId,
                                        );

                                      toast.success(
                                        data?.message ||
                                          "Project invite resent successfully",
                                      );

                                      await loadProjectCollaborationData(
                                        workspaceId,
                                        project._id,
                                        isProjectAdmin,
                                      );
                                    } catch (err: any) {
                                      console.error(err);
                                      toast.error(
                                        err?.response?.data?.message ||
                                          "Failed to resend project invite",
                                      );
                                    }
                                  }}
                                  className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-[var(--app-text)] transition hover:bg-slate-100 dark:border-slate-800 dark:hover:bg-slate-800"
                                >
                                  Resend
                                </button>

                                <button
                                  onClick={async () => {
                                    if (!inviteId) return;

                                    const confirmed = window.confirm(
                                      "Cancel this pending project invite?",
                                    );
                                    if (!confirmed) return;

                                    try {
                                      const data =
                                        await projectService.cancelProjectInvite(
                                          workspaceId,
                                          project._id,
                                          inviteId,
                                        );

                                      toast.success(
                                        data?.message ||
                                          "Project invite cancelled successfully",
                                      );

                                      await loadProjectCollaborationData(
                                        workspaceId,
                                        project._id,
                                        isProjectAdmin,
                                      );
                                    } catch (err: any) {
                                      console.error(err);
                                      toast.error(
                                        err?.response?.data?.message ||
                                          "Failed to cancel project invite",
                                      );
                                    }
                                  }}
                                  className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-1.5 text-xs font-medium text-red-700 transition hover:bg-red-500/20 dark:text-red-300"
                                >
                                  Cancel
                                </button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div className="rounded-2xl border border-slate-200 bg-[var(--app-surface-2)] p-5 dark:border-slate-800">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3 className="text-lg font-semibold text-[var(--app-text)]">
                      Recent Activity
                    </h3>
                    <p className="text-sm text-[var(--app-muted)]">
                      Latest updates from this project.
                    </p>
                  </div>

                  <Link
                    href={`/workspaces/${workspaceId}/activity`}
                    className="shrink-0 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-[var(--app-text)] transition hover:bg-slate-100 dark:border-slate-800 dark:hover:bg-slate-800"
                  >
                    View all
                  </Link>
                </div>

                <div className="mt-4 space-y-3">
                  {activities.length === 0 ? (
                    <div className="rounded-xl border border-dashed border-slate-300 p-4 text-sm text-[var(--app-muted)] dark:border-slate-700">
                      No activity yet
                    </div>
                  ) : (
                    activities.map((activity: any, index: number) => (
                      <div
                        key={activity._id || index}
                        className="rounded-xl border border-slate-200 bg-[var(--app-surface)] p-4 transition hover:border-slate-300 dark:border-slate-800 dark:hover:border-slate-700"
                      >
                        <p className="text-sm leading-6 text-[var(--app-text)]">
                          <span className="font-semibold text-[var(--app-text)]">
                            {activity.actor?.fullName ||
                              activity.actor?.fullname ||
                              activity.actor?.name ||
                              activity.actor?.username ||
                              "Someone"}
                          </span>{" "}
                          {String(activity.message || "").replace(/_/g, " ")}
                        </p>

                        <div className="mt-2 flex flex-wrap items-center gap-2">
                          {activity.project?.name ? (
                            <span className="rounded-full border border-slate-200 bg-[var(--app-surface-2)] px-2.5 py-1 text-[11px] text-[var(--app-text)] dark:border-slate-800 dark:text-slate-300">
                              Project: {activity.project.name}
                            </span>
                          ) : null}

                          {activity.task?.title ? (
                            <span className="rounded-full border border-cyan-500/20 bg-cyan-500/10 px-2.5 py-1 text-[11px] text-cyan-300">
                              Task: {activity.task.title}
                            </span>
                          ) : null}

                          {activity.entityType ? (
                            <span className="rounded-full border border-slate-200 bg-[var(--app-surface-2)] px-2.5 py-1 text-[11px] capitalize text-[var(--app-muted)] dark:border-slate-800 dark:text-slate-400">
                              {activity.entityType}
                            </span>
                          ) : null}
                        </div>

                        <p className="mt-3 text-xs text-[var(--app-muted)]">
                          {formatDateTime(activity.createdAt)}
                        </p>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <CreateTaskModal
        workspaceId={workspaceId}
        projectId={project?._id || ""}
        isOpen={isCreateTaskModalOpen}
        onClose={() => setIsCreateTaskModalOpen(false)}
        onCreated={async () => {
          if (workspaceId && project?._id) {
            await Promise.all([
              loadTasks(workspaceId, project._id),
              loadActivity(project._id),
            ]);
          }
        }}
      />

      {isProjectAdmin && (
        <InviteProjectMemberModal
          workspaceId={workspaceId}
          projectId={project?._id || ""}
          isOpen={isInviteProjectModalOpen}
          onClose={() => setIsInviteProjectModalOpen(false)}
          onInvited={async () => {
            if (workspaceId && project?._id) {
              await loadProjectCollaborationData(
                workspaceId,
                project._id,
                isProjectAdmin,
              );
            }
          }}
        />
      )}
    </>
  );
}
