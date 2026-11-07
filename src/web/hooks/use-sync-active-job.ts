import { useEffect } from "react";
import { Template } from "@custom-types/template-types";
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
  setActiveJob,
  setTemplateAppearance,
} from "@store/jobs/jobs-slice";

/**
 * Makes a variant the one being edited and shown: its page layout and style are loaded
 * into the editor. Call it from event handlers (the dispatches are applied together).
 */
export function activateVariant(dispatch: AppDispatch, variant: Variant): void {
  dispatch(setActiveJob({ id: variant.id }));
  dispatch(updatePageStructure(variant.layout));
  dispatch(setStyle(variant.style));
}

/** Loads the look of a template into the editor (after the active job moved to it) */
export function activateTemplateLook(
  dispatch: AppDispatch,
  template: Template
): void {
  dispatch(updatePageStructure(template.layout));
  dispatch(setStyle(template.style));
}

/**
 * Keeps the layout and style of the active job's template equal to what the editor shows, so
 * changes on the Jobs page (Sections & layout) and Style Settings belong to the template (and every
 * job that uses it). Mount it once.
 */
export function useSyncActiveJob(): void {
  const dispatch = useAppDispatch();
  const variant = useAppSelector(activeVariantSelector);
  const { structure } = useAppSelector(appSelector);
  const style = useAppSelector(styleSelector);

  useEffect(() => {
    if (
      JSON.stringify(variant.layout) !== JSON.stringify(structure) ||
      JSON.stringify(variant.style) !== JSON.stringify(style)
    ) {
      dispatch(
        setTemplateAppearance({ id: variant.id, layout: structure, style })
      );
    }
  }, [dispatch, variant.id, variant.layout, variant.style, structure, style]);
}
