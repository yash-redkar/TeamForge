import { Router } from "express";
import { verifyJWT } from "../middlewares/auth.middleware.js";
import {
    getWorkspaceActivity,
    getProjectActivity,
} from "../controllers/activity.controllers.js";

const router = Router();

router.use(verifyJWT);

router.get("/workspaces/:workspaceId/activity", getWorkspaceActivity);
router.get("/projects/:projectId/activity", getProjectActivity);

export default router;
