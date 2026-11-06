import { useEffect } from "react";
import { Variant } from "@custom-types/variant-types";
import { appSelector, updatePageStructure } from "@store/app/app-slice";
import { setStyle, styleSelector } from "@store/cv-data/cv-data-slice";
import {
  AppDispatch,
  useAppDispatch,
  useAppSelector,
} from "@store/store-helper";
import {
  activeVariantSelector,
  isActiveVariantReadOnlySelector,
  setActiveVariant,
  setVariantAppearance,
} from "@store/variants/variants-slice";

/**
 * Makes a variant the one being edited and shown: its page layout and style are loaded
 * into the editor. Call it from event handlers (the dispatches are applied together).
 */
export function activateVariant(dispatch: AppDispatch, variant: Variant): void {
  dispatch(setActiveVariant({ id: variant.id }));
  dispatch(updatePageStructure(variant.layout));
  dispatch(setStyle(variant.style));
}

/**
 * Keeps the active variant's layout and style equal to what the editor shows, so changes
 * on the Page Structure and Style Settings pages belong to the variant. Mount it once.
 */
export function useSyncActiveVariant(): void {
  const dispatch = useAppDispatch();
  const variant = useAppSelector(activeVariantSelector);
  const { structure } = useAppSelector(appSelector);
  const style = useAppSelector(styleSelector);
  const isReadOnly = useAppSelector(isActiveVariantReadOnlySelector);

  useEffect(() => {
    if (
      JSON.stringify(variant.layout) !== JSON.stringify(structure) ||
      JSON.stringify(variant.style) !== JSON.stringify(style)
    ) {
      if (isReadOnly) {
        // a sent variant cannot change: put the editor back to what it says
        dispatch(updatePageStructure(variant.layout));
        dispatch(setStyle(variant.style));
        return;
      }
      dispatch(
        setVariantAppearance({ id: variant.id, layout: structure, style })
      );
    }
  }, [
    dispatch,
    isReadOnly,
    variant.id,
    variant.layout,
    variant.style,
    structure,
    style,
  ]);
}
