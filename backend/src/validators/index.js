import { body } from "express-validator";
import { AvailableTaskStatus, AvailableUserRole } from "../utils/constants.js";

const passwordValidator = (
    fieldName = "password",
    requiredMessage = "Password is required",
) => {
    return body(fieldName)
        .trim()
        .notEmpty()
        .withMessage(requiredMessage)
        .isLength({ min: 6 })
        .withMessage("Password must be at least 6 characters long")
        .matches(/^(?=.*[A-Za-z])(?=.*\d)[A-Za-z\d@$!%*?&]{6,}$/)
        .withMessage("Password must contain letters and numbers");
};

const userRegisterValidator = () => {
    return [
        body("email")
            .trim()
            .notEmpty()
            .withMessage("Email is required")
            .isEmail()
            .withMessage("Email is invalid"),
        body("username")
            .trim()
            .notEmpty()
            .withMessage("Username is required")
            .isLowercase()
            .withMessage("Username must be in lowercase")
            .isLength({ min: 3 })
            .withMessage("Username must be atleast 3 characters long"),
        passwordValidator("password"),
        body("fullName")
            .optional()
            .trim()
            .isLength({ min: 3, max: 50 })
            .withMessage("Full name must be between 3 and 50 characters long"),
    ];
};

const userLoginValidator = () => {
    return [
        body().custom((value, { req }) => {
            const hasEmail = Boolean(req.body?.email);
            const hasUsername = Boolean(req.body?.username);

            if (!hasEmail && !hasUsername) {
                throw new Error("Username or email is required");
            }

            return true;
        }),
        body("email")
            .optional()
            .trim()
            .isEmail()
            .withMessage("Email is invalid"),
        body("username")
            .optional()
            .trim()
            .isLowercase()
            .withMessage("Username must be in lowercase")
            .isLength({ min: 3 })
            .withMessage("Username must be atleast 3 characters long"),
        passwordValidator("password"),
    ];
};

const userChangedCurrentPasswordValidator = () => {
    return [
        body("oldPassword")
            .trim()
            .notEmpty()
            .withMessage("Old password is required"),
        passwordValidator("newPassword", "New password is required"),
    ];
};

const userForgotPasswordValidator = () => {
    return [
        body("email")
            .trim()
            .notEmpty()
            .withMessage("Email is required")
            .isEmail()
            .withMessage("Email is invalid"),
    ];
};

const userResetForgotPasswordValidator = () => {
    return [passwordValidator("newPassword")];
};

const createProjectValidator = () => {
    return [
        body("name")
            .trim()
            .notEmpty()
            .withMessage("Project name is required")
            .isLength({ min: 3, max: 100 })
            .withMessage(
                "Project name must be between 3 and 100 characters long",
            ),
        body("description")
            .optional()
            .trim()
            .isLength({ max: 500 })
            .withMessage(
                "Project description must be less than 500 characters long",
            ),
    ];
};

const addMemberToProjectValidator = () => {
    return [
        body("email")
            .trim()
            .notEmpty()
            .withMessage("Email is required")
            .isEmail()
            .withMessage("Email is invalid"),
        body("role")
            .trim()
            .notEmpty()
            .withMessage("Role is required")
            .isIn(AvailableUserRole)
            .withMessage(
                `Role must be one of the following: ${AvailableUserRole.join(", ")}`,
            ),
    ];
};

const createTaskValidator = () => {
    return [
        body("title")
            .trim()
            .notEmpty()
            .withMessage("Title is required")
            .isLength({ min: 3, max: 200 })
            .withMessage("Title must be between 3 and 200 characters long"),
        body("description")
            .optional()
            .trim()
            .isLength({ max: 2000 })
            .withMessage("Description must be less than 2000 characters long"),
        body("assignedTo")
            .optional({ nullable: true })
            .custom((value) => {
                if (value === null || value === undefined) return true;
                if (
                    typeof value === "string" &&
                    value.trim().toLowerCase() === "null"
                ) {
                    return true;
                }
                return /^[0-9a-fA-F]{24}$/.test(String(value));
            })
            .withMessage("Assigned user must be a valid user id"),
    ];
};

const updateTaskValidator = () => {
    return [
        body("title")
            .optional()
            .trim()
            .notEmpty()
            .withMessage("Title cannot be empty")
            .isLength({ min: 3, max: 200 })
            .withMessage("Title must be between 3 and 200 characters long"),
        body("description")
            .optional()
            .trim()
            .isLength({ max: 2000 })
            .withMessage("Description must be less than 2000 characters long"),
        body("status")
            .optional()
            .isIn(AvailableTaskStatus)
            .withMessage(
                `Status must be one of the following: ${AvailableTaskStatus.join(", ")}`,
            ),
        body("assignedTo")
            .optional({ nullable: true })
            .custom((value) => {
                if (value === null || value === undefined) return true;
                if (
                    typeof value === "string" &&
                    value.trim().toLowerCase() === "null"
                ) {
                    return true;
                }
                return /^[0-9a-fA-F]{24}$/.test(String(value));
            })
            .withMessage("Assigned user must be a valid user id"),
    ];
};

const createSubTaskValidator = () => {
    return [
        body("title")
            .trim()
            .notEmpty()
            .withMessage("Title is required")
            .isLength({ min: 3, max: 200 })
            .withMessage("Title must be between 3 and 200 characters long"),
    ];
};

const updateSubTaskValidator = () => {
    return [
        body("title")
            .optional()
            .trim()
            .notEmpty()
            .withMessage("Title cannot be empty")
            .isLength({ min: 3, max: 200 })
            .withMessage("Title must be between 3 and 200 characters long"),
        body("isCompleted")
            .optional()
            .isBoolean()
            .withMessage("isCompleted must be a boolean"),
    ];
};

const createTaskCommentValidator = () => {
    return [
        body("content")
            .trim()
            .notEmpty()
            .withMessage("Comment content is required")
            .isLength({ min: 1, max: 2000 })
            .withMessage(
                "Comment content must be between 1 and 2000 characters long",
            ),

        body("mentions")
            .optional()
            .isArray()
            .withMessage("Mentions must be an array"),

        body("mentions.*")
            .optional()
            .isMongoId()
            .withMessage("Each mentioned user must be a valid user id"),
    ];
};

const updateTaskCommentValidator = () => {
    return [
        body("content")
            .trim()
            .notEmpty()
            .withMessage("Comment content is required")
            .isLength({ min: 1, max: 2000 })
            .withMessage(
                "Comment content must be between 1 and 2000 characters long",
            ),

        body("mentions")
            .optional()
            .isArray()
            .withMessage("Mentions must be an array"),

        body("mentions.*")
            .optional()
            .isMongoId()
            .withMessage("Each mentioned user must be a valid user id"),
    ];
};

export {
    userRegisterValidator,
    userLoginValidator,
    userChangedCurrentPasswordValidator,
    userForgotPasswordValidator,
    userResetForgotPasswordValidator,
    createProjectValidator,
    addMemberToProjectValidator,
    createTaskValidator,
    updateTaskValidator,
    createSubTaskValidator,
    updateSubTaskValidator,
    createTaskCommentValidator,
    updateTaskCommentValidator,
};
