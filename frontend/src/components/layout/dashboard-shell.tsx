"use client";

import { useEffect, useState } from "react";
import { AppNavbar } from "./app-navbar";
import { AppSidebar } from "./app-sidebar";
import { MobileSidebarDrawer } from "./mobile-sidebar-drawer";
import { GlobalSearchModal } from "./global-search-modal";
import { AiAssistantModal } from "./ai-assistant-modal";
import { useAuth } from "@/context/auth-context";

export function DashboardShell({ children }: { children: React.ReactNode }) {
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [assistantOpen, setAssistantOpen] = useState(false);

  const { user, isLoading } = useAuth();

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setSearchOpen(true);
      }

      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "j") {
        event.preventDefault();
        setAssistantOpen(true);
      }

      if (event.key === "Escape") {
        setSearchOpen(false);
        setAssistantOpen(false);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  return (
    <div className="min-h-dvh bg-[var(--app-bg)] text-[var(--app-text)]">
      <AppSidebar
        className="fixed inset-y-0 left-0 z-30 hidden w-72 lg:flex"
        user={user}
      />

      <MobileSidebarDrawer
        isOpen={mobileSidebarOpen}
        onClose={() => setMobileSidebarOpen(false)}
        user={user}
      />

      <GlobalSearchModal
        isOpen={searchOpen}
        onClose={() => setSearchOpen(false)}
      />

      <AiAssistantModal
        isOpen={assistantOpen}
        onClose={() => setAssistantOpen(false)}
      />

      <div className="lg:pl-72">
        <AppNavbar
          onOpenSidebar={() => setMobileSidebarOpen(true)}
          onOpenSearch={() => setSearchOpen(true)}
          onOpenAssistant={() => setAssistantOpen(true)}
          user={user}
        />

        <main className="px-4 pb-8 pt-4 sm:px-6 lg:px-8">
          {isLoading ? (
            <div className="space-y-2 text-white">
              <h1 className="text-2xl font-semibold">Loading...</h1>
              <p className="text-slate-400">
                Please wait while we load your workspace.
              </p>
            </div>
          ) : (
            children
          )}
        </main>
      </div>
    </div>
  );
}
