import { useEffect } from "react";
import { redo, undo } from "@store/history/history";
import { useAppDispatch } from "@store/store-helper";

/**
 * Ctrl/Cmd+Z undoes, Ctrl/Cmd+Shift+Z or Ctrl+Y redoes. While typing in a field the browser's
 * own undo of that field is left alone.
 */
export function useUndoShortcuts(): void {
  const dispatch = useAppDispatch();
  useEffect(() => {
    function onKey(event: KeyboardEvent): void {
      const target = event.target as HTMLElement;
      if (
        ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName) ||
        target.isContentEditable ||
        !(event.metaKey || event.ctrlKey) ||
        event.altKey
      ) {
        return;
      }
      const key = event.key.toLowerCase();
      if (key === "z" && !event.shiftKey) {
        event.preventDefault();
        dispatch(undo());
      } else if ((key === "z" && event.shiftKey) || key === "y") {
        event.preventDefault();
        dispatch(redo());
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [dispatch]);
}
