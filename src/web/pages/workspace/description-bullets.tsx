import { useMemo, useState } from "react";
import {
  Alert,
  Box,
  Button,
  Checkbox,
  FormControlLabel,
  MenuItem,
  TextField,
  Typography,
} from "@mui/material";
import { nanoid } from "nanoid";
import { BulletsMode, BulletsResult } from "@custom-types/bullets-types";
import { Item } from "@custom-types/vault-types";
import { generatedBulletsChange } from "@shared/variant/variant-utils";
import { sortBulletsByVariant } from "@shared/variant/render";
import { WORKSPACE_COLORS } from "@pages/workspace/workspace-tokens";
import { batch } from "@store/history/history";
import { createApiClient } from "@store/persistence/api-client";
import { useAppDispatch, useAppSelector } from "@store/store-helper";
import {
  activeJobSelector,
  activeVariantSelector,
  setItemSelection,
} from "@store/jobs/jobs-slice";

interface Props {
  item: Item;
}

const MODE_LABELS: Record<BulletsMode, string> = {
  make: "Make bullets",
  shorten: "Shorten",
  rephrase: "Rephrase for this job",
  emphasise: "Emphasise",
};

/**
 * Bullets for one item in this job, made by AI from the item's description. The proposal is only
 * shown: a bullet with something that is not in the description is flagged and starts unticked, and
 * "Use these bullets" saves the ticked ones in the job (the vault is never changed; one undo step).
 */
export function DescriptionBullets({ item }: Props): JSX.Element {
  const dispatch = useAppDispatch();
  const api = useMemo(() => createApiClient(), []);
  const variant = useAppSelector(activeVariantSelector);
  const [busy, setBusy] = useState<BulletsMode | null>(null);
  const [error, setError] = useState<string>("");
  const [proposal, setProposal] = useState<BulletsResult | null>(null);
  const [ticked, setTicked] = useState<boolean[]>([]);
  const [focus, setFocus] = useState<string>("");

  const description = (item.fields.description ?? "").trim();
  const choice = variant.selection[item.id];
  const hasGenerated = (choice?.generated?.length ?? 0) > 0;
  const analysis = useAppSelector(activeJobSelector).analysis;
  const requirements = variant.tailor
    ? [
        ...variant.tailor.requirements.mustHave,
        ...variant.tailor.requirements.niceToHave,
      ]
    : analysis
      ? [...analysis.mustHave, ...analysis.niceToHave, ...analysis.keywords]
      : [];
  const currentTexts = sortBulletsByVariant(item, variant.selection)
    .filter((bullet) => choice?.bullets?.[bullet.id]?.isVisible !== false)
    .map((bullet) => bullet.text);

  async function ask(mode: BulletsMode): Promise<void> {
    setBusy(mode);
    setError("");
    setProposal(null);
    try {
      const result = await api.generateBullets({
        itemId: item.id,
        mode,
        requirements,
        current: mode === "make" ? undefined : currentTexts,
        focus: mode === "emphasise" ? focus : undefined,
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
          change: generatedBulletsChange(choice, accepted),
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
          change: generatedBulletsChange(choice, undefined),
        }),
      ])
    );
  }

  return (
    <Box
      role="group"
      aria-label="Bullets from the description"
      sx={{ display: "flex", flexDirection: "column", gap: 1 }}
    >
      <Typography sx={{ fontSize: 12, fontWeight: 700 }}>
        Bullets from the description
      </Typography>
      {description === "" ? (
        <Typography sx={{ fontSize: 12.5, color: WORKSPACE_COLORS.muted }}>
          Write what you did in the Description of this item (In vault tab),
          save, and AI can make bullets from it for this job.
        </Typography>
      ) : (
        <>
          <Typography sx={{ fontSize: 12, color: WORKSPACE_COLORS.muted }}>
            Uses the saved description (save first if you just changed it).
            Nothing changes until you pick “Use these bullets”.
          </Typography>
          <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.5 }}>
            <Button
              size="small"
              variant="outlined"
              disabled={busy !== null}
              onClick={() => void ask("make")}
            >
              {busy === "make" ? "Making…" : MODE_LABELS.make}
            </Button>
            {currentTexts.length > 0 && (
              <Button
                size="small"
                variant="outlined"
                disabled={busy !== null}
                onClick={() => void ask("shorten")}
              >
                {busy === "shorten" ? "Shortening…" : MODE_LABELS.shorten}
              </Button>
            )}
            {currentTexts.length > 0 && requirements.length > 0 && (
              <Button
                size="small"
                variant="outlined"
                disabled={busy !== null}
                onClick={() => void ask("rephrase")}
              >
                {busy === "rephrase" ? "Rephrasing…" : MODE_LABELS.rephrase}
              </Button>
            )}
          </Box>
          {currentTexts.length > 0 && requirements.length > 0 && (
            <Box sx={{ display: "flex", gap: 0.5, alignItems: "center" }}>
              <TextField
                select
                size="small"
                label="Requirement to emphasise"
                value={focus}
                onChange={(event) => setFocus(event.target.value)}
                sx={{ flex: 1 }}
              >
                {requirements.map((text) => (
                  <MenuItem key={text} value={text}>
                    {text}
                  </MenuItem>
                ))}
              </TextField>
              <Button
                size="small"
                variant="outlined"
                disabled={busy !== null || focus === ""}
                onClick={() => void ask("emphasise")}
              >
                {busy === "emphasise" ? "Working…" : MODE_LABELS.emphasise}
              </Button>
            </Box>
          )}
        </>
      )}
      {hasGenerated && (
        <Button size="small" onClick={useVaultBullets}>
          Use the vault’s bullets instead
        </Button>
      )}
      {error && (
        <Alert severity="error" sx={{ py: 0 }}>
          {error}
        </Alert>
      )}
      {proposal && (
        <Box
          role="group"
          aria-label="Proposed bullets"
          sx={{
            p: 0.75,
            border: `1px solid ${WORKSPACE_COLORS.border}`,
            borderRadius: 1,
            fontSize: 12.5,
          }}
        >
          {proposal.bullets.map((bullet, index) => (
            <Box key={index}>
              <FormControlLabel
                label={bullet.text}
                control={
                  <Checkbox
                    size="small"
                    checked={ticked[index] ?? false}
                    onChange={(event) =>
                      setTicked(
                        ticked.map((value, at) =>
                          at === index ? event.target.checked : value
                        )
                      )
                    }
                  />
                }
              />
              {bullet.flags.length > 0 && (
                <Alert severity="warning" sx={{ py: 0 }}>
                  Check this, it is not in your description:{" "}
                  {bullet.flags.join("; ")}.
                </Alert>
              )}
            </Box>
          ))}
          <Box
            sx={{
              display: "flex",
              justifyContent: "flex-end",
              gap: 0.5,
              mt: 0.5,
            }}
          >
            <Button size="small" onClick={() => setProposal(null)}>
              Discard
            </Button>
            <Button
              size="small"
              variant="contained"
              disabled={!ticked.some(Boolean)}
              onClick={accept}
            >
              Use these bullets
            </Button>
          </Box>
        </Box>
      )}
    </Box>
  );
}
