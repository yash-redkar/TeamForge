import { User } from "../models/user.models.js";
import { ApiResponse } from "../utils/api-response.js";
import { ApiError } from "../utils/api-error.js";
import { asyncHandler } from "../utils/async-handler.js";
import {
    sendEmail,
    emailVerificationMailgenContent,
    forgotPasswordMailgenContent,
} from "../utils/mail.js";
import jwt from "jsonwebtoken";
import crypto from "crypto";
import { v2 as cloudinary } from "cloudinary";

const GOOGLE_OAUTH_TOKEN_URL = "https://oauth2.googleapis.com/token";
const GOOGLE_OAUTH_USERINFO_URL =
    "https://openidconnect.googleapis.com/v1/userinfo";

const getFrontendBaseUrl = () => {
    return process.env.FRONTEND_URL || "http://localhost:3000";
};

const getBackendBaseUrl = (req) => {
    const configuredBaseUrl =
        process.env.BACKEND_URL || process.env.RENDER_EXTERNAL_URL;

    if (configuredBaseUrl) {
        return configuredBaseUrl.replace(/\/+$/, "");
    }

    return `${req.protocol}://${req.get("host")}`;
};

const getGoogleRedirectUri = (req) => {
    return (
        process.env.GOOGLE_OAUTH_REDIRECT_URI ||
        `${getBackendBaseUrl(req)}/api/v1/auth/google/callback`
    );
};

const getFirstQueryValue = (value) => {
    if (Array.isArray(value)) return value[0];
    return value;
};

const getSafeNextPath = (nextPath) => {
    if (typeof nextPath !== "string") return "/dashboard";

    const trimmedPath = nextPath.trim();

    if (!trimmedPath.startsWith("/") || trimmedPath.startsWith("//")) {
        return "/dashboard";
    }

    return trimmedPath;
};

const buildGoogleState = (nextPath) => {
    return Buffer.from(
        JSON.stringify({ next: getSafeNextPath(nextPath) }),
    ).toString("base64url");
};

const readGoogleState = (state) => {
    if (!state) return { next: "/dashboard" };

    try {
        const parsedState = JSON.parse(
            Buffer.from(state, "base64url").toString("utf8"),
        );

        return {
            next: getSafeNextPath(parsedState?.next),
        };
    } catch {
        return { next: "/dashboard" };
    }
};

const generateUniqueUsername = async (baseUsername) => {
    const normalizedBase =
        baseUsername
            .replace(/[^a-zA-Z0-9_]/g, "")
            .replace(/^_+|_+$/g, "")
            .slice(0, 20) || "user";

    let candidate = normalizedBase;
    let suffix = 0;

    while (await User.exists({ username: candidate })) {
        suffix += 1;
        candidate = `${normalizedBase}${suffix}`;
    }

    return candidate;
};

const hashToken = (token) =>
    crypto.createHash("sha256").update(token).digest("hex");

const deleteCloudinaryAsset = async (publicId) => {
    if (!publicId) return;

    try {
        await cloudinary.uploader.destroy(publicId, { resource_type: "image" });
    } catch (error) {
        console.error("Failed to delete old avatar from Cloudinary:", error);
    }
};

const generateAccessandRefreshToken = async (userId) => {
    const user = await User.findById(userId);
    if (!user) throw new ApiError(404, "User not found");

    const accessToken = user.generateAccessToken();
    const refreshToken = user.generateRefreshToken();

    user.refreshTokenHash = hashToken(refreshToken);
    user.refreshTokenExpiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    await user.save({ validateBeforeSave: false });

    return { accessToken, refreshToken };
};

const refreshCookieOptions = {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
    path: "/api/v1/auth",
    maxAge: 7 * 24 * 60 * 60 * 1000,
};

