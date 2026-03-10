import crypto from "crypto";
import mongoose from "mongoose";
import { User } from "../models/user.models.js";
import { Workspace } from "../models/workspace.models.js";
import { WorkspaceMember } from "../models/workspacemember.models.js";
import { ApiError } from "../utils/api-error.js";
import { ApiResponse } from "../utils/api-response.js";
import { asyncHandler } from "../utils/async-handler.js";
import { sendEmail, workspaceInviteMailgenContent } from "../utils/mail.js";
import { WorkspaceRolesEnum } from "../utils/constants.js";
import { createActivityLog } from "../utils/activity-log.js";
import { createNotification } from "../utils/notification.js";

const makeInviteToken = () => {
    const unHashedToken = crypto.randomBytes(32).toString("hex");
    const hashedToken = crypto
        .createHash("sha256")
        .update(unHashedToken)
        .digest("hex");
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24h
    return { unHashedToken, hashedToken, expiresAt };
};

export const inviteToWorkspace = asyncHandler(async (req, res) => {
    const { workspaceId } = req.params;
    const { email, role } = req.body;

    if (!mongoose.isValidObjectId(workspaceId))
        throw new ApiError(400, "Invalid workspaceId");
    if (!email) throw new ApiError(400, "Email is required");

    const workspace = await Workspace.findById(workspaceId);
    if (!workspace) throw new ApiError(404, "Workspace not found");

    await ensureWorkspaceAdminAccess(workspaceId, req.user._id);

    // invited user must exist (v1)
    const invitedUser = await User.findOne({
        email: email.toLowerCase().trim(),
    });
    if (!invitedUser)
        throw new ApiError(
            404,
            "No user found with this email. Ask them to register first.",
        );

    // if already a member
    const existing = await WorkspaceMember.findOne({
        workspace: workspaceId,
        user: invitedUser._id,
    });
    if (existing?.status === "active")
        throw new ApiError(409, "User is already in workspace");
    if (existing?.status === "invited")
        throw new ApiError(409, "Invite already sent");

    const { unHashedToken, hashedToken, expiresAt } = makeInviteToken();

    const member = await WorkspaceMember.create({
        workspace: workspaceId,
        user: invitedUser._id,
        role: role || WorkspaceRolesEnum.MEMBER,
        status: "invited",
        invitedBy: req.user._id,
        inviteTokenHash: hashedToken,
        inviteExpiresAt: expiresAt,
    });

    const acceptUrl = `${process.env.FRONTEND_URL}/invites/workspace/${unHashedToken}`;

    await sendEmail({
        email: invitedUser.email,
        subject: `Invite to workspace: ${workspace.name}`,
        mailgenContent: workspaceInviteMailgenContent(
            invitedUser.username,
            workspace.name,
            acceptUrl,
        ),
    });

    await createNotification({
        user: invitedUser._id,
        workspace: workspaceId,
        type: "workspace_invite",
        message: `You were invited to workspace "${workspace.name}"`,
        meta: {
            invitedBy: req.user._id,
            invitedByEmail: req.user.email,
            role: role || WorkspaceRolesEnum.MEMBER,
        },
    });

    await createActivityLog({
        workspace: workspaceId,
        actor: req.user._id,
        entityType: "invite",
        action: "workspace_invite_sent",
        message: `Invited ${invitedUser.email} to workspace "${workspace.name}"`,
        meta: {
            invitedUserId: invitedUser._id,
            invitedEmail: invitedUser.email,
            role: role || WorkspaceRolesEnum.MEMBER,
        },
    });

    return res
        .status(200)
        .json(
            new ApiResponse(
                200,
                { memberId: member._id },
                "Workspace invite sent",
            ),
        );
});

export const acceptWorkspaceInvite = asyncHandler(async (req, res) => {
    const { token } = req.params;
    if (!token) throw new ApiError(400, "Token missing");

    const hashed = crypto.createHash("sha256").update(token).digest("hex");

    const member = await WorkspaceMember.findOne({
        inviteTokenHash: hashed,
        inviteExpiresAt: { $gt: new Date() },
        status: "invited",
    });

    if (!member) throw new ApiError(400, "Invite token invalid or expired");

    // security: only invited user can accept
    if (String(member.user) !== String(req.user._id)) {
        throw new ApiError(403, "This invite is not for your account");
    }

    member.status = "active";
    member.inviteTokenHash = null;
    member.inviteExpiresAt = null;
    await member.save({ validateBeforeSave: false });

    await createActivityLog({
        workspace: member.workspace,
        actor: req.user._id,
        entityType: "invite",
        action: "workspace_invite_accepted",
        message: `${req.user.email} accepted a workspace invite`,
        meta: {
            userId: req.user._id,
            workspaceMemberId: member._id,
        },
    });

    return res
        .status(200)
        .json(new ApiResponse(200, {}, "Workspace invite accepted"));
});

