import { useEffect, useRef } from "react";
import API from "renderer/lib/api";

interface UseSelectAllShortcutOptions {
  onSelectAll: () => void;
  enabled?: boolean;
}

const isEditableTarget = (target: EventTarget | null): boolean => {
  return (
    target instanceof HTMLInputElement ||
    target instanceof HTMLTextAreaElement ||
    (target instanceof HTMLElement && target.isContentEditable)
  );
};

export const useSelectAllShortcut = ({
  onSelectAll,
  enabled = true,
}: UseSelectAllShortcutOptions): void => {
  const isClearingSelectionRef = useRef(false);
  const resetSelectionClearRef = useRef<number | null>(null);

  useEffect(() => {
    if (!enabled) {
      return;
    }

    const onKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && !e.shiftKey && e.code === "KeyA") {
        if (isEditableTarget(e.target)) {
          return;
        }

        e.preventDefault();
        onSelectAll();
      }
    };

    const onSelectionChange = (e: Event) => {
      if (isClearingSelectionRef.current) {
        return;
      }

      const selection = window.getSelection();
      if (!selection || selection.focusNode) {
        return;
      }

      isClearingSelectionRef.current = true;
      selection.removeAllRanges();
      e.preventDefault();
      onSelectAll();

      resetSelectionClearRef.current = window.setTimeout(() => {
        isClearingSelectionRef.current = false;
        resetSelectionClearRef.current = null;
      }, 0);
    };

    if (API.env === "web") {
      document.addEventListener("keydown", onKeyDown);
    } else {
      document.addEventListener("selectionchange", onSelectionChange);
    }

    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.removeEventListener("selectionchange", onSelectionChange);

      if (resetSelectionClearRef.current !== null) {
        window.clearTimeout(resetSelectionClearRef.current);
        resetSelectionClearRef.current = null;
      }

      isClearingSelectionRef.current = false;
    };
  }, [enabled, onSelectAll]);
};
