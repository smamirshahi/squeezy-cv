import { useMemo, useState } from "react";
import { Alert, Box, Button, Checkbox, Typography } from "@mui/material";
import { AiButton } from "@components/ai-button";
import { useHideCandidates } from "@pages/workspace/hide-to-fit";
import { WORKSPACE_COLORS } from "@pages/workspace/workspace-tokens";
import { batch } from "@store/history/history";
import { ApiError, createApiClient } from "@store/persistence/api-client";
import {
  activeJobSelector,
  activeVariantSelector,
  setItemSelection,
} from "@store/jobs/jobs-slice";
import { HidePick, setHidePicks } from "@store/app/app-slice";
import { useAppDispatch, useAppSelector } from "@store/store-helper";

/**
 * "Ask AI to pick what to hide", with the answer shown right here: the items it would hide, each
 * with the lines it saves and its reason, ticked and ready to change. Only "Hide ticked" changes
 * the job (one undo step); the vault is never touched.
 */
export function AiHidePicks({
  isDisabled,
  linesOver,
}: {
  isDisabled: boolean;
  linesOver: number;
}): JSX.Element {
  const dispatch = useAppDispatch();
  const api = useMemo(() => createApiClient(), []);
  const variant = useAppSelector(activeVariantSelector);
  const job = useAppSelector(activeJobSelector);
  const candidates = useHideCandidates();
  const [isAsking, setIsAsking] = useState<boolean>(false);
  // Kept in the app state (per job), so leaving this step and coming back keeps the answer
  const saved = useAppSelector((s) => s.app.hidePicks);
  const answer = saved && saved.jobId === variant.id ? saved : null;
  const picks = answer?.picks ?? null;
  const ticked = answer?.ticked ?? [];
  function setAnswer(
    next: { picks: HidePick[]; ticked: string[] } | null
  ): void {
    dispatch(setHidePicks(next ? { jobId: variant.id, ...next } : null));
  }
  const [error, setError] = useState<string>("");
  const [isCancelled, setIsCancelled] = useState<boolean>(false);

  async function ask(): Promise<void> {
    setIsAsking(true);
    setError("");
    setIsCancelled(false);
    setAnswer(null);
    try {
      const result = await api.suggestHide({
        linesOver: Math.max(1, linesOver),
        candidates: candidates.map((candidate) => ({
          itemId: candidate.itemId,
          label: candidate.label,
          section: candidate.sectionTitle,
          lines: candidate.lines,
          relevance: candidate.relevance,
        })),
        ...(job.analysis
          ? {
              jobTitle: job.analysis.jobTitle,
              mustHave: job.analysis.mustHave,
            }
          : {}),
      });
      setAnswer({
        picks: result.suggestions,
        ticked: result.suggestions.map((suggestion) => suggestion.itemId),
      });
    } catch (caught) {
      // Pressing Cancel in the Send to AI window is not a failure
      if (caught instanceof ApiError && caught.code === "cancelled") {
        setIsCancelled(true);
        return;
      }
      setError(
        caught instanceof ApiError || caught instanceof Error
          ? caught.message
          : "The AI request failed."
      );
    } finally {
      setIsAsking(false);
    }
  }

  function hideTicked(): void {
    dispatch(
      batch(
        "Hide to fit",
        ticked.map((itemId) =>
          setItemSelection({
            jobId: variant.id,
            itemId,
            change: { isVisible: false },
          })
        )
      )
    );
    setAnswer(null);
  }

  const rows = (picks ?? []).map((pick) => ({
    ...pick,
    candidate: candidates.find((entry) => entry.itemId === pick.itemId),
  }));
  const savedLines = rows
    .filter((row) => ticked.includes(row.itemId))
    .reduce((sum, row) => sum + (row.candidate?.lines ?? 0), 0);

  return (
    <Box sx={{ display: "grid", gap: 1 }}>
      <Box>
        <AiButton
          size="small"
          variant="outlined"
          disabled={isDisabled || isAsking}
          onClick={() => void ask()}
        >
          {isAsking
            ? "Asking…"
            : picks
              ? "Ask AI again"
              : "Ask AI to pick what to hide"}
        </AiButton>
      </Box>
      {isCancelled && (
        <Typography
          role="status"
          sx={{ fontSize: 12.5, color: WORKSPACE_COLORS.muted }}
        >
          Cancelled. Nothing was sent.
        </Typography>
      )}
      {error && <Alert severity="error">{error}</Alert>}
      {picks && picks.length === 0 && (
        <Typography role="status" sx={{ fontSize: 12.5 }}>
          The AI did not suggest anything to hide.
        </Typography>
      )}
      {picks && picks.length > 0 && (
        <Box
          role="group"
          aria-label="Items the AI would hide"
          sx={{
            border: `1px solid ${WORKSPACE_COLORS.border}`,
            borderRadius: 1,
            bgcolor: WORKSPACE_COLORS.panel,
            p: 1,
            display: "grid",
            gap: 0.5,
          }}
        >
          <Typography sx={{ fontSize: 12.5, fontWeight: 600 }}>
            The AI would hide the following {picks.length}{" "}
            {picks.length === 1 ? "item" : "items"}. To keep{" "}
            {picks.length === 1 ? "it" : "any of them"}, untick its checkbox.
          </Typography>
          {rows.map(({ itemId, reason, candidate }) => (
            <Box
              key={itemId}
              sx={{ display: "flex", alignItems: "flex-start", gap: 0.5 }}
            >
              <Checkbox
                size="small"
                color="secondary"
                checked={ticked.includes(itemId)}
                slotProps={{
                  input: {
                    "aria-label": `Hide ${candidate?.label ?? "this item"}`,
                  },
                }}
                onChange={(event) =>
                  setAnswer({
                    picks,
                    ticked: event.target.checked
                      ? [...ticked, itemId]
                      : ticked.filter((id) => id !== itemId),
                  })
                }
              />
              <Box sx={{ pt: 0.75, minWidth: 0, flex: 1 }}>
                <Typography sx={{ fontSize: 13 }}>
                  {candidate?.label ?? itemId}
                  {candidate && (
                    <Box
                      component="span"
                      sx={{ color: WORKSPACE_COLORS.muted, fontSize: 12 }}
                    >
                      {" "}
                      · {candidate.sectionTitle} · saves {candidate.lines}{" "}
                      {candidate.lines === 1 ? "line" : "lines"}
                    </Box>
                  )}
                </Typography>
                <Typography
                  sx={{ fontSize: 12, color: WORKSPACE_COLORS.aiText }}
                >
                  {reason}
                </Typography>
              </Box>
            </Box>
          ))}
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              flexWrap: "wrap",
              gap: 1,
              pt: 0.5,
            }}
          >
            <Typography
              sx={{ flex: 1, fontSize: 12, color: WORKSPACE_COLORS.muted }}
            >
              Hiding the ticked items saves {savedLines}{" "}
              {savedLines === 1 ? "line" : "lines"}
              {linesOver > 0 ? ` of the ${linesOver} over` : ""}.
            </Typography>
            <Button size="small" onClick={() => setAnswer(null)}>
              Discard
            </Button>
            <Button
              size="small"
              variant="contained"
              disabled={ticked.length === 0}
              onClick={hideTicked}
            >
              Hide ticked ({ticked.length})
            </Button>
          </Box>
        </Box>
      )}
    </Box>
  );
}
