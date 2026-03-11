import mongoose, { Schema } from "mongoose";

const taskCommentSchema = new Schema(
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
        task: {
            type: Schema.Types.ObjectId,
            ref: "Task",
            required: true,
            index: true,
        },
        author: {
            type: Schema.Types.ObjectId,
            ref: "User",
            required: true,
            index: true,
        },
        content: {
            type: String,
            required: true,
            trim: true,
        },
        mentions: [
            {
                type: Schema.Types.ObjectId,
                ref: "User",
            },
        ],
        isEdited: {
            type: Boolean,
            default: false,
        },
        editedAt: {
            type: Date,
            default: null,
        },
    },
    {   timestamps: true,
        versionKey: false
    },
);

taskCommentSchema.index({ task: 1, createdAt: 1 });
taskCommentSchema.index({ workspace: 1, project: 1, task: 1, createdAt: 1 });

export const TaskComment = mongoose.model("TaskComment", taskCommentSchema);
