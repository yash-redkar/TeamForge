import mongoose from "mongoose";
import { Conversation } from "../models/conversation.models.js";
import { Message } from "../models/message.models.js";
import { Project } from "../models/project.models.js";
import { ProjectMember } from "../models/projectmember.models.js";
import { ApiError } from "../utils/api-error.js";
import { ApiResponse } from "../utils/api-response.js";
import { asyncHandler } from "../utils/async-handler.js";

// Helper: ensure user is project member + project belongs to workspace
const ensureProjectAccess = async ({ userId, workspaceId, projectId }) => {
    const project = await Project.findOne({
        _id: projectId,
        workspace: workspaceId,
    });
    if (!project)
        throw new ApiError(404, "Project not found in this workspace");

    const pm = await ProjectMember.findOne({
        project: projectId,
        user: userId,
        workspace: workspaceId,
    });
    if (!pm) throw new ApiError(403, "You are not a member of this project");

    return { project, pm };
};

// 1) Get or Create Project Chat Conversation
export const getOrCreateProjectConversation = asyncHandler(async (req, res) => {
    const { workspaceId, projectId } = req.params;

    if (
        !mongoose.isValidObjectId(workspaceId) ||
        !mongoose.isValidObjectId(projectId)
    ) {
        throw new ApiError(400, "Invalid workspaceId or projectId");
    }

    await ensureProjectAccess({
        userId: req.user._id,
        workspaceId,
        projectId,
    });

    let conversation = await Conversation.findOne({
        workspace: workspaceId,
        type: "project",
        project: projectId,
    });

    if (!conversation) {
        conversation = await Conversation.create({
            workspace: workspaceId,
            type: "project",
            project: projectId,
            name: "Project Chat",
            createdBy: req.user._id,
        });
    }

    return res
        .status(200)
        .json(
            new ApiResponse(true, "Project conversation ready", conversation),
        );
});

// 2) Get Messages (cursor pagination)
export const getConversationMessages = asyncHandler(async (req, res) => {
    const { conversationId } = req.params;
    const { cursor, limit } = req.query;

    if (!mongoose.isValidObjectId(conversationId)) {
        throw new ApiError(400, "Invalid conversationId");
    }

    const pageSize = Math.min(parseInt(limit || "30", 10), 50);

    const convo = await Conversation.findById(conversationId);
    if (!convo) throw new ApiError(404, "Conversation not found");

    if (String(convo.type) === "project") {
        await ensureProjectAccess({
            userId: req.user._id,
            workspaceId: convo.workspace,
            projectId: convo.project,
        });
    } else {
        throw new ApiError(
            400,
            "Only project conversations supported right now",
        );
    }

    const query = {
        conversation: convo._id,
        deletedAt: null,
    };

    if (cursor) {
        const cursorDate = new Date(cursor);
        if (!isNaN(cursorDate.getTime())) {
            query.createdAt = { $lt: cursorDate };
        }
    }

    const messages = await Message.find(query)
        .sort({ createdAt: -1 })
        .limit(pageSize)
        .populate("sender", "username email avatar")
        .lean();

    messages.reverse();

    const nextCursor = messages.length
        ? messages[0].createdAt.toISOString()
        : null;

    return res.status(200).json(
        new ApiResponse(true, "Messages fetched", {
            items: messages,
            nextCursor,
            limit: pageSize,
        }),
    );
});

// 3) Send Message (REST fallback, sockets will also use same logic)
export const sendMessage = asyncHandler(async (req, res) => {
    const { conversationId } = req.params;
    const { text } = req.body;

    if (!mongoose.isValidObjectId(conversationId)) {
        throw new ApiError(400, "Invalid conversationId");
    }

    const convo = await Conversation.findById(conversationId).lean();
    if (!convo) throw new ApiError(404, "Conversation not found");

    if (convo.type !== "project") {
        throw new ApiError(
            400,
            "Only project conversations supported right now",
        );
    }

    await ensureProjectAccess({
        userId: req.user._id,
        workspaceId: convo.workspace,
        projectId: convo.project,
    });

    const cleanText = (text || "").trim();
    if (!cleanText) throw new ApiError(400, "Message text is required");

    const msg = await Message.create({
        workspace: convo.workspace,
        conversation: convo._id,
        sender: req.user._id,
        text: cleanText,
    });

    const populated = await Message.findById(msg._id)
    .populate(
        "sender",
        "username email avatar",
    )
    .lean();

    return res
        .status(201)
        .json(new ApiResponse(true, "Message sent", populated));
});
