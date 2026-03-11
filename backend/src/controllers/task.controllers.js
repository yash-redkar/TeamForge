import { User } from "../models/user.models.js";
import { Project } from "../models/project.models.js";
import { Tasks } from "../models/task.models.js";
import { SubTask } from "../models/subtask.models.js";
import { ProjectMember } from "../models/projectmember.models.js";
import { ApiResponse } from "../utils/api-response.js";
import { ApiError } from "../utils/api-error.js";
import { asyncHandler } from "../utils/async-handler.js";
import mongoose from "mongoose";
import { AvailableUserRole, UserRolesEnum } from "../utils/constants.js";
import { v2 as cloudinary } from "cloudinary";
import { createNotification } from "../utils/notification.js";
import { createActivityLog } from "../utils/activity-log.js";

cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
    secure: true,
});

// Helper: Check if user is a project member
const checkProjectMembership = async (userId, workspaceId, projectId) => {
    const member = await ProjectMember.findOne({
        user: userId,
        workspace: workspaceId,
        project: projectId,
    });
    if (!member) {
        throw new ApiError(403, "Access denied: Not a project member");
    }
    return member;
};

// Helper: Delete attachment from Cloudinary
const deleteFromCloudinary = async (public_id) => {
    try {
        if (!public_id) return;
        await cloudinary.uploader.destroy(public_id, { resource_type: "auto" });
    } catch (error) {
        console.error("Cloudinary deletion error:", error);
    }
};

// Helper: Delete multiple attachments
const deleteMultipleAttachments = async (attachments) => {
    if (!attachments || attachments.length === 0) return;
    await Promise.all(
        attachments.map((att) => deleteFromCloudinary(att.public_id)),
    );
};

const normalizeAssignedTo = (value) => {
    if (value === undefined) return undefined;
    if (value === null) return null;
    if (typeof value === "string") {
        const trimmed = value.trim().toLowerCase();
        if (trimmed === "" || trimmed === "null") return null;
    }

    return value;
};

const getTasks = asyncHandler(async (req, res) => {
    const { workspaceId, projectId } = req.params;
    const { status, assignedTo, mine, limit, cursor } = req.query;
    const userId = req.user._id;

    const project = await Project.findOne({
        _id: projectId,
        workspace: workspaceId,
    });

    if (!project)
        throw new ApiError(404, "Project not found in this workspace");

    await checkProjectMembership(userId, workspaceId, projectId);

    const pageSize = Math.min(parseInt(limit || "20", 10), 50);

    const query = {
        workspace: workspaceId,
        project: projectId,
    };

    // Filter by status (Kanban column)
    if (status) {
        query.status = status;
    }

    // Filter assigned user
    if (mine === "true") {
        query.assignedTo = userId;
    } else if (assignedTo) {
        query.assignedTo = assignedTo;
    }

    // Cursor pagination
    if (cursor) {
        const cursorDate = new Date(cursor);
        if (!isNaN(cursorDate.getTime())) {
            query.createdAt = { $lt: cursorDate };
        }
    }

    const tasks = await Tasks.find(query)
        .sort({ createdAt: -1 })
        .limit(pageSize)
        .populate("assignedTo", "username email avatar")
        .populate("assignedBy", "username email")
        .lean();

    tasks.reverse();

    const nextCursor = tasks.length ? tasks[0].createdAt.toISOString() : null;

    return res.status(200).json(
        new ApiResponse(
            200,
            {
                items: tasks,
                nextCursor,
                limit: pageSize,
            },
            "Tasks fetched successfully",
        ),
    );
});

