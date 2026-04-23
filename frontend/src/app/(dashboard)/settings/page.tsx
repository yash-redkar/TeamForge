"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import {
  User,
  Bell,
  Palette,
  Shield,
  Camera,
  Mail,
  Smartphone,
  Globe,
  Moon,
  Sun,
  Monitor,
  Key,
  CheckCircle2,
  AlertCircle,
  Users,
  CreditCard,
  Crown,
  UserPlus,
  Trash2,
  RefreshCw,
} from "lucide-react";
import { authService } from "@/services/auth.service";
import { workspaceService } from "@/services/workspace.service";
import { projectService } from "@/services/project.service";
import { InviteWorkspaceMemberModal } from "@/components/workspace/invite-workspace-member-modal";
import { ThemeToggleSwitch } from "@/components/ui/theme-toggle-switch";
import { applyThemePreference } from "@/lib/theme";
import { useClientSearchParams } from "@/lib/use-client-search-params";

type SettingsSection =
  | "profile"
  | "notifications"
  | "appearance"
  | "security"
  | "team"
  | "billing";

type CurrentUser = {
  _id: string;
  username: string;
  email: string;
  authProvider?: "local" | "google";
  googleId?: string;
  fullName?: string;
  fullname?: string;
  avatar?: {
    url?: string;
    localPath?: string;
  };
  isEmailVerified?: boolean;
  createdAt?: string;
};

type WorkspaceListItem = {
  role?: string;
  status?: string;
  workspace?: {
    _id: string;
    name: string;
    slug?: string;
    plan?: string;
    createdAt?: string;
    createdBy?: string;
  };
};

const settingsSections: {
  id: SettingsSection;
  label: string;
  icon: any;
  description: string;
}[] = [
  {
    id: "profile",
    label: "Profile",
    icon: User,
    description: "Personal information",
  },
  {
    id: "notifications",
    label: "Notifications",
    icon: Bell,
    description: "Alerts and updates",
  },
  {
    id: "appearance",
    label: "Appearance",
    icon: Palette,
    description: "Theme and region",
  },
  {
    id: "security",
    label: "Security",
    icon: Shield,
    description: "Password and protection",
  },
  {
    id: "team",
    label: "Team",
    icon: Users,
    description: "Members and invites",
  },
  {
    id: "billing",
    label: "Billing",
    icon: CreditCard,
    description: "Plan and usage",
  },
];

function getInitials(user?: CurrentUser | null) {
  const value = user?.fullName || user?.fullname || user?.username || "U";
  const parts = String(value).trim().split(" ").filter(Boolean);

  if (parts.length >= 2) {
    return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
  }

  return String(value).slice(0, 2).toUpperCase();
}

function splitFullName(fullName?: string) {
  const value = (fullName || "").trim();
  if (!value) return { firstName: "", lastName: "" };

  const parts = value.split(" ").filter(Boolean);

  if (parts.length === 1) {
    return { firstName: parts[0], lastName: "" };
  }

  return {
    firstName: parts.slice(0, -1).join(" "),
    lastName: parts.slice(-1).join(""),
  };
}

function inputClass(disabled = false) {
  return `h-12 w-full rounded-2xl border border-slate-800 bg-[var(--app-surface)] px-4 text-sm text-[var(--app-text)] outline-none transition placeholder:text-[var(--app-muted)] focus:border-cyan-500/40 focus:ring-2 focus:ring-cyan-500/10 ${
    disabled ? "cursor-not-allowed opacity-70" : ""
  }`;
}

function selectClass() {
  return "h-12 w-full rounded-2xl border border-slate-800 bg-[var(--app-surface)] px-4 text-sm text-[var(--app-text)] outline-none transition focus:border-cyan-500/40 focus:ring-2 focus:ring-cyan-500/10";
}

function cardClass() {
  return "rounded-[28px] border border-slate-800/90 bg-[var(--app-surface)] shadow-[0_20px_60px_rgba(0,0,0,0.35)]";
}