const registerUser = asyncHandler(async (req, res) => {
    const { email, username, password } = req.body;

    const existingUser = await User.findOne({
        $or: [{ username: username }, { email: email }],
    });

    if (existingUser) {
        throw new ApiError(
            409,
            "User with email or username already exists",
            [],
        );
    }

    const user = await User.create({
        email,
        password,
        username,
        authProvider: "local",
        isEmailVerified: false,
    });

    const { unHashedToken, hashedToken, tokenExpiry } =
        user.generateTemporaryToken();

    user.emailVerificationToken = hashedToken;
    user.emailVerificationExpiry = tokenExpiry;

    await user.save({ validateBeforeSave: false });

    await sendEmail({
        email: user?.email,
        subject: "Please verify your Email",
        mailgenContent: emailVerificationMailgenContent(
            user.username,
            `${req.protocol}://${req.get("host")}/api/v1/auth/verify-email/${unHashedToken}`,
        ),
    });

    const createdUser = await User.findById(user._id).select(
        "-password -refreshTokenHash -refreshTokenExpiresAt -emailVerificationToken -emailVerificationExpiry",
    );

    if (!createdUser) {
        throw new ApiError(
            500,
            "Something went wrong while registering a user",
        );
    }

    return res
        .status(201)
        .json(
            new ApiResponse(
                201,
                { user: createdUser },
                "User registered successfully and verification email has been sent on your email",
            ),
        );
});

const login = asyncHandler(async (req, res) => {
    const { email, password, username } = req.body;

    if (!username && !email) {
        throw new ApiError(400, "Username or email is required");
    }

    const user = await User.findOne({
        $or: [{ email }, { username }],
    });

    if (!user) {
        throw new ApiError(404, "User not found");
    }

    const isPasswordValid = await user.isPasswordCorrect(password);

    if (!isPasswordValid) {
        throw new ApiError(401, "Invalid credentials");
    }

    const { accessToken, refreshToken } = await generateAccessandRefreshToken(
        user._id,
    );

    const loggedInUser = await User.findById(user._id).select(
        "-password -refreshTokenHash -refreshTokenExpiresAt -emailVerificationToken -emailVerificationExpiry",
    );

    return res
        .status(200)
        .cookie("refreshToken", refreshToken, refreshCookieOptions)
        .json(
            new ApiResponse(
                200,
                { user: loggedInUser, accessToken },
                "User logged in Successfully",
            ),
        );
});

const googleLogin = asyncHandler(async (req, res) => {
    const clientId = process.env.GOOGLE_CLIENT_ID;
    const redirectUri = getGoogleRedirectUri(req);
    const nextPath = getSafeNextPath(req.query?.next);

    if (!clientId) {
        throw new ApiError(500, "Google login is not configured");
    }

    const authUrl = new URL("https://accounts.google.com/o/oauth2/v2/auth");
    authUrl.searchParams.set("client_id", clientId);
    authUrl.searchParams.set("redirect_uri", redirectUri);
    authUrl.searchParams.set("response_type", "code");
    authUrl.searchParams.set("scope", "openid email profile");
    authUrl.searchParams.set("access_type", "offline");
    authUrl.searchParams.set("prompt", "select_account");
    authUrl.searchParams.set("state", buildGoogleState(nextPath));

    return res.redirect(authUrl.toString());
});