const createTask = asyncHandler(async (req, res) => {
    const { title, description, projectId, assignedTo } = req.body;
    const { workspaceId, projectId: paramProjectId } = req.params;
    const userId = req.user._id;

    const normalizedAssignedTo = normalizeAssignedTo(assignedTo);

    const pId = projectId || paramProjectId;

    const project = await Project.findOne({ _id: pId, workspace: workspaceId });
    if (!project)
        throw new ApiError(404, "Project not found in this workspace");

    // Check membership
    await checkProjectMembership(userId, workspaceId, pId);

    // Validate assigned user if provided
    if (normalizedAssignedTo !== undefined && normalizedAssignedTo !== null) {
        const isMember = await ProjectMember.findOne({
            user: normalizedAssignedTo,
            workspace: workspaceId,
            project: pId,
        });

        if (!isMember) {
            throw new ApiError(400, "Assigned user is not a project member");
        }
    }

    const task = await Tasks.create({
        title,
        description,
        project: pId,
        workspace: workspaceId,
        assignedTo: normalizedAssignedTo ?? null,
        assignedBy: userId,
        attachments: req.uploadedFiles || [],
    });

    if (task.assignedTo) {
        await createNotification({
            user: task.assignedTo,
            workspace: task.workspace,
            project: task.project,
            task: task._id,
            type: "task_assigned",
            message: `You were assigned to task "${task.title}"`,
            meta: {
                assignedBy: req.user._id,
                taskId: task._id,
                taskTitle: task.title,
            },
        });
    }

    // ✅ realtime emit
    const io = req.app.get("io");
    io?.to(`project:${workspaceId}:${pId}`).emit("task_created", task);

    await createActivityLog({
        workspace: workspaceId,
        project: pId,
        task: task._id,
        actor: req.user._id,
        entityType: "task",
        action: "task_created",
        message: `Task "${task.title}" was created`,
        meta: {
            taskTitle: task.title,
        },
    });

    return res
        .status(201)
        .json(new ApiResponse(201, task, "Task created successfully"));
});

const getTaskById = asyncHandler(async (req, res) => {
    const { workspaceId, projectId, taskId } = req.params;
    const userId = req.user._id;

    // Check membership
    await checkProjectMembership(userId, workspaceId, projectId);

    const task = await Tasks.findOne({
         _id: taskId, project: projectId,
         workspace: workspaceId,
         })
        .populate("assignedTo", "username email avatar")
        .populate("assignedBy", "username email");

    if (!task) {
        throw new ApiError(404, "Task not found");
    }

    return res
        .status(200)
        .json(new ApiResponse(200, task, "Task fetched successfully"));
});

const updateTask = asyncHandler(async (req, res) => {
    const { workspaceId, projectId, taskId } = req.params;
    const { title, description, status, assignedTo } = req.body;
    const userId = req.user._id;

    const normalizedAssignedTo = normalizeAssignedTo(assignedTo);

    // Check membership
    await checkProjectMembership(userId, workspaceId, projectId);

    const task = await Tasks.findOne({
        _id: taskId,
        project: projectId,
        workspace: workspaceId,
    });

    if (!task) {
        throw new ApiError(404, "Task not found");
    }

    // store old values before update
    const oldAssignedTo = task.assignedTo ? task.assignedTo.toString() : null;
    const oldStatus = task.status;

    if (title) task.title = title;
    if (description) task.description = description;
    if (status) task.status = status;

    if (normalizedAssignedTo !== undefined) {
        if (normalizedAssignedTo === null) {
            task.assignedTo = null;
        } else {
            const isMember = await ProjectMember.findOne({
                user: normalizedAssignedTo,
                project: projectId,
                workspace: workspaceId,
            });

            if (!isMember) {
                throw new ApiError(
                    400,
                    "Assigned user is not a project member",
                );
            }

            task.assignedTo = normalizedAssignedTo;
        }
    }

    if (req.uploadedFiles && req.uploadedFiles.length > 0) {
        task.attachments.push(...req.uploadedFiles);
    }

    await task.save();

    const io = req.app.get("io");
    io?.to(`project:${workspaceId}:${projectId}`).emit("task_updated", task);

    // assignment notification + activity log
    const newAssignedTo = task.assignedTo ? task.assignedTo.toString() : null;

    if (newAssignedTo && newAssignedTo !== oldAssignedTo) {
        await createNotification({
            user: task.assignedTo,
            workspace: task.workspace,
            project: task.project,
            task: task._id,
            type: "task_assigned",
            message: `You were assigned to task "${task.title}"`,
            meta: {
                assignedBy: req.user._id,
                taskId: task._id,
                taskTitle: task.title,
            },
        });

        await createActivityLog({
            workspace: task.workspace,
            project: task.project,
            task: task._id,
            actor: req.user._id,
            entityType: "task",
            action: "task_assigned",
            message: `Task "${task.title}" was assigned`,
            meta: {
                assignedTo: task.assignedTo,
                previousAssignedTo: oldAssignedTo,
            },
        });
    }

    // status change activity log
    if (status && oldStatus !== task.status) {
        await createActivityLog({
            workspace: task.workspace,
            project: task.project,
            task: task._id,
            actor: req.user._id,
            entityType: "task",
            action: "task_status_changed",
            message: `Task "${task.title}" status changed from ${oldStatus} to ${task.status}`,
            meta: {
                oldStatus,
                newStatus: task.status,
            },
        });
    }

    return res
        .status(200)
        .json(new ApiResponse(200, task, "Task updated successfully"));
});

