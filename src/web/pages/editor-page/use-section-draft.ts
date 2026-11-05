import { useMemo } from "react";
import { nanoid } from "@reduxjs/toolkit";
import { Item, Section } from "@custom-types/vault-types";
import { appSelector, setShouldAddNewItem } from "@store/app/app-slice";
import { useAppDispatch, useAppSelector } from "@store/store-helper";
import {
  addBullet,
  addItem,
  initialState,
  moveItem,
  removeItem,
  setItemVisibility,
  setSection,
  updateItemFields,
  vaultSelector,
} from "@store/vault/vault-slice";
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

  const source = useMemo(
    () => ({ ...initialState, sections: stored ? [stored] : [] }),
    [stored]
  );

  const { draft, draftDispatch, skipNextReset } = useVaultDraft(
    source,
    (applied) => {
      if (applied.sections[0]) {
        dispatch(setSection(applied.sections[0]));
      }
    }
  );

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

  function currentItem(itemId: string): Item | undefined {
    return section?.items.find((i) => i.id === itemId);
  }

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
    setVisibility: (itemId, shouldShow) => {
      draftDispatch(setItemVisibility({ sectionId, itemId, shouldShow }));
      if (
        stored?.items.find((i) => i.id === itemId)?.shouldShow !== shouldShow
      ) {
        if (currentItem(itemId)) {
          skipNextReset();
        }
        dispatch(setItemVisibility({ sectionId, itemId, shouldShow }));
      }
    },
  };
}
