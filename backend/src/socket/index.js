import { Server } from "socket.io";
import jwt from "jsonwebtoken";
import mongoose from "mongoose";

import { User } from "../models/user.models.js";
import { Conversation } from "../models/conversation.models.js";
import { Message } from "../models/message.models.js";
import { Project } from "../models/project.models.js";
import { ProjectMember } from "../models/projectmember.models.js";
import { WorkspaceMember } from "../models/workspacemember.models.js";
import { Tasks } from "../models/task.models.js";

let ioInstance = null;

const ensureProjectAccess = async ({ userId, workspaceId, projectId }) => {
    const project = await Project.findOne({
        _id: projectId,
        workspace: workspaceId,
    });
    if (!project) throw new Error("Project not found in this workspace");

    const pm = await ProjectMember.findOne({
        project: projectId,
        user: userId,
        workspace: workspaceId,
    });
    if (!pm) throw new Error("You are not a member of this project");

    return true;
};

const ensureWorkspaceAccess = async ({ userId, workspaceId }) => {
    const wm = await WorkspaceMember.findOne({
        workspace: workspaceId,
        user: userId,
    });
    if (!wm) throw new Error("You are not a member of this workspace");

    return true;
};

const ensureTaskAccess = async ({ userId, workspaceId, projectId, taskId }) => {
    const project = await Project.findOne({
        _id: projectId,
        workspace: workspaceId,
    });
    if (!project) throw new Error("Project not found in this workspace");

    const pm = await ProjectMember.findOne({
        workspace: workspaceId,
        project: projectId,
        user: userId,
    });
    if (!pm) throw new Error("You are not a member of this project");

    const task = await Tasks.findOne({
        _id: taskId,
        workspace: workspaceId,
        project: projectId,
    });
    if (!task) throw new Error("Task not found in this project");

    return true;
};

const ensureDirectConversationAccess = async ({ userId, conversation }) => {
    const participantIds = Array.isArray(conversation.participants)
        ? conversation.participants.map((item) => String(item))
        : [];

    if (!participantIds.includes(String(userId))) {
        throw new Error("You do not have access to this direct chat");
    }

    await ensureProjectAccess({
        userId,
        workspaceId: conversation.workspace,
        projectId: conversation.project,
    });

    return true;
};

const getUserFromSocket = async (socket) => {
    const authToken = socket.handshake.auth?.token;
    if (!authToken) return null;

    const decoded = jwt.verify(authToken, process.env.ACCESS_TOKEN_SECRET);
    const user = await User.findById(decoded._id).select(
        "_id username email fullname name avatar",
    );
    return user || null;
};

