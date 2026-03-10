import { ActivityLog } from "../models/activityLog.models.js";

export const createActivityLog = async ({
    workspace = null,
    project = null,
    task = null,
    actor,
    entityType,
    action,
    message,
    meta = {},
}) => {
    return ActivityLog.create({
        workspace,
        project,
        task,
        actor,
        entityType,
        action,
        message,
        meta,
    });
};
