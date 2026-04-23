"use client";

import Link from "next/link";
import {
  ArrowRight,
  Bell,
  CheckSquare,
  LayoutDashboard,
  MessageSquare,
  Users,
  Activity,
  Zap,
} from "lucide-react";

export default function LandingPage() {
  const features = [
    {
      icon: LayoutDashboard,
      title: "Flexible Kanban Boards",
      description:
        "Visualize work clearly with boards, statuses, and drag-and-drop task management that adapts to your workflow.",
      iconStyle: "text-sky-300 bg-sky-500/10 border border-sky-500/15",
    },
    {
      icon: MessageSquare,
      title: "Real-Time Collaboration",
      description:
        "Discuss tasks instantly with chat, comments, and live team communication that keeps everyone aligned.",
      iconStyle: "text-violet-300 bg-violet-500/10 border border-violet-500/15",
    },
    {
      icon: Bell,
      title: "Smart Notifications",
      description:
        "Stay on top of mentions, assignments, and important updates without getting overwhelmed by noise.",
      iconStyle: "text-amber-300 bg-amber-500/10 border border-amber-500/15",
    },
  ];

  const benefits = [
    {
      icon: LayoutDashboard,
      title: "Organized Workspaces",
      description: "Keep projects, tasks, and teams structured in one place.",
    },
    {
      icon: CheckSquare,
      title: "Project Tracking",
      description:
        "Monitor progress, status, deadlines, and execution clearly.",
    },
    {
      icon: Users,
      title: "Team Collaboration",
      description:
        "Collaborate with roles, comments, chat, and shared visibility.",
    },
    {
      icon: Activity,
      title: "Activity Visibility",
      description:
        "See the latest updates across workspaces, projects, and tasks.",
    },
  ];

  return (
    <main
      className="relative isolate min-h-dvh text-white"
      style={{
        backgroundColor:
          "color-mix(in srgb, var(--app-bg) 92%, rgb(56 189 248) 8%)",
      }}
    >
      <div
        className="pointer-events-none absolute inset-0 -z-10"
        style={{
          backgroundImage:
            "radial-gradient(circle at 8% 8%, rgba(56,189,248,0.22), transparent 32%), radial-gradient(circle at 92% 10%, rgba(59,130,246,0.18), transparent 28%), linear-gradient(to bottom, rgba(125,211,252,0.12), rgba(147,197,253,0.08))",
        }}
      />

      <header className="sticky top-0 z-50 border-b border-slate-800/80 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <Link href="/" className="flex items-center gap-3">
            <div
              className="flex h-12 w-12 items-center justify-center rounded-2xl text-xl font-bold text-white shadow-[0_10px_28px_rgba(14,165,233,0.28)]"
              style={{
                backgroundColor: "#0ea5e9",
                backgroundImage:
                  "linear-gradient(135deg, #06b6d4 0%, #2563eb 100%)",
              }}
            >
              T
            </div>
            <div>
              <p className="text-2xl font-semibold tracking-tight text-white">
                TeamForge
              </p>
              <p className="text-xs text-slate-400">Project command center</p>
            </div>
          </Link>

          <nav className="hidden items-center gap-10 md:flex">
            <a
              href="#features"
              className="text-sm text-slate-300 transition hover:text-white"
            >
              Features
            </a>
            <a
              href="#product"
              className="text-sm text-slate-300 transition hover:text-white"
            >
              Product
            </a>
            <a
              href="#about"
              className="text-sm text-slate-300 transition hover:text-white"
            >
              About
            </a>
          </nav>

          <div className="flex items-center gap-3">
            <Link
              href="/login"
              className="rounded-xl border border-slate-700 px-5 py-2.5 text-sm font-medium text-white transition hover:bg-slate-900"
            >
              Log In
            </Link>
            <Link
              href="/register"
              className="rounded-xl bg-linear-to-r from-sky-500 to-indigo-500 px-5 py-2.5 text-sm font-medium text-white shadow-[0_10px_30px_rgba(59,130,246,0.16)] transition hover:brightness-105"
            >
              Sign Up
            </Link>
          </div>
        </div>
      </header>

      <section className="relative overflow-hidden border-b border-slate-800">
        <div className="mx-auto flex min-h-[calc(100dvh-81px)] max-w-7xl items-center px-6 py-20">
          <div className="max-w-5xl">
            <h1 className="text-5xl font-semibold leading-tight tracking-tight text-white sm:text-6xl lg:text-7xl">
              Manage Projects, Tasks & Teams
              <br />
              <span className="bg-linear-to-r from-sky-400 via-indigo-400 to-violet-400 bg-clip-text text-transparent">
                in One Powerful Workspace
              </span>
            </h1>

            <p className="mt-6 max-w-3xl text-lg leading-8 text-slate-400">
              Organize your work, collaborate in real time, and deliver projects
              faster with a modern workspace built for focused teams.
            </p>

            <div className="mt-10 flex flex-wrap items-center gap-4">
              <Link
                href="/register"
                className="inline-flex items-center gap-2 rounded-2xl bg-linear-to-r from-sky-500 to-indigo-500 px-7 py-4 text-base font-medium text-white shadow-[0_10px_30px_rgba(59,130,246,0.16)] transition hover:brightness-105"
              >
                Get Started Free
                <ArrowRight className="size-5" />
              </Link>

              <Link
                href="/login"
                className="rounded-2xl border border-slate-700 bg-slate-900/60 px-7 py-4 text-base font-medium text-white transition hover:bg-slate-800"
              >
                Explore Demo
              </Link>
            </div>
          </div>
        </div>
      </section>

      <section id="features" className="mx-auto max-w-7xl px-6 py-24">
        <div className="grid gap-6 md:grid-cols-3">
          {features.map((feature) => {
            const Icon = feature.icon;

            return (
              <div
                key={feature.title}
                className="rounded-[28px] border border-slate-800 bg-linear-to-br from-slate-900/80 to-slate-950/90 p-8 transition hover:border-slate-700"
              >
                <div
                  className={`flex h-14 w-14 items-center justify-center rounded-2xl ${feature.iconStyle}`}
                >
                  <Icon className="size-7" />
                </div>

                <h3 className="mt-6 text-3xl font-semibold text-white">
                  {feature.title}
                </h3>
                <p className="mt-4 text-lg leading-8 text-slate-400">
                  {feature.description}
                </p>
              </div>
            );
          })}
        </div>
      </section>

      <section id="product" className="mx-auto max-w-7xl px-6 py-20">
        <div className="grid gap-14 lg:grid-cols-[1fr_0.95fr] lg:items-center">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-sky-500/20 bg-sky-500/10 px-4 py-1.5 text-sm text-sky-300">
              <Zap className="size-4" />
              Built for modern teams
            </div>

            <h2 className="mt-6 text-5xl font-semibold leading-tight tracking-tight text-white">
              Streamline Your Workflow & Boost Team Productivity
            </h2>

            <p className="mt-6 max-w-2xl text-lg leading-8 text-slate-400">
              From planning to execution, TeamForge helps teams stay aligned,
              reduce clutter, and ship faster with a clean productivity-first
              workspace.
            </p>

            <div className="mt-10 grid gap-4 sm:grid-cols-2">
              <div className="rounded-[28px] border border-slate-800 bg-linear-to-br from-slate-900/80 to-slate-950/90 p-6">
                <p className="text-5xl font-semibold text-white">3×</p>
                <p className="mt-4 text-lg leading-8 text-slate-400">
                  Faster task tracking and execution visibility
                </p>
              </div>

              <div className="rounded-[28px] border border-slate-800 bg-linear-to-br from-slate-900/80 to-slate-950/90 p-6">
                <p className="text-5xl font-semibold text-white">24/7</p>
                <p className="mt-4 text-lg leading-8 text-slate-400">
                  Realtime collaboration across teams and projects
                </p>
              </div>
            </div>
          </div>

          <div className="rounded-[32px] border border-slate-800 bg-linear-to-br from-slate-900/80 to-slate-950/90 p-8">
            <div className="grid gap-5 sm:grid-cols-2">
              {benefits.map((item) => {
                const Icon = item.icon;

                return (
                  <div
                    key={item.title}
                    className="rounded-2xl border border-slate-800 bg-[#090d18] p-5"
                  >
                    <Icon className="size-8 text-sky-300" />
                    <h3 className="mt-4 text-xl font-semibold text-white">
                      {item.title}
                    </h3>
                    <p className="mt-3 text-sm leading-7 text-slate-400">
                      {item.description}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      <section id="about" className="mx-auto max-w-7xl px-6 py-24">
        <div className="text-center">
          <h2 className="text-5xl font-semibold tracking-tight text-white">
            Why Teams Choose TeamForge
          </h2>
          <p className="mx-auto mt-6 max-w-3xl text-lg leading-8 text-slate-400">
            Everything you need to organize workspaces, track projects,
            collaborate with your team, and maintain visibility across every
            task and update.
          </p>
        </div>

        <div className="mt-14 grid gap-6 md:grid-cols-2 xl:grid-cols-4">
          {benefits.map((item) => {
            const Icon = item.icon;

            return (
              <div
                key={item.title}
                className="rounded-[28px] border border-slate-800 bg-linear-to-br from-slate-900/80 to-slate-950/90 p-7 text-center transition hover:border-slate-700"
              >
                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl border border-sky-500/15 bg-sky-500/10 text-sky-300">
                  <Icon className="size-7" />
                </div>
                <h3 className="mt-5 text-2xl font-semibold text-white">
                  {item.title}
                </h3>
                <p className="mt-3 text-base leading-7 text-slate-400">
                  {item.description}
                </p>
              </div>
            );
          })}
        </div>
      </section>

      <footer className="border-t border-slate-800">
        <div className="mx-auto grid max-w-7xl gap-10 px-6 py-14 md:grid-cols-[1.3fr_1fr_1fr_1fr]">
          <div>
            <div className="flex items-center gap-3">
              <div
                className="flex h-12 w-12 items-center justify-center rounded-2xl text-xl font-bold text-white shadow-[0_10px_24px_rgba(14,165,233,0.24)]"
                style={{
                  backgroundColor: "#0ea5e9",
                  backgroundImage:
                    "linear-gradient(135deg, #06b6d4 0%, #2563eb 100%)",
                }}
              >
                T
              </div>
              <div>
                <p className="text-2xl font-semibold text-white">TeamForge</p>
                <p className="text-sm text-slate-400">
                  Modern project management for focused teams.
                </p>
              </div>
            </div>
          </div>

          <div>
            <p className="text-lg font-semibold text-white">Product</p>
            <div className="mt-4 space-y-3 text-sm text-slate-400">
              <p>Features</p>
              <p>Pricing</p>
              <p>Security</p>
            </div>
          </div>

          <div>
            <p className="text-lg font-semibold text-white">Company</p>
            <div className="mt-4 space-y-3 text-sm text-slate-400">
              <p>About</p>
              <p>Blog</p>
              <p>Careers</p>
            </div>
          </div>

          <div>
            <p className="text-lg font-semibold text-white">Support</p>
            <div className="mt-4 space-y-3 text-sm text-slate-400">
              <p>Help Center</p>
              <p>Contact</p>
              <p>Status</p>
            </div>
          </div>
        </div>

        <div className="mx-auto flex max-w-7xl flex-col gap-4 border-t border-slate-800 px-6 py-6 text-sm text-slate-500 sm:flex-row sm:items-center sm:justify-between">
          <p>© 2026 TeamForge. All rights reserved.</p>
          <div className="flex items-center gap-6">
            <p>Privacy</p>
            <p>Terms</p>
          </div>
        </div>
      </footer>
    </main>
  );
}
