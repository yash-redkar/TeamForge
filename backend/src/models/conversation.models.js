import mongoose from "mongoose";

const conversationSchema = new mongoose.Schema(
    {
        workspace: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Workspace",
            required: true,
            index: true,
        },

        type: {
            type: String,
            enum: ["project", "workspace", "task", "direct"],
            required: true,
            index: true,
        },

        // For project-level chat
        project: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Project",
            default: null,
            index: true,
        },

        // For task threads (later)
        task: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Tasks",
            default: null,
            index: true,
        },

        // For direct member-to-member chat inside a project
        participants: [
            {
                type: mongoose.Schema.Types.ObjectId,
                ref: "User",
                index: true,
            },
        ],

        // Sorted user-id key for unique direct conversations
        directKey: {
            type: String,
            trim: true,
            default: null,
            index: true,
        },

        name: {
            type: String,
            trim: true,
            default: null, // e.g., "Project Chat"
        },

        createdBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
        },
    },
    { timestamps: true },
);

// Ensure ONLY ONE project chat per project per workspace
conversationSchema.index(
    { workspace: 1, type: 1, project: 1 },
    { unique: true, partialFilterExpression: { type: "project" } },
);

// Ensure ONLY ONE workspace general chat per workspace
conversationSchema.index(
    { workspace: 1, type: 1 },
    { unique: true, partialFilterExpression: { type: "workspace" } },
);

// Ensure ONLY ONE task thread per task per workspace
conversationSchema.index(
    { workspace: 1, type: 1, task: 1 },
    { unique: true, partialFilterExpression: { type: "task" } },
);

// Ensure ONLY ONE direct chat per user pair in a project/workspace
conversationSchema.index(
    { workspace: 1, project: 1, type: 1, directKey: 1 },
    { unique: true, partialFilterExpression: { type: "direct" } },
);

conversationSchema.index({ workspace: 1, updatedAt: -1 });

export const Conversation = mongoose.model("Conversation", conversationSchema);
