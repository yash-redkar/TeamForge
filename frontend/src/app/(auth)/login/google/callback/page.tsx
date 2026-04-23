"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useClientSearchParams } from "@/lib/use-client-search-params";

const WORKSPACE_LOCAL_KEYS = [
  "teamforge_active_workspace_id",
  "teamforge_chat_unread_counts",
  "teamforge_chat_unread_meta",
  "teamforge_notification_unread_count",
];

const getSafeNextUrl = (nextUrl: string | null | undefined) => {
  if (!nextUrl) return "/dashboard";

  const trimmedNextUrl = nextUrl.trim();

  if (!trimmedNextUrl.startsWith("/") || trimmedNextUrl.startsWith("//")) {
    return "/dashboard";
  }

  return trimmedNextUrl;
};

export default function GoogleLoginCallbackPage() {
  const router = useRouter();
  const searchParams = useClientSearchParams();
  const [message, setMessage] = useState("Completing Google sign-in...");

  useEffect(() => {
    const accessToken = searchParams?.get("accessToken");
    const error = searchParams?.get("error");
    const nextUrl = getSafeNextUrl(searchParams?.get("next"));

    if (error) {
      setMessage("Google sign-in could not be completed.");
      return;
    }

    if (!accessToken) {
      setMessage("Google sign-in did not return a session token.");
      return;
    }

    // Clear workspace-scoped state to avoid using stale workspace IDs
    // from a previous account session.
    for (const key of WORKSPACE_LOCAL_KEYS) {
      localStorage.removeItem(key);
    }

    localStorage.setItem("accessToken", accessToken);
    router.replace(nextUrl);
  }, [router, searchParams]);

  return (
    <main className="flex min-h-dvh items-center justify-center bg-slate-950 px-4 text-white">
      <div className="w-full max-w-md rounded-3xl border border-slate-800 bg-slate-900/90 p-8 text-center shadow-2xl">
        <p className="text-sm uppercase tracking-[0.3em] text-cyan-300">
          TeamForge
        </p>
        <h1 className="mt-4 text-2xl font-semibold">Google sign-in</h1>
        <p className="mt-3 text-sm leading-6 text-slate-400">{message}</p>

        <div className="mt-8 flex items-center justify-center gap-3 text-sm text-slate-400">
          <Link
            href="/login"
            className="text-cyan-300 transition hover:text-cyan-200"
          >
            Back to login
          </Link>
        </div>
      </div>
    </main>
  );
}
