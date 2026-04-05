import { Router } from "express";
import { verifyJWT } from "../middlewares/auth.middleware.js";
import { validate } from "../middlewares/validator.middleware.js";
import { createWorkspaceValidator } from "../validators/workspace.validators.js";
import {
    createWorkspace,
    getMyWorkspaces,
    leaveWorkspace,
    transferWorkspaceOwnership,
} from "../controllers/workspace.controllers.js";
import { getWorkspaceTasks } from "../controllers/task.controllers.js";
import workspaceMemberRouter from "./workspaceMember.routes.js";
import workspaceProjectRouter from "./workspaceProject.routes.js";
import {
    getWorkspaceBillingSummary,
    createWorkspaceBillingOrder,
    verifyWorkspaceBillingPayment,
    updateWorkspaceBillingPlan,
} from "../controllers/billing.controllers.js";

const router = Router();

router.use(verifyJWT);

router
    .route("/")
    .post(createWorkspaceValidator(), validate, createWorkspace)
    .get(getMyWorkspaces);

router.post("/:workspaceId/leave", leaveWorkspace);

router.patch("/:workspaceId/transfer-ownership", transferWorkspaceOwnership);

router.get("/:workspaceId/tasks", getWorkspaceTasks);
router.get("/:workspaceId/billing-summary", getWorkspaceBillingSummary);
router.post("/:workspaceId/billing/order", createWorkspaceBillingOrder);
router.post("/:workspaceId/billing/verify", verifyWorkspaceBillingPayment);
router.put("/:workspaceId/billing/plan", updateWorkspaceBillingPlan);

router.use("/:workspaceId/members", workspaceMemberRouter);
router.use("/:workspaceId/projects", workspaceProjectRouter);

export default router;
