import mongoose from "mongoose";

const activityLogSchema = new mongoose.Schema(
    {
        workspace: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Workspace",
            default: null,
            index: true,
        },
        project: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Project",
            default: null,
            index: true,
        },
        task: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Task",
            default: null,
            index: true,
        },
        actor: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
            index: true,
        },
        entityType: {
            type: String,
            enum: ["workspace", "project", "task", "member", "invite"],
            required: true,
        },
        action: {
            type: String,
            required: true,
            index: true,
        },
        message: {
            type: String,
            required: true,
        },
        meta: {
            type: mongoose.Schema.Types.Mixed,
            default: {},
        },
    },
    { timestamps: true,
        versionKey: false
     },
);

export const ActivityLog = mongoose.model("ActivityLog", activityLogSchema);
