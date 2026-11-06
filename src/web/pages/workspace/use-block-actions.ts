import { computeItemOrders } from "@shared/variant/variant-utils";
import { sortItemsByVariant } from "@shared/variant/render";
import { useAppDispatch, useAppSelector } from "@store/store-helper";
import {
  activeVariantSelector,
  setItemOrders,
  setItemSelection,
} from "@store/variants/variants-slice";
import { sectionsSelector } from "@store/vault/vault-slice";

export interface BlockActions {
  /** The selected item, if an item (not just a section) is selected */
  itemId: string | undefined;
  isShown: boolean;
  isEmphasised: boolean;
  canMoveUp: boolean;
  canMoveDown: boolean;
  toggleShown: () => void;
  toggleEmphasis: () => void;
  move: (delta: -1 | 1) => void;
}

/** What can be done to the item selected on the page, for this variant (shortcuts and toolbar share it) */
export function useBlockActions(): BlockActions {
  const dispatch = useAppDispatch();
  const variant = useAppSelector(activeVariantSelector);
  const sections = useAppSelector(sectionsSelector);
  const block = useAppSelector((s) => s.app.selectedBlock);
  const section = sections.find((s) => s.id === block?.sectionId);
  const itemId = section && block?.itemId ? block.itemId : undefined;
  const choice = itemId ? variant.selection[itemId] : undefined;
  const ids = section
    ? sortItemsByVariant(section.items, variant.selection).map(
        (item) => item.id
      )
    : [];
  const index = itemId ? ids.indexOf(itemId) : -1;

  return {
    itemId,
    isShown: choice?.isVisible !== false,
    isEmphasised: choice?.emphasis === "high",
    canMoveUp: index > 0,
    canMoveDown: index >= 0 && index < ids.length - 1,
    toggleShown() {
      if (itemId) {
        dispatch(
          setItemSelection({
            variantId: variant.id,
            itemId,
            change: { isVisible: choice?.isVisible === false },
          })
        );
      }
    },
    toggleEmphasis() {
      if (itemId) {
        dispatch(
          setItemSelection({
            variantId: variant.id,
            itemId,
            change: {
              emphasis: choice?.emphasis === "high" ? "normal" : "high",
            },
          })
        );
      }
    },
    move(delta) {
      const toIndex = index + delta;
      if (
        section &&
        itemId &&
        index >= 0 &&
        toIndex >= 0 &&
        toIndex < ids.length
      ) {
        dispatch(
          setItemOrders({
            variantId: variant.id,
            orders: computeItemOrders(section.items, variant, itemId, toIndex),
          })
        );
      }
    },
  };
}
