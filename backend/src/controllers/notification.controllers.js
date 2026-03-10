import mongoose from "mongoose";
import { Notification } from "../models/notification.models.js";
import { ApiError } from "../utils/api-error.js";
import { ApiResponse } from "../utils/api-response.js";
import { asyncHandler } from "../utils/async-handler.js";

export const getNotifications = asyncHandler(async (req, res) => {
    const limit = Math.min(Number(req.query.limit) || 20, 50);

    const notifications = await Notification.find({
        user: req.user._id,
    })
        .select("-__v -updatedAt -user")
        .populate("workspace", "name")
        .populate("project", "name")
        .populate("task", "title")
        .sort({ createdAt: -1 })
        .limit(limit)
        .lean();

    const unreadCount = await Notification.countDocuments({
        user: req.user._id,
        isRead: false,
    });

    return res.status(200).json(
        new ApiResponse(
            200,
            {
                notifications,
                unreadCount,
            },
            "Notifications fetched successfully",
        ),
    );
});

export const markNotificationAsRead = asyncHandler(async (req, res) => {
    const { notificationId } = req.params;

    if (!mongoose.isValidObjectId(notificationId)) {
        throw new ApiError(400, "Invalid notificationId");
    }

    const notification = await Notification.findOneAndUpdate(
        {
            _id: notificationId,
            user: req.user._id,
        },
        {
            $set: { isRead: true },
        },
        { new: true },
    ).select("-__v -updatedAt");

    if (!notification) {
        throw new ApiError(404, "Notification not found");
    }

    return res
        .status(200)
        .json(
            new ApiResponse(
                200,
                notification,
                "Notification marked as read successfully",
            ),
        );
});

export const markAllNotificationsAsRead = asyncHandler(async (req, res) => {
    await Notification.updateMany(
        {
            user: req.user._id,
            isRead: false,
        },
        {
            $set: { isRead: true },
        },
    );

    return res
        .status(200)
        .json(
            new ApiResponse(
                200,
                null,
                "All notifications marked as read successfully",
            ),
        );
});
