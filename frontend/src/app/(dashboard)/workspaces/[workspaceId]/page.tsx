"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import toast from "react-hot-toast";
import { workspaceService } from "@/services/workspace.service";
import { projectService } from "@/services/project.service";
import { CreateProjectModal } from "@/components/project/create-project-modal";
import { useAuth } from "@/context/auth-context";

export default function WorkspaceDetailsPage() {
  const params = useParams();
  const { user: currentUser } = useAuth();

  const workspaceId =
    typeof params.workspaceId === "string"
      ? params.workspaceId
      : Array.isArray(params.workspaceId)
        ? params.workspaceId[0]
        : "";

  const [workspaceItem, setWorkspaceItem] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [projects, setProjects] = useState<any[]>([]);
  const [members, setMembers] = useState<any[]>([]);
  const [isCreateProjectModalOpen, setIsCreateProjectModalOpen] =
    useState(false);

  const loadProjects = async () => {
    try {
      const projectRes =
        await projectService.getProjectsByWorkspace(workspaceId);
      setProjects(projectRes.data || []);
    } catch (err: any) {
      console.error(err);
      toast.error(
        err?.response?.data?.message || "Failed to load workspace projects",
      );
    }
  };

  const loadMembers = async () => {
    try {
      const membersRes =
        await workspaceService.getWorkspaceMembers(workspaceId);
      setMembers(membersRes.data || []);
    } catch (err: any) {
      console.error(err);
      toast.error(
        err?.response?.data?.message || "Failed to load workspace members",
      );
    }
  };

  useEffect(() => {
    const loadWorkspace = async () => {
      try {
        setIsLoading(true);
        setError("");

        const workspaceRes = await workspaceService.getWorkspaces();
        const allWorkspaces = workspaceRes.data || [];

        const found = allWorkspaces.find((item: any) => {
          const workspace = item.workspace || item;
          return workspace._id === workspaceId;
        });

        if (!found) {
          setError("Workspace not found");
          return;
        }

        setWorkspaceItem(found);

        await Promise.all([loadProjects(), loadMembers()]);
      } catch (err: any) {
        console.error(err);

        const message =
          err?.response?.data?.message || "Failed to load workspace details";

        setError(message);
        toast.error(message);
      } finally {
        setIsLoading(false);
      }
    };

    if (workspaceId) {
      loadWorkspace();
    }
  }, [workspaceId]);

  const sortedMembers = useMemo(() => {
    const rolePriority: Record<string, number> = {
      owner: 1,
      admin: 2,
      member: 3,
    };

    return [...members].sort((a: any, b: any) => {
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

      const roleA = a.role || "member";
      const roleB = b.role || "member";

      if (rolePriority[roleA] !== rolePriority[roleB]) {
        return rolePriority[roleA] - rolePriority[roleB];
      }

      const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;

      return dateA - dateB;
    });
  }, [members, currentUser]);

  const previewMembers = useMemo(() => {
    return sortedMembers.slice(0, 4);
  }, [sortedMembers]);

  if (isLoading) {
    return (
      <div className="space-y-4 text-[var(--app-text)]">
        <h1 className="text-3xl font-semibold">Workspace</h1>
        <p className="text-[var(--app-muted)]">Loading workspace details...</p>
      </div>
    );
  }

  if (error || !workspaceItem) {
    return (
      <div className="space-y-4 text-[var(--app-text)]">
        <h1 className="text-3xl font-semibold">Workspace</h1>
        <p className="text-red-400">{error || "Workspace not found"}</p>

        <Link
          href="/workspaces"
          className="inline-flex rounded-xl border border-slate-200 px-4 py-2 text-sm text-[var(--app-text)] transition hover:bg-slate-100 dark:border-slate-800 dark:hover:bg-slate-800"
        >
          Back to Workspaces
        </Link>
      </div>
    );
  }

  const workspace = workspaceItem.workspace || workspaceItem;
  const role = workspaceItem.role || "member";
  const status = workspaceItem.status || "active";

  return (
    <>
      <div className="space-y-6 text-[var(--app-text)]">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-start gap-3">
              <h1 className="text-3xl font-semibold leading-tight wrap-anywhere">
                {workspace.name}
              </h1>

              <span className="rounded-full border border-slate-200 bg-[var(--app-surface-2)] px-2.5 py-1 text-xs text-[var(--app-text)] dark:border-slate-800">
                {workspace.plan || "free"}
              </span>
            </div>

            <p className="mt-2 text-[var(--app-muted)]">
              Workspace details and collaboration overview.
            </p>
          </div>

          <Link
            href="/workspaces"
            className="inline-flex rounded-xl border border-slate-200 px-4 py-2 text-sm text-[var(--app-text)] transition hover:bg-slate-100 dark:border-slate-800 dark:hover:bg-slate-800"
          >
            Back
          </Link>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-2xl border border-slate-200 bg-[var(--app-surface)] p-5 shadow-sm dark:border-slate-800">
            <p className="text-sm text-[var(--app-muted)]">Workspace Name</p>
            <p className="mt-3 text-xl font-semibold">{workspace.name}</p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-[var(--app-surface)] p-5 shadow-sm dark:border-slate-800">
            <p className="text-sm text-[var(--app-muted)]">Slug</p>
            <p className="mt-3 text-xl font-semibold">{workspace.slug}</p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-[var(--app-surface)] p-5 shadow-sm dark:border-slate-800">
            <p className="text-sm text-[var(--app-muted)]">Role</p>
            <p className="mt-3 text-xl font-semibold capitalize">{role}</p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-[var(--app-surface)] p-5 shadow-sm dark:border-slate-800">
            <p className="text-sm text-[var(--app-muted)]">Status</p>
            <p className="mt-3 text-xl font-semibold capitalize">{status}</p>
          </div>
        </div>

        <div className="rounded-3xl border border-slate-200 bg-[var(--app-surface)] p-6 shadow-sm dark:border-slate-800">
          <h2 className="text-xl font-semibold text-[var(--app-text)]">
            Workspace Overview
          </h2>

          <p className="mt-2 text-sm text-[var(--app-muted)]">
            Manage projects and get a quick overview of workspace collaboration.
          </p>

          <div className="mt-6 grid gap-4 md:grid-cols-2">
            <div className="rounded-2xl border border-slate-200 bg-[var(--app-surface-2)] p-5 shadow-sm dark:border-slate-800">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-[var(--app-text)]">
                  Projects
                </h3>

                <div className="flex items-center gap-2">
                  <span className="rounded-full border border-slate-200 bg-[var(--app-surface)] px-2.5 py-1 text-xs text-[var(--app-text)] dark:border-slate-800">
                    {projects.length}
                  </span>

                  <button
                    onClick={() => setIsCreateProjectModalOpen(true)}
                    className="rounded-lg bg-cyan-500 px-3 py-1.5 text-xs font-medium text-white transition hover:bg-cyan-400"
                  >
                    Create Project
                  </button>
                </div>
              </div>

              {projects.length === 0 ? (
                <p className="mt-3 text-sm text-[var(--app-muted)]">
                  No projects found in this workspace yet.
                </p>
              ) : (
                <div className="mt-4 space-y-3">
                  {projects.map((item: any, index: number) => {
                    const project = item.project || item;

                    return (
                      <Link
                        key={project._id || index}
                        href={`/workspaces/${workspaceId}/projects/${project._id}`}
                        className="block rounded-xl border border-slate-200 bg-[var(--app-surface)] p-4 shadow-sm transition hover:border-slate-300 hover:bg-slate-100 dark:border-slate-800 dark:hover:border-slate-700 dark:hover:bg-slate-900"
                      >
                        <h4 className="overflow-hidden text-sm font-semibold text-[var(--app-text)] wrap-anywhere [display:-webkit-box] [-webkit-box-orient:vertical] [-webkit-line-clamp:2]">
                          {project.name || "Untitled Project"}
                        </h4>

                        <p className="mt-1 overflow-hidden text-xs text-[var(--app-muted)] wrap-anywhere [display:-webkit-box] [-webkit-box-orient:vertical] [-webkit-line-clamp:3]">
                          {project.description || "No description"}
                        </p>
                      </Link>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="rounded-2xl border border-slate-200 bg-[var(--app-surface-2)] p-5 shadow-sm dark:border-slate-800">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h3 className="text-lg font-semibold text-[var(--app-text)]">
                    Members
                  </h3>
                  <p className="mt-2 text-sm text-[var(--app-muted)]">
                    Quick preview of your workspace team.
                  </p>
                </div>

                <Link
                  href="/settings?tab=team"
                  className="rounded-lg bg-cyan-500 px-3 py-1.5 text-xs font-medium text-white transition hover:bg-cyan-400"
                >
                  Manage Team
                </Link>
              </div>

              <div className="mt-5">
                <div className="flex items-center gap-2">
                  <h4 className="text-sm font-semibold text-[var(--app-text)]">
                    Team Members
                  </h4>

                  <span className="rounded-full border border-slate-200 bg-[var(--app-surface)] px-2.5 py-1 text-xs text-[var(--app-text)] dark:border-slate-800">
                    {members.length}
                  </span>
                </div>

                {members.length === 0 ? (
                  <p className="mt-3 text-sm text-[var(--app-muted)]">
                    No members found in this workspace.
                  </p>
                ) : (
                  <div className="mt-4 space-y-3">
                    {previewMembers.map((item: any, index: number) => {
                      const memberUser = item.user || item.member || item;
                      const displayName =
                        memberUser?.fullname ||
                        memberUser?.fullName ||
                        memberUser?.name ||
                        memberUser?.username ||
                        "Unknown User";
                      const email = memberUser?.email || "No email";
                      const memberRole = item.role || "member";

                      const isSelf =
                        currentUser?._id && memberUser?._id
                          ? String(currentUser._id) === String(memberUser._id)
                          : false;

                      return (
                        <div
                          key={memberUser?._id || index}
                          className="rounded-xl border border-slate-200 bg-[var(--app-surface)] p-4 shadow-sm dark:border-slate-800"
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex min-w-0 items-center gap-3">
                              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-cyan-500/20 text-sm font-semibold text-cyan-300">
                                {displayName?.charAt(0)?.toUpperCase() || "U"}
                              </div>

                              <div className="min-w-0">
                                <p className="truncate text-sm font-semibold text-[var(--app-text)]">
                                  {displayName}
                                  {isSelf ? (
                                    <span className="ml-2 text-xs font-normal text-cyan-400">
                                      (You)
                                    </span>
                                  ) : null}
                                </p>
                                <p className="truncate text-xs text-[var(--app-muted)]">
                                  {email}
                                </p>
                              </div>
                            </div>

                            <span className="rounded-full border border-slate-200 bg-[var(--app-surface-2)] px-2.5 py-1 text-[11px] capitalize text-[var(--app-text)] dark:border-slate-800">
                              {memberRole}
                            </span>
                          </div>
                        </div>
                      );
                    })}

                    {members.length > 4 ? (
                      <div className="pt-1">
                        <Link
                          href="/settings?tab=team"
                          className="text-xs font-medium text-cyan-400 transition hover:text-cyan-300"
                        >
                          View all {members.length} members
                        </Link>
                      </div>
                    ) : null}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
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
