import { Router } from "express";
import { verifyJWT } from "../middlewares/auth.middleware.js";
import {
    getNotifications,
    markNotificationAsRead,
    markAllNotificationsAsRead,
} from "../controllers/notification.controllers.js";

const router = Router();

router.use(verifyJWT);

router.get("/notifications", getNotifications);
router.patch("/notifications/read-all", markAllNotificationsAsRead);
router.patch("/notifications/:notificationId/read", markNotificationAsRead);

export default router;
