"use client";

import { useEffect, useRef } from "react";

const BIG_RESIZE_DELTA = 140;

export function FullscreenScrollStabilizer() {
  const viewportRef = useRef({ width: 0, height: 0 });
  const lastStableScrollYRef = useRef(0);
  const transitionTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    viewportRef.current = {
      width: window.innerWidth,
      height: window.innerHeight,
    };
    lastStableScrollYRef.current = window.scrollY;

    const markTransition = () => {
      document.documentElement.setAttribute("data-viewport-transition", "true");

      if (transitionTimerRef.current) {
        clearTimeout(transitionTimerRef.current);
      }

      transitionTimerRef.current = setTimeout(() => {
        document.documentElement.removeAttribute("data-viewport-transition");
      }, 280);
    };

    const onScroll = () => {
      lastStableScrollYRef.current = window.scrollY;
    };

    const onResize = () => {
      const nextWidth = window.innerWidth;
      const nextHeight = window.innerHeight;

      const widthDelta = Math.abs(nextWidth - viewportRef.current.width);
      const heightDelta = Math.abs(nextHeight - viewportRef.current.height);

      const isLikelyFullscreenToggle =
        widthDelta >= BIG_RESIZE_DELTA || heightDelta >= BIG_RESIZE_DELTA;

      if (isLikelyFullscreenToggle) {
        const targetY = lastStableScrollYRef.current;
        markTransition();

        requestAnimationFrame(() => {
          window.scrollTo({ top: targetY, behavior: "auto" });
        });
      }

      viewportRef.current = { width: nextWidth, height: nextHeight };
    };

    const onFullscreenChange = () => {
      const active = Boolean(document.fullscreenElement);

      if (active) {
        document.documentElement.setAttribute("data-fullscreen", "true");
      } else {
        document.documentElement.removeAttribute("data-fullscreen");
      }
    };

    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onResize);
    document.addEventListener("fullscreenchange", onFullscreenChange);

    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onResize);
      document.removeEventListener("fullscreenchange", onFullscreenChange);

      if (transitionTimerRef.current) {
        clearTimeout(transitionTimerRef.current);
      }
    };
  }, []);

  return null;
}
