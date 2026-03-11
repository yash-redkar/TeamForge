import { Router } from "express";
import {
    getTasks,
    createTask,
    getTaskById,
    updateTask,
    deleteTask,
    createSubTask,
    updateSubTask,
    deleteSubTask,
    removeAttachment,
    getKanbanBoard,
} from "../controllers/task.controllers.js";

import {
    verifyJWT,
    validateProjectPermission,
} from "../middlewares/auth.middleware.js";
import {
    upload,
    uploadToCloudinary,
} from "../middlewares/multer.middleware.js";
import { validate } from "../middlewares/validator.middleware.js";
import { AvailableUserRole, UserRolesEnum } from "../utils/constants.js";
import {
    createTaskValidator,
    updateTaskValidator,
    createSubTaskValidator,
    updateSubTaskValidator,
} from "../validators/index.js";
import taskCommentRoutes from "./taskcomment.routes.js";

const router = Router({ mergeParams: true });
router.use(verifyJWT);

// LIST + CREATE  (GET /tasks, POST /tasks)
router
    .route("/")
    .get(validateProjectPermission(AvailableUserRole), getTasks)
    .post(
        validateProjectPermission([UserRolesEnum.ADMIN, UserRolesEnum.MEMBER]),
        upload.array("attachments", 5),
        uploadToCloudinary,
        createTaskValidator(),
        validate,
        createTask,
    );

// KANBAN BOARD (GET /tasks/board)
router.get(
  "/board",
  validateProjectPermission(AvailableUserRole),
  getKanbanBoard
);

// SINGLE TASK (GET/PUT/DELETE /tasks/:taskId)
router
    .route("/:taskId")
    .get(validateProjectPermission(AvailableUserRole), getTaskById)
    .put(
        validateProjectPermission([UserRolesEnum.ADMIN, UserRolesEnum.MEMBER]),
        upload.array("attachments", 5),
        uploadToCloudinary,
        updateTaskValidator(),
        validate,
        updateTask,
    )
    .delete(validateProjectPermission([UserRolesEnum.ADMIN]), deleteTask);

// ATTACHMENT DELETE  (/tasks/:taskId/attachments/:attachmentId)
router
    .route("/:taskId/attachments/:attachmentId")
    .delete(
        validateProjectPermission([UserRolesEnum.ADMIN, UserRolesEnum.MEMBER]),
        removeAttachment,
    );

// SUBTASKS  (/tasks/:taskId/subtasks)
router
    .route("/:taskId/subtasks")
    .post(
        validateProjectPermission([UserRolesEnum.ADMIN, UserRolesEnum.MEMBER]),
        createSubTaskValidator(),
        validate,
        createSubTask,
    );

// SUBTASK UPDATE/DELETE  (/tasks/:taskId/subtasks/:subtaskId)
router
    .route("/:taskId/subtasks/:subtaskId")
    .put(
        validateProjectPermission([UserRolesEnum.ADMIN, UserRolesEnum.MEMBER]),
        updateSubTaskValidator(),
        validate,
        updateSubTask,
    )
    .delete(validateProjectPermission([UserRolesEnum.ADMIN]), deleteSubTask);

router.use(
    "/:taskId/comments",
    validateProjectPermission(AvailableUserRole),
    taskCommentRoutes,
);


export default router;