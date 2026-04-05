import mongoose, { Schema } from "mongoose";

const workspaceSchema = new Schema(
    {
        name: {
            type: String,
            required: true,
            trim: true,
            minlength: 2,
            maxlength: 80,
        },

        slug: { type: String, required: true, trim: true, lowercase: true },

        createdBy: {
            type: Schema.Types.ObjectId,
            ref: "User",
            required: true,
            index: true,
        },

        plan: {
            type: String,
            enum: ["free", "pro", "business"],
            default: "free",
        },
    },
    { timestamps: true },
);

workspaceSchema.index({ slug: 1 }, { unique: true });
workspaceSchema.index({ name: 1 });
workspaceSchema.index({ createdBy: 1, createdAt: -1 });

export const Workspace = mongoose.model("Workspace", workspaceSchema);
