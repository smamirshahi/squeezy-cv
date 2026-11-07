import { UnknownAction, combineReducers } from "@reduxjs/toolkit";
import { Operation } from "@custom-types/chat-types";
import { reorderLayoutSections } from "@shared/ai/apply-proposal";
import { sortItemsByVariant } from "@shared/variant/render";
import { computeItemOrders } from "@shared/variant/variant-utils";
import { appReducer, updatePageStructure } from "@store/app/app-slice";
import { cvDataReducer } from "@store/cv-data/cv-data-slice";
import {
  activeVariantSelector,
  setBulletSelection,
  setItemOrders,
  setItemSelection,
  setPageLimit,
  setTone,
  setTemplateAppearance,
  jobsReducer,
} from "@store/jobs/jobs-slice";
import { setBulletAlt, vaultReducer } from "@store/vault/vault-slice";

const simulate = combineReducers({
  cvData: cvDataReducer,
  vault: vaultReducer,
  jobs: jobsReducer,
  app: appReducer,
});

type Simulated = ReturnType<typeof simulate>;

/** The slices the operations read; the real state has more */
export type OperationState = Pick<
  Simulated,
  "cvData" | "vault" | "jobs" | "app"
>;

function actionsFor(state: Simulated, op: Operation): UnknownAction[] {
  const variant = activeVariantSelector(state);
  const jobId = variant.id;
  const sections = state.vault.sections;
  const section = (itemId: string): (typeof sections)[number] | undefined =>
    sections.find((s) => s.items.some((i) => i.id === itemId));

  switch (op.op) {
    case "hideItem":
      return section(op.itemId)
        ? [
            setItemSelection({
              jobId,
              itemId: op.itemId,
              change: { isVisible: !op.isHidden },
            }),
          ]
        : [];
    case "emphasiseItem":
      return section(op.itemId)
        ? [
            setItemSelection({
              jobId,
              itemId: op.itemId,
              change: { emphasis: op.isEmphasised ? "high" : "normal" },
            }),
          ]
        : [];
    case "moveItem": {
      const home = section(op.itemId);
      if (!home) {
        return [];
      }
      const count = sortItemsByVariant(home.items, variant.selection).length;
      const toIndex = Math.min(count - 1, Math.max(0, op.position - 1));
      return [
        setItemOrders({
          jobId,
          orders: computeItemOrders(home.items, variant, op.itemId, toIndex),
        }),
      ];
    }
    case "moveSection": {
      const structure = state.app.structure;
      const ids = new Set(sections.map((s) => s.id));
      const order = [
        ...structure.fullWidth,
        ...structure.left,
        ...structure.right,
      ].filter((id) => ids.has(id));
      if (!order.includes(op.sectionId)) {
        return [];
      }
      const next = order.filter((id) => id !== op.sectionId);
      next.splice(
        Math.min(next.length, Math.max(0, op.position - 1)),
        0,
        op.sectionId
      );
      const layout = reorderLayoutSections(structure, next);
      return [
        updatePageStructure(layout),
        // the variant's own copy is written in the same step (the sync hook would do it one step later)
        setTemplateAppearance({
          id: jobId,
          layout,
          style: state.cvData.style,
        }),
      ];
    }
    case "hideBullet":
      return section(op.itemId)
        ? [
            setBulletSelection({
              jobId,
              itemId: op.itemId,
              bulletId: op.bulletId,
              change: { isVisible: !op.isHidden },
            }),
          ]
        : [];
    case "useWording":
      return section(op.itemId)
        ? [
            setBulletSelection({
              jobId,
              itemId: op.itemId,
              bulletId: op.bulletId,
              change: { wording: op.wording },
            }),
          ]
        : [];
    case "rewriteBullet": {
      const home = section(op.itemId);
      return home
        ? [
            setBulletAlt({
              sectionId: home.id,
              itemId: op.itemId,
              bulletId: op.bulletId,
              kind: op.wording,
              text: op.text,
            }),
            setBulletSelection({
              jobId,
              itemId: op.itemId,
              bulletId: op.bulletId,
              change: { wording: op.wording },
            }),
          ]
        : [];
    }
    case "setTone":
      return [setTone({ id: jobId, tone: op.tone })];
    case "setPageLimit":
      return [setPageLimit({ id: jobId, pageLimit: op.pages })];
  }
}

/**
 * The reducer actions that carry out `operations` on the active variant, in order. Each
 * operation is worked out against the state the ones before it leave, so several moves
 * add up. Operations about things that are not there any more give no actions. The actions are
 * the same ones a manual edit dispatches. Pure.
 */
export function operationsToActions(
  state: OperationState,
  operations: Operation[]
): { actions: UnknownAction[]; skipped: number } {
  const actions: UnknownAction[] = [];
  let skipped = 0;
  // only the slices the reducers know (the real state has more, which combineReducers would warn about)
  let current: Simulated = {
    cvData: state.cvData,
    vault: state.vault,
    jobs: state.jobs,
    app: state.app,
  };
  for (const operation of operations) {
    const next = actionsFor(current, operation);
    if (next.length === 0) {
      skipped += 1;
    }
    for (const action of next) {
      current = simulate(current, action);
      actions.push(action);
    }
  }
  return { actions, skipped };
}
