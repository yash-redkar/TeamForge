"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";

export function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [isChecking, setIsChecking] = useState(true);

  useEffect(() => {
    try {
      const token = localStorage.getItem("accessToken");

      if (!token) {
        router.replace(`/login?next=${encodeURIComponent(pathname)}`);
        return;
      }

      setIsChecking(false);
    } catch (error) {
      console.error("Auth check failed:", error);
      router.replace("/login");
    }
  }, [router, pathname]);

  if (isChecking) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-zinc-950 text-white">
        Checking authentication...
      </div>
    );
  }

  return <>{children}</>;
}
