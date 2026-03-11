import crypto from "crypto";
import mongoose from "mongoose";

import { User } from "../models/user.models.js";
import { Project } from "../models/project.models.js";
import { ProjectMember } from "../models/projectmember.models.js";

import { ApiError } from "../utils/api-error.js";
import { ApiResponse } from "../utils/api-response.js";
import { asyncHandler } from "../utils/async-handler.js";

import { sendEmail, projectInviteMailgenContent } from "../utils/mail.js";
import { UserRolesEnum } from "../utils/constants.js";
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

export const inviteToProject = asyncHandler(async (req, res) => {
    const { projectId } = req.params;
    const { email, role } = req.body;

    if (!mongoose.isValidObjectId(projectId))
        throw new ApiError(400, "Invalid projectId");
    if (!email) throw new ApiError(400, "Email is required");

    const project = await Project.findById(projectId);
    if (!project) throw new ApiError(404, "Project not found");

    await ensureProjectAdminAccess(projectId, req.user._id);

    const invitedUser = await User.findOne({
        email: email.toLowerCase().trim(),
    });

    if (!invitedUser) {
        throw new ApiError(
            404,
            "No user found with this email. Ask them to register first.",
        );
    }

    const existing = await ProjectMember.findOne({
        project: projectId,
        user: invitedUser._id,
    });

    if (existing?.status === "active") {
        throw new ApiError(409, "User is already in project");
    }

    if (existing?.status === "invited") {
        throw new ApiError(409, "Invite already sent");
    }

    const { unHashedToken, hashedToken, expiresAt } = makeInviteToken();

    const member = await ProjectMember.create({
        workspace: project.workspace,
        project: projectId,
        user: invitedUser._id,
        role: role || "member",
        status: "invited",
        invitedBy: req.user._id,
        inviteTokenHash: hashedToken,
        inviteExpiresAt: expiresAt,
    });

    const acceptUrl = `${process.env.FRONTEND_URL}/invites/project/${unHashedToken}`;

    await sendEmail({
        email: invitedUser.email,
        subject: `Invite to project: ${project.name}`,
        mailgenContent: projectInviteMailgenContent(
            invitedUser.username,
            project.name,
            acceptUrl,
        ),
    });

    await createNotification({
        user: invitedUser._id,
        workspace: project.workspace,
        project: project._id,
        type: "project_invite",
        message: `You were invited to project "${project.name}"`,
        meta: {
            invitedBy: req.user._id,
            invitedByEmail: req.user.email,
            role: role || "member",
        },
    });

    await createActivityLog({
        workspace: project.workspace,
        project: project._id,
        actor: req.user._id,
        entityType: "invite",
        action: "project_invite_sent",
        message: `Invited ${invitedUser.email} to project "${project.name}"`,
        meta: {
            invitedUserId: invitedUser._id,
            invitedEmail: invitedUser.email,
            role: role || "member",
        },
    });

    return res
        .status(200)
        .json(
            new ApiResponse(
                200,
                { memberId: member._id },
                "Project invite sent",
            ),
        );
});

export const acceptProjectInvite = asyncHandler(async (req, res) => {
    const { token } = req.params;
    if (!token) throw new ApiError(400, "Token missing");

    const hashed = crypto.createHash("sha256").update(token).digest("hex");

    const member = await ProjectMember.findOne({
        inviteTokenHash: hashed,
        inviteExpiresAt: { $gt: new Date() },
        status: "invited",
    });

    if (!member) throw new ApiError(400, "Invite token invalid or expired");

    // ✅ security: only invited user can accept
    if (String(member.user) !== String(req.user._id)) {
        throw new ApiError(403, "This invite is not for your account");
    }

    member.status = "active";
    member.inviteTokenHash = null;
    member.inviteExpiresAt = null;

    await member.save({ validateBeforeSave: false });

    await createActivityLog({
        workspace: member.workspace,
        project: member.project,
        actor: req.user._id,
        entityType: "invite",
        action: "project_invite_accepted",
        message: `${req.user.email} accepted a project invite`,
        meta: {
            userId: req.user._id,
            projectMemberId: member._id,
        },
    });

    return res
        .status(200)
        .json(new ApiResponse(200, {}, "Project invite accepted"));
});

