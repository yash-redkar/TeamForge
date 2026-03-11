import { User } from "../models/user.models.js";
import { ApiError } from "../utils/api-error.js";
import { asyncHandler } from "../utils/async-handler.js";
import { ensureProjectMember } from "../utils/permissions.js";
import jwt from "jsonwebtoken";

export const verifyJWT = asyncHandler(async (req, res, next) => {
    const authHeader = req.header("Authorization");
    const token = authHeader?.startsWith("Bearer ")
        ? authHeader.slice(7)
        : null;

    if (!token) {
        throw new ApiError(401, "Unauthorized request: No token provided");
    }

    try {
        const decodedToken = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);

        const user = await User.findById(decodedToken?._id).select(
            "-password -refreshTokenHash -refreshTokenExpiresAt -emailVerificationToken -emailVerificationExpiry",
        );

        if (!user) {
            throw new ApiError(401, "Unauthorized request: User not found");
        }

        req.user = user;
        next();
    } catch (error) {
        throw new ApiError(401, "Invalid or expired access token");
    }
});

export const validateProjectPermission = (roles = []) => {
    return asyncHandler(async (req, res, next) => {
        const { workspaceId, projectId } = req.params;

        if (!workspaceId) throw new ApiError(400, "Workspace ID is missing");
        if (!projectId) throw new ApiError(400, "Project ID is missing");

        const { project, projectMember } = await ensureProjectMember({
            workspaceId,
            projectId,
            userId: req.user._id,
            roles,
        });

        req.project = project;
        req.projectMember = projectMember;
        req.projectRole = projectMember.role;

        next();
    });
};