const googleLoginCallback = asyncHandler(async (req, res) => {
    const clientId = process.env.GOOGLE_CLIENT_ID;
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
    const redirectUri = getGoogleRedirectUri(req);

    if (!clientId || !clientSecret) {
        throw new ApiError(500, "Google login is not configured");
    }

    const code = getFirstQueryValue(req.query.code);
    const state = getFirstQueryValue(req.query.state);
    const error = getFirstQueryValue(req.query.error);
    const { next } = readGoogleState(state);

    if (error) {
        const errorUrl = new URL(
            "/login/google/callback",
            getFrontendBaseUrl(),
        );
        errorUrl.searchParams.set("error", "google_oauth_denied");
        errorUrl.searchParams.set("next", next);
        return res.redirect(errorUrl.toString());
    }

    if (!code) {
        throw new ApiError(400, "Google authorization code is missing");
    }

    const tokenResponse = await fetch(GOOGLE_OAUTH_TOKEN_URL, {
        method: "POST",
        headers: {
            "Content-Type": "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams({
            code,
            client_id: clientId,
            client_secret: clientSecret,
            redirect_uri: redirectUri,
            grant_type: "authorization_code",
        }),
    });

    if (!tokenResponse.ok) {
        const tokenError = await tokenResponse.text();
        throw new ApiError(401, tokenError || "Failed to exchange Google code");
    }

    const tokenData = await tokenResponse.json();

    const profileResponse = await fetch(GOOGLE_OAUTH_USERINFO_URL, {
        headers: {
            Authorization: `Bearer ${tokenData.access_token}`,
        },
    });

    if (!profileResponse.ok) {
        const profileError = await profileResponse.text();
        throw new ApiError(
            401,
            profileError || "Failed to fetch Google profile",
        );
    }

    const profile = await profileResponse.json();

    if (!profile?.email) {
        throw new ApiError(400, "Google account email is missing");
    }

    const googleId = profile?.sub ? String(profile.sub) : "";

    let user = googleId ? await User.findOne({ googleId }) : null;

    if (!user) {
        user = await User.findOne({ email: profile.email });
    }

    if (!user) {
        const fullName = profile.name || "User";
        const username = await generateUniqueUsername(fullName);

        user = await User.create({
            email: profile.email,
            username,
            fullName,
            password: crypto.randomUUID(),
            authProvider: "google",
            googleId: googleId || undefined,
            isEmailVerified: true,
            avatar: {
                url: profile.picture || "https://placehold.co/200x200",
                localPath: "",
            },
        });
    } else {
        user.authProvider = "google";

        if (googleId && !user.googleId) {
            user.googleId = googleId;
        }

        user.fullName = profile.name || user.fullName || user.username;
        user.isEmailVerified = true;

        if (profile.picture) {
            user.avatar = {
                ...(user.avatar || {}),
                url: profile.picture,
            };
        }

        await user.save({ validateBeforeSave: false });
    }

    const { accessToken, refreshToken } = await generateAccessandRefreshToken(
        user._id,
    );

    const frontendCallbackUrl = new URL(
        "/login/google/callback",
        getFrontendBaseUrl(),
    );
    frontendCallbackUrl.searchParams.set("accessToken", accessToken);
    frontendCallbackUrl.searchParams.set("next", next);

    return res
        .status(200)
        .cookie("refreshToken", refreshToken, refreshCookieOptions)
        .redirect(frontendCallbackUrl.toString());
});

const logoutUser = asyncHandler(async (req, res) => {
    await User.findByIdAndUpdate(req.user._id, {
        $unset: { refreshTokenHash: 1, refreshTokenExpiresAt: 1 },
    });

    return res
        .status(200)
        .clearCookie("refreshToken", refreshCookieOptions)
        .json(new ApiResponse(200, {}, "User logged out"));
});

const getCurrentUser = asyncHandler(async (req, res) => {
    return res
        .status(200)
        .json(
            new ApiResponse(200, req.user, "Current user fetched successfully"),
        );
});

const verifyEmail = asyncHandler(async (req, res) => {
    const { verificationToken } = req.params;

    if (!verificationToken) {
        throw new ApiError(400, "Email verification token is missing");
    }

    const hashedToken = crypto
        .createHash("sha256")
        .update(verificationToken)
        .digest("hex");

    const user = await User.findOne({
        emailVerificationToken: hashedToken,
        emailVerificationExpiry: { $gt: Date.now() },
    });

    if (!user) {
        return res.redirect(
            `${process.env.FRONTEND_URL}/settings?verified=failed`,
        );
    }

    user.emailVerificationToken = undefined;
    user.emailVerificationExpiry = undefined;
    user.isEmailVerified = true;

    await user.save({ validateBeforeSave: false });

    return res.redirect(`${process.env.FRONTEND_URL}/settings?verified=true`);
});

