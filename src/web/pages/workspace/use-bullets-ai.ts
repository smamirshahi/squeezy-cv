import { useMemo, useState } from "react";
import { nanoid } from "nanoid";
import { BulletsMode, BulletsResult } from "@custom-types/bullets-types";
import { Item } from "@custom-types/vault-types";
import { generatedBulletsChange } from "@shared/variant/variant-utils";
import { sortBulletsByVariant } from "@shared/variant/render";
import { batch } from "@store/history/history";
import { createApiClient } from "@store/persistence/api-client";
import { useAppDispatch, useAppSelector } from "@store/store-helper";
import {
  activeJobSelector,
  activeVariantSelector,
  setItemSelection,
} from "@store/jobs/jobs-slice";

/** The points to lean on: the ones picked for this request, else the ones picked for the item */
function focusFor(
  mode: BulletsMode,
  focus: string[] | undefined,
  leanOn: string[]
): string[] | undefined {
  if (mode === "emphasise") {
    return focus;
  }
  return leanOn.length > 0 ? leanOn : undefined;
}

/**
 * Bullets for one item in this job, made by AI from the item's description. The proposal is only
 * kept in this state: a bullet with something that is not in the description is flagged and
 * starts unticked, and `accept` saves the ticked ones in the job (the vault is never changed; one
 * undo step). `leanOn` = the points the user picked to emphasise; they go with every request.
 */
// eslint-disable-next-line @typescript-eslint/explicit-function-return-type -- the return type is inferred from the state it hands out
export function useBulletsAi(item: Item, leanOn: string[] = []) {
  const dispatch = useAppDispatch();
  const api = useMemo(() => createApiClient(), []);
  const variant = useAppSelector(activeVariantSelector);
  const [busy, setBusy] = useState<BulletsMode | null>(null);
  const [error, setError] = useState<string>("");
  const [proposal, setProposal] = useState<BulletsResult | null>(null);
  const [ticked, setTicked] = useState<boolean[]>([]);
  // The bullets say what the description says: by default the description is left out of this job
  const [isReplacingDescription, setIsReplacingDescription] =
    useState<boolean>(true);

  const description = (item.fields.description ?? "").trim();
  const choice = variant.selection[item.id];
  const hiddenFields = choice?.hiddenFields ?? [];
  const hasGenerated = (choice?.generated?.length ?? 0) > 0;
  const analysis = useAppSelector(activeJobSelector).analysis;
  let requirements: string[] = [];
  if (variant.tailor) {
    requirements = [
      ...variant.tailor.requirements.mustHave,
      ...variant.tailor.requirements.niceToHave,
    ];
  } else if (analysis) {
    requirements = [
      ...analysis.mustHave,
      ...analysis.niceToHave,
      ...analysis.keywords,
    ];
  }
  const currentTexts = sortBulletsByVariant(item, variant.selection)
    .filter((bullet) => choice?.bullets?.[bullet.id]?.isVisible !== false)
    .map((bullet) => bullet.text);

  async function ask(mode: BulletsMode, focus?: string[]): Promise<void> {
    setBusy(mode);
    setError("");
    setProposal(null);
    try {
      const result = await api.generateBullets({
        itemId: item.id,
        mode,
        requirements,
        current: mode === "make" ? undefined : currentTexts,
        focus: focusFor(mode, focus, leanOn),
      });
      setProposal(result);
      setTicked(result.bullets.map((bullet) => bullet.flags.length === 0));
    } catch (reason) {
      setError(
        reason instanceof Error ? reason.message : "Making bullets failed."
      );
    } finally {
      setBusy(null);
    }
  }

  function accept(): void {
    if (!proposal) {
      return;
    }
    const accepted = proposal.bullets
      .filter((_bullet, index) => ticked[index])
      .map((bullet) => ({ id: nanoid(), text: bullet.text }));
    dispatch(
      batch("AI bullets", [
        setItemSelection({
          jobId: variant.id,
          itemId: item.id,
          change: {
            ...generatedBulletsChange(choice, accepted),
            ...(isReplacingDescription && !hiddenFields.includes("description")
              ? { hiddenFields: [...hiddenFields, "description"] }
              : {}),
          },
        }),
      ])
    );
    setProposal(null);
  }

  function useVaultBullets(): void {
    dispatch(
      batch("Use vault bullets", [
        setItemSelection({
          jobId: variant.id,
          itemId: item.id,
          change: {
            ...generatedBulletsChange(choice, undefined),
            // the description comes back with the vault's bullets
            ...(hiddenFields.includes("description")
              ? {
                  hiddenFields:
                    hiddenFields.filter((key) => key !== "description").length >
                    0
                      ? hiddenFields.filter((key) => key !== "description")
                      : undefined,
                }
              : {}),
          },
        }),
      ])
    );
  }

  return {
    busy,
    error,
    proposal,
    ticked,
    setTicked,
    setProposal,
    isReplacingDescription,
    setIsReplacingDescription,
    description,
    hiddenFields,
    hasGenerated,
    requirements,
    currentTexts,
    ask,
    accept,
    useVaultBullets,
  };
}
