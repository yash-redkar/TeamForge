"use client";

import Link from "next/link";
import toast from "react-hot-toast";
import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { AuthInput } from "@/components/auth/auth-input";
import { AuthShell } from "@/components/auth/auth-shell";
import { buildApiUrl } from "@/lib/api-url";
import { parseApiResponse } from "@/lib/response";

export default function ResetPasswordPage() {
  const params = useParams();
  const router = useRouter();
  const token = params.token as string;

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleResetPassword = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (isLoading) return;

    if (password !== confirmPassword) {
      toast.error("Passwords do not match");
      return;
    }

    try {
      setIsLoading(true);

      const res = await fetch(buildApiUrl(`/auth/reset-password/${token}`), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ newPassword: password }),
        credentials: "include",
      });

      const data = await parseApiResponse(res);
      console.log("Reset password response:", data);

      if (res.ok) {
        toast.success(data?.message || "Password reset successful");
        router.push("/login");
      } else {
        toast.error(data?.message || "Failed to reset password");
      }
    } catch (err) {
      console.error("Reset password error:", err);
      toast.error("Something went wrong while resetting password.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AuthShell
      title="Reset your password"
      subtitle="Enter a new password for your account."
    >
      <form onSubmit={handleResetPassword} className="space-y-5" noValidate>
        <AuthInput
          name="password"
          label="New password"
          type="password"
          placeholder="Enter your new password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />

        <AuthInput
          name="confirmPassword"
          label="Confirm new password"
          type="password"
          placeholder="Re-enter your new password"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
        />

        <button
          type="submit"
          disabled={isLoading}
          className="w-full rounded-2xl bg-gradient-to-r from-cyan-400 to-indigo-500 px-4 py-3 text-sm font-semibold text-white transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-70"
        >
          {isLoading ? "Resetting password..." : "Reset Password"}
        </button>

        <p className="text-center text-sm text-slate-400">
          Remembered your password?{" "}
          <Link
            href="/login"
            className="font-medium text-cyan-300 hover:text-cyan-200"
          >
            Back to login
          </Link>
        </p>
      </form>
    </AuthShell>
  );
}
