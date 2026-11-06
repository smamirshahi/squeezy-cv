import { useEffect } from "react";
import { useBlockActions } from "@pages/workspace/use-block-actions";
import {
  ZOOM_STEP,
  setCanvasZoom,
  setSelectedBlock,
} from "@store/app/app-slice";
import { useAppDispatch, useAppSelector } from "@store/store-helper";

/** The items on the page in reading order, from the DOM */
function pageItems(): HTMLElement[] {
  return Array.from(
    document.querySelectorAll<HTMLElement>("[data-cv-paper] [data-cv-item]")
  );
}

/**
 * Keyboard shortcuts for the canvas: + − 0 zoom, Tab / Shift+Tab (with the page focused) select
 * the next / previous item and let go at the ends so the keyboard is never trapped. For the
 * selected item on the canvas: H shows or hides it, B toggles
 * emphasis, Alt+Up/Down moves it within its section, Escape deselects. Ignored while the
 * user is typing in a field.
 */
export function useCanvasShortcuts(isActive: boolean): void {
  const dispatch = useAppDispatch();
  const actions = useBlockActions();
  const block = useAppSelector((s) => s.app.selectedBlock);
  const zoom = useAppSelector((s) => s.app.canvasZoom);

  useEffect(() => {
    if (!isActive) {
      return undefined;
    }
    function onKey(event: KeyboardEvent): void {
      const target = event.target as HTMLElement;
      if (
        ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName) ||
        target.isContentEditable ||
        event.metaKey ||
        event.ctrlKey
      ) {
        return;
      }
      if (event.key === "Escape") {
        dispatch(setSelectedBlock(null));
        return;
      }
      if (!event.altKey && ["+", "=", "-", "_", "0"].includes(event.key)) {
        dispatch(
          setCanvasZoom(
            event.key === "0"
              ? 1
              : zoom + (["-", "_"].includes(event.key) ? -ZOOM_STEP : ZOOM_STEP)
          )
        );
        return;
      }
      if (event.key === "Tab" && target.closest("[data-cv-paper]")) {
        const items = pageItems();
        const current = items.findIndex(
          (element) => element.dataset.cvItem === block?.itemId
        );
        const next = current + (event.shiftKey ? -1 : 1);
        // past either end: leave the page and let Tab do its normal job
        if (next >= 0 && next < items.length && items.length > 0) {
          event.preventDefault();
          const element = items[next];
          dispatch(
            setSelectedBlock({
              sectionId:
                element.closest<HTMLElement>("[data-cv-section]")?.dataset
                  .cvSection ?? "",
              itemId: element.dataset.cvItem,
            })
          );
          element.scrollIntoView?.({ block: "nearest" });
        }
        return;
      }
      if (!block) {
        return;
      }
      const key = event.key.toLowerCase();
      if (key === "h" && !event.altKey) {
        actions.toggleShown();
      } else if (key === "b" && !event.altKey) {
        actions.toggleEmphasis();
      } else if (
        event.altKey &&
        (event.key === "ArrowUp" || event.key === "ArrowDown")
      ) {
        event.preventDefault();
        actions.move(event.key === "ArrowUp" ? -1 : 1);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [isActive, block, zoom, dispatch, actions]);
}
