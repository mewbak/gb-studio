import { useCallback, useEffect, useState } from "react";

export const useWebFullscreen = () => {
  const supportsFullscreen =
    typeof document !== "undefined" &&
    !!document.documentElement.requestFullscreen;

  const [isFullscreen, setIsFullscreen] = useState(
    () => typeof document !== "undefined" && !!document.fullscreenElement,
  );

  useEffect(() => {
    if (!supportsFullscreen) return;

    const handler = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };

    document.addEventListener("fullscreenchange", handler);
    return () => {
      document.removeEventListener("fullscreenchange", handler);
    };
  }, [supportsFullscreen]);

  const toggleFullscreen = useCallback(async () => {
    if (!supportsFullscreen) return;

    try {
      if (!document.fullscreenElement) {
        await document.documentElement.requestFullscreen();
      } else {
        await document.exitFullscreen();
      }
    } catch (err) {
      console.error("Fullscreen toggle failed", err);
    }
  }, [supportsFullscreen]);

  return { isFullscreen, supportsFullscreen, toggleFullscreen };
};
