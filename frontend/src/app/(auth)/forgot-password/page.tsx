"use client";

import Link from "next/link";
import toast from "react-hot-toast";
import { useState } from "react";
import { AuthInput } from "@/components/auth/auth-input";
import { AuthShell } from "@/components/auth/auth-shell";
import { buildApiUrl } from "@/lib/api-url";
import { parseApiResponse } from "@/lib/response";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleForgotPassword = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (isLoading) return;

    try {
      setIsLoading(true);

      const res = await fetch(buildApiUrl("/auth/forgot-password"), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email }),
        credentials: "include",
      });

      const data = await parseApiResponse(res);
      console.log("Forgot password response:", data);

      if (res.ok) {
        toast.success(
          data?.message || "Password reset link sent to your email.",
        );
      } else {
        toast.error(data?.message || "Failed to send reset link.");
      }
    } catch (err) {
      console.error("Forgot password error:", err);
      toast.error("Something went wrong while sending reset link.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AuthShell
      title="Forgot your password?"
      subtitle="Enter your email address and we’ll send you a password reset link."
    >
      <form onSubmit={handleForgotPassword} className="space-y-5" noValidate>
        <AuthInput
          name="email"
          label="Email address"
          type="email"
          placeholder="you@example.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />

        <button
          type="submit"
          disabled={isLoading}
          className="w-full rounded-2xl bg-gradient-to-r from-cyan-400 to-indigo-500 px-4 py-3 text-sm font-semibold text-white transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-70"
        >
          {isLoading ? "Sending reset link..." : "Send Reset Link"}
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
