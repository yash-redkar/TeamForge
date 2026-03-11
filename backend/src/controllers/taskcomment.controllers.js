import mongoose from "mongoose";
import { TaskComment } from "../models/taskcomment.models.js";
import { Tasks } from "../models/task.models.js";
import { ProjectMember } from "../models/projectmember.models.js";
import { WorkspaceMember } from "../models/workspacemember.models.js";
import { ApiResponse } from "../utils/api-response.js";
import { ApiError } from "../utils/api-error.js";
import { asyncHandler } from "../utils/async-handler.js";
import { createNotification } from "../utils/notification.js";
import { createActivityLog } from "../utils/activity-log.js";
import { UserRolesEnum, WorkspaceRolesEnum } from "../utils/constants.js";

const checkProjectMembership = async (userId, workspaceId, projectId) => {
    const member = await ProjectMember.findOne({
        user: userId,
        workspace: workspaceId,
        project: projectId,
        status: "active",
    });

    if (!member) {
        throw new ApiError(403, "Access denied: Not a project member");
    }

    return member;
};

const normalizeMentionIds = (mentions = []) => {
    if (!Array.isArray(mentions)) return [];

    const cleaned = mentions
        .filter(Boolean)
        .map((id) => id.toString().trim())
        .filter((id) => mongoose.isValidObjectId(id));

    return [...new Set(cleaned)];
};

const validateMentionMembers = async ({
    mentionIds,
    workspaceId,
    projectId,
}) => {
    if (!mentionIds.length) return [];

    const members = await ProjectMember.find({
        workspace: workspaceId,
        project: projectId,
        user: { $in: mentionIds },
        status: "active",
    }).select("user");

    const validUserIds = members.map((m) => m.user.toString());

    return mentionIds.filter((id) => validUserIds.includes(id));
};

const createComment = asyncHandler(async (req, res) => {
    const { workspaceId, projectId, taskId } = req.params;
    const { content, mentions = [] } = req.body;
    const userId = req.user._id;

    await checkProjectMembership(userId, workspaceId, projectId);

    const task = await Tasks.findOne({
        _id: taskId,
        workspace: workspaceId,
        project: projectId,
    });

    if (!task) {
        throw new ApiError(404, "Task not found");
    }

    const normalizedMentions = normalizeMentionIds(mentions);
    const validMentions = await validateMentionMembers({
        mentionIds: normalizedMentions,
        workspaceId,
        projectId,
    });

    const comment = await TaskComment.create({
        workspace: workspaceId,
        project: projectId,
        task: taskId,
        author: userId,
        content,
        mentions: validMentions,
    });

    const populatedComment = await TaskComment.findById(comment._id)
        .populate("author", "username email avatar")
        .populate("mentions", "username email avatar");

    await createActivityLog({
        workspace: workspaceId,
        project: projectId,
        task: taskId,
        actor: userId,
        entityType: "task",
        action: "task_comment_added",
        message: `Comment added on task "${task.title}"`,
        meta: {
            commentId: comment._id,
            taskTitle: task.title,
        },
    });

    const notifiedUsers = new Set();

    if (task.assignedTo && task.assignedTo.toString() !== userId.toString()) {
        await createNotification({
            user: task.assignedTo,
            workspace: workspaceId,
            project: projectId,
            task: taskId,
            type: "task_comment",
            message: `New comment on task "${task.title}"`,
            meta: {
                commentId: comment._id,
                taskId: task._id,
                taskTitle: task.title,
                commentedBy: userId,
            },
        });

        notifiedUsers.add(task.assignedTo.toString());
    }

    for (const mentionUserId of validMentions) {
        const mentionId = mentionUserId.toString();

        if (mentionId === userId.toString()) continue;
        if (notifiedUsers.has(mentionId)) continue;

        await createNotification({
            user: mentionUserId,
            workspace: workspaceId,
            project: projectId,
            task: taskId,
            type: "task_mention",
            message: `You were mentioned in a comment on task "${task.title}"`,
            meta: {
                commentId: comment._id,
                taskId: task._id,
                taskTitle: task.title,
                mentionedBy: userId,
            },
        });

        notifiedUsers.add(mentionId);
    }

    const io = req.app.get("io");
    io?.to(`project:${workspaceId}:${projectId}`).emit(
        "comment_created",
        populatedComment,
    );

    return res
        .status(201)
        .json(
            new ApiResponse(
                201,
                populatedComment,
                "Comment created successfully",
            ),
        );
});

