import mongoose, { Schema } from "mongoose";
import { UserRolesEnum } from "../utils/constants.js";

const projectMemberSchema = new Schema(
    {
        workspace: {
            type: Schema.Types.ObjectId,
            ref: "Workspace",
            required: true,
            index: true,
        },

        project: {
            type: Schema.Types.ObjectId,
            ref: "Project",
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
            enum: Object.values(UserRolesEnum),
            required: true,
            index: true,
        },
        status: {
            type: String,
            enum: ["active", "invited"],
            default: "active",
            index: true,
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

projectMemberSchema.index({ project: 1, user: 1 }, { unique: true });

// you often query by workspace+project+user in your permission middleware
projectMemberSchema.index({ workspace: 1, project: 1, user: 1 });

// list all projects for a user in a workspace
projectMemberSchema.index({ user: 1, workspace: 1, createdAt: -1 });

projectMemberSchema.index({ inviteTokenHash: 1, inviteExpiresAt: 1 });

export const ProjectMember = mongoose.model(
    "ProjectMember",
    projectMemberSchema,
);
