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

const getUserFromSocket = async (socket) => {
    const authToken = socket.handshake.auth?.token;
    if (!authToken) return null;

    const decoded = jwt.verify(authToken, process.env.ACCESS_TOKEN_SECRET);

    const user = await User.findById(decoded._id).select("_id username email");
    return user || null;
};

export const initSocket = (httpServer) => {
    const allowedOrigins = process.env.CORS_ORIGIN?.split(",") || [];

    const io = new Server(httpServer, {
        cors: {
            origin: (origin, cb) => {
                // Allow undefined origin only in dev (Node test client)
                if (!origin && process.env.NODE_ENV !== "production")
                    return cb(null, true);

                // Allow only whitelisted origins (browser)
                if (origin && allowedOrigins.includes(origin))
                    return cb(null, true);

                return cb(new Error("Not allowed by CORS"), false);
            },
            credentials: true,
        },
    });

    // Auth middleware
    io.use(async (socket, next) => {
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

    io.on("connection", (socket) => { 
        console.log(
            "✅ Socket connected:",
            socket.id,
            "user:",
            socket.user?.username,
        );

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
                }else if (convo.type === "task") {
                    await ensureTaskAccess({
                        userId: socket.user._id,
                        workspaceId: convo.workspace,
                        projectId: convo.project,
                        taskId: convo.task,
                    });
                }else {
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
                }else if (convo.type === "task") {
                    await ensureTaskAccess({
                        userId: socket.user._id,
                        workspaceId: convo.workspace,
                        projectId: convo.project,
                        taskId: convo.task,
                    });
                }else {
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

                const populated = await Message.findById(msg._id).populate(
                    "sender",
                    "username email",
                );
                io.to(`conversation:${convo._id}`).emit(
                    "message_created",
                    populated,
                );
            } catch (e) {
                socket.emit("error_event", {
                    message: e.message || "Send failed",
                });
            }
        });

        socket.on("disconnect", () => {
            console.log("❌ Socket disconnected:", socket.id);
        });
    });

    return io;
};