const getComments = asyncHandler(async (req, res) => {
    const { workspaceId, projectId, taskId } = req.params;
    const userId = req.user._id;

    await checkProjectMembership(userId, workspaceId, projectId);

    const task = await Tasks.findOne({
        _id: taskId,
        workspace: workspaceId,
        project: projectId,
    });

    if (!task) {
        throw new ApiError(404, "Task not found");
    }

    const comments = await TaskComment.find({
        workspace: workspaceId,
        project: projectId,
        task: taskId,
    })
        .sort({ createdAt: 1 })
        .populate("author", "username email avatar")
        .populate("mentions", "username email avatar")
        .lean();

    return res
        .status(200)
        .json(new ApiResponse(200, comments, "Comments fetched successfully"));
});

const updateComment = asyncHandler(async (req, res) => {
    const { workspaceId, projectId, taskId, commentId } = req.params;
    const { content, mentions = [] } = req.body;
    const userId = req.user._id;

    await checkProjectMembership(userId, workspaceId, projectId);

    const task = await Tasks.findOne({
        _id: taskId,
        workspace: workspaceId,
        project: projectId,
    });

    if (!task) {
        throw new ApiError(404, "Task not found");
    }

    const comment = await TaskComment.findOne({
        _id: commentId,
        workspace: workspaceId,
        project: projectId,
        task: taskId,
    });

    if (!comment) {
        throw new ApiError(404, "Comment not found");
    }

    if (comment.author.toString() !== userId.toString()) {
        throw new ApiError(403, "Only comment author can edit this comment");
    }

    comment.content = content;
    comment.mentions = await validateMentionMembers({
        mentionIds: normalizeMentionIds(mentions),
        workspaceId,
        projectId,
    });
    comment.isEdited = true;
    comment.editedAt = new Date();

    await comment.save();

    const populatedComment = await TaskComment.findById(comment._id)
        .populate("author", "username email avatar")
        .populate("mentions", "username email avatar");

    await createActivityLog({
        workspace: workspaceId,
        project: projectId,
        task: taskId,
        actor: userId,
        entityType: "task",
        action: "task_comment_updated",
        message: `Comment updated on task "${task.title}"`,
        meta: {
            commentId: comment._id,
            taskTitle: task.title,
        },
    });

    const io = req.app.get("io");
    io?.to(`project:${workspaceId}:${projectId}`).emit(
        "comment_updated",
        populatedComment,
    );

    return res
        .status(200)
        .json(
            new ApiResponse(
                200,
                populatedComment,
                "Comment updated successfully",
            ),
        );
});

const deleteComment = asyncHandler(async (req, res) => {
    const { workspaceId, projectId, taskId, commentId } = req.params;
    const userId = req.user._id;

    const projectMember = await checkProjectMembership(
        userId,
        workspaceId,
        projectId,
    );

    const workspaceMember = await WorkspaceMember.findOne({
        workspace: workspaceId,
        user: userId,
        status: "active",
    });

    const task = await Tasks.findOne({
        _id: taskId,
        workspace: workspaceId,
        project: projectId,
    });

    if (!task) {
        throw new ApiError(404, "Task not found");
    }

    const comment = await TaskComment.findOne({
        _id: commentId,
        workspace: workspaceId,
        project: projectId,
        task: taskId,
    });

    if (!comment) {
        throw new ApiError(404, "Comment not found");
    }

    const isAuthor = comment.author.toString() === userId.toString();
    const isProjectAdmin =
        projectMember.role === UserRolesEnum.ADMIN ||
        projectMember.role === UserRolesEnum.PROJECT_ADMIN;
    const isWorkspaceAdminOrOwner =
        workspaceMember &&
        [WorkspaceRolesEnum.ADMIN, WorkspaceRolesEnum.OWNER].includes(
            workspaceMember.role,
        );

    if (!isAuthor && !isProjectAdmin && !isWorkspaceAdminOrOwner) {
        throw new ApiError(403, "You are not allowed to delete this comment");
    }

    await TaskComment.findOneAndDelete({
        _id: commentId,
        workspace: workspaceId,
        project: projectId,
        task: taskId,
    });

    await createActivityLog({
        workspace: workspaceId,
        project: projectId,
        task: taskId,
        actor: userId,
        entityType: "task",
        action: "task_comment_deleted",
        message: `Comment deleted from task "${task.title}"`,
        meta: {
            commentId,
            taskTitle: task.title,
        },
    });

    const io = req.app.get("io");
    io?.to(`project:${workspaceId}:${projectId}`).emit("comment_deleted", {
        commentId,
        taskId,
    });

    return res
        .status(200)
        .json(new ApiResponse(200, null, "Comment deleted successfully"));
});

export { createComment, getComments, updateComment, deleteComment };