export const getWorkspacePendingInvites = asyncHandler(async (req, res) => {
    const { workspaceId } = req.params;

    await ensureWorkspaceAdminAccess(workspaceId, req.user._id);

    const invites = await WorkspaceMember.find({
        workspace: workspaceId,
        status: "invited",
    })
        .populate("user", "email username")
        .populate("invitedBy", "username email")
        .select("user invitedBy inviteExpiresAt createdAt");

    return res
        .status(200)
        .json(
            new ApiResponse(
                200,
                invites,
                "Pending workspace invites fetched successfully",
            ),
        );
});

export const cancelWorkspaceInvite = asyncHandler(async (req, res) => {
    const { workspaceId, memberId } = req.params;

    await ensureWorkspaceAdminAccess(workspaceId, req.user._id);

    const invitedMember = await WorkspaceMember.findOne({
        _id: memberId,
        workspace: workspaceId,
        status: "invited",
    });

    if (!invitedMember) {
        throw new ApiError(404, "Pending workspace invite not found");
    }

    await WorkspaceMember.deleteOne({ _id: invitedMember._id });

    await createActivityLog({
        workspace: workspaceId,
        actor: req.user._id,
        entityType: "invite",
        action: "workspace_invite_cancelled",
        message: `Cancelled a workspace invite`,
        meta: {
            workspaceMemberId: invitedMember._id,
            invitedUserId: invitedMember.user,
        },
    });

    return res
        .status(200)
        .json(
            new ApiResponse(
                200,
                null,
                "Workspace invite cancelled successfully",
            ),
        );
});

export const resendWorkspaceInvite = asyncHandler(async (req, res) => {
    const { workspaceId, memberId } = req.params;

    await ensureWorkspaceAdminAccess(workspaceId, req.user._id);

    const invitedMember = await WorkspaceMember.findOne({
        _id: memberId,
        workspace: workspaceId,
        status: "invited",
    }).populate("user", "email username");

    if (!invitedMember) {
        throw new ApiError(404, "Pending workspace invite not found");
    }

    const workspace = await Workspace.findById(workspaceId);

    if (!workspace) {
        throw new ApiError(404, "Workspace not found");
    }

    const unHashedToken = crypto.randomBytes(32).toString("hex");
    const inviteTokenHash = crypto
        .createHash("sha256")
        .update(unHashedToken)
        .digest("hex");

    invitedMember.inviteTokenHash = inviteTokenHash;
    invitedMember.inviteExpiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
    invitedMember.invitedBy = req.user._id;

    await invitedMember.save();

    const inviteUrl = `${process.env.FRONTEND_URL}/invites/workspace/${unHashedToken}`;

    await sendEmail({
        email: invitedMember.user.email,
        subject: `Invitation to join workspace ${workspace.name}`,
        mailgenContent: workspaceInviteMailgenContent(
            invitedMember.user.username || invitedMember.user.email,
            workspace.name,
            inviteUrl,
        ),
    });

    await createActivityLog({
        workspace: workspaceId,
        actor: req.user._id,
        entityType: "invite",
        action: "workspace_invite_resent",
        message: `Resent workspace invite to ${invitedMember.user.email}`,
        meta: {
            workspaceMemberId: invitedMember._id,
            invitedUserId: invitedMember.user._id,
            invitedEmail: invitedMember.user.email,
        },
    });

    return res
        .status(200)
        .json(
            new ApiResponse(200, null, "Workspace invite resent successfully"),
        );
});

export const cleanupExpiredWorkspaceInvites = asyncHandler(async (req, res) => {
    const { workspaceId } = req.params;

    await ensureWorkspaceAdminAccess(workspaceId, req.user._id);

    const result = await WorkspaceMember.deleteMany({
        workspace: workspaceId,
        status: "invited",
        inviteExpiresAt: { $lt: new Date() },
    });

    await createActivityLog({
        workspace: workspaceId,
        actor: req.user._id,
        entityType: "invite",
        action: "workspace_expired_invites_cleaned",
        message: `Cleaned up ${result.deletedCount} expired workspace invites`,
        meta: {
            deletedCount: result.deletedCount,
        },
    });

    return res
        .status(200)
        .json(
            new ApiResponse(
                200,
                { deletedCount: result.deletedCount },
                "Expired workspace invites cleaned up successfully",
            ),
        );
});

const ensureWorkspaceAdminAccess = async (workspaceId, userId) => {
    const membership = await WorkspaceMember.findOne({
        workspace: workspaceId,
        user: userId,
        status: "active",
    });

    if (!membership) {
        throw new ApiError(403, "You are not a member of this workspace");
    }

    if (!["owner", "admin"].includes(membership.role)) {
        throw new ApiError(
            403,
            "Only workspace owner or admin can perform this action",
        );
    }

    return membership;
};