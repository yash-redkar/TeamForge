import mongoose from "mongoose";
import { ActivityLog } from "../models/activityLog.models.js";
import { WorkspaceMember } from "../models/workspacemember.models.js";
import { ProjectMember } from "../models/projectmember.models.js";
import { ApiError } from "../utils/api-error.js";
import { ApiResponse } from "../utils/api-response.js";
import { asyncHandler } from "../utils/async-handler.js";

export const getWorkspaceActivity = asyncHandler(async (req, res) => {
    const { workspaceId } = req.params;
    const limit = Math.min(Number(req.query.limit) || 20, 50);

    if (!mongoose.isValidObjectId(workspaceId)) {
        throw new ApiError(400, "Invalid workspaceId");
    }

    const membership = await WorkspaceMember.findOne({
        workspace: workspaceId,
        user: req.user._id,
        status: "active",
    });

    if (!membership) {
        throw new ApiError(403, "You are not a member of this workspace");
    }

    const logs = await ActivityLog.find({
        workspace: workspaceId,
    })
        .select("-__v -updatedAt")
        .populate("actor", "username avatar")
        .populate("project", "name")
        .populate("task", "title")
        .sort({ createdAt: -1 })
        .limit(limit)
        .lean();

    return res
        .status(200)
        .json(
            new ApiResponse(
                200,
                logs,
                "Workspace activity fetched successfully",
            ),
        );
});

export const getProjectActivity = asyncHandler(async (req, res) => {
    const { projectId } = req.params;
    const limit = Math.min(Number(req.query.limit) || 20, 50);

    if (!mongoose.isValidObjectId(projectId)) {
        throw new ApiError(400, "Invalid projectId");
    }

    const membership = await ProjectMember.findOne({
        project: projectId,
        user: req.user._id,
        status: "active",
    });

    if (!membership) {
        throw new ApiError(403, "You are not a member of this project");
    }

    const logs = await ActivityLog.find({
        project: projectId,
    })
        .select("-__v -updatedAt")
        .populate("actor", "username avatar")
        .populate("project", "name")
        .populate("task", "title")
        .sort({ createdAt: -1 })
        .limit(limit)
        .lean();

    return res
        .status(200)
        .json(
            new ApiResponse(200, logs, "Project activity fetched successfully"),
        );
});
