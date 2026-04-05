import mongoose from "mongoose";
import { ApiError } from "../utils/api-error.js";
import { ApiResponse } from "../utils/api-response.js";
import { asyncHandler } from "../utils/async-handler.js";
import { Workspace } from "../models/workspace.models.js";
import { WorkspaceMember } from "../models/workspacemember.models.js";
import { ProjectMember } from "../models/projectmember.models.js";
import { Project } from "../models/project.models.js";
import { Tasks } from "../models/task.models.js";
import { ActivityLog } from "../models/activityLog.models.js";

const isOnboardingQuery = (query) => {
    const normalized = String(query || "").toLowerCase();
    return (
        normalized.includes("how to use") ||
        normalized.includes("how this website works") ||
        normalized.includes("step by step") ||
        normalized.includes("new user") ||
        normalized.includes("website guide")
    );
};

const buildOnboardingAnswer = () => {
    return [
        "Here is a step-by-step guide to use this website:",
        "1) Create or open a workspace from the dashboard.",
        "2) Invite your team members and assign their roles (member/admin).",
        "3) Create projects inside the workspace and set each project status.",
        "4) Add tasks in projects, set priority/status, and assign owners.",
        "5) Use task details to update status, comments, and assignees.",
        "6) Track progress in Dashboard, Activity, and project boards.",
        "7) Use chat and notifications to coordinate with your team.",
        "8) Review billing and upgrade plan when your team scales.",
    ].join("\n");
};

const buildAnswer = ({ query, tasks, projects, members, activities, plan }) => {
    const normalized = query.toLowerCase();

    if (isOnboardingQuery(normalized)) {
        return buildOnboardingAnswer();
    }

    if (normalized.includes("billing") || normalized.includes("plan")) {
        return `Your workspace is on the ${plan} plan. I found ${projects.length} projects and ${members.length} active members in scope.`;
    }

    if (normalized.includes("task") || normalized.includes("todo")) {
        return `I found ${tasks.length} matching tasks and ${activities.length} recent activity items related to your workspace.`;
    }

    if (normalized.includes("project")) {
        return `I found ${projects.length} matching projects with ${tasks.length} related tasks.`;
    }

    return `I found ${tasks.length} tasks, ${projects.length} projects, ${members.length} members, and ${activities.length} recent activity items related to your workspace.`;
};

export const queryWorkspaceAssistant = asyncHandler(async (req, res) => {
    const { workspaceId, query } = req.body;

    if (!query || !String(query).trim()) {
        throw new ApiError(400, "Query is required");
    }

    if (!workspaceId || !mongoose.isValidObjectId(workspaceId)) {
        throw new ApiError(400, "workspaceId is required");
    }

    const workspace = await Workspace.findById(workspaceId).lean();
    if (!workspace) {
        throw new ApiError(404, "Workspace not found");
    }

    const membership = await WorkspaceMember.findOne({
        workspace: workspaceId,
        user: req.user._id,
        status: "active",
    }).lean();

    if (!membership) {
        throw new ApiError(403, "Access denied: Not a workspace member");
    }

    const projectMemberRows = await ProjectMember.find({
        workspace: workspaceId,
        user: req.user._id,
        status: "active",
    }).select("project");

    const accessibleProjectIds = projectMemberRows.map((row) => row.project);
    const q = String(query).trim();
    const searchRegex = new RegExp(
        q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"),
        "i",
    );

    const [tasks, projects, memberRows, activities, workspacePlan] =
        await Promise.all([
            Tasks.find({
                workspace: workspaceId,
                project: { $in: accessibleProjectIds },
                $or: [{ title: searchRegex }, { description: searchRegex }],
            })
                .sort({ createdAt: -1 })
                .limit(6)
                .populate("assignedTo", "username email avatar fullName name")
                .lean(),
            Project.find({
                workspace: workspaceId,
                _id: { $in: accessibleProjectIds },
                $or: [{ name: searchRegex }, { description: searchRegex }],
            })
                .sort({ createdAt: -1 })
                .limit(6)
                .lean(),
            WorkspaceMember.find({
                workspace: workspaceId,
                status: "active",
            })
                .select("user role status createdAt")
                .populate("user", "username email fullName avatar")
                .limit(6)
                .lean(),
            ActivityLog.find({ workspace: workspaceId })
                .sort({ createdAt: -1 })
                .limit(6)
                .populate("actor", "username email fullName avatar")
                .populate("project", "name")
                .populate("task", "title status")
                .lean(),
            Promise.resolve(workspace.plan || "free"),
        ]);

    const filteredMembers = memberRows.filter((row) => {
        const user = row.user || {};
        return (
            searchRegex.test(user.username || "") ||
            searchRegex.test(user.fullName || "") ||
            searchRegex.test(user.fullname || "") ||
            searchRegex.test(user.email || "")
        );
    });

    const answer = buildAnswer({
        query: q,
        tasks,
        projects,
        members: filteredMembers,
        activities,
        plan: workspacePlan,
    });

    const suggestions = [];
    if (isOnboardingQuery(q)) {
        suggestions.push(
            "Start by creating a workspace if you do not have one yet.",
        );
        suggestions.push(
            "Invite at least one teammate to test collaboration flow.",
        );
        suggestions.push(
            "Create one sample project and 3 tasks to practice the workflow.",
        );
    } else {
        if (tasks.length)
            suggestions.push("Open the Tasks page to review the matches.");
        if (projects.length)
            suggestions.push("Jump into the matching project.");
        suggestions.push(
            "Check the billing section for plan and usage details.",
        );
    }

    return res.status(200).json(
        new ApiResponse(
            200,
            {
                answer,
                suggestions,
                tasks,
                projects,
                members: filteredMembers,
                activity: activities,
                plan: workspacePlan,
            },
            "Workspace assistant response generated successfully",
        ),
    );
});