const deleteTask = asyncHandler(async (req, res) => {
    const { workspaceId, projectId, taskId } = req.params;
    const userId = req.user._id;

    const project = await Project.findOne({
        _id: projectId,
        workspace: workspaceId,
    });
    if (!project)
        throw new ApiError(404, "Project not found in this workspace");

    // Check membership
    const member = await checkProjectMembership(userId, workspaceId, projectId);

    // Only ADMIN can delete
    if (member.role !== UserRolesEnum.ADMIN) {
        throw new ApiError(403, "Only admins can delete tasks");
    }

    const task = await Tasks.findOne({
        _id: taskId,
        project: projectId,
        workspace: workspaceId,
    });
    if (!task) {
        throw new ApiError(404, "Task not found");
    }

    // Delete attachments FIRST (transaction safety)
    await deleteMultipleAttachments(task.attachments);

    // Delete associated subtasks
    await SubTask.deleteMany({ workspace: workspaceId, task: taskId });

    // Finally delete task
    await Tasks.findByIdAndDelete(taskId);

    const io = req.app.get("io");
    io?.to(`project:${workspaceId}:${projectId}`).emit("task_deleted", {
        taskId,
    });

    await createActivityLog({
        workspace: task.workspace,
        project: task.project,
        task: task._id,
        actor: req.user._id,
        entityType: "task",
        action: "task_deleted",
        message: `Task "${task.title}" was deleted`,
        meta: {
            taskTitle: task.title,
        },
    });

    return res
        .status(200)
        .json(new ApiResponse(200, null, "Task deleted successfully"));
});

const createSubTask = asyncHandler(async (req, res) => {
    const { workspaceId, projectId, taskId } = req.params;
    const { title } = req.body;
    const userId = req.user._id;

    // Check membership
    await checkProjectMembership(userId, workspaceId, projectId);

    const task = await Tasks.findOne({ _id: taskId, project: projectId, workspace: workspaceId });
    if (!task) {
        throw new ApiError(404, "Task not found");
    }

    const subtask = await SubTask.create({
        title,
        task: taskId,
        createdBy: userId,
        workspace: workspaceId,
    });

    const io = req.app.get("io");
    io?.to(`project:${workspaceId}:${projectId}`).emit("subtask_created", subtask);

    await createActivityLog({
        workspace: workspaceId,
        project: projectId,
        task: taskId,
        actor: req.user._id,
        entityType: "task",
        action: "subtask_created",
        message: `Subtask "${subtask.title}" was created`,
        meta: {
            subtaskId: subtask._id,
            subtaskTitle: subtask.title,
        },
    });

    return res
        .status(201)
        .json(new ApiResponse(201, subtask, "Subtask created successfully"));
});

const updateSubTask = asyncHandler(async (req, res) => {
    const { workspaceId, projectId, taskId, subtaskId } = req.params;
    const { title, isCompleted } = req.body;
    const userId = req.user._id;

    // Check membership
    await checkProjectMembership(userId, workspaceId, projectId);

    const task = await Tasks.findOne({ _id: taskId, project: projectId, workspace: workspaceId });
    if (!task) {
        throw new ApiError(404, "Task not found");
    }

    const subtask = await SubTask.findOne({ _id: subtaskId, task: taskId, workspace: workspaceId });
    if (!subtask) {
        throw new ApiError(404, "Subtask not found");
    }

    if (title) subtask.title = title;
    if (isCompleted !== undefined) subtask.isCompleted = isCompleted;

    await subtask.save();

    await createActivityLog({
        workspace: workspaceId,
        project: projectId,
        task: taskId,
        actor: req.user._id,
        entityType: "task",
        action: "subtask_updated",
        message: `Subtask "${subtask.title}" was updated`,
        meta: {
            subtaskId: subtask._id,
            subtaskTitle: subtask.title,
            isCompleted: subtask.isCompleted,
        },
    });

    return res
        .status(200)
        .json(new ApiResponse(200, subtask, "Subtask updated successfully"));
});

