import mongoose from "mongoose";
import { Workspace } from "../models/workspace.models.js";
import { WorkspaceMember } from "../models/workspacemember.models.js";
import { ApiError } from "../utils/api-error.js";
import { ApiResponse } from "../utils/api-response.js";
import { asyncHandler } from "../utils/async-handler.js";
import { WorkspaceRolesEnum } from "../utils/constants.js";
import { createActivityLog } from "../utils/activity-log.js";
import { ProjectMember } from "../models/projectmember.models.js";
import { Tasks } from "../models/task.models.js";

const slugify = (s = "") =>
    s
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/(^-|-$)/g, "");

export const createWorkspace = asyncHandler(async (req, res) => {
    const { name, slug } = req.body;

    const session = await mongoose.startSession();
    session.startTransaction();

    try {
        const finalSlug = slug ? slugify(slug) : slugify(name);

        const [workspace] = await Workspace.create(
            [{ name, slug: finalSlug, createdBy: req.user._id }],
            { session },
        );

        const [member] = await WorkspaceMember.create(
            [
                {
                    workspace: workspace._id,
                    user: req.user._id,
                    role: WorkspaceRolesEnum.OWNER,
                    status: "active",
                },
            ],
            { session },
        );

        await session.commitTransaction();
        session.endSession();

        await createActivityLog({
            workspace: workspace._id,
            actor: req.user._id,
            entityType: "workspace",
            action: "workspace_created",
            message: `Workspace "${workspace.name}" was created`,
            meta: {
                workspaceName: workspace.name,
                workspaceSlug: workspace.slug,
            },
        });

        return res
            .status(201)
            .json(
                new ApiResponse(
                    201,
                    { workspace, member },
                    "Workspace created successfully",
                ),
            );
    } catch (err) {
        await session.abortTransaction();
        session.endSession();
        if (err?.code === 11000)
            throw new ApiError(409, "Workspace slug already exists");
        throw err;
    }
});

export const getMyWorkspaces = asyncHandler(async (req, res) => {
    const data = await WorkspaceMember.aggregate([
        {
            $match: {
                user: new mongoose.Types.ObjectId(req.user._id),
                status: "active",
            },
        },
        {
            $lookup: {
                from: "workspaces",
                localField: "workspace",
                foreignField: "_id",
                as: "workspace",
            },
        },
        { $unwind: "$workspace" },
        {
            $project: {
                _id: 0,
                role: 1,
                status: 1,
                workspace: {
                    _id: "$workspace._id",
                    name: "$workspace.name",
                    slug: "$workspace.slug",
                    plan: "$workspace.plan",
                    createdAt: "$workspace.createdAt",
                    createdBy: "$workspace.createdBy",
                },
            },
        },
    ]);

    return res
        .status(200)
        .json(new ApiResponse(200, data, "Workspaces fetched successfully"));
});

export const leaveWorkspace = asyncHandler(async (req, res) => {
    const { workspaceId } = req.params;
    const userId = req.user._id;

    const membership = await WorkspaceMember.findOne({
        workspace: workspaceId,
        user: userId,
        status: "active",
    });

    if (!membership) {
        throw new ApiError(404, "You are not a member of this workspace");
    }

    if (membership.role === WorkspaceRolesEnum.OWNER) {
        throw new ApiError(
            400,
            "Workspace owner cannot leave directly. Transfer ownership first",
        );
    }

    const session = await mongoose.startSession();
    session.startTransaction();

    try {
        await WorkspaceMember.deleteOne({ _id: membership._id }, { session });

        await ProjectMember.deleteMany(
            {
                workspace: workspaceId,
                user: userId,
            },
            { session },
        );

        await Tasks.updateMany(
            {
                workspace: workspaceId,
                assignedTo: userId,
            },
            {
                $set: {
                    assignedTo: null,
                    assignedBy: null,
                },
            },
            { session },
        );

        await session.commitTransaction();
        session.endSession();

        await createActivityLog({
            workspace: workspaceId,
            actor: userId,
            entityType: "member",
            action: "workspace_left",
            message: `${req.user.email} left the workspace`,
            meta: {
                userId,
                previousRole: membership.role,
            },
        });

        return res
            .status(200)
            .json(
                new ApiResponse(
                    200,
                    null,
                    "You left the workspace successfully",
                ),
            );
    } catch (error) {
        await session.abortTransaction();
        session.endSession();
        throw error;
    }
});

export const transferWorkspaceOwnership = asyncHandler(async (req, res) => {
    const { workspaceId } = req.params;
    const { userId } = req.body;

    if (!mongoose.isValidObjectId(workspaceId)) {
        throw new ApiError(400, "Invalid workspaceId");
    }

    if (!mongoose.isValidObjectId(userId)) {
        throw new ApiError(400, "Invalid userId");
    }

    const currentOwnerMembership = await WorkspaceMember.findOne({
        workspace: workspaceId,
        user: req.user._id,
        status: "active",
        role: WorkspaceRolesEnum.OWNER,
    });

    if (!currentOwnerMembership) {
        throw new ApiError(403, "Only workspace owner can transfer ownership");
    }

    if (String(req.user._id) === String(userId)) {
        throw new ApiError(400, "You are already the workspace owner");
    }

    const targetMember = await WorkspaceMember.findOne({
        workspace: workspaceId,
        user: userId,
        status: "active",
    }).populate("user", "username email");

    if (!targetMember) {
        throw new ApiError(
            404,
            "Target user is not an active workspace member",
        );
    }

    if (targetMember.role === WorkspaceRolesEnum.OWNER) {
        throw new ApiError(400, "Target user is already the workspace owner");
    }

    const session = await mongoose.startSession();
    session.startTransaction();

    try {
        await WorkspaceMember.updateOne(
            { _id: currentOwnerMembership._id },
            { $set: { role: WorkspaceRolesEnum.ADMIN } },
            { session },
        );

        await WorkspaceMember.updateOne(
            { _id: targetMember._id },
            { $set: { role: WorkspaceRolesEnum.OWNER } },
            { session },
        );

        await Workspace.updateOne(
            { _id: workspaceId },
            { $set: { createdBy: targetMember.user._id } },
            { session },
        );

        await session.commitTransaction();
        session.endSession();

        await createActivityLog({
            workspace: workspaceId,
            actor: req.user._id,
            entityType: "workspace",
            action: "workspace_ownership_transferred",
            message: `Workspace ownership transferred to ${targetMember.user.email}`,
            meta: {
                previousOwnerId: req.user._id,
                newOwnerId: targetMember.user._id,
            },
        });

        return res.status(200).json(
            new ApiResponse(
                200,
                {
                    previousOwner: req.user._id,
                    newOwner: targetMember.user,
                },
                "Workspace ownership transferred successfully",
            ),
        );
    } catch (error) {
        await session.abortTransaction();
        session.endSession();
        throw error;
    }
});