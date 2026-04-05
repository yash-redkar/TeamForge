import crypto from "crypto";
import Razorpay from "razorpay";
import { Workspace } from "../models/workspace.models.js";
import { WorkspaceMember } from "../models/workspacemember.models.js";
import { ApiError } from "../utils/api-error.js";
import { ApiResponse } from "../utils/api-response.js";
import { asyncHandler } from "../utils/async-handler.js";
import { WorkspaceRolesEnum } from "../utils/constants.js";

const PLAN_PRICING = {
    free: 0,
    pro: 500,
    business: 1000,
};

const PAID_PLANS = new Set(["pro", "business"]);
const CURRENCY = "INR";

function getRazorpayClient() {
    const keyId = process.env.RAZORPAY_KEY_ID;
    const keySecret = process.env.RAZORPAY_KEY_SECRET;

    if (!keyId || !keySecret) {
        throw new ApiError(500, "Razorpay is not configured on the server.");
    }

    return new Razorpay({
        key_id: keyId,
        key_secret: keySecret,
    });
}

function getAmountInPaise(plan) {
    const price = PLAN_PRICING[plan];
    if (typeof price !== "number") {
        throw new ApiError(400, "Invalid plan selected.");
    }

    return Math.round(price * 100);
}

function serializeWorkspaceBilling(workspace) {
    const currentPlan = workspace.plan || "free";
    const billingCycle = workspace.billingCycle || "monthly";

    return {
        currentPlan,
        billingCycle,
        price: PLAN_PRICING[currentPlan] ?? 0,
        currency: CURRENCY,
        isPaidPlan: PAID_PLANS.has(currentPlan),
        paymentGateway: "razorpay",
    };
}

async function assertWorkspaceAdmin(workspaceId, userId) {
    const membership = await WorkspaceMember.findOne({
        workspace: workspaceId,
        user: userId,
        status: "active",
    }).lean();

    if (!membership) {
        throw new ApiError(
            403,
            "You do not have permission to manage billing for this workspace.",
        );
    }

    const allowedRoles = [WorkspaceRolesEnum.OWNER, WorkspaceRolesEnum.ADMIN];

    if (!allowedRoles.includes(String(membership.role || ""))) {
        throw new ApiError(
            403,
            "You do not have permission to manage billing for this workspace.",
        );
    }
}

export const getWorkspaceBillingSummary = asyncHandler(async (req, res) => {
    const { workspaceId } = req.params;

    const workspace = await Workspace.findById(workspaceId).lean();

    if (!workspace) {
        throw new ApiError(404, "Workspace not found.");
    }

    await assertWorkspaceAdmin(workspaceId, req.user._id);

    return res.status(200).json(
        new ApiResponse(
            200,
            {
                workspaceId: workspace._id,
                workspaceName: workspace.name,
                ...serializeWorkspaceBilling(workspace),
            },
            "Workspace billing summary fetched successfully.",
        ),
    );
});

export const createWorkspaceBillingOrder = asyncHandler(async (req, res) => {
    const { workspaceId } = req.params;
    const { plan } = req.body;

    const normalizedPlan =
        typeof plan === "string" ? plan.trim().toLowerCase() : "";

    if (!PAID_PLANS.has(normalizedPlan)) {
        throw new ApiError(400, "Select a paid plan to continue.");
    }

    const workspace = await Workspace.findById(workspaceId);
    if (!workspace) {
        throw new ApiError(404, "Workspace not found.");
    }

    await assertWorkspaceAdmin(workspaceId, req.user._id);

    const amount = getAmountInPaise(normalizedPlan);
    const razorpay = getRazorpayClient();

    const shortWorkspaceId = workspace._id.toString().slice(-8);
    const shortTs = Date.now().toString().slice(-8);
    const receipt = `ws_${shortWorkspaceId}_${shortTs}`;

    try {
        const order = await razorpay.orders.create({
            amount,
            currency: CURRENCY,
            receipt,
            notes: {
                workspaceId: workspace._id.toString(),
                plan: normalizedPlan,
            },
        });

        return res.status(200).json(
            new ApiResponse(
                200,
                {
                    orderId: order.id,
                    amount: order.amount,
                    currency: order.currency,
                    workspaceId: workspace._id,
                    workspaceName: workspace.name,
                    plan: normalizedPlan,
                    keyId: process.env.RAZORPAY_KEY_ID,
                    customerName:
                        req.user.fullName ||
                        req.user.username ||
                        "TeamForge User",
                    customerEmail: req.user.email,
                },
                "Razorpay order created successfully.",
            ),
        );
    } catch (err) {
        console.error("Razorpay order error:", err);
        throw new ApiError(
            400,
            err?.error?.description || "Failed to create Razorpay order.",
        );
    }
});