export const initSocket = (httpServer) => {
    const allowedOrigins = process.env.CORS_ORIGIN?.split(",") || [];

    ioInstance = new Server(httpServer, {
        cors: {
            origin: (origin, cb) => {
                if (!origin && process.env.NODE_ENV !== "production") {
                    return cb(null, true);
                }

                if (origin && allowedOrigins.includes(origin)) {
                    return cb(null, true);
                }

                return cb(new Error("Not allowed by CORS"), false);
            },
            credentials: true,
        },
    });

    ioInstance.use(async (socket, next) => {
        try {
            const user = await getUserFromSocket(socket);

            if (!user) {
                console.log("❌ Socket Unauthorized: no user");
                return next(new Error("Unauthorized"));
            }

            socket.user = user;
            return next();
        } catch (err) {
            console.log("❌ Socket auth error:", err.message);
            console.log("auth context:", {
                hasAuthToken: Boolean(socket.handshake.auth?.token),
                hasCookieHeader: Boolean(socket.handshake.headers?.cookie),
            });
            return next(new Error("Unauthorized"));
        }
    });

    ioInstance.on("connection", (socket) => {
        console.log(
            "✅ Socket connected:",
            socket.id,
            "user:",
            socket.user?.username,
        );

        socket.join(socket.user._id.toString());
        console.log("🔔 Joined personal room:", socket.user._id.toString());

        socket.on("join_project", async ({ workspaceId, projectId }) => {
            try {
                if (
                    !mongoose.isValidObjectId(workspaceId) ||
                    !mongoose.isValidObjectId(projectId)
                ) {
                    return socket.emit("error_event", {
                        message: "Invalid workspaceId or projectId",
                    });
                }

                await ensureProjectAccess({
                    userId: socket.user._id,
                    workspaceId,
                    projectId,
                });

                socket.join(`project:${workspaceId}:${projectId}`);
                socket.emit("joined_project", { workspaceId, projectId });
            } catch (e) {
                socket.emit("error_event", {
                    message: e.message || "Join project failed",
                });
            }
        });

        socket.on("join_conversation", async ({ conversationId }) => {
            console.log("➡️ join_conversation:", conversationId);

            try {
                if (!mongoose.isValidObjectId(conversationId)) {
                    return socket.emit("error_event", {
                        message: "Invalid conversationId",
                    });
                }

                const convo = await Conversation.findById(conversationId);
                if (!convo) {
                    return socket.emit("error_event", {
                        message: "Conversation not found",
                    });
                }

                if (convo.type === "project") {
                    await ensureProjectAccess({
                        userId: socket.user._id,
                        workspaceId: convo.workspace,
                        projectId: convo.project,
                    });
                } else if (convo.type === "workspace") {
                    await ensureWorkspaceAccess({
                        userId: socket.user._id,
                        workspaceId: convo.workspace,
                    });
                } else if (convo.type === "task") {
                    await ensureTaskAccess({
                        userId: socket.user._id,
                        workspaceId: convo.workspace,
                        projectId: convo.project,
                        taskId: convo.task,
                    });
                } else if (convo.type === "direct") {
                    await ensureDirectConversationAccess({
                        userId: socket.user._id,
                        conversation: convo,
                    });
                } else {
                    return socket.emit("error_event", {
                        message: "Unsupported conversation type",
                    });
                }

                socket.join(`conversation:${convo._id}`);
                socket.emit("joined_conversation", {
                    conversationId: convo._id,
                });
            } catch (e) {
                socket.emit("error_event", {
                    message: e.message || "Join failed",
                });
            }
        });

        socket.on("send_message", async ({ conversationId, text }) => {
            try {
                if (!mongoose.isValidObjectId(conversationId)) {
                    return socket.emit("error_event", {
                        message: "Invalid conversationId",
                    });
                }

                const convo = await Conversation.findById(conversationId);
                if (!convo) {
                    return socket.emit("error_event", {
                        message: "Conversation not found",
                    });
                }

                if (convo.type === "project") {
                    await ensureProjectAccess({
                        userId: socket.user._id,
                        workspaceId: convo.workspace,
                        projectId: convo.project,
                    });
                } else if (convo.type === "workspace") {
                    await ensureWorkspaceAccess({
                        userId: socket.user._id,
                        workspaceId: convo.workspace,
                    });
                } else if (convo.type === "task") {
                    await ensureTaskAccess({
                        userId: socket.user._id,
                        workspaceId: convo.workspace,
                        projectId: convo.project,
                        taskId: convo.task,
                    });
                } else if (convo.type === "direct") {
                    await ensureDirectConversationAccess({
                        userId: socket.user._id,
                        conversation: convo,
                    });
                } else {
                    return socket.emit("error_event", {
                        message: "Unsupported conversation type",
                    });
                }

                const cleanText = (text || "").trim();
                if (!cleanText) {
                    return socket.emit("error_event", {
                        message: "Message text is required",
                    });
                }

                const msg = await Message.create({
                    workspace: convo.workspace,
                    conversation: convo._id,
                    sender: socket.user._id,
                    text: cleanText,
                });

                await Conversation.findByIdAndUpdate(convo._id, {
                    $set: { updatedAt: new Date() },
                });

                const populated = await Message.findById(msg._id)
                    .populate("sender", "username email avatar fullname name")
                    .lean();

                const outboundMessage = {
                    ...populated,
                    conversation: String(convo._id),
                    conversationId: String(convo._id),
                    conversationType: String(convo.type || ""),
                    workspaceId: convo.workspace ? String(convo.workspace) : "",
                    projectId: convo.project ? String(convo.project) : "",
                };

                if (convo.type === "direct") {
                    const participants = Array.isArray(convo.participants)
                        ? convo.participants.map((item) => String(item))
                        : [];

                    participants.forEach((participantId) => {
                        ioInstance
                            .to(participantId)
                            .emit("message_created", outboundMessage);
                    });
                } else {
                    ioInstance
                        .to(`conversation:${convo._id}`)
                        .emit("message_created", outboundMessage);
                }
            } catch (e) {
                socket.emit("error_event", {
                    message: e.message || "Send failed",
                });
            }
        });

        socket.on("typing_start", async ({ conversationId }) => {
            try {
                if (!mongoose.isValidObjectId(conversationId)) {
                    return;
                }

                const convo = await Conversation.findById(conversationId);
                if (!convo) return;

                if (convo.type === "project") {
                    await ensureProjectAccess({
                        userId: socket.user._id,
                        workspaceId: convo.workspace,
                        projectId: convo.project,
                    });
                } else if (convo.type === "workspace") {
                    await ensureWorkspaceAccess({
                        userId: socket.user._id,
                        workspaceId: convo.workspace,
                    });
                } else if (convo.type === "task") {
                    await ensureTaskAccess({
                        userId: socket.user._id,
                        workspaceId: convo.workspace,
                        projectId: convo.project,
                        taskId: convo.task,
                    });
                } else if (convo.type === "direct") {
                    await ensureDirectConversationAccess({
                        userId: socket.user._id,
                        conversation: convo,
                    });
                } else {
                    return;
                }

                socket.to(`conversation:${convo._id}`).emit("typing_started", {
                    conversationId: convo._id,
                    user: {
                        _id: socket.user._id,
                        username: socket.user.username,
                        fullname: socket.user.fullname,
                        name: socket.user.name,
                    },
                });
            } catch (e) {
                console.log("typing_start error:", e.message);
            }
        });

        socket.on("typing_stop", async ({ conversationId }) => {
            try {
                if (!mongoose.isValidObjectId(conversationId)) {
                    return;
                }

                const convo = await Conversation.findById(conversationId);
                if (!convo) return;

                if (convo.type === "project") {
                    await ensureProjectAccess({
                        userId: socket.user._id,
                        workspaceId: convo.workspace,
                        projectId: convo.project,
                    });
                } else if (convo.type === "workspace") {
                    await ensureWorkspaceAccess({
                        userId: socket.user._id,
                        workspaceId: convo.workspace,
                    });
                } else if (convo.type === "task") {
                    await ensureTaskAccess({
                        userId: socket.user._id,
                        workspaceId: convo.workspace,
                        projectId: convo.project,
                        taskId: convo.task,
                    });
                } else if (convo.type === "direct") {
                    await ensureDirectConversationAccess({
                        userId: socket.user._id,
                        conversation: convo,
                    });
                } else {
                    return;
                }

                socket.to(`conversation:${convo._id}`).emit("typing_stopped", {
                    conversationId: convo._id,
                    userId: socket.user._id,
                });
            } catch (e) {
                console.log("typing_stop error:", e.message);
            }
        });

        socket.on("disconnect", () => {
            console.log("❌ Socket disconnected:", socket.id);
        });
    });

    return ioInstance;
};

export const getIO = () => {
    if (!ioInstance) {
        throw new Error("Socket.IO is not initialized");
    }
    return ioInstance;
};
