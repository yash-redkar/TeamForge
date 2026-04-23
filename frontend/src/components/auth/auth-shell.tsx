export function AuthShell({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle: string;
  children: React.ReactNode;
}) {
  return (
    <div
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
      <div className="grid min-h-dvh lg:grid-cols-2">
        <div
          className="hidden border-r lg:flex lg:flex-col lg:justify-between lg:p-10"
          style={{
            borderColor:
              "color-mix(in srgb, var(--app-muted) 26%, transparent)",
            backgroundColor:
              "color-mix(in srgb, var(--app-surface) 82%, rgb(56 189 248) 18%)",
          }}
        >
          <div>
            <div className="flex items-center gap-3">
              <div
                className="flex h-11 w-11 items-center justify-center rounded-2xl text-lg font-bold text-white shadow-[0_10px_24px_rgba(14,165,233,0.26)]"
                style={{
                  backgroundColor: "#0ea5e9",
                  backgroundImage:
                    "linear-gradient(135deg, #06b6d4 0%, #2563eb 100%)",
                }}
              >
                T
              </div>
              <div>
                <p className="text-xl font-semibold tracking-tight text-white">
                  TeamForge
                </p>
                <p className="text-sm text-slate-400">Project command center</p>
              </div>
            </div>
          </div>

          <div className="max-w-lg">
            <p className="inline-flex rounded-full border border-white/35 bg-white/15 px-3 py-1 text-sm font-semibold uppercase tracking-[0.25em] text-white shadow-[0_1px_0_rgba(255,255,255,0.25)]">
              Welcome back
            </p>
            <h2 className="mt-4 text-4xl font-semibold leading-tight text-white">
              Focus your team. Track work. Deliver faster.
            </h2>
            <p className="mt-4 text-lg leading-8 text-slate-300">
              Log in to continue managing projects, tasks, notifications, and
              collaboration from one focused workspace.
            </p>
          </div>

          <div
            className="rounded-3xl border p-6 backdrop-blur-sm"
            style={{
              borderColor:
                "color-mix(in srgb, var(--app-muted) 28%, transparent)",
              backgroundColor:
                "color-mix(in srgb, var(--app-surface) 84%, rgb(56 189 248) 16%)",
            }}
          >
            <p className="text-sm text-slate-400">Why teams choose TeamForge</p>
            <div className="mt-4 grid gap-4 sm:grid-cols-3">
              <div>
                <p className="text-2xl font-semibold text-white">24/7</p>
                <p className="mt-1 text-sm text-slate-400">
                  Realtime visibility
                </p>
              </div>
              <div>
                <p className="text-2xl font-semibold text-white">3x</p>
                <p className="mt-1 text-sm text-slate-400">
                  Better execution flow
                </p>
              </div>
              <div>
                <p className="text-2xl font-semibold text-white">1 hub</p>
                <p className="mt-1 text-sm text-slate-400">For all team work</p>
              </div>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-center px-4 py-10 sm:px-6 lg:px-8">
          <div
            className="w-full max-w-md rounded-3xl border p-6 shadow-[0_20px_60px_rgba(15,23,42,0.12)] backdrop-blur-sm sm:p-8"
            style={{
              borderColor:
                "color-mix(in srgb, var(--app-muted) 26%, transparent)",
              backgroundColor:
                "color-mix(in srgb, var(--app-surface) 88%, rgb(56 189 248) 12%)",
            }}
          >
            <div className="mb-8">
              <h1 className="text-3xl font-semibold tracking-tight text-[var(--app-text)]">
                {title}
              </h1>
              <p className="mt-2 text-[var(--app-muted)]">{subtitle}</p>
            </div>

            {children}
          </div>
        </div>
      </div>
    </div>
  );
}
