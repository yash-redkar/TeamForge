import { Notification } from "../models/notification.models.js";
import { getIO } from "../socket/index.js";

export const createNotification = async ({
    user,
    workspace = null,
    project = null,
    task = null,
    type,
    message,
    meta = {},
}) => {
    const notification = await Notification.create({
        user,
        workspace,
        project,
        task,
        type,
        message,
        meta,
    });

    try {
        const io = getIO();

        io.to(user.toString()).emit("notification", {
            _id: notification._id,
            type,
            message,
            workspace,
            project,
            task,
            meta,
            createdAt: notification.createdAt,
        });
    } catch (error) {
        console.log("Socket notification emit failed:", error.message);
    }

    return notification;
};