const deleteSubTask = asyncHandler(async (req, res) => {
    const { workspaceId, projectId, taskId, subtaskId } = req.params;
    const userId = req.user._id;

    // Check membership
    await checkProjectMembership(userId, workspaceId, projectId);

    const task = await Tasks.findOne({ _id: taskId, project: projectId, workspace: workspaceId });
    if (!task) {
        throw new ApiError(404, "Task not found");
    }

    const subtask = await SubTask.findOneAndDelete({
        _id: subtaskId,
        task: taskId,
        workspace: workspaceId,
    });
    if (!subtask) {
        throw new ApiError(404, "Subtask not found");
    }

    await createActivityLog({
        workspace: workspaceId,
        project: projectId,
        task: taskId,
        actor: req.user._id,
        entityType: "task",
        action: "subtask_deleted",
        message: `Subtask "${subtask.title}" was deleted`,
        meta: {
            subtaskId: subtask._id,
            subtaskTitle: subtask.title,
        },
    });

    return res
        .status(200)
        .json(new ApiResponse(200, null, "Subtask deleted successfully"));
});

// Professional: Delete specific attachment from task
const removeAttachment = asyncHandler(async (req, res) => {
    const { workspaceId, projectId, taskId, attachmentId } = req.params;
    const userId = req.user._id;

    // Check membership
    await checkProjectMembership(userId, workspaceId, projectId);

    const task = await Tasks.findOne({ _id: taskId, project: projectId, workspace: workspaceId });
    if (!task) {
        throw new ApiError(404, "Task not found");
    }

    const attachment = task.attachments.id(attachmentId);
    if (!attachment) {
        throw new ApiError(404, "Attachment not found");
    }

    const attachmentInfo = {
        attachmentId: attachment._id,
        url: attachment.url,
        public_id: attachment.public_id,
    };

    // Delete from Cloudinary
    await deleteFromCloudinary(attachment.public_id);

    // Remove from task
    task.attachments.id(attachmentId).deleteOne();
    await task.save();

    await createActivityLog({
        workspace: workspaceId,
        project: projectId,
        task: taskId,
        actor: req.user._id,
        entityType: "task",
        action: "attachment_removed",
        message: `An attachment was removed from task "${task.title}"`,
        meta: {
            ...attachmentInfo,
            taskTitle: task.title,
        },
    });

    return res
        .status(200)
        .json(new ApiResponse(200, null, "Attachment deleted successfully"));
});

const getKanbanBoard = asyncHandler(async (req, res) => {
    const { workspaceId, projectId } = req.params;
    const userId = req.user._id;

    // Validate project
    const project = await Project.findOne({
        _id: projectId,
        workspace: workspaceId,
    });

    if (!project)
        throw new ApiError(404, "Project not found in this workspace");

    await checkProjectMembership(userId, workspaceId, projectId);

    const board = await Tasks.aggregate([
        {
            $match: {
                workspace: new mongoose.Types.ObjectId(workspaceId),
                project: new mongoose.Types.ObjectId(projectId),
            },
        },
        {
            $sort: { createdAt: -1 },
        },
        {
            $group: {
                _id: "$status",
                tasks: { $push: "$$ROOT" },
            },
        },
    ]);

    // Convert array → object
    const result = {
        todo: [],
        in_progress: [],
        done: [],
    };

    board.forEach((column) => {
        result[column._id] = column.tasks;
    });

    return res
        .status(200)
        .json(new ApiResponse(200, result, "Kanban board fetched"));
});

export {
    getTasks,
    createTask,
    getTaskById,
    updateTask,
    deleteTask,
    createSubTask,
    updateSubTask,
    deleteSubTask,
    removeAttachment,
    getKanbanBoard,
};
