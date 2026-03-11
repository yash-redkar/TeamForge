import mongoose, { Schema } from "mongoose";

const subTaskSchema = new Schema(
    {
        title: {
            type: String,
            required: true,
            trim: true,
        },
        workspace: {
            type: Schema.Types.ObjectId,
            ref: "Workspace",
            required: true,
            index: true,
        },
        task: {
            type: Schema.Types.ObjectId,
            ref: "Task",
            required: true,
        },
        isCompleted: {
            type: Boolean,
            default: false,
        },
        createdBy: {
            type: Schema.Types.ObjectId,
            ref: "User",
            required: true,
        },
    },
    { timestamps: true,
        versionKey: false
     },
);

export const SubTask = mongoose.model("SubTask", subTaskSchema);
