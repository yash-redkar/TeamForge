import mongoose, { Schema } from "mongoose";
import { WorkspaceRolesEnum } from "../utils/constants.js";

const workspaceMemberSchema = new Schema(
    {
        workspace: {
            type: Schema.Types.ObjectId,
            ref: "Workspace",
            required: true,
            index: true,
        },
        user: {
            type: Schema.Types.ObjectId,
            ref: "User",
            required: true,
            index: true,
        },

        role: {
            type: String,
            enum: Object.values(WorkspaceRolesEnum),
            default: WorkspaceRolesEnum.MEMBER,
            required: true,
            index: true,
        },

        status: {
            type: String,
            enum: ["active", "invited"],
            default: "active",
        },
        invitedBy: {
            type: Schema.Types.ObjectId,
            ref: "User",
            default: null,
            index: true,
        },

        inviteTokenHash: { type: String, default: null, index: true },
        inviteExpiresAt: { type: Date, default: null },
    },
    { timestamps: true,
        versionKey: false
     },
);

// ✅ one user only once in a workspace
workspaceMemberSchema.index({ workspace: 1, user: 1 }, { unique: true });
// fetch all members in a workspace quickly
workspaceMemberSchema.index({ workspace: 1, status: 1, role: 1 });

// fetch all workspaces for a user quickly
workspaceMemberSchema.index({ user: 1, status: 1, createdAt: -1 });

workspaceMemberSchema.index({ inviteTokenHash: 1, inviteExpiresAt: 1 });

export const WorkspaceMember = mongoose.model(
    "WorkspaceMember",
    workspaceMemberSchema,
);
