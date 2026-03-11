import mongoose, { Schema } from "mongoose";
import { AvailableTaskStatus, TaskStatusEnum } from "../utils/constants.js";

const taskSchema = new Schema(
    {
        title: {
            type: String,
            required: true,
            trim: true,
        },
        description: {
            type: String,
            trim: true,
        },
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
        assignedTo: {
            type: Schema.Types.ObjectId,
            ref: "User",
        },
        assignedBy: {
            type: Schema.Types.ObjectId,
            ref: "User",
        },
        status: {
            type: String,
            enum: AvailableTaskStatus,
            default: TaskStatusEnum.TODO,
        },
        attachments: {
            type: [
                {
                    public_id: String,
                    url: String,
                    mimetype: String,
                    size: Number,
                },
            ],
            default: [],
        },
    },
    { timestamps: true,
        versionKey: false
     },
);

// list tasks in project
taskSchema.index({ workspace: 1, project: 1, createdAt: -1 }); 

 // "my tasks"
taskSchema.index({ workspace: 1, assignedTo: 1, status: 1, createdAt: -1 });

 // kanban columns
taskSchema.index({ project: 1, status: 1, createdAt: -1 });

taskSchema.index({ workspace: 1, status: 1, createdAt: -1 });

taskSchema.index({ title: "text", description: "text" });

export const Tasks = mongoose.model("Task", taskSchema);