const resendEmailVerification = asyncHandler(async (req, res) => {
    const user = await User.findById(req.user?._id);

    if (!user) {
        throw new ApiError(404, "User does not exists");
    }
    if (user.isEmailVerified) {
        throw new ApiError(409, "Email is already verified");
    }

    const { unHashedToken, hashedToken, tokenExpiry } =
        user.generateTemporaryToken();

    user.emailVerificationToken = hashedToken;
    user.emailVerificationExpiry = tokenExpiry;

    await user.save({ validateBeforeSave: false });

    await sendEmail({
        email: user?.email,
        subject: "Please verify your Email",
        mailgenContent: emailVerificationMailgenContent(
            user.username,
            `${req.protocol}://${req.get("host")}/api/v1/auth/verify-email/${unHashedToken}`,
        ),
    });

    return res
        .status(200)
        .json(
            new ApiResponse(
                200,
                {},
                "Verification email has been sent successfully",
            ),
        );
});

const refreshAccessToken = asyncHandler(async (req, res) => {
    const incomingRefreshToken =
        req.cookies.refreshToken || req.body.refreshToken;

    if (!incomingRefreshToken) {
        throw new ApiError(401, "Unauthorized access");
    }

    let decodedToken;
    try {
        decodedToken = jwt.verify(
            incomingRefreshToken,
            process.env.REFRESH_TOKEN_SECRET,
        );
    } catch (err) {
        throw new ApiError(401, "Invalid refresh token");
    }

    const user = await User.findById(decodedToken?._id);
    if (!user) {
        throw new ApiError(401, "Invalid refresh token");
    }

    // expiry check (recommended)
    if (user.refreshTokenExpiresAt && user.refreshTokenExpiresAt < new Date()) {
        throw new ApiError(401, "Refresh token expired");
    }

    // HASH compare (production)
    const incomingHash = hashToken(incomingRefreshToken);

    if (!user.refreshTokenHash || incomingHash !== user.refreshTokenHash) {
        // possible reuse / stolen token → invalidate
        user.refreshTokenHash = undefined;
        user.refreshTokenExpiresAt = undefined;
        await user.save({ validateBeforeSave: false });

        throw new ApiError(401, "Refresh token is invalid or has been used");
    }

    // rotate refresh token + new access token
    const { accessToken, refreshToken: newRefreshToken } =
        await generateAccessandRefreshToken(user._id);

    return res
        .status(200)
        .cookie("refreshToken", newRefreshToken, refreshCookieOptions)
        .json(new ApiResponse(200, { accessToken }, "Access token refreshed"));
});

const forgotPasswordRequest = asyncHandler(async (req, res) => {
    const { email } = req.body;

    const user = await User.findOne({ email });

    if (!user) {
        throw new ApiError(404, "User does not exist", []);
    }

    const { unHashedToken, hashedToken, tokenExpiry } =
        user.generateTemporaryToken();

    user.forgotPasswordToken = hashedToken;
    user.forgotPasswordExpiry = tokenExpiry;

    await user.save({ validateBeforeSave: false });

    await sendEmail({
        email: user?.email,
        subject: "Password Reset request",
        mailgenContent: forgotPasswordMailgenContent(
            user.username,
            `${process.env.FORGOT_PASSWORD_REDIRECT_URL}/${unHashedToken}`,
        ),
    });

    return res
        .status(200)
        .json(
            new ApiResponse(
                200,
                {},
                "Password reset mail has been sent on your mail id",
            ),
        );
});

const resetForgotPassword = asyncHandler(async (req, res) => {
    const { resetToken } = req.params;
    const { newPassword } = req.body;

    let hashedToken = crypto
        .createHash("sha256")
        .update(resetToken)
        .digest("hex");

    const user = await User.findOne({
        forgotPasswordToken: hashedToken,
        forgotPasswordExpiry: { $gt: Date.now() },
    });

    if (!user) {
        throw new ApiError(400, "Token is invalid or expired");
    }

    user.forgotPasswordExpiry = undefined;
    user.forgotPasswordToken = undefined;

    user.password = newPassword;
    await user.save({ validateBeforeSave: false });

    return res
        .status(200)
        .json(new ApiResponse(200, {}, "Password reset successfully"));
});

