import { Router } from "express";
import {
    createComment,
    getComments,
    updateComment,
    deleteComment,
} from "../controllers/taskcomment.controllers.js";
import {
    validateProjectPermission,
} from "../middlewares/auth.middleware.js";
import { validate } from "../middlewares/validator.middleware.js";
import { AvailableUserRole, UserRolesEnum } from "../utils/constants.js";
import {
    createTaskCommentValidator,
    updateTaskCommentValidator,
} from "../validators/index.js";

const router = Router({ mergeParams: true });

router
    .route("/")
    .get(validateProjectPermission(AvailableUserRole), getComments)
    .post(
        validateProjectPermission([UserRolesEnum.ADMIN, UserRolesEnum.MEMBER]),
        createTaskCommentValidator(),
        validate,
        createComment,
    );

router
    .route("/:commentId")
    .patch(
        validateProjectPermission([UserRolesEnum.ADMIN, UserRolesEnum.MEMBER]),
        updateTaskCommentValidator(),
        validate,
        updateComment,
    )
    .delete(
        validateProjectPermission([UserRolesEnum.ADMIN, UserRolesEnum.MEMBER]),
        deleteComment,
    );

export default router;
