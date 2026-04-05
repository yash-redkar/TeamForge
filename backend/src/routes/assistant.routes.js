import { Router } from "express";
import { verifyJWT } from "../middlewares/auth.middleware.js";
import { queryWorkspaceAssistant } from "../controllers/assistant.controllers.js";

const router = Router();

router.use(verifyJWT);

router.post("/query", queryWorkspaceAssistant);

export default router;