function SettingsNavButton({
  active,
  icon: Icon,
  label,
  description,
  onClick,
}: {
  active: boolean;
  icon: any;
  label: string;
  description: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`group flex w-full items-center gap-3 rounded-2xl px-4 py-3.5 text-left transition ${
        active
          ? "bg-indigo-500/15 text-white shadow-[0_0_0_1px_rgba(99,102,241,0.18)]"
          : "text-slate-400 hover:bg-slate-900/70 hover:text-white"
      }`}
    >
      <div
        className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border transition ${
          active
            ? "border-indigo-400/20 bg-indigo-500/10 text-indigo-200"
            : "border-slate-800 bg-slate-900/80 text-slate-400 group-hover:border-slate-700 group-hover:text-slate-200"
        }`}
      >
        <Icon className="h-4 w-4" />
      </div>

      <div className="min-w-0">
        <p className="text-sm font-medium">{label}</p>
        <p className="mt-0.5 truncate text-xs text-slate-500 group-hover:text-slate-400">
          {description}
        </p>
      </div>
    </button>
  );
}

function SettingsInfoCard({
  icon: Icon,
  title,
  subtitle,
  children,
  iconClassName = "text-cyan-300",
}: {
  icon: any;
  title: string;
  subtitle: string;
  children: React.ReactNode;
  iconClassName?: string;
}) {
  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-950/45 p-4">
      <div className="flex items-start gap-3">
        <div className="mt-0.5">
          <Icon className={`h-4 w-4 ${iconClassName}`} />
        </div>

        <div className="min-w-0">
          <p className="text-sm font-medium text-white">{title}</p>
          <p className="text-xs text-slate-400">{subtitle}</p>
        </div>
      </div>

      <div className="mt-4">{children}</div>
    </div>
  );
}

function getUserDisplayName(item: any) {
  const user = item?.user || item?.member || item;
  return (
    user?.fullName ||
    user?.fullname ||
    user?.name ||
    user?.username ||
    "Unknown User"
  );
}

function getUserEmail(item: any) {
  const user = item?.user || item?.member || item;
  return user?.email || "No email";
}

export default function SettingsPage() {
  const searchParams = useClientSearchParams();
  const router = useRouter();

  const [activeSection, setActiveSection] =
    useState<SettingsSection>("profile");

  const [user, setUser] = useState<CurrentUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const [profileForm, setProfileForm] = useState({
    firstName: "",
    lastName: "",
    fullName: "",
    username: "",
    email: "",
  });

  const [notificationPrefs, setNotificationPrefs] = useState({
    taskAssignments: true,
    commentsMentions: true,
    projectUpdates: true,
    weeklyDigest: false,
    desktopNotifications: true,
    soundAlerts: false,
  });

  const [appearancePrefs, setAppearancePrefs] = useState({
    theme: "dark",
    language: "en",
    timezone: "asia-kolkata",
  });

  const [passwordForm, setPasswordForm] = useState({
    oldPassword: "",
    newPassword: "",
    confirmPassword: "",
  });

  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [isSendingVerification, setIsSendingVerification] = useState(false);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);

  const [workspaceItem, setWorkspaceItem] = useState<WorkspaceListItem | null>(
    null,
  );
  const [projects, setProjects] = useState<any[]>([]);
  const [members, setMembers] = useState<any[]>([]);
  const [pendingInvites, setPendingInvites] = useState<any[]>([]);
  const [isTeamLoading, setIsTeamLoading] = useState(true);
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
  const [billingSummary, setBillingSummary] = useState<any>(null);
  const [isBillingLoading, setIsBillingLoading] = useState(false);
  const [isUpdatingPlan, setIsUpdatingPlan] = useState(false);
  const [isStartingCheckout, setIsStartingCheckout] = useState(false);
  const [isConfirmingCheckout, setIsConfirmingCheckout] = useState(false);
  const avatarInputRef = useRef<HTMLInputElement | null>(null);

  const canSkipOldPasswordCheck =
    user?.authProvider === "google" || Boolean(user?.googleId);

  useEffect(() => {
    const tab = searchParams?.get("tab");

    if (
      tab === "profile" ||
      tab === "notifications" ||
      tab === "appearance" ||
      tab === "security" ||
      tab === "team" ||
      tab === "billing"
    ) {
      setActiveSection(tab);
    }
  }, [searchParams]);

  const loadCurrentUser = async () => {
    try {
      setIsLoading(true);
      const res = await authService.getCurrentUser();
      const currentUser = res?.data as CurrentUser;

      setUser(currentUser);

      const { firstName, lastName } = splitFullName(
        currentUser?.fullName || currentUser?.fullname,
      );

      setProfileForm({
        firstName,
        lastName,
        fullName: currentUser?.fullName || currentUser?.fullname || "",
        username: currentUser?.username || "",
        email: currentUser?.email || "",
      });
    } catch (error) {
      console.error(error);
      toast.error("Failed to load account settings");
    } finally {
      setIsLoading(false);
    }
  };

  const loadTeamData = async () => {
    try {
      setIsTeamLoading(true);

      const activeWorkspaceId =
        typeof window !== "undefined"
          ? localStorage.getItem("teamforge_active_workspace_id") || ""
          : "";

      if (!activeWorkspaceId) {
        setWorkspaceItem(null);
        setProjects([]);
        setMembers([]);
        setPendingInvites([]);
        return;
      }

      const workspaceRes = await workspaceService.getWorkspaces();
      const allWorkspaces = workspaceRes.data || [];

      const found = allWorkspaces.find((item: any) => {
        const workspace = item.workspace || item;
        return workspace?._id === activeWorkspaceId;
      });

      if (!found) {
        setWorkspaceItem(null);
        setProjects([]);
        setMembers([]);
        setPendingInvites([]);
        return;
      }

      setWorkspaceItem(found);

      const currentRole = found.role || "member";
      const canViewInvites = currentRole === "owner" || currentRole === "admin";

      const [projectRes, membersRes] = await Promise.all([
        projectService.getProjectsByWorkspace(activeWorkspaceId),
        workspaceService.getWorkspaceMembers(activeWorkspaceId),
      ]);

      setProjects(projectRes?.data || []);
      setMembers(membersRes?.data || []);

      if (canViewInvites) {
        const invitesRes =
          await workspaceService.getWorkspacePendingInvites(activeWorkspaceId);
        setPendingInvites(invitesRes?.data || []);
      } else {
        setPendingInvites([]);
      }
    } catch (error: any) {
      console.error(error);
      toast.error(
        error?.response?.data?.message || "Failed to load team settings",
      );
    } finally {
      setIsTeamLoading(false);
    }
  };

  const loadBillingData = async () => {
    try {
      setIsBillingLoading(true);

      const activeWorkspaceId =
        typeof window !== "undefined"
          ? localStorage.getItem("teamforge_active_workspace_id") || ""
          : "";

      if (!activeWorkspaceId) {
        setBillingSummary(null);
        return;
      }

      const res =
        await workspaceService.getWorkspaceBillingSummary(activeWorkspaceId);

      setBillingSummary(res?.data || null);
    } catch (error: any) {
      if (error?.response?.status === 403) {
        localStorage.removeItem("teamforge_active_workspace_id");
        setBillingSummary(null);
        return;
      }

      console.error(error);
      toast.error(
        error?.response?.data?.message || "Failed to load billing summary",
      );
    } finally {
      setIsBillingLoading(false);
    }
  };

  const ensureRazorpayScript = () => {
    return new Promise<boolean>((resolve) => {
      if (typeof window === "undefined") {
        resolve(false);
        return;
      }

      if ((window as any).Razorpay) {
        resolve(true);
        return;
      }

      const existing = document.getElementById("razorpay-checkout-js");
      if (existing) {
        existing.addEventListener("load", () => resolve(true), {
          once: true,
        });
        existing.addEventListener("error", () => resolve(false), {
          once: true,
        });
        return;
      }

      const script = document.createElement("script");
      script.id = "razorpay-checkout-js";
      script.src = "https://checkout.razorpay.com/v1/checkout.js";
      script.async = true;
      script.onload = () => resolve(true);
      script.onerror = () => resolve(false);
      document.body.appendChild(script);
    });
  };

  useEffect(() => {
    loadCurrentUser();
    loadTeamData();
    loadBillingData();

    const savedNotifications = localStorage.getItem(
      "teamforge_notification_preferences",
    );
    const savedAppearance = localStorage.getItem(
      "teamforge_appearance_preferences",
    );

    if (savedNotifications) {
      try {
        setNotificationPrefs(JSON.parse(savedNotifications));
      } catch {}
    }

    if (savedAppearance) {
      try {
        setAppearancePrefs(JSON.parse(savedAppearance));
      } catch {}
    }
  }, []);

  useEffect(() => {
    const verified = searchParams?.get("verified");

    if (verified === "true") {
      toast.success("Email verified successfully");
      router.replace("/settings");
    }

    if (verified === "failed") {
      toast.error("Verification link is invalid or expired");
      router.replace("/settings");
    }
  }, [searchParams, router]);

  useEffect(() => {
    const tab = searchParams?.get("tab");
    if (
      tab === "profile" ||
      tab === "notifications" ||
      tab === "appearance" ||
      tab === "security" ||
      tab === "team" ||
      tab === "billing"
    ) {
      setActiveSection(tab);
    }
  }, [searchParams]);

  const workspace = workspaceItem?.workspace || null;
  const workspaceRole = workspaceItem?.role || "member";
  const canInviteMembers =
    workspaceRole === "owner" || workspaceRole === "admin";
  const isWorkspaceOwner = workspaceRole === "owner";
  const isWorkspaceAdmin = workspaceRole === "admin";

  const accountMeta = useMemo(() => {
    if (!user?.createdAt) return "Member account";
    const joined = new Date(user.createdAt).toLocaleDateString();
    return `Joined ${joined}`;
  }, [user]);

  const profileCompletion = useMemo(() => {
    let score = 0;
    if (profileForm.username) score += 25;
    if (profileForm.email) score += 25;
    if (profileForm.fullName) score += 25;
    if (user?.isEmailVerified) score += 25;
    return score;
  }, [profileForm, user]);

  const sortedMembers = useMemo(() => {
    return [...members].sort((a: any, b: any) => {
      const userA = a.user || a.member || a;
      const userB = b.user || b.member || b;

      const isSelfA =
        user?._id && userA?._id
          ? String(user._id) === String(userA._id)
          : false;

      const isSelfB =
        user?._id && userB?._id
          ? String(user._id) === String(userB._id)
          : false;

      if (isSelfA && !isSelfB) return -1;
      if (!isSelfA && isSelfB) return 1;

      const rolePriority: Record<string, number> = {
        owner: 1,
        admin: 2,
        member: 3,
      };

      const roleA = a.role || "member";
      const roleB = b.role || "member";

      if (rolePriority[roleA] !== rolePriority[roleB]) {
        return rolePriority[roleA] - rolePriority[roleB];
      }

      const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;

      return dateA - dateB;
    });
  }, [members, user]);

  const showRealAvatar =
    user?.avatar?.url && !user.avatar.url.includes("placehold.co");

  const handleProfileSave = async () => {
    const fullName = `${profileForm.firstName} ${profileForm.lastName}`.trim();

    if (!fullName) {
      toast.error("Please enter your full name");
      return;
    }

    if (fullName.length < 3) {
      toast.error("Full name must be at least 3 characters");
      return;
    }

    if (!profileForm.username || !profileForm.username.trim()) {
      toast.error("Username is required");
      return;
    }

    if (profileForm.username.length < 3) {
      toast.error("Username must be at least 3 characters");
      return;
    }

    const usernameRegex = /^[a-z0-9_]+$/i;
    if (!usernameRegex.test(profileForm.username)) {
      toast.error(
        "Username can only contain letters, numbers, and underscores",
      );
      return;
    }

    try {
      setIsSavingProfile(true);

      const res = await authService.updateAccount({
        fullName,
        username: profileForm.username,
      });

      const updatedUser = res?.data as CurrentUser;
      setUser(updatedUser);

      const { firstName, lastName } = splitFullName(
        updatedUser?.fullName || updatedUser?.fullname,
      );

      setProfileForm((prev) => ({
        ...prev,
        firstName,
        lastName,
        fullName: updatedUser?.fullName || updatedUser?.fullname || "",
        username: updatedUser?.username || prev.username,
        email: updatedUser?.email || prev.email,
      }));

      toast.success("Profile updated successfully");
    } catch (error: any) {
      console.error(error);
      toast.error(error?.response?.data?.message || "Failed to update profile");
    } finally {
      setIsSavingProfile(false);
    }
  };

  const handleAppearanceSave = () => {
    localStorage.setItem(
      "teamforge_appearance_preferences",
      JSON.stringify(appearancePrefs),
    );
    applyThemePreference(appearancePrefs.theme as any);
    toast.success("Appearance preferences saved locally");
  };

  const handlePlanCheckout = async (plan: "free" | "pro" | "business") => {
    const activeWorkspaceId =
      typeof window !== "undefined"
        ? localStorage.getItem("teamforge_active_workspace_id") || ""
        : "";

    if (!activeWorkspaceId) {
      toast.error("Select a workspace first");
      return;
    }

    try {
      if (plan === "free") {
        setIsUpdatingPlan(true);
        const res = await workspaceService.updateWorkspacePlan(
          activeWorkspaceId,
          { plan: "free" },
        );

        setBillingSummary(res?.data || null);
        await loadTeamData();
        toast.success("Workspace switched to free plan");
        return;
      }

      setIsStartingCheckout(true);
      const scriptReady = await ensureRazorpayScript();

      if (!scriptReady) {
        toast.error("Unable to load Razorpay checkout");
        return;
      }

      const res = await workspaceService.createWorkspaceBillingOrder(
        activeWorkspaceId,
        { plan },
      );

      const order = res?.data;
      const razorpayKeyId = order?.keyId;

      if (!order?.orderId || !razorpayKeyId) {
        toast.error("Unable to start payment");
        return;
      }

      const Razorpay = (window as any).Razorpay;
      const razorpay = new Razorpay({
        key: razorpayKeyId,
        amount: order.amount,
        currency: order.currency,
        name: order.workspaceName || "TeamForge",
        description: `${plan} plan subscription`,
        order_id: order.orderId,

        prefill: {
          name:
            order.customerName ||
            user?.fullName ||
            user?.username ||
            "TeamForge User",
          email: order.customerEmail || user?.email || "",
        },

        theme: {
          color: "#0ea5e9",
        },

        handler: async (response: any) => {
          try {
            setIsConfirmingCheckout(true);

            await workspaceService.verifyWorkspaceBillingPayment(
              activeWorkspaceId,
              {
                plan,
                razorpayOrderId: response.razorpay_order_id,
                razorpayPaymentId: response.razorpay_payment_id,
                razorpaySignature: response.razorpay_signature,
              },
            );

            toast.success("Payment successful 🚀");
            await loadBillingData();
          } catch (error: any) {
            toast.error("Payment verification failed");
          } finally {
            setIsConfirmingCheckout(false);
          }
        },

        modal: {
          ondismiss: () => {
            toast("Payment cancelled");
          },
        },
      });
      razorpay.on("payment.failed", function (response: any) {
        console.log("Payment failed:", response);

        const reason =
          response?.error?.description ||
          response?.error?.reason ||
          "Payment failed";

        toast.error(reason);
      });

      razorpay.open();
    } catch (error: any) {
      console.error(error);
      toast.error(error?.response?.data?.message || "Failed to update plan");
    } finally {
      setIsUpdatingPlan(false);
      setIsStartingCheckout(false);
    }
  };

  const handleNotificationSave = () => {
    localStorage.setItem(
      "teamforge_notification_preferences",
      JSON.stringify(notificationPrefs),
    );
    toast.success("Notification preferences saved locally");
  };

  const handleChangePassword = async () => {
    if (!passwordForm.newPassword) {
      toast.error("Please fill all required password fields");
      return;
    }

    if (!canSkipOldPasswordCheck && !passwordForm.oldPassword) {
      toast.error("Please enter your current password");
      return;
    }

    const strongPasswordPattern =
      /^(?=.*[A-Za-z])(?=.*\d)[A-Za-z\d@$!%*?&]{6,}$/;
    if (!strongPasswordPattern.test(passwordForm.newPassword)) {
      toast.error("Password must contain letters and numbers");
      return;
    }

    if (passwordForm.newPassword.length < 6) {
      toast.error("New password must be at least 6 characters");
      return;
    }

    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      toast.error("New password and confirm password do not match");
      return;
    }

    try {
      setIsChangingPassword(true);

      await authService.changePassword({
        newPassword: passwordForm.newPassword,
        ...(passwordForm.oldPassword
          ? { oldPassword: passwordForm.oldPassword }
          : {}),
      });

      toast.success("Password changed successfully");

      setPasswordForm({
        oldPassword: "",
        newPassword: "",
        confirmPassword: "",
      });
    } catch (error: any) {
      console.error(error);
      toast.error(
        error?.response?.data?.message || "Failed to change password",
      );
    } finally {
      setIsChangingPassword(false);
    }
  };

  const handleResendVerification = async () => {
    try {
      setIsSendingVerification(true);
      const res = await authService.resendEmailVerification();
      toast.success(res?.message || "Verification email sent successfully");
    } catch (error: any) {
      console.error(error);
      toast.error(
        error?.response?.data?.message || "Failed to resend verification email",
      );
    } finally {
      setIsSendingVerification(false);
    }
  };

  const handleAvatarSelected = async (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = event.target.files?.[0];

    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast.error("Please select an image file");
      event.target.value = "";
      return;
    }

    const maxSizeBytes = 2 * 1024 * 1024;
    if (file.size > maxSizeBytes) {
      toast.error("Avatar must be 2MB or smaller");
      event.target.value = "";
      return;
    }

    try {
      setIsUploadingAvatar(true);

      const res = await authService.uploadAvatar(file);
      const updatedUser = res?.data;

      if (updatedUser) {
        setUser(updatedUser);
      }

      toast.success(res?.message || "Avatar updated successfully");
    } catch (error: any) {
      console.error(error);
      toast.error(error?.response?.data?.message || "Failed to upload avatar");
    } finally {
      setIsUploadingAvatar(false);
      event.target.value = "";
    }
  };

  const handleRoleChange = async (memberUserId: string, role: string) => {
    if (!workspace?._id) return;

    try {
      const data = await workspaceService.updateWorkspaceMemberRole(
        workspace._id,
        memberUserId,
        { role },
      );

      toast.success(
        data?.message || "Workspace member role updated successfully",
      );

      await loadTeamData();
    } catch (error: any) {
      console.error(error);
      toast.error(
        error?.response?.data?.message || "Failed to update member role",
      );
    }
  };

  const handleRemoveMember = async (memberUserId: string) => {
    if (!workspace?._id) return;

    const confirmed = window.confirm("Remove this member from workspace?");
    if (!confirmed) return;

    try {
      const data = await workspaceService.removeWorkspaceMember(
        workspace._id,
        memberUserId,
      );

      toast.success(data?.message || "Member removed successfully");
      await loadTeamData();
    } catch (error: any) {
      console.error(error);
      toast.error(error?.response?.data?.message || "Failed to remove member");
    }
  };

  const handleResendInvite = async (inviteId: string) => {
    if (!workspace?._id) return;

    try {
      const data = await workspaceService.resendWorkspaceInvite(
        workspace._id,
        inviteId,
      );

      toast.success(data?.message || "Invite resent successfully");
      await loadTeamData();
    } catch (error: any) {
      console.error(error);
      toast.error(
        error?.response?.data?.message ||
          "Mail service limit reached. Please try again later.",
      );
    }
  };

  const handleCancelInvite = async (inviteId: string) => {
    if (!workspace?._id) return;

    const confirmed = window.confirm("Cancel this pending invite?");
    if (!confirmed) return;

    try {
      const data = await workspaceService.cancelWorkspaceInvite(
        workspace._id,
        inviteId,
      );

      toast.success(data?.message || "Invite cancelled successfully");
      await loadTeamData();
    } catch (error: any) {
      console.error(error);
      toast.error(error?.response?.data?.message || "Failed to cancel invite");
    }
  };

  const renderTeamTab = () => {
    if (isTeamLoading) {
      return (
        <div className={`${cardClass()} p-8`}>
          <p className="text-sm text-slate-400">Loading team settings...</p>
        </div>
      );
    }

    if (!workspace?._id) {
      return (
        <div className={`${cardClass()} p-6 sm:p-8`}>
          <div className="mb-8">
            <h3 className="text-[32px] font-semibold tracking-tight text-white">
              Team
            </h3>
            <p className="mt-1.5 text-sm text-slate-400">
              Manage workspace members and invites.
            </p>
          </div>

          <div className="rounded-3xl border border-dashed border-slate-800 bg-slate-950/40 px-6 py-14 text-center">
            <h3 className="text-lg font-semibold text-white">
              No active workspace selected
            </h3>
            <p className="mt-2 text-sm text-slate-400">
              Open a workspace first, then return here to manage team members.
            </p>
            <button
              type="button"
              onClick={() => router.push("/workspaces")}
              className="mt-5 rounded-2xl border border-slate-700 bg-slate-900/70 px-4 py-3 text-sm font-medium text-white transition hover:bg-slate-800"
            >
              Go to Workspaces
            </button>
          </div>
        </div>
      );
    }

    return (
      <>
        <div className={`${cardClass()} p-6 sm:p-8`}>
          <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h3 className="text-[32px] font-semibold tracking-tight text-white">
                Team
              </h3>
              <p className="mt-1.5 text-sm text-slate-400">
                Manage members, roles, and pending invites for{" "}
                <span className="font-medium text-slate-300">
                  {workspace.name}
                </span>
                .
              </p>
            </div>

            {canInviteMembers ? (
              <button
                type="button"
                onClick={() => setIsInviteModalOpen(true)}
                className="inline-flex items-center gap-2 rounded-2xl bg-gradient-to-r from-cyan-400 to-indigo-500 px-5 py-3 text-sm font-semibold text-white transition hover:brightness-110"
              >
                <UserPlus className="h-4 w-4" />
                Invite Member
              </button>
            ) : null}
          </div>

          <div className="mb-6 grid gap-4 md:grid-cols-3">
            <div className="rounded-2xl border border-slate-800 bg-slate-950/45 p-4">
              <p className="text-sm text-slate-400">Workspace</p>
              <p className="mt-2 text-lg font-semibold text-white">
                {workspace.name}
              </p>
            </div>

            <div className="rounded-2xl border border-slate-800 bg-slate-950/45 p-4">
              <p className="text-sm text-slate-400">Your role</p>
              <p className="mt-2 text-lg font-semibold capitalize text-white">
                {workspaceRole}
              </p>
            </div>

            <div className="rounded-2xl border border-slate-800 bg-slate-950/45 p-4">
              <p className="text-sm text-slate-400">Members</p>
              <p className="mt-2 text-lg font-semibold text-white">
                {members.length}
              </p>
            </div>
          </div>

          <div className="space-y-5">
            <div>
              <div className="mb-4 flex items-center gap-3">
                <h4 className="text-lg font-semibold text-white">
                  Current Members
                </h4>
                <span className="rounded-full border border-slate-800 bg-slate-900 px-2.5 py-1 text-xs font-medium text-slate-300">
                  {members.length}
                </span>
              </div>

              {members.length === 0 ? (
                <div className="rounded-2xl border border-slate-800 bg-slate-950/40 p-5">
                  <p className="text-sm text-slate-400">
                    No members found in this workspace.
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {sortedMembers.map((item: any, index: number) => {
                    const memberUser = item.user || item.member || item;
                    const displayName = getUserDisplayName(item);
                    const email = getUserEmail(item);
                    const memberRole = item.role || "member";
                    const joinedAt = item.createdAt
                      ? new Date(item.createdAt).toLocaleDateString()
                      : "N/A";

                    const isSelf =
                      user?._id && memberUser?._id
                        ? String(user._id) === String(memberUser._id)
                        : false;

                    const canOwnerChangeRole =
                      isWorkspaceOwner && !isSelf && memberRole !== "owner";

                    const canRemoveMember =
                      !isSelf &&
                      (isWorkspaceOwner
                        ? memberRole !== "owner"
                        : isWorkspaceAdmin
                          ? memberRole === "member"
                          : false);

                    return (
                      <div
                        key={memberUser?._id || index}
                        className="rounded-2xl border border-slate-800 bg-slate-950/40 p-4"
                      >
                        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                          <div className="flex min-w-0 items-center gap-3">
                            <div className="flex h-11 w-11 items-center justify-center rounded-full bg-cyan-500/20 text-sm font-semibold text-cyan-300">
                              {displayName?.charAt(0)?.toUpperCase() || "U"}
                            </div>

                            <div className="min-w-0">
                              <p className="truncate text-sm font-semibold text-white">
                                {displayName}
                                {isSelf ? (
                                  <span className="ml-2 text-xs font-normal text-cyan-400">
                                    (You)
                                  </span>
                                ) : null}
                              </p>
                              <p className="truncate text-xs text-slate-400">
                                {email}
                              </p>
                              <p className="mt-1 text-xs text-slate-500">
                                Joined: {joinedAt}
                              </p>
                            </div>
                          </div>

                          <div className="flex flex-wrap items-center gap-2">
                            {memberRole === "owner" ? (
                              <span className="rounded-full border border-indigo-500/20 bg-indigo-500/10 px-2.5 py-1 text-[11px] font-medium text-indigo-300">
                                Owner
                              </span>
                            ) : canOwnerChangeRole ? (
                              <select
                                value={memberRole}
                                onChange={(e) =>
                                  handleRoleChange(
                                    memberUser._id,
                                    e.target.value,
                                  )
                                }
                                className="rounded-full border border-slate-700 bg-zinc-950 px-3 py-1 text-[11px] capitalize text-slate-300 outline-none transition hover:border-slate-600"
                              >
                                <option value="member">Member</option>
                                <option value="admin">Admin</option>
                              </select>
                            ) : (
                              <span className="rounded-full border border-slate-700 bg-zinc-950 px-2.5 py-1 text-[11px] capitalize text-slate-300">
                                {memberRole}
                              </span>
                            )}

                            {canRemoveMember ? (
                              <button
                                type="button"
                                onClick={() =>
                                  handleRemoveMember(memberUser._id)
                                }
                                className="inline-flex items-center gap-1 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-1.5 text-xs font-medium text-red-300 transition hover:bg-red-500/20"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                                Remove
                              </button>
                            ) : null}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {canInviteMembers ? (
              <div className="border-t border-slate-800 pt-6">
                <div className="mb-4 flex items-center gap-3">
                  <h4 className="text-lg font-semibold text-white">
                    Pending Invites
                  </h4>
                  <span className="rounded-full border border-slate-800 bg-slate-900 px-2.5 py-1 text-xs font-medium text-slate-300">
                    {pendingInvites.length}
                  </span>
                </div>

                {pendingInvites.length === 0 ? (
                  <div className="rounded-2xl border border-slate-800 bg-slate-950/40 p-5">
                    <p className="text-sm text-slate-400">
                      No pending invites.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {pendingInvites.map((invite: any, index: number) => {
                      const email =
                        invite.user?.email ||
                        invite.email ||
                        invite.invitedEmail ||
                        invite.invited_user_email ||
                        invite.memberEmail ||
                        "No email";

                      const inviteUserName =
                        invite.user?.fullname ||
                        invite.user?.fullName ||
                        invite.user?.name ||
                        invite.user?.username ||
                        null;

                      const inviteRole = invite.role || "member";

                      const invitedBy =
                        invite.invitedBy?.fullname ||
                        invite.invitedBy?.fullName ||
                        invite.invitedBy?.name ||
                        invite.invitedBy?.username ||
                        invite.invitedBy?.email ||
                        "Unknown";

                      const expiresAt = invite.inviteExpiresAt
                        ? new Date(invite.inviteExpiresAt).toLocaleDateString()
                        : "N/A";

                      const inviteId = invite._id;

                      return (
                        <div
                          key={invite._id || index}
                          className="rounded-2xl border border-slate-800 bg-slate-950/40 p-4"
                        >
                          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                            <div className="min-w-0">
                              <p className="truncate text-sm font-semibold text-white">
                                {inviteUserName || email}
                              </p>

                              {inviteUserName ? (
                                <p className="mt-1 text-xs text-slate-400">
                                  {email}
                                </p>
                              ) : null}

                              <p className="mt-1 text-xs text-slate-400">
                                Role:{" "}
                                <span className="capitalize">{inviteRole}</span>
                              </p>

                              <p className="mt-1 text-xs text-slate-500">
                                Invited by: {invitedBy}
                              </p>

                              <p className="mt-1 text-xs text-slate-500">
                                Expires: {expiresAt}
                              </p>
                            </div>

                            <div className="flex flex-wrap items-center gap-2">
                              <span className="rounded-full border border-amber-500/30 bg-amber-500/10 px-2.5 py-1 text-[11px] text-amber-300">
                                Pending
                              </span>

                              <button
                                type="button"
                                onClick={() => handleResendInvite(inviteId)}
                                className="inline-flex items-center gap-1 rounded-lg border border-slate-700 px-3 py-1.5 text-xs font-medium text-slate-200 transition hover:bg-slate-800"
                              >
                                <RefreshCw className="h-3.5 w-3.5" />
                                Resend
                              </button>

                              <button
                                type="button"
                                onClick={() => handleCancelInvite(inviteId)}
                                className="inline-flex items-center gap-1 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-1.5 text-xs font-medium text-red-300 transition hover:bg-red-500/20"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                                Cancel
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            ) : null}
          </div>
        </div>

        {canInviteMembers ? (
          <InviteWorkspaceMemberModal
            workspaceId={workspace._id}
            isOpen={isInviteModalOpen}
            onClose={() => setIsInviteModalOpen(false)}
            onInvited={async () => {
              await loadTeamData();
            }}
          />
        ) : null}
      </>
    );
  };

  const renderBillingTab = () => {
    if (isBillingLoading) {
      return (
        <div className={`${cardClass()} p-8`}>
          <p className="text-sm text-slate-400">Loading billing summary...</p>
        </div>
      );
    }

    const summary = billingSummary;

    const workspaceName =
      summary?.workspace?.name || workspace?.name || "No workspace";

    const workspacePlan = summary?.workspace?.plan || workspace?.plan || "free";

    const projectCount = summary?.usage?.projects ?? projects.length;
    const memberCount = summary?.usage?.members ?? members.length;

    const maxProjects = summary?.limits?.maxProjects ?? 10;
    const maxMembers =
      summary?.limits?.maxMembers ?? (workspacePlan === "free" ? 10 : 5);

    const projectUsagePercent =
      maxProjects > 0
        ? Math.min(100, Math.round((projectCount / maxProjects) * 100))
        : 0;

    const memberUsagePercent =
      maxMembers > 0
        ? Math.min(100, Math.round((memberCount / maxMembers) * 100))
        : 0;

    const billingPlans = [
      {
        id: "free",
        label: "Free",
        price: "$0",
        description: "For lightweight use and early projects.",
        features: ["10 projects", "10 members", "Core workspace tools"],
      },
      {
        id: "pro",
        label: "Pro",
        price: "$19",
        description: "For growing teams that need more room.",
        features: ["50 projects", "25 members", "Priority collaboration"],
      },
      {
        id: "business",
        label: "Business",
        price: "$49",
        description: "For larger teams and broader operations.",
        features: [
          "Unlimited projects",
          "Unlimited members",
          "Billing controls",
        ],
      },
    ] as const;

    return (
      <div className={`${cardClass()} p-6 sm:p-8`}>
        <div className="mb-8">
          <h3 className="text-[32px] font-semibold tracking-tight text-white">
            Billing
          </h3>
          <p className="mt-1.5 text-sm text-slate-400">
            Manage your workspace plan, usage, and payment details.
          </p>
        </div>

        <div className="rounded-[26px] border border-cyan-500/20 bg-cyan-500/5 p-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-cyan-500/20 bg-cyan-500/10 px-3 py-1.5 text-xs font-medium uppercase tracking-[0.14em] text-cyan-300">
                Current Plan
              </div>

              <h4 className="mt-4 text-2xl font-semibold capitalize text-white">
                {workspacePlan} Plan
              </h4>

              <p className="mt-2 text-sm text-slate-400">
                {workspacePlan === "free"
                  ? "Free plan suitable for small teams."
                  : workspacePlan === "pro"
                    ? "Pro plan with expanded collaboration limits."
                    : "Business plan with unlimited usage."}
              </p>
            </div>

            <div className="rounded-2xl border border-slate-800 bg-slate-950/50 px-4 py-3 text-sm text-slate-300">
              <p className="text-xs uppercase tracking-[0.18em] text-slate-500">
                Payment Gateway
              </p>
              <p className="mt-1 font-medium text-white">Razorpay Checkout</p>
              <p className="mt-1 text-xs text-slate-400">
                Paid plans activate after Razorpay verification.
              </p>
            </div>
          </div>

          <div className="mt-6 grid gap-4 lg:grid-cols-3">
            {billingPlans.map((plan) => {
              const active = workspacePlan === plan.id;

              return (
                <div
                  key={plan.id}
                  className={`rounded-2xl border p-5 transition ${
                    active
                      ? "border-cyan-500/30 bg-cyan-500/10"
                      : "border-slate-800 bg-slate-950/50 hover:bg-slate-900/60"
                  }`}
                >
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-lg font-semibold text-white">
                        {plan.label}
                      </p>
                      <p className="text-xs text-slate-400">
                        {plan.description}
                      </p>
                    </div>

                    <div className="text-right">
                      <p className="text-xl font-semibold text-white">
                        {plan.price}
                      </p>
                      <p className="text-[11px] uppercase tracking-[0.18em] text-slate-500">
                        monthly
                      </p>
                    </div>
                  </div>

                  <ul className="mt-4 space-y-2 text-sm text-slate-300">
                    {plan.features.map((feature) => (
                      <li key={feature} className="flex items-center gap-2">
                        <CheckCircle2 className="h-4 w-4 text-cyan-400" />
                        {feature}
                      </li>
                    ))}
                  </ul>

                  <button
                    type="button"
                    disabled={
                      active ||
                      isUpdatingPlan ||
                      isStartingCheckout ||
                      isConfirmingCheckout
                    }
                    onClick={() => handlePlanCheckout(plan.id)}
                    className={`mt-5 w-full rounded-xl px-4 py-2.5 text-sm font-medium transition disabled:cursor-not-allowed disabled:opacity-60 ${
                      active
                        ? "bg-slate-800 text-slate-300"
                        : "bg-gradient-to-r from-cyan-500 to-indigo-500 text-white hover:brightness-110"
                    }`}
                  >
                    {active
                      ? "Current plan"
                      : isStartingCheckout && plan.id !== "free"
                        ? "Opening checkout..."
                        : isUpdatingPlan && plan.id === "free"
                          ? "Updating..."
                          : plan.id === "free"
                            ? "Switch to Free"
                            : `Upgrade to ${plan.label}`}
                  </button>
                </div>
              );
            })}
          </div>

          <div className="mt-6 grid gap-4 md:grid-cols-3">
            <div className="rounded-2xl border border-slate-800 bg-slate-950/50 p-4">
              <p className="text-sm text-slate-400">Workspace</p>
              <p className="mt-2 truncate text-lg font-semibold text-white">
                {workspaceName}
              </p>
            </div>

            <div className="rounded-2xl border border-slate-800 bg-slate-950/50 p-4">
              <p className="text-sm text-slate-400">Projects</p>
              <p className="mt-2 text-2xl font-semibold text-white">
                {projectCount}
              </p>
              <p className="text-xs text-slate-500">
                {projectCount}/{maxProjects}
              </p>
            </div>

            <div className="rounded-2xl border border-slate-800 bg-slate-950/50 p-4">
              <p className="text-sm text-slate-400">Members</p>
              <p className="mt-2 text-2xl font-semibold text-white">
                {memberCount}
              </p>
              <p className="text-xs text-slate-500">
                {memberCount}/{maxMembers}
              </p>
            </div>
          </div>

          <div className="mt-6 grid gap-4 lg:grid-cols-2">
            <div className="rounded-2xl border border-slate-800 bg-slate-950/40 p-5">
              <div className="flex items-start gap-3">
                <CreditCard className="mt-0.5 h-5 w-5 text-violet-300" />
                <div>
                  <h4 className="text-lg font-semibold text-white">
                    Payment Setup
                  </h4>
                  <p className="text-sm text-slate-400">
                    Razorpay Checkout handles card, UPI, and netbanking flows.
                  </p>
                </div>
              </div>

              <p className="mt-4 text-xs text-slate-500">
                No card is stored in this app. Payment is verified by Razorpay
                before the plan is activated.
              </p>
            </div>

            <div className="rounded-2xl border border-slate-800 bg-slate-950/40 p-5">
              <div className="space-y-4">
                <div>
                  <div className="flex justify-between text-xs text-slate-400">
                    <span>Projects</span>
                    <span>
                      {projectCount}/{maxProjects}
                    </span>
                  </div>

                  <div className="h-2 rounded-full bg-slate-900">
                    <div
                      className="h-full bg-cyan-500"
                      style={{ width: `${projectUsagePercent}%` }}
                    />
                  </div>
                </div>

                <div>
                  <div className="flex justify-between text-xs text-slate-400">
                    <span>Members</span>
                    <span>
                      {memberCount}/{maxMembers}
                    </span>
                  </div>

                  <div className="h-2 rounded-full bg-slate-900">
                    <div
                      className="h-full bg-indigo-500"
                      style={{ width: `${memberUsagePercent}%` }}
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-[calc(100vh-120px)] bg-[radial-gradient(circle_at_top_left,rgba(34,211,238,0.07),transparent_24%),radial-gradient(circle_at_top_right,rgba(99,102,241,0.08),transparent_28%)] px-4 pb-6 pt-3 sm:px-6 sm:pb-8 sm:pt-4 lg:px-8 lg:pb-10 lg:pt-4">
      <div className="mb-8">
        <h2 className="text-3xl font-semibold tracking-tight text-white">
          Settings
        </h2>
        <p className="mt-2 text-sm text-slate-400">
          Manage your account, security, preferences, and workspace experience.
        </p>
      </div>

      <div className="flex flex-col gap-6 xl:flex-row">
        <div className={`${cardClass()} h-fit w-full xl:w-[300px]`}>
          <div className="border-b border-slate-800/80 px-5 py-5">
            <p className="text-sm font-semibold text-white">Account Settings</p>
            <p className="mt-1 text-xs text-slate-400">
              Personal preferences and workspace controls
            </p>
          </div>

          <div className="p-3">
            <nav className="space-y-1.5">
              {settingsSections.map((section) => (
                <SettingsNavButton
                  key={section.id}
                  active={activeSection === section.id}
                  icon={section.icon}
                  label={section.label}
                  description={section.description}
                  onClick={() => setActiveSection(section.id)}
                />
              ))}
            </nav>
          </div>

          <div className="border-t border-slate-800/80 px-5 py-4">
            <div className="rounded-2xl border border-slate-800 bg-slate-950/50 p-4">
              <p className="text-xs uppercase tracking-[0.18em] text-slate-500">
                Profile strength
              </p>
              <div className="mt-3 flex items-end justify-between gap-3">
                <div>
                  <p className="text-2xl font-semibold text-white">
                    {profileCompletion}%
                  </p>
                  <p className="text-xs text-slate-400">
                    Complete your profile for a better workspace setup
                  </p>
                </div>
              </div>
              <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-900">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-cyan-500 to-indigo-500 transition-all"
                  style={{ width: `${profileCompletion}%` }}
                />
              </div>
            </div>
          </div>
        </div>

        <div className="min-w-0 flex-1">
          {isLoading ? (
            <div className={`${cardClass()} p-8`}>
              <p className="text-sm text-slate-400">Loading settings...</p>
            </div>
          ) : activeSection === "profile" ? (
            <div className={`${cardClass()} p-6 sm:p-8`}>
              <div className="mb-8">
                <h3 className="text-[32px] font-semibold tracking-tight text-white">
                  Profile
                </h3>
                <p className="mt-1.5 text-sm text-slate-400">
                  Manage your personal information and account identity.
                </p>
              </div>

              <div className="mb-8 flex flex-col gap-5 rounded-[26px] border border-slate-800 bg-slate-950/35 p-5 sm:flex-row sm:items-center">
                <div className="relative shrink-0">
                  <input
                    ref={avatarInputRef}
                    type="file"
                    accept="image/png,image/jpeg,image/webp,image/gif"
                    onChange={handleAvatarSelected}
                    className="hidden"
                  />

                  {showRealAvatar ? (
                    <img
                      src={user?.avatar?.url}
                      alt="User avatar"
                      className="h-24 w-24 rounded-full border border-slate-800 object-cover"
                    />
                  ) : (
                    <div className="flex h-24 w-24 items-center justify-center rounded-full border border-slate-800 bg-gradient-to-br from-cyan-500/20 to-indigo-500/20 text-2xl font-semibold text-white">
                      {getInitials(user)}
                    </div>
                  )}

                  <button
                    type="button"
                    disabled={isUploadingAvatar}
                    onClick={() => avatarInputRef.current?.click()}
                    className="absolute -bottom-1 -right-1 flex h-10 w-10 items-center justify-center rounded-full border border-slate-800 bg-slate-900 text-slate-200 transition hover:bg-slate-800"
                  >
                    <Camera className="h-4 w-4" />
                  </button>
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <h4 className="text-xl font-semibold text-white">
                        Profile Photo
                      </h4>
                      <p className="text-sm text-slate-400">
                        JPG, PNG or GIF. Max 2MB.
                      </p>
                      <p className="mt-2 text-xs text-slate-500">
                        {accountMeta}
                      </p>
                    </div>

                    <div className="inline-flex h-fit items-center gap-2 rounded-full border border-slate-800 bg-slate-900/80 px-3 py-1.5 text-xs font-medium text-slate-300">
                      {user?.isEmailVerified ? (
                        <>
                          <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                          Verified account
                        </>
                      ) : (
                        <>
                          <AlertCircle className="h-4 w-4 text-amber-400" />
                          Verification pending
                        </>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              <div className="grid gap-5 md:grid-cols-2">
                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-300">
                    First Name
                  </label>
                  <input
                    value={profileForm.firstName}
                    onChange={(e) =>
                      setProfileForm((prev) => ({
                        ...prev,
                        firstName: e.target.value,
                        fullName: `${e.target.value} ${prev.lastName}`.trim(),
                      }))
                    }
                    className={inputClass()}
                    placeholder="Enter first name"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-300">
                    Last Name
                  </label>
                  <input
                    value={profileForm.lastName}
                    onChange={(e) =>
                      setProfileForm((prev) => ({
                        ...prev,
                        lastName: e.target.value,
                        fullName: `${prev.firstName} ${e.target.value}`.trim(),
                      }))
                    }
                    className={inputClass()}
                    placeholder="Enter last name"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-300">
                    Username
                  </label>
                  <input
                    value={profileForm.username}
                    onChange={(e) =>
                      setProfileForm((prev) => ({
                        ...prev,
                        username: e.target.value,
                      }))
                    }
                    className={inputClass()}
                    placeholder="Enter username"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-300">
                    Email
                  </label>
                  <input
                    value={profileForm.email}
                    disabled
                    className={inputClass(true)}
                  />
                </div>
              </div>

              <div className="mt-5 grid gap-5 md:grid-cols-2">
                <SettingsInfoCard
                  icon={Mail}
                  title="Email verification"
                  subtitle="Account email verification status"
                  iconClassName="text-cyan-300"
                >
                  <div className="flex flex-col items-start gap-3">
                    <div className="inline-flex items-center gap-2 rounded-full border border-slate-800 bg-slate-900 px-3 py-1.5 text-xs font-medium text-slate-300">
                      {user?.isEmailVerified ? (
                        <>
                          <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                          Verified
                        </>
                      ) : (
                        <>
                          <AlertCircle className="h-4 w-4 text-amber-400" />
                          Not verified
                        </>
                      )}
                    </div>

                    {!user?.isEmailVerified ? (
                      <button
                        type="button"
                        onClick={handleResendVerification}
                        disabled={isSendingVerification}
                        className="rounded-xl border border-cyan-500/20 bg-cyan-500/10 px-3 py-2 text-xs font-medium text-cyan-300 transition hover:bg-cyan-500/15 disabled:cursor-not-allowed disabled:opacity-70"
                      >
                        {isSendingVerification
                          ? "Sending..."
                          : "Resend verification email"}
                      </button>
                    ) : null}
                  </div>
                </SettingsInfoCard>

                <SettingsInfoCard
                  icon={User}
                  title="Full name"
                  subtitle="Stored value from your account"
                  iconClassName="text-violet-300"
                >
                  <p className="text-sm text-slate-200">
                    {profileForm.fullName || "No full name added yet"}
                  </p>
                </SettingsInfoCard>
              </div>

              <div className="mt-8 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={loadCurrentUser}
                  className="rounded-xl border border-slate-800 bg-slate-900 px-4 py-2.5 text-sm font-medium text-slate-200 transition hover:bg-slate-800"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleProfileSave}
                  disabled={isSavingProfile}
                  className="rounded-xl bg-gradient-to-r from-cyan-500 to-indigo-500 px-5 py-2.5 text-sm font-medium text-white shadow-lg shadow-cyan-500/10 transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-70"
                >
                  {isSavingProfile ? "Saving..." : "Save Changes"}
                </button>
              </div>
            </div>
          ) : activeSection === "notifications" ? (
            <div className={`${cardClass()} p-6 sm:p-8`}>
              <div className="mb-8">
                <h3 className="text-[32px] font-semibold tracking-tight text-white">
                  Notifications
                </h3>
                <p className="mt-1.5 text-sm text-slate-400">
                  Choose how you want to be notified across TeamForge.
                </p>
              </div>

              <div className="space-y-8">
                <div>
                  <h4 className="mb-4 flex items-center gap-2 text-base font-semibold text-white">
                    <Mail className="h-4 w-4 text-cyan-300" />
                    Email notifications
                  </h4>

                  <div className="space-y-4">
                    {[
                      {
                        key: "taskAssignments",
                        label: "Task assignments",
                        description: "When a task is assigned to you",
                      },
                      {
                        key: "commentsMentions",
                        label: "Comments & mentions",
                        description: "When someone comments or mentions you",
                      },
                      {
                        key: "projectUpdates",
                        label: "Project updates",
                        description:
                          "Important changes in projects and workspace",
                      },
                      {
                        key: "weeklyDigest",
                        label: "Weekly digest",
                        description: "A weekly summary of your activity",
                      },
                    ].map((item) => (
                      <div
                        key={item.key}
                        className="flex items-center justify-between gap-4 rounded-2xl border border-slate-800 bg-slate-950/40 p-4"
                      >
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-white">
                            {item.label}
                          </p>
                          <p className="text-xs text-slate-400">
                            {item.description}
                          </p>
                        </div>

                        <ThemeToggleSwitch
                          checked={
                            notificationPrefs[
                              item.key as keyof typeof notificationPrefs
                            ] as boolean
                          }
                          onChange={(value) =>
                            setNotificationPrefs((prev) => ({
                              ...prev,
                              [item.key]: value,
                            }))
                          }
                        />
                      </div>
                    ))}
                  </div>
                </div>

                <div className="border-t border-slate-800 pt-8">
                  <h4 className="mb-4 flex items-center gap-2 text-base font-semibold text-white">
                    <Smartphone className="h-4 w-4 text-violet-300" />
                    In-app preferences
                  </h4>

                  <div className="space-y-4">
                    {[
                      {
                        key: "desktopNotifications",
                        label: "Desktop notifications",
                        description:
                          "Show task and workspace alerts on desktop",
                      },
                      {
                        key: "soundAlerts",
                        label: "Sound alerts",
                        description: "Play a sound for important updates",
                      },
                    ].map((item) => (
                      <div
                        key={item.key}
                        className="flex items-center justify-between gap-4 rounded-2xl border border-slate-800 bg-slate-950/40 p-4"
                      >
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-white">
                            {item.label}
                          </p>
                          <p className="text-xs text-slate-400">
                            {item.description}
                          </p>
                        </div>

                        <ThemeToggleSwitch
                          checked={
                            notificationPrefs[
                              item.key as keyof typeof notificationPrefs
                            ] as boolean
                          }
                          onChange={(value) =>
                            setNotificationPrefs((prev) => ({
                              ...prev,
                              [item.key]: value,
                            }))
                          }
                        />
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="mt-8 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() =>
                    setNotificationPrefs({
                      taskAssignments: true,
                      commentsMentions: true,
                      projectUpdates: true,
                      weeklyDigest: false,
                      desktopNotifications: true,
                      soundAlerts: false,
                    })
                  }
                  className="rounded-xl border border-slate-800 bg-slate-900 px-4 py-2.5 text-sm font-medium text-slate-200 transition hover:bg-slate-800"
                >
                  Reset
                </button>

                <button
                  type="button"
                  onClick={handleNotificationSave}
                  className="rounded-xl bg-gradient-to-r from-cyan-500 to-indigo-500 px-5 py-2.5 text-sm font-medium text-white shadow-lg shadow-cyan-500/10 transition hover:brightness-110"
                >
                  Save Preferences
                </button>
              </div>
            </div>
          ) : activeSection === "appearance" ? (
            <div className={`${cardClass()} p-6 sm:p-8`}>
              <div className="mb-8">
                <h3 className="text-[32px] font-semibold tracking-tight text-white">
                  Appearance
                </h3>
                <p className="mt-1.5 text-sm text-slate-400">
                  Customize how TeamForge looks on your device.
                </p>
              </div>

              <div className="space-y-8">
                <div>
                  <h4 className="mb-4 text-base font-semibold text-white">
                    Theme
                  </h4>

                  <div className="grid gap-4 sm:grid-cols-3">
                    {[
                      { id: "light", label: "Light", icon: Sun },
                      { id: "dark", label: "Dark", icon: Moon },
                      { id: "system", label: "System", icon: Monitor },
                    ].map((option) => {
                      const Icon = option.icon;
                      const active = appearancePrefs.theme === option.id;

                      return (
                        <button
                          key={option.id}
                          type="button"
                          onClick={() => {
                            setAppearancePrefs((prev) => ({
                              ...prev,
                              theme: option.id,
                            }));
                            applyThemePreference(option.id as any);
                          }}
                          className={`rounded-2xl border p-5 text-left transition ${
                            active
                              ? "border-cyan-500/40 bg-cyan-500/10"
                              : "border-slate-800 bg-slate-950/40 hover:border-slate-700"
                          }`}
                        >
                          <Icon
                            className={`mb-3 h-5 w-5 ${
                              active ? "text-cyan-300" : "text-slate-400"
                            }`}
                          />
                          <p
                            className={`text-sm font-medium ${
                              active ? "text-white" : "text-slate-300"
                            }`}
                          >
                            {option.label}
                          </p>
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="border-t border-slate-800 pt-8">
                  <h4 className="mb-4 flex items-center gap-2 text-base font-semibold text-white">
                    <Globe className="h-4 w-4 text-violet-300" />
                    Language & region
                  </h4>

                  <div className="grid gap-5 md:grid-cols-2">
                    <div>
                      <label className="mb-2 block text-sm font-medium text-slate-300">
                        Language
                      </label>
                      <select
                        value={appearancePrefs.language}
                        onChange={(e) =>
                          setAppearancePrefs((prev) => ({
                            ...prev,
                            language: e.target.value,
                          }))
                        }
                        className={selectClass()}
                      >
                        <option value="en" className="bg-slate-950">
                          English
                        </option>
                        <option value="hi" className="bg-slate-950">
                          Hindi
                        </option>
                      </select>
                    </div>

                    <div>
                      <label className="mb-2 block text-sm font-medium text-slate-300">
                        Timezone
                      </label>
                      <select
                        value={appearancePrefs.timezone}
                        onChange={(e) =>
                          setAppearancePrefs((prev) => ({
                            ...prev,
                            timezone: e.target.value,
                          }))
                        }
                        className={selectClass()}
                      >
                        <option value="asia-kolkata" className="bg-slate-950">
                          Asia/Kolkata
                        </option>
                        <option value="utc" className="bg-slate-950">
                          UTC
                        </option>
                        <option
                          value="america-new_york"
                          className="bg-slate-950"
                        >
                          America/New_York
                        </option>
                      </select>
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-8 flex justify-end">
                <button
                  type="button"
                  onClick={handleAppearanceSave}
                  className="rounded-xl bg-gradient-to-r from-cyan-500 to-indigo-500 px-5 py-2.5 text-sm font-medium text-white shadow-lg shadow-cyan-500/10 transition hover:brightness-110"
                >
                  Save Preferences
                </button>
              </div>
            </div>
          ) : activeSection === "security" ? (
            <div className={`${cardClass()} p-6 sm:p-8`}>
              <div className="mb-8">
                <h3 className="text-[32px] font-semibold tracking-tight text-white">
                  Security
                </h3>
                <p className="mt-1.5 text-sm text-slate-400">
                  Manage password and basic account protection.
                </p>
              </div>

              <div className="rounded-[26px] border border-emerald-500/20 bg-emerald-500/10 p-4">
                <div className="flex items-start gap-3">
                  <Shield className="mt-0.5 h-5 w-5 text-emerald-300" />
                  <div>
                    <p className="text-sm font-medium text-white">
                      Your account is protected
                    </p>
                    <p className="text-xs text-slate-300">
                      Keep your password strong and never share it with anyone.
                    </p>
                  </div>
                </div>
              </div>

              <div className="mt-8 grid gap-5 md:grid-cols-2">
                <div className="md:col-span-2">
                  <h4 className="mb-4 flex items-center gap-2 text-base font-semibold text-white">
                    <Key className="h-4 w-4 text-cyan-300" />
                    Change password
                  </h4>
                </div>

                <div className="md:col-span-2">
                  {canSkipOldPasswordCheck ? (
                    <div
                      className="rounded-2xl border p-3"
                      style={{
                        borderColor:
                          "color-mix(in srgb, var(--app-muted) 32%, rgb(14 165 233) 68%)",
                        backgroundColor:
                          "color-mix(in srgb, var(--app-surface) 88%, rgb(56 189 248) 12%)",
                      }}
                    >
                      <p className="text-sm text-[var(--app-text)]">
                        You signed in with Google. Set a new password here to
                        enable email/password login too.
                      </p>
                    </div>
                  ) : (
                    <>
                      <label className="mb-2 block text-sm font-medium text-slate-300">
                        Current Password
                      </label>
                      <input
                        type="password"
                        value={passwordForm.oldPassword}
                        onChange={(e) =>
                          setPasswordForm((prev) => ({
                            ...prev,
                            oldPassword: e.target.value,
                          }))
                        }
                        className={inputClass()}
                        placeholder="Enter current password"
                      />
                    </>
                  )}
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-300">
                    New Password
                  </label>
                  <input
                    type="password"
                    value={passwordForm.newPassword}
                    onChange={(e) =>
                      setPasswordForm((prev) => ({
                        ...prev,
                        newPassword: e.target.value,
                      }))
                    }
                    className={inputClass()}
                    placeholder="Enter new password"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-300">
                    Confirm Password
                  </label>
                  <input
                    type="password"
                    value={passwordForm.confirmPassword}
                    onChange={(e) =>
                      setPasswordForm((prev) => ({
                        ...prev,
                        confirmPassword: e.target.value,
                      }))
                    }
                    className={inputClass()}
                    placeholder="Confirm new password"
                  />
                </div>
              </div>

              <div className="mt-8 flex justify-end">
                <button
                  type="button"
                  disabled={isChangingPassword}
                  onClick={handleChangePassword}
                  className="rounded-xl bg-gradient-to-r from-cyan-500 to-indigo-500 px-5 py-2.5 text-sm font-medium text-white shadow-lg shadow-cyan-500/10 transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-70"
                >
                  {isChangingPassword ? "Updating..." : "Update Password"}
                </button>
              </div>
            </div>
          ) : activeSection === "team" ? (
            renderTeamTab()
          ) : (
            renderBillingTab()
          )}
        </div>
      </div>
    </div>
  );
}
