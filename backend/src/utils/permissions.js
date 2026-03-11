import mongoose from "mongoose";
import { Project } from "../models/project.models.js";
import { ProjectMember } from "../models/projectmember.models.js";
import { WorkspaceMember } from "../models/workspacemember.models.js";
import { Tasks } from "../models/task.models.js";
import { ApiError } from "./api-error.js";

export const ensureValidObjectId = (value, fieldName = "id") => {
    if (!value || !mongoose.Types.ObjectId.isValid(value)) {
        throw new ApiError(400, `Invalid ${fieldName}`);
    }
};

export const ensureWorkspaceMember = async ({
    workspaceId,
    userId,
    roles = [],
}) => {
    ensureValidObjectId(workspaceId, "workspaceId");

    const workspaceMember = await WorkspaceMember.findOne({
        workspace: workspaceId,
        user: userId,
        status: "active",
    });

    if (!workspaceMember) {
        throw new ApiError(403, "Access denied: Not a workspace member");
    }

    if (roles.length > 0 && !roles.includes(workspaceMember.role)) {
        throw new ApiError(
            403,
            "Forbidden: Insufficient workspace permissions",
        );
    }

    return workspaceMember;
};

export const ensureProjectMember = async ({
    workspaceId,
    projectId,
    userId,
    roles = [],
}) => {
    ensureValidObjectId(workspaceId, "workspaceId");
    ensureValidObjectId(projectId, "projectId");

    const project = await Project.findOne({
        _id: projectId,
        workspace: workspaceId,
    }).select("_id workspace name");

    if (!project) {
        throw new ApiError(404, "Project not found in this workspace");
    }

    const projectMember = await ProjectMember.findOne({
        workspace: workspaceId,
        project: projectId,
        user: userId,
        status: "active",
    });

    if (!projectMember) {
        throw new ApiError(403, "Access denied: Not a project member");
    }

    if (roles.length > 0 && !roles.includes(projectMember.role)) {
        throw new ApiError(403, "Forbidden: Insufficient project permissions");
    }

    return { project, projectMember };
};

export const ensureTaskAccess = async ({
    workspaceId,
    projectId,
    taskId,
    userId,
    roles = [],
}) => {
    ensureValidObjectId(taskId, "taskId");

    const { project, projectMember } = await ensureProjectMember({
        workspaceId,
        projectId,
        userId,
        roles,
    });

    const task = await Tasks.findOne({
        _id: taskId,
        workspace: workspaceId,
        project: projectId,
    });

    if (!task) {
        throw new ApiError(404, "Task not found");
    }

    return { project, projectMember, task };
};