export const getProjectPendingInvites = asyncHandler(async (req, res) => {
    const { projectId } = req.params;

    await ensureProjectAdminAccess(projectId, req.user._id);

    const invites = await ProjectMember.find({
        project: projectId,
        status: "invited",
    })
        .populate("user", "email username")
        .populate("invitedBy", "username email")
        .select("user invitedBy inviteExpiresAt createdAt role");

    return res
        .status(200)
        .json(
            new ApiResponse(
                200,
                invites,
                "Pending project invites fetched successfully",
            ),
        );
});

export const cancelProjectInvite = asyncHandler(async (req, res) => {
    const { projectId, memberId } = req.params;

    await ensureProjectAdminAccess(projectId, req.user._id);

    const invitedMember = await ProjectMember.findOne({
        _id: memberId,
        project: projectId,
        status: "invited",
    });

    if (!invitedMember) {
        throw new ApiError(404, "Pending project invite not found");
    }

    await ProjectMember.deleteOne({ _id: invitedMember._id });

    await createActivityLog({
        workspace: invitedMember.workspace,
        project: invitedMember.project,
        actor: req.user._id,
        entityType: "invite",
        action: "project_invite_cancelled",
        message: `Cancelled a project invite`,
        meta: {
            projectMemberId: invitedMember._id,
            invitedUserId: invitedMember.user,
        },
    });

    return res
        .status(200)
        .json(
            new ApiResponse(200, null, "Project invite cancelled successfully"),
        );
});

export const resendProjectInvite = asyncHandler(async (req, res) => {
    const { projectId, memberId } = req.params;

    await ensureProjectAdminAccess(projectId, req.user._id);

    const invitedMember = await ProjectMember.findOne({
        _id: memberId,
        project: projectId,
        status: "invited",
    }).populate("user", "email username");

    if (!invitedMember) {
        throw new ApiError(404, "Pending project invite not found");
    }

    const project = await Project.findById(projectId);

    if (!project) {
        throw new ApiError(404, "Project not found");
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

    const inviteUrl = `${process.env.FRONTEND_URL}/invites/project/${unHashedToken}`;

    await sendEmail({
        email: invitedMember.user.email,
        subject: `Invitation to join project ${project.name}`,
        mailgenContent: projectInviteMailgenContent(
            invitedMember.user.username || invitedMember.user.email,
            project.name,
            inviteUrl,
        ),
    });

    await createActivityLog({
        workspace: invitedMember.workspace,
        project: invitedMember.project,
        actor: req.user._id,
        entityType: "invite",
        action: "project_invite_resent",
        message: `Resent project invite to ${invitedMember.user.email}`,
        meta: {
            projectMemberId: invitedMember._id,
            invitedUserId: invitedMember.user._id,
            invitedEmail: invitedMember.user.email,
        },
    });

    return res
        .status(200)
        .json(new ApiResponse(200, null, "Project invite resent successfully"));
});

export const cleanupExpiredProjectInvites = asyncHandler(async (req, res) => {
    const { projectId } = req.params;

    await ensureProjectAdminAccess(projectId, req.user._id);

    const result = await ProjectMember.deleteMany({
        project: projectId,
        status: "invited",
        inviteExpiresAt: { $lt: new Date() },
    });

    const project = await Project.findById(projectId);

    await createActivityLog({
        workspace: project.workspace,
        project: projectId,
        actor: req.user._id,
        entityType: "invite",
        action: "project_expired_invites_cleaned",
        message: `Cleaned up ${result.deletedCount} expired project invites`,
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
                "Expired project invites cleaned up successfully",
            ),
        );
});

const ensureProjectAdminAccess = async (projectId, userId) => {
    const membership = await ProjectMember.findOne({
        project: projectId,
        user: userId,
        status: "active",
    });

    if (!membership) {
        throw new ApiError(403, "You are not a member of this project");
    }

    if (membership.role !== "admin") {
        throw new ApiError(403, "Only project admin can perform this action");
    }

    return membership;
};