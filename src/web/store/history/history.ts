import { Reducer, UnknownAction, createAction } from "@reduxjs/toolkit";
import { Variant } from "@custom-types/variant-types";
import { Vault } from "@custom-types/vault-types";
import { PageStructure } from "@store/app/app-slice-types";
import { Style } from "@custom-types/styles-types";

/** What an undo step restores: the CV's facts and every variant (the things the user edits and saves) */
export interface Snapshot {
  vault: Vault;
  variants: Variant[];
  activeId: string;

  /** The action that made the change, and when: edits of the same kind in quick succession are one step */
  type: string;
  at: number;
}

export interface HistoryState {
  /** Oldest first; the last one is what `undo` goes back to */
  past: Snapshot[];
  future: Snapshot[];
}

export const undo = createAction("history/undo");
export const redo = createAction("history/redo");

/** Forget the history, e.g. after loading a file: undo must never go back to the previous file */
export const clearHistory = createAction("history/clear");

/**
 * Makes `applyOperations` (the chat) and similar batch actions one undo step: the actions it
 * expands to are reduced one after another and only one snapshot is kept.
 */
export interface BatchAction extends UnknownAction {
  type: "history/batch";
  payload: { label: string; actions: UnknownAction[] };
}

export function batch(label: string, actions: UnknownAction[]): BatchAction {
  return { type: "history/batch", payload: { label, actions } };
}

const MAX_STEPS = 100;
/** Edits of the same kind closer together than this (typing) are one undo step */
export const COALESCE_MS = 700;

/** The history is kept by `withUndo`; this reducer only gives it a place in the state */
export function historyReducer(
  state: HistoryState = { past: [], future: [] }
): HistoryState {
  return state;
}

/** The slices `withUndo` looks at */
interface Undoable {
  vault: Vault;
  variants: { variants: Variant[]; activeId: string };
  app: { structure: PageStructure };
  cvData: { style: Style };
  history: HistoryState;
}

function snapshotOf(state: Undoable, type: string, at: number): Snapshot {
  return {
    vault: state.vault,
    variants: state.variants.variants,
    activeId: state.variants.activeId,
    type,
    at,
  };
}

/** The state with a snapshot put back. The editor's mirror of the active variant (layout, style) follows. */
function restore<S extends Undoable>(state: S, snapshot: Snapshot): S {
  const active =
    snapshot.variants.find((v) => v.id === snapshot.activeId) ??
    snapshot.variants.find((v) => v.id === state.variants.activeId) ??
    snapshot.variants[0];
  return {
    ...state,
    vault: snapshot.vault,
    variants: {
      ...state.variants,
      variants: snapshot.variants,
      activeId: active.id,
    },
    app: { ...state.app, structure: active.layout },
    cvData: { ...state.cvData, style: active.style },
  };
}

/**
 * Undo and redo for everything that changes the vault or a variant, manual edits and chat
 * operations alike. A change is any action after which `vault` or the list of variants is a
 * different object; locks, saving and UI state are not steps. Typing is coalesced.
 */
export function withUndo<S extends Undoable>(
  reducer: Reducer<S>,
  now: () => number = Date.now
): Reducer<S> {
  return (state, action) => {
    if (state === undefined) {
      return reducer(state, action);
    }
    const { history } = state;

    if (undo.match(action)) {
      const previous = history.past.at(-1);
      if (!previous) {
        return state;
      }
      const restored = restore(state, previous);
      return {
        ...restored,
        history: {
          past: history.past.slice(0, -1),
          future: [
            snapshotOf(state, previous.type, previous.at),
            ...history.future,
          ],
        },
      };
    }
    if (redo.match(action)) {
      const [next, ...rest] = history.future;
      if (!next) {
        return state;
      }
      const restored = restore(state, next);
      return {
        ...restored,
        history: {
          past: [...history.past, snapshotOf(state, next.type, next.at)],
          future: rest,
        },
      };
    }
    if (clearHistory.match(action)) {
      return { ...state, history: { past: [], future: [] } };
    }

    let next: S;
    let label = action.type;
    if (action.type === "history/batch") {
      const { label: batchLabel, actions } = (action as unknown as BatchAction)
        .payload;
      label = batchLabel;
      next = actions.reduce<S>(
        (current, step) => reducer(current, step),
        state
      );
    } else {
      next = reducer(state, action);
    }

    const isEdit =
      next.vault !== state.vault ||
      next.variants.variants !== state.variants.variants;
    if (!isEdit) {
      return next;
    }
    const at = now();
    const last = history.past.at(-1);
    const isSameBurst =
      last !== undefined &&
      last.type === label &&
      at - last.at < COALESCE_MS &&
      history.future.length === 0;
    const past = isSameBurst
      ? [...history.past.slice(0, -1), { ...last, at }]
      : [...history.past, snapshotOf(state, label, at)].slice(-MAX_STEPS);
    return { ...next, history: { past, future: [] } };
  };
}