const changeCurrentPassword = asyncHandler(async (req, res) => {
    const { oldPassword, newPassword } = req.body;

    const user = await User.findById(req.user?._id);
    const canSkipOldPasswordCheck =
        user?.authProvider === "google" || Boolean(user?.googleId);

    if (!user) {
        throw new ApiError(404, "User not found");
    }

    if (!canSkipOldPasswordCheck) {
        const isPasswordValid = await user.isPasswordCorrect(oldPassword);

        if (!isPasswordValid) {
            throw new ApiError(400, "Invalid old password");
        }
    }

    user.password = newPassword;

    if (canSkipOldPasswordCheck) {
        user.authProvider = "local";
    }

    await user.save({ validateBeforeSave: false });

    return res
        .status(200)
        .json(new ApiResponse(200, {}, "Password changed successfully"));
});

const updateAccountDetails = asyncHandler(async (req, res) => {
    const { fullName, username } = req.body;

    const updateData = {};

    if (fullName) {
        updateData.fullName = fullName.trim();
    }

    if (username) {
        const normalizedUsername = username
            .replace(/[^a-zA-Z0-9_]/g, "")
            .replace(/^_+|_+$/g, "")
            .slice(0, 30)
            .trim();

        if (!normalizedUsername) {
            throw new ApiError(400, "Username must contain valid characters");
        }

        const existingUser = await User.findOne({
            username: normalizedUsername,
            _id: { $ne: req.user?._id },
        });

        if (existingUser) {
            throw new ApiError(409, "Username already taken");
        }

        updateData.username = normalizedUsername;
    }

    if (Object.keys(updateData).length === 0) {
        throw new ApiError(400, "Nothing to update");
    }

    const user = await User.findByIdAndUpdate(
        req.user?._id,
        {
            $set: updateData,
        },
        {
            new: true,
            runValidators: true,
        },
    ).select(
        "-password -refreshTokenHash -refreshTokenExpiresAt -emailVerificationToken -emailVerificationExpiry -forgotPasswordToken -forgotPasswordExpiry",
    );

    if (!user) {
        throw new ApiError(404, "User not found");
    }

    return res
        .status(200)
        .json(
            new ApiResponse(200, user, "Account details updated successfully"),
        );
});

const uploadAvatar = asyncHandler(async (req, res) => {
    const uploadedAvatar = req.uploadedFiles?.[0];

    if (!uploadedAvatar) {
        throw new ApiError(400, "Avatar image file is required");
    }

    if (!uploadedAvatar.mimetype?.startsWith("image/")) {
        throw new ApiError(400, "Only image files are allowed for avatar");
    }

    const existingUser = await User.findById(req.user?._id).select("avatar");

    if (!existingUser) {
        throw new ApiError(404, "User not found");
    }

    const previousAvatarPublicId = existingUser.avatar?.localPath || "";

    const user = await User.findByIdAndUpdate(
        req.user?._id,
        {
            $set: {
                avatar: {
                    url: uploadedAvatar.url,
                    localPath: uploadedAvatar.public_id,
                },
            },
        },
        {
            new: true,
            runValidators: true,
        },
    ).select(
        "-password -refreshTokenHash -refreshTokenExpiresAt -emailVerificationToken -emailVerificationExpiry -forgotPasswordToken -forgotPasswordExpiry",
    );

    if (!user) {
        throw new ApiError(404, "User not found");
    }

    if (
        previousAvatarPublicId &&
        previousAvatarPublicId !== uploadedAvatar.public_id
    ) {
        await deleteCloudinaryAsset(previousAvatarPublicId);
    }

    return res
        .status(200)
        .json(new ApiResponse(200, user, "Avatar updated successfully"));
});

export {
    registerUser,
    login,
    googleLogin,
    googleLoginCallback,
    logoutUser,
    getCurrentUser,
    verifyEmail,
    resendEmailVerification,
    refreshAccessToken,
    forgotPasswordRequest,
    resetForgotPassword,
    changeCurrentPassword,
    updateAccountDetails,
    uploadAvatar,
};
