import { useEffect } from "react";
import { computeItemOrders } from "@shared/variant/variant-utils";
import { sortItemsByVariant } from "@shared/variant/render";
import { setSelectedBlock } from "@store/app/app-slice";
import { useAppDispatch, useAppSelector } from "@store/store-helper";
import {
  activeVariantSelector,
  setItemOrders,
  setItemSelection,
} from "@store/variants/variants-slice";
import { sectionsSelector } from "@store/vault/vault-slice";

/**
 * Keyboard shortcuts for the selected item on the canvas: H shows or hides it, B toggles
 * emphasis, Alt+Up/Down moves it within its section, Escape deselects. Ignored while the
 * user is typing in a field.
 */
export function useCanvasShortcuts(isActive: boolean): void {
  const dispatch = useAppDispatch();
  const variant = useAppSelector(activeVariantSelector);
  const sections = useAppSelector(sectionsSelector);
  const block = useAppSelector((s) => s.app.selectedBlock);

  useEffect(() => {
    if (!isActive || !block) {
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
      const section = sections.find((s) => s.id === block?.sectionId);
      const itemId = block?.itemId;
      if (!section || !itemId) {
        return;
      }
      const choice = variant.selection[itemId];
      const key = event.key.toLowerCase();
      if (key === "h" && !event.altKey) {
        dispatch(
          setItemSelection({
            variantId: variant.id,
            itemId,
            change: { isVisible: choice?.isVisible === false },
          })
        );
      } else if (key === "b" && !event.altKey) {
        dispatch(
          setItemSelection({
            variantId: variant.id,
            itemId,
            change: {
              emphasis: choice?.emphasis === "high" ? "normal" : "high",
            },
          })
        );
      } else if (
        event.altKey &&
        (event.key === "ArrowUp" || event.key === "ArrowDown")
      ) {
        event.preventDefault();
        const ids = sortItemsByVariant(section.items, variant.selection).map(
          (item) => item.id
        );
        const toIndex =
          ids.indexOf(itemId) + (event.key === "ArrowUp" ? -1 : 1);
        if (toIndex >= 0 && toIndex < ids.length) {
          dispatch(
            setItemOrders({
              variantId: variant.id,
              orders: computeItemOrders(
                section.items,
                variant,
                itemId,
                toIndex
              ),
            })
          );
        }
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [isActive, block, variant, sections, dispatch]);
}
