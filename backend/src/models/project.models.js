import mongoose, { Schema } from "mongoose";

const projectSchema = new Schema(
    {
        workspace: {
            type: Schema.Types.ObjectId,
            ref: "Workspace",
            required: true,
            index: true,
        },

        name: {
            type: String,
            required: true,
            trim: true,
            minlength: 3,
            maxlength: 100,
        },

        description: {
            type: String,
            trim: true,
            maxlength: 500,
            default: "",
        },

        createdBy: {
            type: Schema.Types.ObjectId,
            ref: "User",
            required: true,
            index: true,
        },
    },
    { timestamps: true,
        versionKey: false
     },
);

// Ensure that project names are unique within the same workspace
projectSchema.index({ workspace: 1, name: 1 }, { unique: true });

projectSchema.index({ workspace: 1, createdAt: -1 });

projectSchema.index({ name: "text", description: "text" });

export const Project = mongoose.model("Project", projectSchema);
