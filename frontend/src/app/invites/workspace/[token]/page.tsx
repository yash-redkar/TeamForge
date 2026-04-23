"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { CheckCircle2, Loader2, XCircle } from "lucide-react";
import { workspaceInviteService } from "@/services/workspace-invite.service";

export default function AcceptWorkspaceInvitePage() {
  const params = useParams();
  const router = useRouter();
  const token = params.token as string;

  const [status, setStatus] = useState<"loading" | "success" | "error">(
    "loading",
  );
  const [message, setMessage] = useState("Accepting workspace invite...");
  const [subMessage, setSubMessage] = useState(
    "Please wait while we confirm your invitation.",
  );

  useEffect(() => {
    const acceptInvite = async () => {
      try {
        const data = await workspaceInviteService.acceptWorkspaceInvite(token);

        setStatus("success");
        setMessage(data?.message || "Invite accepted successfully");
        setSubMessage(
          "Redirecting to workspaces... You may close this tab if TeamForge is already open.",
        );

        toast.success(
          data?.message || "Workspace invite accepted successfully",
        );

        setTimeout(() => {
          router.replace("/workspaces");
          router.refresh();
        }, 1800);
      } catch (err: any) {
        const errorMessage =
          err?.response?.data?.message || "Failed to accept workspace invite";

        setStatus("error");
        setMessage("Invite could not be accepted");
        setSubMessage(errorMessage);

        toast.error(errorMessage);
      }
    };

    if (token) {
      acceptInvite();
    }
  }, [token, router]);

  return (
    <div className="flex min-h-dvh items-center justify-center bg-zinc-950 px-4 text-white">
      <div className="w-full max-w-md rounded-3xl border border-slate-800 bg-slate-900/70 p-8 text-center shadow-2xl">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full border border-slate-800 bg-zinc-950">
          {status === "loading" && (
            <Loader2 className="size-8 animate-spin text-cyan-400" />
          )}
          {status === "success" && (
            <CheckCircle2 className="size-8 text-emerald-400" />
          )}
          {status === "error" && <XCircle className="size-8 text-red-400" />}
        </div>

        <h1 className="mt-5 text-2xl font-semibold">
          {status === "loading" && "Accepting Invite"}
          {status === "success" && "Invite Accepted Successfully"}
          {status === "error" && "Invite Failed"}
        </h1>

        <p className="mt-3 text-sm font-medium text-slate-200">{message}</p>
        <p className="mt-2 text-sm leading-6 text-slate-400">{subMessage}</p>

        {status === "success" && (
          <div className="mt-6 rounded-2xl border border-emerald-500/20 bg-emerald-500/10 px-4 py-3 text-xs text-emerald-300">
            Your workspace access is active now.
          </div>
        )}

        {status !== "loading" && (
          <button
            onClick={() => router.replace("/workspaces")}
            className="mt-6 rounded-xl bg-cyan-500 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-cyan-400"
          >
            Go to Workspaces
          </button>
        )}
      </div>
    </div>
  );
}