export const verifyWorkspaceBillingPayment = asyncHandler(async (req, res) => {
    const { workspaceId } = req.params;
    const { plan, razorpayOrderId, razorpayPaymentId, razorpaySignature } =
        req.body;

    const normalizedPlan =
        typeof plan === "string" ? plan.trim().toLowerCase() : "";

    if (!PAID_PLANS.has(normalizedPlan)) {
        throw new ApiError(400, "Select a paid plan to continue.");
    }

    if (!razorpayOrderId || !razorpayPaymentId || !razorpaySignature) {
        throw new ApiError(400, "Missing Razorpay payment details.");
    }

    const workspace = await Workspace.findById(workspaceId);
    if (!workspace) {
        throw new ApiError(404, "Workspace not found.");
    }

    await assertWorkspaceAdmin(workspaceId, req.user._id);

    const expectedSignature = crypto
        .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
        .update(`${razorpayOrderId}|${razorpayPaymentId}`)
        .digest("hex");

    if (expectedSignature !== razorpaySignature) {
        throw new ApiError(400, "Razorpay payment verification failed.");
    }

    workspace.plan = normalizedPlan;
    workspace.billingCycle = "monthly";
    workspace.updatedBy = req.user._id;

    await workspace.save();

    return res.status(200).json(
        new ApiResponse(
            200,
            {
                workspaceId: workspace._id,
                workspaceName: workspace.name,
                currentPlan: workspace.plan,
                billingCycle: workspace.billingCycle,
                price: PLAN_PRICING[workspace.plan] ?? 0,
                currency: CURRENCY,
                isPaidPlan: PAID_PLANS.has(workspace.plan),
                paymentGateway: "razorpay",
            },
            "Workspace plan activated successfully.",
        ),
    );
});

export const updateWorkspaceBillingPlan = asyncHandler(async (req, res) => {
    const { workspaceId } = req.params;
    const { plan } = req.body;

    const normalizedPlan =
        typeof plan === "string" ? plan.trim().toLowerCase() : "";

    if (!Object.prototype.hasOwnProperty.call(PLAN_PRICING, normalizedPlan)) {
        throw new ApiError(400, "Invalid plan selected.");
    }

    const workspace = await Workspace.findById(workspaceId);
    if (!workspace) {
        throw new ApiError(404, "Workspace not found.");
    }

    await assertWorkspaceAdmin(workspaceId, req.user._id);

    if (PAID_PLANS.has(normalizedPlan)) {
        throw new ApiError(
            400,
            "Use Razorpay checkout to activate a paid plan.",
        );
    }

    workspace.plan = normalizedPlan;
    workspace.billingCycle = "monthly";
    workspace.updatedBy = req.user._id;

    await workspace.save();

    return res.status(200).json(
        new ApiResponse(
            200,
            {
                workspaceId: workspace._id,
                workspaceName: workspace.name,
                currentPlan: workspace.plan,
                billingCycle: workspace.billingCycle,
                price: PLAN_PRICING[workspace.plan] ?? 0,
                currency: CURRENCY,
                isPaidPlan: PAID_PLANS.has(workspace.plan),
                paymentGateway: "razorpay",
            },
            "Workspace plan updated successfully.",
        ),
    );
});
