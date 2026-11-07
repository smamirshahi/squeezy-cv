import { useMemo } from "react";
import { nanoid } from "@reduxjs/toolkit";
import { Section } from "@custom-types/vault-types";
import { appSelector, setShouldAddNewItem } from "@store/app/app-slice";
import { useAppDispatch, useAppSelector } from "@store/store-helper";
import {
  addBullet,
  addItem,
  initialState,
  moveItem,
  removeItem,
  setSection,
  updateItemFields,
  vaultSelector,
} from "@store/vault/vault-slice";
import {
  activeVariantSelector,
  setItemSelection,
} from "@store/jobs/jobs-slice";
import { useVaultDraft } from "@pages/editor-page/use-vault-draft";
import { useEffect } from "react";

/** What a new item of a section starts with */
export interface NewItemTemplate {
  fields: Record<string, string>;
  bullets: { text: string; rating?: number }[];
}

interface ReturnProps {
  /** The section as edited so far. Undefined if the section does not exist (any more). */
  section: Section | undefined;

  /** Changes some fields of an item */
  updateFields: (itemId: string, fields: Record<string, string>) => void;

  removeItem: (itemId: string) => void;

  /** Moves the item at `fromIndex` to `toIndex` */
  moveItem: (fromIndex: number, toIndex: number) => void;

  /** Shows or hides an item. The store is updated at once so the preview follows. */
  /** Whether the item is shown in the active job */
  isVisible: (itemId: string) => boolean;

  /** Shows or hides the item in the active job, at once */
  setVisibility: (itemId: string, shouldShow: boolean) => void;

  /** The draft's dispatch, for edits that are specific to one section type */
  draftDispatch: ReturnType<typeof useVaultDraft>["draftDispatch"];
}

/**
 * Draft editing of one vault section for the item-based editors (experience, education,
 * skills, ...). The "Add new ..." button in the footer adds an item made from `template`.
 */
export function useSectionDraft(
  sectionId: string,
  template: NewItemTemplate
): ReturnProps {
  const dispatch = useAppDispatch();
  const stored = useAppSelector(vaultSelector).sections.find(
    (s) => s.id === sectionId
  );
  const { shouldAddNewItem } = useAppSelector(appSelector);
  const variant = useAppSelector(activeVariantSelector);

  const source = useMemo(
    () => ({ ...initialState, sections: stored ? [stored] : [] }),
    [stored]
  );

  const { draft, draftDispatch } = useVaultDraft(source, (applied) => {
    if (applied.sections[0]) {
      dispatch(setSection(applied.sections[0]));
    }
  });

  useEffect(() => {
    if (!shouldAddNewItem) {
      return;
    }
    const itemId = nanoid();
    draftDispatch(addItem({ sectionId, id: itemId, fields: template.fields }));
    for (const bullet of template.bullets) {
      draftDispatch(addBullet({ sectionId, itemId, ...bullet }));
    }
    dispatch(setShouldAddNewItem(false));
  }, [dispatch, draftDispatch, sectionId, shouldAddNewItem, template]);

  const section = draft.sections[0];

  return {
    section,
    draftDispatch,
    updateFields: (itemId, fields) =>
      draftDispatch(updateItemFields({ sectionId, itemId, fields })),
    removeItem: (itemId) => draftDispatch(removeItem({ sectionId, itemId })),
    moveItem: (fromIndex, toIndex) => {
      const item = section?.items[fromIndex];
      if (item) {
        draftDispatch(moveItem({ sectionId, itemId: item.id, toIndex }));
      }
    },
    isVisible: (itemId) => variant.selection[itemId]?.isVisible !== false,
    setVisibility: (itemId, shouldShow) => {
      // Visibility belongs to the active job; the vault item stays as it is
      dispatch(
        setItemSelection({
          jobId: variant.id,
          itemId,
          change: { isVisible: shouldShow },
        })
      );
    },
  };
}
