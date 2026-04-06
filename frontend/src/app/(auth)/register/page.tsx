"use client";

import Link from "next/link";
import toast from "react-hot-toast";
import { useState } from "react";
import { AuthInput } from "@/components/auth/auth-input";
import { AuthShell } from "@/components/auth/auth-shell";
import { buildApiUrl } from "@/lib/api-url";
import { parseApiResponse } from "@/lib/response";

export default function RegisterPage() {
  const [fullName, setFullName] = useState("");
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleRegister = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (isLoading) return;

    if (password !== confirmPassword) {
      toast.error("Passwords do not match");
      return;
    }

    try {
      setIsLoading(true);

      const res = await fetch(buildApiUrl("/auth/register"), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          fullName,
          username,
          email,
          password,
        }),
        credentials: "include",
      });

      const data = await parseApiResponse(res);
      console.log("Register response:", data);

      if (res.ok) {
        toast.success("Registration successful. Please log in.");
        window.location.href = "/login";
      } else {
        toast.error(data?.message || "Registration failed");
      }
    } catch (err) {
      console.error("Register error:", err);
      toast.error("Something went wrong while registering.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AuthShell
      title="Create your TeamForge account"
      subtitle="Sign up to start managing projects, teams, and tasks."
    >
      <form onSubmit={handleRegister} className="space-y-5" noValidate>
        <AuthInput
          name="fullName"
          label="Full name"
          placeholder="Enter your full name"
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
        />

        <AuthInput
          name="username"
          label="Username"
          placeholder="Choose a username"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
        />

        <AuthInput
          name="email"
          label="Email address"
          type="email"
          placeholder="you@example.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />

        <AuthInput
          name="password"
          label="Password"
          type="password"
          placeholder="Create a password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />

        <AuthInput
          name="confirmPassword"
          label="Confirm password"
          type="password"
          placeholder="Re-enter your password"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
        />

        <button
          type="submit"
          disabled={isLoading}
          className="w-full rounded-2xl px-4 py-3 text-sm font-semibold text-white transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-70"
          style={{
            backgroundImage: "linear-gradient(90deg, #22d3ee 0%, #6366f1 100%)",
          }}
        >
          {isLoading ? "Creating account..." : "Create Account"}
        </button>

        <p className="text-center text-sm text-slate-400">
          Already have an account?{" "}
          <Link
            href="/login"
            className="font-medium text-cyan-300 hover:text-cyan-200"
          >
            Log in
          </Link>
        </p>
      </form>
    </AuthShell>
  );
}
