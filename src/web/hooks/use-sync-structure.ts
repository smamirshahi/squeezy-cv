import { useEffect } from "react";
import { appSelector, updatePageStructure } from "@store/app/app-slice";
import { useAppDispatch, useAppSelector } from "@store/store-helper";
import { HEADER_IDS } from "@shared/vault/default-vault";
import { reconcileStructure } from "@shared/vault/page-structure";
import { sectionsSelector } from "@store/vault/vault-slice";

/**
 * Keeps the page structure (which part of the CV sits in which column) consistent with
 * the sections in the vault: deleted sections disappear from it, new or imported
 * sections get a place. Mount it once.
 */
export function useSyncStructure(): void {
  const dispatch = useAppDispatch();
  const { structure } = useAppSelector(appSelector);
  const sections = useAppSelector(sectionsSelector);

  useEffect(() => {
    const validIds = [...HEADER_IDS, ...sections.map((s) => s.id)];
    const next = reconcileStructure(structure, validIds);
    if (JSON.stringify(next) !== JSON.stringify(structure)) {
      dispatch(updatePageStructure(next));
    }
  }, [dispatch, sections, structure]);
}
