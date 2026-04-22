"use client";

import {
  ChangeEvent,
  DragEvent,
  KeyboardEvent,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import toast from "react-hot-toast";
import { Trash2 } from "lucide-react";
import { useAuth } from "@/context/auth-context";
import { taskService } from "@/services/task.service";
import { taskCommentService } from "@/services/task-comment.service";
import { subTaskService } from "@/services/subtask.service";
import { projectMemberService } from "@/services/project-member.service";
import { taskAttachmentService } from "@/services/task-attachment.service";
import { useClientSearchParams } from "@/lib/use-client-search-params";

export default function TaskDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useClientSearchParams();
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const taskId =
    typeof params.taskId === "string"
      ? params.taskId
      : Array.isArray(params.taskId)
        ? params.taskId[0]
        : "";

  const workspaceId = searchParams?.get("workspaceId") || "";
  const projectId = searchParams?.get("projectId") || "";

  const { user: currentUser } = useAuth();

  const [taskItem, setTaskItem] = useState<any>(null);
  const [comments, setComments] = useState<any[]>([]);
  const [subtasks, setSubtasks] = useState<any[]>([]);
  const [attachments, setAttachments] = useState<any[]>([]);
  const [members, setMembers] = useState<any[]>([]);

  const [selectedAssignee, setSelectedAssignee] = useState("");
  const [commentText, setCommentText] = useState("");
  const [subtaskTitle, setSubtaskTitle] = useState("");

  const [isLoading, setIsLoading] = useState(true);
  const [isUpdating, setIsUpdating] = useState(false);
  const [isAssigneeUpdating, setIsAssigneeUpdating] = useState(false);
  const [isMembersLoading, setIsMembersLoading] = useState(false);
  const [isCommentSubmitting, setIsCommentSubmitting] = useState(false);
  const [isSubtaskSubmitting, setIsSubtaskSubmitting] = useState(false);
  const [isAttachmentUploading, setIsAttachmentUploading] = useState(false);

  const [uploadProgress, setUploadProgress] = useState(0);
  const [isDraggingAttachment, setIsDraggingAttachment] = useState(false);
  const [deletingAttachmentId, setDeletingAttachmentId] = useState<
    string | null
  >(null);

  const [editingCommentId, setEditingCommentId] = useState<string | null>(null);
  const [editingCommentText, setEditingCommentText] = useState("");
  const [isCommentUpdating, setIsCommentUpdating] = useState(false);
  const [deletingCommentId, setDeletingCommentId] = useState<string | null>(
    null,
  );
  const [isDeletingTask, setIsDeletingTask] = useState(false);

  const [error, setError] = useState("");
  const [statusValue, setStatusValue] = useState("todo");

  const normalizeStatus = (status: string) =>
    (status || "").toLowerCase().replace(/[_\s-]/g, "");

  const toBackendStatus = (status: string) => {
    const normalized = normalizeStatus(status);

    switch (normalized) {
      case "todo":
        return "todo";
      case "inprogress":
        return "in_progress";
      case "done":
        return "done";
      default:
        return "todo";
    }
  };

  const getStatusColor = (status: string) => {
    const normalized = normalizeStatus(status);

    switch (normalized) {
      case "todo":
        return "border-slate-700 bg-slate-800 text-slate-300";
      case "inprogress":
        return "border-yellow-800 bg-yellow-900/30 text-yellow-300";
      case "done":
        return "border-green-800 bg-green-900/30 text-green-300";
      default:
        return "border-slate-700 bg-slate-800 text-slate-300";
    }
  };

  const getPriorityColor = (priority: string) => {
    switch ((priority || "").toLowerCase()) {
      case "low":
        return "border-slate-700 bg-slate-800 text-slate-300";
      case "medium":
        return "border-blue-800 bg-blue-900/30 text-blue-300";
      case "high":
        return "border-orange-800 bg-orange-900/30 text-orange-300";
      case "urgent":
        return "border-red-800 bg-red-900/30 text-red-300";
      default:
        return "border-slate-700 bg-slate-800 text-slate-300";
    }
  };

  const formatStatusLabel = (status: string) => {
    const normalized = normalizeStatus(status);

    switch (normalized) {
      case "todo":
        return "Todo";
      case "inprogress":
        return "In Progress";
      case "done":
        return "Done";
      default:
        return status || "Todo";
    }
  };

  const formatDateTime = (value: string) => {
    if (!value) return "";
    return new Date(value).toLocaleString();
  };

  const formatFileSize = (bytes?: number) => {
    if (!bytes) return "Unknown size";

    const sizes = ["B", "KB", "MB", "GB"];
    let i = 0;
    let value = bytes;

    while (value >= 1024 && i < sizes.length - 1) {
      value /= 1024;
      i++;
    }

    return `${value.toFixed(value >= 10 || i === 0 ? 0 : 1)} ${sizes[i]}`;
  };

  const getAttachmentName = (attachment: any) =>
    attachment?.fileName ||
    attachment?.originalname ||
    attachment?.filename ||
    attachment?.name ||
    "Untitled file";

  const getAttachmentUrl = (attachment: any) =>
    attachment?.url || attachment?.fileUrl || attachment?.secure_url || "#";

  const getAttachmentType = (attachment: any) =>
    attachment?.fileType || attachment?.mimetype || attachment?.type || "";

  const getAttachmentSize = (attachment: any) =>
    attachment?.size || attachment?.fileSize || 0;

  const getAttachmentIcon = (attachment: any) => {
    const fileType = getAttachmentType(attachment).toLowerCase();
    const fileName = getAttachmentName(attachment).toLowerCase();

    if (fileType.startsWith("image/")) return "🖼";
    if (fileType.includes("pdf") || fileName.endsWith(".pdf")) return "📄";
    if (
      fileType.includes("word") ||
      fileName.endsWith(".doc") ||
      fileName.endsWith(".docx")
    ) {
      return "📝";
    }
    if (
      fileType.includes("sheet") ||
      fileName.endsWith(".xls") ||
      fileName.endsWith(".xlsx")
    ) {
      return "📊";
    }
    if (
      fileType.includes("presentation") ||
      fileName.endsWith(".ppt") ||
      fileName.endsWith(".pptx")
    ) {
      return "📽";
    }
    if (fileType.includes("zip") || fileName.endsWith(".zip")) return "📦";
    if (fileType.includes("text") || fileName.endsWith(".txt")) return "📃";

    return "📁";
  };

  const isPreviewable = (attachment: any) => {
    const fileType = getAttachmentType(attachment).toLowerCase();
    const fileName = getAttachmentName(attachment).toLowerCase();

    return (
      fileType.startsWith("image/") ||
      fileType.includes("pdf") ||
      fileName.endsWith(".pdf")
    );
  };

  const trimmedCommentText = commentText.trim();
  const trimmedEditingCommentText = editingCommentText.trim();
  const trimmedSubtaskTitle = subtaskTitle.trim();

  const completedSubtasksCount = subtasks.filter((subtask) =>
    Boolean(subtask.isCompleted),
  ).length;

  const totalSubtasksCount = subtasks.length;

  const progressPercentage =
    totalSubtasksCount > 0
      ? Math.round((completedSubtasksCount / totalSubtasksCount) * 100)
      : 0;

  const loadMembers = async () => {
    try {
      if (!workspaceId || !projectId) return;

      setIsMembersLoading(true);

      const res = await projectMemberService.getProjectMembers(
        workspaceId,
        projectId,
      );

      setMembers(Array.isArray(res?.data) ? res.data : []);
    } catch (err: any) {
      console.error(
        "Failed to load project members:",
        err?.response?.data || err,
      );
      toast.error("Failed to load project members");
    } finally {
      setIsMembersLoading(false);
    }
  };

  const loadComments = async () => {
    try {
      if (!workspaceId || !projectId || !taskId) return;

      const res = await taskCommentService.getComments(
        workspaceId,
        projectId,
        taskId,
      );

      setComments(Array.isArray(res?.data) ? res.data : []);
    } catch (err: any) {
      console.error("Failed to load comments:", err?.response?.data || err);
      toast.error("Failed to load comments");
    }
  };

  const loadSubTasks = async () => {
    try {
      if (!workspaceId || !projectId || !taskId) return;

      const res = await subTaskService.getSubTasks(
        workspaceId,
        projectId,
        taskId,
      );

      setSubtasks(Array.isArray(res?.data) ? res.data : []);
    } catch (err: any) {
      console.error("Failed to load subtasks:", err?.response?.data || err);
      toast.error("Failed to load subtasks");
    }
  };

  const loadTask = async () => {
    try {
      setIsLoading(true);
      setError("");

      if (!workspaceId || !projectId || !taskId) {
        setError("Missing task route information");
        return;
      }

      const res = await taskService.getTaskById(workspaceId, projectId, taskId);
      const fetchedTask = res?.data || null;

      setTaskItem(fetchedTask);

      const task = fetchedTask?.task || fetchedTask;
      setStatusValue(toBackendStatus(task?.status || "todo"));
      setSelectedAssignee(task?.assignedTo?._id || task?.assignedTo?.id || "");
      setAttachments(Array.isArray(task?.attachments) ? task.attachments : []);

      await Promise.all([loadMembers(), loadComments(), loadSubTasks()]);
    } catch (err: any) {
      console.error("Failed to load task:", err?.response?.data || err);
      const message =
        err?.response?.data?.message || "Failed to load task details";
      setError(message);
      toast.error(message);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (workspaceId && projectId && taskId) {
      loadTask();
    }
  }, [workspaceId, projectId, taskId]);

  const handleStatusUpdate = async () => {
    try {
      if (!workspaceId || !projectId || !taskId) {
        toast.error("Missing task information");
        return;
      }

      setIsUpdating(true);

      await taskService.updateTask(workspaceId, projectId, taskId, {
        status: statusValue,
      });

      setTaskItem((prev: any) => {
        if (!prev) return prev;
        const currentTask = prev.task || prev;
        const updatedTask = {
          ...currentTask,
          status: statusValue,
        };

        return prev.task ? { ...prev, task: updatedTask } : updatedTask;
      });

      toast.success("Task status updated successfully");
    } catch (err: any) {
      console.error("Update task error:", err?.response?.data || err);
      const message =
        err?.response?.data?.errors?.[0]?.msg ||
        err?.response?.data?.message ||
        "Failed to update task status";
      toast.error(message);
    } finally {
      setIsUpdating(false);
    }
  };

  const handleAssigneeUpdate = async () => {
    try {
      if (!workspaceId || !projectId || !taskId) {
        toast.error("Missing task information");
        return;
      }

      setIsAssigneeUpdating(true);

      await taskService.updateTask(workspaceId, projectId, taskId, {
        assignedTo: selectedAssignee || null,
      });

      const selectedMember =
        members.find(
          (member: any) => getMemberValue(member) === selectedAssignee,
        ) || null;

      const selectedUser = selectedMember
        ? getMemberUser(selectedMember)
        : null;

      setTaskItem((prev: any) => {
        if (!prev) return prev;

        const currentTask = prev.task || prev;

        const updatedTask = {
          ...currentTask,
          assignedTo: selectedAssignee
            ? {
                _id: selectedUser?._id || selectedUser?.id || selectedAssignee,
                username:
                  selectedUser?.username ||
                  selectedUser?.fullName ||
                  selectedUser?.fullname ||
                  selectedUser?.name ||
                  "Unknown User",
                fullname:
                  selectedUser?.fullname ||
                  selectedUser?.fullName ||
                  selectedUser?.name ||
                  "",
                name: selectedUser?.name || "",
                email: selectedUser?.email || "",
              }
            : null,
        };

        return prev.task ? { ...prev, task: updatedTask } : updatedTask;
      });

      toast.success("Assignee updated successfully");
    } catch (err: any) {
      console.error("Update assignee error:", err?.response?.data || err);
      const message =
        err?.response?.data?.errors?.[0]?.msg ||
        err?.response?.data?.message ||
        "Failed to update assignee";
      toast.error(message);
    } finally {
      setIsAssigneeUpdating(false);
    }
  };

  const handleCreateComment = async () => {
    try {
      if (!workspaceId || !projectId || !taskId) {
        toast.error("Missing task information");
        return;
      }

      if (!trimmedCommentText) {
        toast.error("Comment cannot be empty");
        return;
      }

      setIsCommentSubmitting(true);

      await taskCommentService.createComment(workspaceId, projectId, taskId, {
        content: trimmedCommentText,
      });

      setCommentText("");
      toast.success("Comment added successfully");
      await loadComments();
    } catch (err: any) {
      console.error("Create comment error:", err?.response?.data || err);
      const message =
        err?.response?.data?.errors?.[0]?.msg ||
        err?.response?.data?.message ||
        "Failed to add comment";
      toast.error(message);
    } finally {
      setIsCommentSubmitting(false);
    }
  };

  const startEditingComment = (comment: any) => {
    setEditingCommentId(comment._id);
    setEditingCommentText(comment.content || "");
  };

  const cancelEditingComment = () => {
    setEditingCommentId(null);
    setEditingCommentText("");
  };

  const handleUpdateComment = async (commentId: string) => {
    try {
      if (!workspaceId || !projectId || !taskId || !commentId) {
        toast.error("Missing comment information");
        return;
      }

      if (!trimmedEditingCommentText) {
        toast.error("Comment cannot be empty");
        return;
      }

      setIsCommentUpdating(true);

      await taskCommentService.updateComment(
        workspaceId,
        projectId,
        taskId,
        commentId,
        {
          content: trimmedEditingCommentText,
        },
      );

      setComments((prev) =>
        prev.map((item: any) => {
          const comment = item.comment || item;
          if (comment._id !== commentId) return item;

          if (item.comment) {
            return {
              ...item,
              comment: {
                ...item.comment,
                content: trimmedEditingCommentText,
              },
            };
          }

          return {
            ...item,
            content: trimmedEditingCommentText,
          };
        }),
      );

      toast.success("Comment updated successfully");
      cancelEditingComment();
      await loadComments();
    } catch (err: any) {
      console.error("Update comment error:", err?.response?.data || err);
      const message =
        err?.response?.data?.errors?.[0]?.msg ||
        err?.response?.data?.message ||
        "Failed to update comment";
      toast.error(message);
    } finally {
      setIsCommentUpdating(false);
    }
  };

  const handleDeleteComment = async (commentId: string) => {
    if (!workspaceId || !projectId || !taskId || !commentId) {
      toast.error("Missing comment information");
      return;
    }

    const previousComments = comments;
    setDeletingCommentId(commentId);

    setComments((prev) =>
      prev.filter((item: any) => {
        const comment = item.comment || item;
        return comment._id !== commentId;
      }),
    );

    try {
      await taskCommentService.deleteComment(
        workspaceId,
        projectId,
        taskId,
        commentId,
      );

      if (editingCommentId === commentId) {
        cancelEditingComment();
      }

      toast.success("Comment deleted successfully");
    } catch (err: any) {
      setComments(previousComments);
      console.error("Delete comment error:", err?.response?.data || err);

      const message =
        err?.response?.data?.errors?.[0]?.msg ||
        err?.response?.data?.message ||
        "Failed to delete comment";

      toast.error(message);
    } finally {
      setDeletingCommentId(null);
    }
  };

  const handleCreateSubTask = async () => {
    try {
      if (!workspaceId || !projectId || !taskId) {
        toast.error("Missing task information");
        return;
      }

      if (!trimmedSubtaskTitle) {
        toast.error("Subtask title cannot be empty");
        return;
      }

      setIsSubtaskSubmitting(true);

      await subTaskService.createSubTask(workspaceId, projectId, taskId, {
        title: trimmedSubtaskTitle,
      });

      setSubtaskTitle("");
      toast.success("Subtask created successfully");
      await loadSubTasks();
    } catch (err: any) {
      console.error("Create subtask error:", err?.response?.data || err);
      const message =
        err?.response?.data?.errors?.[0]?.msg ||
        err?.response?.data?.message ||
        "Failed to create subtask";
      toast.error(message);
    } finally {
      setIsSubtaskSubmitting(false);
    }
  };

  const uploadAttachmentFile = async (file: File) => {
    try {
      if (!workspaceId || !projectId || !taskId) {
        toast.error("Missing task information");
        return;
      }

      setIsAttachmentUploading(true);
      setUploadProgress(0);

      const formData = new FormData();
      formData.append("attachments", file);

      await taskService.updateTask(workspaceId, projectId, taskId, formData, {
        onUploadProgress: (progressEvent: any) => {
          const total = progressEvent.total || file.size || 1;
          const percent = Math.round((progressEvent.loaded * 100) / total);
          setUploadProgress(percent);
        },
      });

      toast.success("Attachment uploaded successfully");
      await loadTask();
    } catch (err: any) {
      console.error("Upload attachment error:", err);

      const message =
        err?.response?.data?.errors?.[0]?.msg ||
        err?.response?.data?.message ||
        "Failed to upload attachment";

      toast.error(message);
    } finally {
      setIsAttachmentUploading(false);
      setUploadProgress(0);

      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const handleAttachmentSelect = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    await uploadAttachmentFile(file);
  };

  const handleAttachmentDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDraggingAttachment(true);
  };

  const handleAttachmentDragLeave = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDraggingAttachment(false);
  };

  const handleAttachmentDrop = async (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDraggingAttachment(false);

    const file = e.dataTransfer.files?.[0];
    if (!file) return;

    await uploadAttachmentFile(file);
  };

  const handleDeleteAttachment = async (attachmentId: string) => {
    if (!workspaceId || !projectId || !taskId || !attachmentId) {
      toast.error("Missing attachment information");
      return;
    }

    try {
      setDeletingAttachmentId(attachmentId);

      await taskAttachmentService.deleteAttachment(
        workspaceId,
        projectId,
        taskId,
        attachmentId,
      );

      toast.success("Attachment deleted successfully");
      await loadTask();
    } catch (err: any) {
      console.error("Delete attachment error:", err?.response?.data || err);

      const message =
        err?.response?.data?.errors?.[0]?.msg ||
        err?.response?.data?.message ||
        "Failed to delete attachment";

      toast.error(message);
    } finally {
      setDeletingAttachmentId(null);
    }
  };

  const handleSubtaskKeyDown = async (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && trimmedSubtaskTitle && !isSubtaskSubmitting) {
      e.preventDefault();
      await handleCreateSubTask();
    }
  };

  const handleCommentKeyDown = async (
    e: KeyboardEvent<HTMLTextAreaElement>,
  ) => {
    if (
      e.key === "Enter" &&
      !e.shiftKey &&
      trimmedCommentText &&
      !isCommentSubmitting
    ) {
      e.preventDefault();
      await handleCreateComment();
    }
  };

  const handleEditCommentKeyDown = async (
    e: KeyboardEvent<HTMLTextAreaElement>,
    commentId: string,
  ) => {
    if (
      e.key === "Enter" &&
      !e.shiftKey &&
      trimmedEditingCommentText &&
      !isCommentUpdating
    ) {
      e.preventDefault();
      await handleUpdateComment(commentId);
    }
  };

  const handleToggleSubTask = async (subtask: any) => {
    if (!workspaceId || !projectId || !taskId || !subtask?._id) {
      toast.error("Missing subtask information");
      return;
    }

    const nextValue = !subtask.isCompleted;

    setSubtasks((prev) =>
      prev.map((item) =>
        item._id === subtask._id ? { ...item, isCompleted: nextValue } : item,
      ),
    );

    try {
      await subTaskService.updateSubTask(
        workspaceId,
        projectId,
        taskId,
        subtask._id,
        { isCompleted: nextValue },
      );
    } catch (err: any) {
      setSubtasks((prev) =>
        prev.map((item) =>
          item._id === subtask._id
            ? { ...item, isCompleted: subtask.isCompleted }
            : item,
        ),
      );

      console.error("Toggle subtask error:", err?.response?.data || err);

      const message =
        err?.response?.data?.errors?.[0]?.msg ||
        err?.response?.data?.message ||
        "Failed to update subtask";

      toast.error(message);
    }
  };

  const handleDeleteSubTask = async (subtaskId: string) => {
    if (!workspaceId || !projectId || !taskId || !subtaskId) {
      toast.error("Missing subtask information");
      return;
    }

    const previousSubtasks = subtasks;
    setSubtasks((prev) => prev.filter((item) => item._id !== subtaskId));

    try {
      await subTaskService.deleteSubTask(
        workspaceId,
        projectId,
        taskId,
        subtaskId,
      );

      toast.success("Subtask deleted successfully");
    } catch (err: any) {
      setSubtasks(previousSubtasks);
      console.error("Delete subtask error:", err?.response?.data || err);

      const message =
        err?.response?.data?.errors?.[0]?.msg ||
        err?.response?.data?.message ||
        "Failed to delete subtask";

      toast.error(message);
    }
  };

  const getMemberUser = (item: any) => item?.user || item;

  const getMemberLabel = (item: any) => {
    const user = getMemberUser(item);
    return (
      user?.fullName ||
      user?.fullname ||
      user?.name ||
      user?.username ||
      user?.email ||
      "Unknown Member"
    );
  };

  const getMemberValue = (item: any) => {
    const user = getMemberUser(item);
    return user?._id || user?.id || "";
  };

  const orderedMembers = useMemo(() => {
    const priority: Record<string, number> = {
      admin: 1,
      member: 2,
    };

    return [...members].sort((a: any, b: any) => {
      const roleA = a?.role || "member";
      const roleB = b?.role || "member";

      if ((priority[roleA] || 99) !== (priority[roleB] || 99)) {
        return (priority[roleA] || 99) - (priority[roleB] || 99);
      }

      const dateA = a?.createdAt ? new Date(a.createdAt).getTime() : 0;
      const dateB = b?.createdAt ? new Date(b.createdAt).getTime() : 0;

      return dateA - dateB;
    });
  }, [members]);

  const currentUserId = currentUser?._id || currentUser?.id || "";
  const currentMembership = members.find((item: any) => {
    const user = getMemberUser(item);
    const memberId = user?._id || user?.id || "";
    return Boolean(currentUserId && memberId && memberId === currentUserId);
  });
  const isProjectAdmin = (currentMembership?.role || "") === "admin";

  const handleDeleteTask = async () => {
    if (
      !isProjectAdmin ||
      isDeletingTask ||
      !workspaceId ||
      !projectId ||
      !taskId
    ) {
      return;
    }

    const shouldDelete = window.confirm(
      "Delete this task? This action cannot be undone.",
    );

    if (!shouldDelete) return;

    try {
      setIsDeletingTask(true);
      await taskService.deleteTask(workspaceId, projectId, taskId);
      toast.success("Task deleted successfully");
      router.push(`/workspaces/${workspaceId}/projects/${projectId}`);
    } catch (err: any) {
      console.error("Delete task error:", err?.response?.data || err);
      const message =
        err?.response?.data?.errors?.[0]?.msg ||
        err?.response?.data?.message ||
        "Failed to delete task";
      toast.error(message);
    } finally {
      setIsDeletingTask(false);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-4 text-white">
        <h1 className="text-3xl font-semibold">Task</h1>
        <p className="text-slate-400">Loading task details...</p>
      </div>
    );
  }

  if (error || !taskItem) {
    return (
      <div className="space-y-4 text-white">
        <h1 className="text-3xl font-semibold">Task</h1>
        <p className="text-red-400">{error || "Task not found"}</p>

        <div className="flex gap-3">
          <Link
            href="/tasks"
            className="inline-flex rounded-xl border border-slate-700 px-4 py-2 text-sm text-slate-200 transition hover:bg-slate-800"
          >
            Back to Tasks
          </Link>

          {projectId ? (
            <Link
              href={`/workspaces/${workspaceId}/projects/${projectId}`}
              className="inline-flex rounded-xl border border-slate-700 px-4 py-2 text-sm text-slate-200 transition hover:bg-slate-800"
            >
              Back to Project
            </Link>
          ) : null}
        </div>
      </div>
    );
  }

  const task = taskItem.task || taskItem;
  const currentAssigneeId = task.assignedTo?._id || task.assignedTo?.id || "";
  const hasAssigneeChanged = selectedAssignee !== currentAssigneeId;

  return (
    <div className="space-y-6 text-white">
      <div className="rounded-3xl border border-slate-800 bg-slate-900/70 p-5 sm:p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.28em] text-cyan-400">
              Task Details
            </p>

            <h1 className="mt-2 text-3xl font-semibold tracking-tight text-white sm:text-4xl">
              {task.title || "Untitled Task"}
            </h1>

            <p className="mt-2 max-w-xl text-sm leading-6 text-slate-400">
              Track progress, manage ownership, and collaborate on updates.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <Link
              href={`/workspaces/${workspaceId}/projects/${projectId}`}
              className="inline-flex rounded-xl border border-slate-700 px-4 py-2.5 text-sm font-medium text-slate-200 transition hover:bg-slate-800"
            >
              Back to Project
            </Link>

            {isProjectAdmin ? (
              <button
                type="button"
                onClick={handleDeleteTask}
                disabled={isDeletingTask}
                className="inline-flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 transition hover:border-red-500/40 hover:bg-red-500/10 hover:text-red-400 disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-700 dark:bg-slate-900/80 dark:text-slate-200 dark:hover:text-red-300"
              >
                <Trash2 className="size-4" />
                {isDeletingTask ? "Deleting..." : "Delete Task"}
              </button>
            ) : null}
          </div>
        </div>

        <div className="mt-5 border-t border-slate-800 pt-5">
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <div className="rounded-2xl border border-slate-800 bg-zinc-950/60 p-4">
              <p className="text-sm text-slate-400">Task Title</p>
              <p className="mt-2 text-lg font-semibold">
                {task.title || "Untitled Task"}
              </p>
            </div>

            <div className="rounded-2xl border border-slate-800 bg-zinc-950/60 p-4">
              <p className="text-sm text-slate-400">Status</p>
              <p className="mt-2 text-lg font-semibold">
                {formatStatusLabel(task.status)}
              </p>
            </div>

            <div className="rounded-2xl border border-slate-800 bg-zinc-950/60 p-4">
              <p className="text-sm text-slate-400">Priority</p>
              <p className="mt-2 text-lg font-semibold capitalize">
                {task.priority || "medium"}
              </p>
            </div>

            <div className="rounded-2xl border border-slate-800 bg-zinc-950/60 p-4">
              <p className="text-sm text-slate-400">Assignee</p>
              <p className="mt-2 text-lg font-semibold">
                {task.assignedTo?.username ||
                  task.assignedTo?.fullName ||
                  task.assignedTo?.fullname ||
                  task.assignedTo?.name ||
                  "Unassigned"}
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid gap-4 xl:grid-cols-3">
        <div className="xl:col-span-2 space-y-4">
          <div className="rounded-3xl border border-slate-800 bg-slate-900/70 p-6">
            <div className="flex flex-wrap items-center gap-3">
              <span
                className={`rounded-full border px-3 py-1 text-xs font-medium ${getStatusColor(task.status || "todo")}`}
              >
                {formatStatusLabel(task.status)}
              </span>

              <span
                className={`rounded-full border px-3 py-1 text-xs font-medium capitalize ${getPriorityColor(task.priority || "medium")}`}
              >
                {task.priority || "medium"}
              </span>
            </div>

            <div className="mt-6">
              <h2 className="text-xl font-semibold text-white">Description</h2>
              <p className="mt-3 text-sm leading-7 text-slate-400">
                {task.description || "No description available for this task."}
              </p>
            </div>

            <div className="mt-5 rounded-2xl border border-slate-800 bg-zinc-950/60 p-5">
              <h3 className="text-lg font-semibold text-white">
                Update Status
              </h3>
              <p className="mt-2 text-sm text-slate-400">
                Move this task across the Kanban workflow.
              </p>

              <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center">
                <select
                  value={statusValue}
                  onChange={(e) => setStatusValue(e.target.value)}
                  className="rounded-xl border border-slate-700 bg-slate-900 px-4 py-2 pr-10 text-sm text-white outline-none"
                >
                  <option value="todo">Todo</option>
                  <option value="in_progress">In Progress</option>
                  <option value="done">Done</option>
                </select>

                <button
                  onClick={handleStatusUpdate}
                  disabled={isUpdating}
                  className="rounded-xl bg-cyan-500 px-4 py-2 text-sm font-medium text-white transition hover:bg-cyan-400 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isUpdating ? "Updating..." : "Save Status"}
                </button>
              </div>
            </div>

            <div className="mt-5 rounded-2xl border border-slate-800 bg-zinc-950/60 p-5">
              <h3 className="text-lg font-semibold text-white">Assignee</h3>
              <p className="mt-2 text-sm text-slate-400">
                Assign this task to a project member.
              </p>

              <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center">
                <select
                  value={selectedAssignee}
                  onChange={(e) => setSelectedAssignee(e.target.value)}
                  disabled={isMembersLoading}
                  className="rounded-xl border border-slate-700 bg-slate-900 px-4 py-2 pr-10 text-sm text-white outline-none disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <option value="">Unassigned</option>
                  {orderedMembers.map((member: any, index: number) => (
                    <option
                      key={getMemberValue(member) || index}
                      value={getMemberValue(member)}
                    >
                      {getMemberLabel(member)}
                    </option>
                  ))}
                </select>

                <button
                  onClick={handleAssigneeUpdate}
                  disabled={
                    isAssigneeUpdating ||
                    isMembersLoading ||
                    !hasAssigneeChanged
                  }
                  className="rounded-xl bg-cyan-500 px-4 py-2 text-sm font-medium text-white transition hover:bg-cyan-400 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isAssigneeUpdating ? "Saving..." : "Save Assignee"}
                </button>
              </div>

              <p className="mt-2 text-xs text-slate-500">
                Select a different project member to update the assignee.
              </p>
            </div>

            <div className="mt-5 rounded-2xl border border-slate-800 bg-zinc-950/60 p-5">
              <h3 className="text-lg font-semibold text-white">Comments</h3>
              <p className="mt-2 text-sm text-slate-400">
                Discuss updates and collaboration on this task.
              </p>

              <div className="mt-4 space-y-3">
                <textarea
                  value={commentText}
                  onChange={(e) => setCommentText(e.target.value)}
                  onKeyDown={handleCommentKeyDown}
                  placeholder="Write a comment..."
                  rows={4}
                  className="w-full rounded-2xl border border-slate-700 bg-slate-900 px-4 py-3 text-sm text-white outline-none placeholder:text-slate-500"
                />

                <button
                  onClick={handleCreateComment}
                  disabled={isCommentSubmitting || !trimmedCommentText}
                  className="rounded-xl bg-cyan-500 px-4 py-2 text-sm font-medium text-white transition hover:bg-cyan-400 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isCommentSubmitting ? "Posting..." : "Add Comment"}
                </button>
              </div>

              <div className="mt-6 space-y-4">
                {comments.length === 0 ? (
                  <div className="rounded-xl border border-dashed border-slate-700 p-4 text-sm text-slate-500">
                    No comments yet
                  </div>
                ) : (
                  comments.map((item: any, index: number) => {
                    const comment = item.comment || item;
                    const author =
                      comment.author ||
                      comment.user ||
                      comment.createdBy ||
                      null;
                    const isEditing = editingCommentId === comment._id;
                    const isDeleting = deletingCommentId === comment._id;
                    const authorId = author?._id || author?.id || "";
                    const currentUserId =
                      currentUser?._id || currentUser?.id || "";
                    const isCommentOwner = Boolean(
                      authorId && currentUserId && authorId === currentUserId,
                    );

                    const wasEdited =
                      comment.updatedAt &&
                      comment.createdAt &&
                      new Date(comment.updatedAt).getTime() >
                        new Date(comment.createdAt).getTime();

                    return (
                      <div
                        key={comment._id || index}
                        className="rounded-2xl border border-slate-800 bg-slate-950/70 p-4"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="text-sm font-semibold text-white">
                              {author?.fullName ||
                                author?.fullname ||
                                author?.name ||
                                author?.username ||
                                "Unknown User"}
                            </p>
                            <p className="mt-1 text-xs text-slate-500">
                              {formatDateTime(
                                comment.updatedAt || comment.createdAt || "",
                              )}
                              {wasEdited ? " • edited" : ""}
                            </p>
                          </div>

                          {!isEditing && isCommentOwner ? (
                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => startEditingComment(comment)}
                                className="rounded-lg border border-slate-700 px-3 py-1 text-xs text-slate-300 transition hover:bg-slate-800"
                              >
                                Edit
                              </button>

                              <button
                                onClick={() => handleDeleteComment(comment._id)}
                                disabled={isDeleting}
                                className="rounded-lg border border-red-900/50 px-3 py-1 text-xs text-red-400 transition hover:bg-red-950/30 disabled:cursor-not-allowed disabled:opacity-60"
                              >
                                {isDeleting ? "Deleting..." : "Delete"}
                              </button>
                            </div>
                          ) : null}
                        </div>

                        {isEditing ? (
                          <div className="mt-3 space-y-3">
                            <textarea
                              value={editingCommentText}
                              onChange={(e) =>
                                setEditingCommentText(e.target.value)
                              }
                              onKeyDown={(e) =>
                                handleEditCommentKeyDown(e, comment._id)
                              }
                              rows={4}
                              className="w-full rounded-2xl border border-slate-700 bg-slate-900 px-4 py-3 text-sm text-white outline-none placeholder:text-slate-500"
                            />

                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => handleUpdateComment(comment._id)}
                                disabled={
                                  isCommentUpdating ||
                                  !trimmedEditingCommentText
                                }
                                className="rounded-lg bg-cyan-500 px-4 py-2 text-sm font-medium text-white transition hover:bg-cyan-400 disabled:cursor-not-allowed disabled:opacity-60"
                              >
                                {isCommentUpdating ? "Saving..." : "Save"}
                              </button>

                              <button
                                onClick={cancelEditingComment}
                                disabled={isCommentUpdating}
                                className="rounded-lg border border-slate-700 px-4 py-2 text-sm text-slate-300 transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
                              >
                                Cancel
                              </button>
                            </div>
                          </div>
                        ) : (
                          <p className="mt-3 text-sm leading-6 text-slate-300">
                            {comment.content || "No content"}
                          </p>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            <div className="mt-8 grid gap-4 md:grid-cols-2">
              <div className="rounded-2xl border border-slate-800 bg-zinc-950/60 p-5">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3 className="text-lg font-semibold text-white">
                      Subtasks
                      {totalSubtasksCount > 0 ? (
                        <span className="ml-2 text-sm font-medium text-slate-400">
                          ({completedSubtasksCount}/{totalSubtasksCount}{" "}
                          completed)
                        </span>
                      ) : null}
                    </h3>
                    <p className="mt-2 text-sm text-slate-400">
                      Break this task into smaller steps.
                    </p>
                  </div>
                </div>

                <div className="mt-4 space-y-3">
                  <input
                    type="text"
                    value={subtaskTitle}
                    onChange={(e) => setSubtaskTitle(e.target.value)}
                    onKeyDown={handleSubtaskKeyDown}
                    placeholder="Add a new subtask..."
                    className="w-full rounded-xl border border-slate-700 bg-slate-900 px-4 py-2 text-sm text-white outline-none placeholder:text-slate-500"
                  />

                  <button
                    onClick={handleCreateSubTask}
                    disabled={isSubtaskSubmitting || !trimmedSubtaskTitle}
                    className="rounded-xl bg-cyan-500 px-4 py-2 text-sm font-medium text-white transition hover:bg-cyan-400 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {isSubtaskSubmitting ? "Adding..." : "Add Subtask"}
                  </button>
                </div>

                <div className="mt-6 space-y-3">
                  {subtasks.length === 0 ? (
                    <div className="rounded-xl border border-dashed border-slate-700 p-4 text-sm text-slate-500">
                      No subtasks yet
                    </div>
                  ) : (
                    subtasks.map((subtask: any, index: number) => (
                      <div
                        key={subtask._id || index}
                        className="flex items-center justify-between gap-3 rounded-xl border border-slate-800 bg-slate-950/70 p-3"
                      >
                        <div className="flex min-w-0 flex-1 items-center gap-3">
                          <input
                            type="checkbox"
                            checked={Boolean(subtask.isCompleted)}
                            onChange={() => handleToggleSubTask(subtask)}
                            className="h-4 w-4 rounded border-slate-600 bg-slate-900"
                          />

                          <p
                            className={`truncate text-sm transition ${
                              subtask.isCompleted
                                ? "text-slate-500 line-through opacity-70"
                                : "text-slate-200"
                            }`}
                          >
                            {subtask.title}
                          </p>
                        </div>

                        <button
                          onClick={() => handleDeleteSubTask(subtask._id)}
                          className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-red-900/50 text-sm text-red-400 transition hover:bg-red-950/30"
                          title="Delete subtask"
                        >
                          🗑
                        </button>
                      </div>
                    ))
                  )}
                </div>
              </div>

              <div
                onDragOver={handleAttachmentDragOver}
                onDragLeave={handleAttachmentDragLeave}
                onDrop={handleAttachmentDrop}
                className={`rounded-2xl border p-5 transition ${
                  isDraggingAttachment
                    ? "border-cyan-400 bg-cyan-500/10"
                    : "border-slate-800 bg-zinc-950/60"
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3 className="text-lg font-semibold text-white">
                      Attachments
                    </h3>
                    <p className="mt-2 text-sm text-slate-400">
                      Upload and manage files related to this task.
                    </p>
                  </div>

                  <input
                    ref={fileInputRef}
                    type="file"
                    className="hidden"
                    onChange={handleAttachmentSelect}
                  />

                  <button
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isAttachmentUploading}
                    className="rounded-xl bg-cyan-500 px-4 py-2 text-sm font-medium text-white transition hover:bg-cyan-400 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {isAttachmentUploading ? "Uploading..." : "Upload"}
                  </button>
                </div>

                {isAttachmentUploading && (
                  <div className="mb-4 mt-4">
                    <div className="mb-1 flex justify-between text-xs text-slate-400">
                      <span>Uploading file...</span>
                      <span>{uploadProgress}%</span>
                    </div>

                    <div className="h-2 w-full overflow-hidden rounded bg-slate-800">
                      <div
                        className="h-full bg-cyan-400 transition-all"
                        style={{ width: `${uploadProgress}%` }}
                      />
                    </div>
                  </div>
                )}

                <div className="mt-6 space-y-3">
                  {attachments.length === 0 ? (
                    <div
                      className={`rounded-xl border border-dashed p-6 text-center text-sm transition ${
                        isDraggingAttachment
                          ? "border-cyan-400 bg-cyan-500/10 text-cyan-300"
                          : "border-slate-700 text-slate-500"
                      }`}
                    >
                      {isAttachmentUploading
                        ? "Uploading file..."
                        : isDraggingAttachment
                          ? "Drop file here to upload"
                          : "No attachments yet. Drag and drop a file here, or click Upload."}
                    </div>
                  ) : (
                    attachments.map((attachment: any, index: number) => {
                      const attachmentId = String(
                        attachment?._id || attachment?.id || index,
                      );
                      const fileName = getAttachmentName(attachment);
                      const fileUrl = getAttachmentUrl(attachment);
                      const fileType = getAttachmentType(attachment);
                      const fileSize = formatFileSize(
                        getAttachmentSize(attachment),
                      );
                      const uploadedBy =
                        attachment?.uploadedBy?.fullName ||
                        attachment?.uploadedBy?.fullname ||
                        attachment?.uploadedBy?.username ||
                        attachment?.uploadedBy?.name ||
                        "";

                      return (
                        <div
                          key={attachmentId}
                          className="rounded-xl border border-slate-800 bg-slate-950/70 p-4"
                        >
                          <div className="flex flex-col gap-4">
                            <div className="flex items-start gap-3">
                              <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-800 bg-slate-900 text-lg">
                                {getAttachmentIcon(attachment)}
                              </div>

                              <div>
                                <p className="truncate text-sm font-semibold text-white">
                                  {fileName}
                                </p>
                                <p className="mt-1 text-xs text-slate-500">
                                  {fileSize}
                                  {fileType ? ` • ${fileType}` : ""}
                                  {uploadedBy ? ` • by ${uploadedBy}` : ""}
                                  {attachment?.createdAt
                                    ? ` • ${formatDateTime(attachment.createdAt)}`
                                    : ""}
                                </p>
                              </div>
                            </div>

                            <div className="flex flex-wrap items-center gap-2">
                              {isPreviewable(attachment) ? (
                                <a
                                  href={fileUrl}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="rounded-lg border border-slate-700 px-3 py-1.5 text-xs text-slate-300 transition hover:bg-slate-800"
                                >
                                  View
                                </a>
                              ) : null}

                              <a
                                href={fileUrl}
                                target="_blank"
                                rel="noreferrer"
                                download
                                className="rounded-lg border border-slate-700 px-3 py-1.5 text-xs text-slate-300 transition hover:bg-slate-800"
                              >
                                Download
                              </a>

                              <button
                                onClick={() =>
                                  handleDeleteAttachment(attachmentId)
                                }
                                disabled={deletingAttachmentId === attachmentId}
                                className="rounded-lg border border-red-900/50 px-3 py-1.5 text-xs text-red-400 transition hover:bg-red-950/30 disabled:cursor-not-allowed disabled:opacity-60"
                              >
                                {deletingAttachmentId === attachmentId
                                  ? "Deleting..."
                                  : "Delete"}
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <div className="rounded-3xl border border-slate-800 bg-slate-900/70 p-5">
            <h3 className="text-lg font-semibold text-white">Overview</h3>

            <div className="mt-5 space-y-4 text-sm">
              <div className="flex items-start justify-between gap-4 border-b border-slate-800 pb-3">
                <span className="text-slate-500">Current Status</span>
                <span className="font-medium text-white">
                  {formatStatusLabel(task.status)}
                </span>
              </div>

              <div className="flex items-start justify-between gap-4 border-b border-slate-800 pb-3">
                <span className="text-slate-500">Priority Level</span>
                <span className="font-medium text-white capitalize">
                  {task.priority || "Medium"}
                </span>
              </div>

              <div className="flex items-start justify-between gap-4 border-b border-slate-800 pb-3">
                <span className="text-slate-500">Assigned To</span>
                <span className="text-right font-medium text-white">
                  {task.assignedTo?.username ||
                    task.assignedTo?.fullName ||
                    task.assignedTo?.fullname ||
                    task.assignedTo?.name ||
                    "Unassigned"}
                </span>
              </div>

              <div className="flex items-start justify-between gap-4 border-b border-slate-800 pb-3">
                <span className="text-slate-500">Created</span>
                <span className="text-right font-medium text-white">
                  {task.createdAt ? formatDateTime(task.createdAt) : "N/A"}
                </span>
              </div>

              <div className="flex items-start justify-between gap-4">
                <span className="text-slate-500">Last Updated</span>
                <span className="text-right font-medium text-white">
                  {task.updatedAt ? formatDateTime(task.updatedAt) : "N/A"}
                </span>
              </div>
            </div>
          </div>

          <div className="rounded-3xl border border-slate-800 bg-slate-900/70 p-5">
            <div className="flex items-center justify-between gap-3">
              <h3 className="text-lg font-semibold text-white">Progress</h3>
              <span className="text-sm font-semibold text-cyan-400">
                {progressPercentage}%
              </span>
            </div>

            <p className="mt-2 text-sm text-slate-400">
              Completion based on subtasks.
            </p>

            <div className="mt-5">
              <div className="h-2 w-full overflow-hidden rounded-full bg-slate-800">
                <div
                  className="h-full rounded-full bg-cyan-400 transition-all"
                  style={{ width: `${progressPercentage}%` }}
                />
              </div>

              <div className="mt-4 flex items-center justify-between text-sm">
                <span className="text-slate-500">Completed</span>
                <span className="font-medium text-white">
                  {completedSubtasksCount}/{totalSubtasksCount}
                </span>
              </div>
            </div>
          </div>

          <div className="rounded-3xl border border-slate-800 bg-slate-900/70 p-5">
            <h3 className="text-lg font-semibold text-white">Quick Summary</h3>
            <p className="mt-2 text-sm text-slate-400">
              A clean snapshot of this task for faster review.
            </p>

            <div className="mt-5 space-y-3">
              <div className="flex items-center justify-between rounded-xl border border-slate-800 bg-zinc-950/60 px-4 py-3 text-sm">
                <span className="text-slate-400">Comments</span>
                <span className="font-semibold text-white">
                  {comments.length}
                </span>
              </div>

              <div className="flex items-center justify-between rounded-xl border border-slate-800 bg-zinc-950/60 px-4 py-3 text-sm">
                <span className="text-slate-400">Subtasks</span>
                <span className="font-semibold text-white">
                  {subtasks.length}
                </span>
              </div>

              <div className="flex items-center justify-between rounded-xl border border-slate-800 bg-zinc-950/60 px-4 py-3 text-sm">
                <span className="text-slate-400">Attachments</span>
                <span className="font-semibold text-white">
                  {attachments.length}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
