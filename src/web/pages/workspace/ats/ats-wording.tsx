import { useMemo, useState } from "react";
import {
  Alert,
  Box,
  Button,
  Checkbox,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControlLabel,
  Typography,
} from "@mui/material";
import { AtsWordingResult } from "@custom-types/ats-wording-types";
import { AiBadge, AiButton, AiIcon } from "@components/ai-button";
import { useViewport } from "@hooks/use-viewport";
import { WORKSPACE_COLORS } from "@pages/workspace/workspace-tokens";
import { batch } from "@store/history/history";
import {
  activeVariantSelector,
  setItemSelection,
} from "@store/jobs/jobs-slice";
import { createApiClient } from "@store/persistence/api-client";
import { useAppDispatch, useAppSelector } from "@store/store-helper";

/**
 * "Suggest natural wording" (AI): asks a model to work the advert's keywords that the CV lacks,
 * or words differently, into the CV's own texts, where those texts already say it. The request
 * goes through the Send to AI dialog; the answer is only a proposal. Ticked suggestions become
 * this job's wording of the text (never the vault), in one undo step. Purple everywhere,
 * because a model is involved; "Use these" only applies the result, so it is a normal button.
 */
export function AtsWording({
  missing,
  reworded,
  leading,
}: {
  /** Keywords the CV lacks */
  missing: string[];

  /** Keywords the CV has, worded differently from the advert */
  reworded: string[];

  /** The button shown beside "Suggest wording" (Update score) */
  leading: JSX.Element;
}): JSX.Element {
  const terms = [...missing, ...reworded];
  const api = useMemo(() => createApiClient(), []);
  const dispatch = useAppDispatch();
  const variant = useAppSelector(activeVariantSelector);
  const isPhone = useViewport() === "phone";
  const [isBusy, setIsBusy] = useState<boolean>(false);
  const [error, setError] = useState<string>("");
  const [proposal, setProposal] = useState<AtsWordingResult | null>(null);
  const [ticked, setTicked] = useState<boolean[]>([]);

  async function ask(): Promise<void> {
    setIsBusy(true);
    setError("");
    try {
      const result = await api.suggestAtsWording(terms, reworded);
      setProposal(result);
      // a suggestion that adds something the CV does not say starts unticked
      setTicked(result.suggestions.map((entry) => entry.flags.length === 0));
    } catch (reason) {
      setError(
        reason instanceof Error ? reason.message : "The AI could not answer."
      );
    } finally {
      setIsBusy(false);
    }
  }

  function use(): void {
    if (!proposal) {
      return;
    }
    dispatch(
      batch(
        "Suggest natural wording",
        proposal.suggestions
          .filter((_entry, index) => ticked[index])
          .map((entry) =>
            setItemSelection({
              jobId: variant.id,
              itemId: entry.itemId,
              change: {
                fieldText: {
                  ...variant.selection[entry.itemId]?.fieldText,
                  [entry.field]: entry.text,
                },
              },
            })
          )
      )
    );
    setProposal(null);
  }

  return (
    <Box sx={{ display: "grid", gap: 1 }}>
      <Box sx={{ display: "flex", gap: 1 }}>
        <Box sx={{ flex: 1, minWidth: 0, display: "flex" }}>{leading}</Box>
        <AiButton
          variant="outlined"
          sx={{ flex: 1, minWidth: 0 }}
          disabled={isBusy || terms.length === 0}
          startIcon={
            isBusy ? (
              <CircularProgress size={16} color="secondary" />
            ) : undefined
          }
          onClick={() => void ask()}
        >
          Suggest wording
        </AiButton>
      </Box>
      <Typography
        sx={{
          fontSize: 12,
          color: WORKSPACE_COLORS.aiText,
          display: "flex",
          alignItems: "center",
          gap: 0.5,
        }}
      >
        <AiIcon fontSize="inherit" /> Suggestions are reviewed by you before
        anything changes.
      </Typography>
      {terms.length === 0 && (
        <Typography sx={{ fontSize: 12, color: WORKSPACE_COLORS.muted }}>
          Nothing to work in: no keyword is missing or worded differently.
        </Typography>
      )}
      {error !== "" && (
        <Alert severity="error" sx={{ py: 0 }}>
          {error}
        </Alert>
      )}
      <Dialog
        open={proposal !== null}
        onClose={() => setProposal(null)}
        maxWidth="sm"
        fullWidth
        fullScreen={isPhone}
        aria-labelledby="ats-wording-title"
      >
        <DialogTitle
          id="ats-wording-title"
          sx={{ display: "flex", alignItems: "center", gap: 1 }}
        >
          <AiIcon /> Suggested wording
        </DialogTitle>
        <DialogContent dividers sx={{ display: "grid", gap: 1.5 }}>
          {proposal?.suggestions.length === 0 && (
            <Typography sx={{ fontSize: 14 }}>
              The AI found nothing it could reword without adding something your
              texts do not say.
            </Typography>
          )}
          {proposal?.suggestions.map((entry, index) => (
            <Box
              key={`${entry.itemId}/${entry.field}`}
              sx={{
                p: 1,
                borderRadius: 1,
                border: `1px solid ${WORKSPACE_COLORS.border}`,
              }}
            >
              <FormControlLabel
                sx={{ alignItems: "flex-start", m: 0 }}
                control={
                  <Checkbox
                    size="small"
                    color="secondary"
                    checked={ticked[index] ?? false}
                    onChange={(event) =>
                      setTicked(
                        ticked.map((isTicked, at) =>
                          at === index ? event.target.checked : isTicked
                        )
                      )
                    }
                  />
                }
                label={
                  <Box>
                    <Typography sx={{ fontSize: 13, fontWeight: 700 }}>
                      {entry.label}
                    </Typography>
                    <Typography
                      sx={{
                        fontSize: 12.5,
                        color: WORKSPACE_COLORS.muted,
                        whiteSpace: "pre-wrap",
                      }}
                    >
                      Now: {entry.original}
                    </Typography>
                    <Typography
                      sx={{ fontSize: 12.5, whiteSpace: "pre-wrap", mt: 0.5 }}
                    >
                      <AiBadge /> {entry.text}
                    </Typography>
                  </Box>
                }
              />
              {entry.flags.length > 0 && (
                <Alert severity="warning" sx={{ py: 0, mt: 0.5 }}>
                  Check this, it is not in your text: {entry.flags.join("; ")}.
                </Alert>
              )}
            </Box>
          ))}
          {proposal && proposal.unplaced.length > 0 && (
            <Typography sx={{ fontSize: 13 }}>
              <b>Left out, your texts do not say it:</b>{" "}
              {proposal.unplaced.join(", ")}. Add them in the vault only where
              they are true.
            </Typography>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setProposal(null)}>Discard</Button>
          <Button
            variant="contained"
            disabled={!ticked.some(Boolean)}
            onClick={use}
          >
            Use these
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
