import { useEffect, useRef } from "react";
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
  editedTemplateSelector,
  setActiveJob,
  setTemplateLook,
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
 * Keeps the layout and style of the edited template equal to what the editor shows, so changes on
 * the Jobs page (Sections & layout) and the Templates pages belong to the template (and every job
 * that uses it). The edited template is the one named in the address on Templates > Page layout /
 * Style settings, otherwise the active job's. When it changes, its look is loaded into the editor
 * first, so the previous template's look is never written into the new one. Mount it once.
 */
export function useSyncActiveJob(): void {
  const dispatch = useAppDispatch();
  const template = useAppSelector(editedTemplateSelector);
  const { structure } = useAppSelector(appSelector);
  const style = useAppSelector(styleSelector);
  const loadedFor = useRef<string>(template.id);

  useEffect(() => {
    if (loadedFor.current !== template.id) {
      loadedFor.current = template.id;
      dispatch(updatePageStructure(template.layout));
      dispatch(setStyle(template.style));
      return;
    }
    if (
      JSON.stringify(template.layout) !== JSON.stringify(structure) ||
      JSON.stringify(template.style) !== JSON.stringify(style)
    ) {
      dispatch(
        setTemplateLook({ templateId: template.id, layout: structure, style })
      );
    }
  }, [
    dispatch,
    template.id,
    template.layout,
    template.style,
    structure,
    style,
  ]);
}
