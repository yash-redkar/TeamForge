import express from "express";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import cookieParser from "cookie-parser";
import cors from "cors";
import { mongoSanitizeMiddleware } from "./middlewares/mongoSanitize.middleware.js";
import hpp from "hpp";

const app = express();

app.use(helmet());

// body limits
app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: true, limit: "1mb" }));

app.use(cookieParser());
app.use(mongoSanitizeMiddleware);
app.use(hpp());

//cors configuration
app.use(
    cors({
        origin: process.env.CORS_ORIGIN?.split(",") || [
            "http://localhost:3000",
        ],
        credentials: true,
        methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
        allowedHeaders: ["Content-Type", "Authorization"],
    }),
);

const globalLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 300,
    standardHeaders: true,
    legacyHeaders: false,
});
app.use(globalLimiter);

const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 20,
    standardHeaders: true,
    legacyHeaders: false,
});
app.use("/api/v1/auth", authLimiter);

// import the routes

import healthCheckRouter from "./routes/healthcheck.routes.js";
import authRouter from "./routes/auth.routes.js";
import projectRouter from "./routes/project.routes.js";
import taskRouter from "./routes/task.routes.js";
import workspaceRouter from "./routes/workspace.routes.js";
import chatRoutes from "./routes/chat.routes.js";
import workspaceInviteRoutes from "./routes/workspaceInvite.routes.js";
import projectInviteRoutes from "./routes/projectInvite.routes.js";
import activityRoutes from "./routes/activity.routes.js";

app.use("/api/v1/healthcheck", healthCheckRouter);
app.use("/api/v1/auth", authRouter);
app.use("/api/v1/workspaces/:workspaceId/projects", projectRouter);
app.use(
    "/api/v1/workspaces/:workspaceId/projects/:projectId/tasks",
    taskRouter,
);
app.use("/api/v1/workspaces", workspaceRouter);
app.use("/api/v1/chat", chatRoutes);
app.use("/api/v1", workspaceInviteRoutes);
app.use("/api/v1", projectInviteRoutes);
app.use("/api/v1", activityRoutes);

app.get("/", (req, res) => {
    res.send("Welcome to basecampy");
});

// global error handler - MUST BE LAST
app.use((err, req, res, next) => {
    const statusCode = err.statusCode || 500;

    return res.status(statusCode).json({
        statusCode,
        message: err.message || "Internal Server Error",
        success: false,
        ...(process.env.NODE_ENV === "development" && { stack: err.stack }),
    });
});

export default app;
