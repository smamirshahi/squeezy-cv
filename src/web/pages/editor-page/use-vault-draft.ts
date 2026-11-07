import { Dispatch, useEffect, useReducer, useRef } from "react";
import { UnknownAction } from "@reduxjs/toolkit";
import { setVault, vaultReducer, VaultState } from "@store/vault/vault-slice";
import { useUnappliedDraft } from "@hooks/navigation";
import { useEditorPage } from "@pages/editor-page/use-editor-page";

interface ReturnProps {
  /** The vault as edited so far (not yet applied) */
  draft: VaultState;

  /** Applies a vault action to the draft only */
  draftDispatch: Dispatch<UnknownAction>;

  /**
   * Call this right before you also put a change into the store that the draft already
   * contains (e.g. a visibility toggle), so the draft is not reset and keeps the
   * user's other unapplied edits.
   */
  skipNextReset: () => void;
}

/**
 * A local copy of (part of) the vault that an editor changes with the same reducers as
 * the store. "Apply" in the editor footer writes it to the store through `apply`;
 * "Discard", or a change of `source`, resets it.
 */
export function useVaultDraft(
  source: VaultState,
  apply: (draft: VaultState) => void
): ReturnProps {
  const [draft, draftDispatch] = useReducer(vaultReducer, source);
  const shouldSkipReset = useRef(false);

  useEffect(() => {
    if (shouldSkipReset.current) {
      shouldSkipReset.current = false;
      return;
    }
    draftDispatch(setVault(source));
  }, [source]);

  // Leaving through a link or Back asks first while the draft differs from the store
  useUnappliedDraft(draft !== source);

  useEditorPage({
    onApplyChanges: () => apply(draft),
    onDiscardChanges: () => draftDispatch(setVault(source)),
  });

  return {
    draft,
    draftDispatch,
    skipNextReset: () => {
      shouldSkipReset.current = true;
    },
  };
}
