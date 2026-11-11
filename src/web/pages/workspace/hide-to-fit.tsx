import { useEffect, useMemo, useRef, useState } from "react";
import { Alert, Box, Button, Checkbox, Typography } from "@mui/material";
import { rankHideCandidates } from "@shared/layout/hide-candidates";
import { WORKSPACE_COLORS } from "@pages/workspace/workspace-tokens";
import { ApiError, createApiClient } from "@store/persistence/api-client";
import {
  activeJobSelector,
  activeVariantSelector,
  setItemSelection,
} from "@store/jobs/jobs-slice";
import { useAppDispatch, useAppSelector } from "@store/store-helper";
import { vaultSelector } from "@store/vault/vault-slice";

/** Lines an item takes on the paper now, measured from the drawing (0 when it is not drawn) */
function measureLines(itemId: string, lineHeightPx: number): number {
  const element = document.querySelector<HTMLElement>(
    `[data-cv-paper] [data-cv-item="${itemId}"]`
  );
  if (!element || lineHeightPx <= 0) {
    return 0;
  }
  return Math.max(1, Math.round(element.offsetHeight / lineHeightPx));
}

/**
 * Choose items to hide so the CV fits: the visible items, least relevant first, each with the
 * lines it would save. Ticking only selects; "Hide selected" changes the job (the vault is
 * never touched). With `ai` the model can pick for you, but it still only ticks the boxes.
 */
export function HideToFit({
  askSignal,
}: {
  /** Raised by the AI card's button: every change asks the AI to pick */
  askSignal: number;
}): JSX.Element {
  const dispatch = useAppDispatch();
  const vault = useAppSelector(vaultSelector);
  const variant = useAppSelector(activeVariantSelector);
  const job = useAppSelector(activeJobSelector);
  const fit = useAppSelector((s) => s.app.fit);
  const api = useMemo(() => createApiClient(), []);
  const [picked, setPicked] = useState<string[]>([]);
  const [reasons, setReasons] = useState<Record<string, string>>({});
  const [isAsking, setIsAsking] = useState<boolean>(false);
  const [message, setMessage] = useState<string>("");
  const candidates = rankHideCandidates(vault, variant)
    .filter((candidate) => !candidate.isHidden)
    .map((candidate) => ({
      ...candidate,
      lines: measureLines(candidate.itemId, fit.lineHeightPx),
    }))
    .filter((candidate) => candidate.lines > 0);
  const saved = candidates
    .filter((candidate) => picked.includes(candidate.itemId))
    .reduce((sum, candidate) => sum + candidate.lines, 0);
  const lastSignal = useRef<number>(askSignal);
  const [, setMeasured] = useState<number>(0);

  // The lines are measured from the drawn page, which is only in the DOM after a render: measure
  // again once it is drawn and whenever its size or what the job shows changes
  useEffect(() => {
    setMeasured((count) => count + 1);
  }, [fit, variant.selection]);

  async function askAi(): Promise<void> {
    setIsAsking(true);
    setMessage("");
    try {
      const result = await api.suggestHide({
        linesOver: Math.max(1, fit.linesOver),
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
      setPicked(result.suggestions.map((suggestion) => suggestion.itemId));
      setReasons(
        Object.fromEntries(
          result.suggestions.map((suggestion) => [
            suggestion.itemId,
            suggestion.reason,
          ])
        )
      );
      setMessage(
        result.suggestions.length === 0
          ? "The AI did not suggest anything to hide."
          : `The AI ticked ${result.suggestions.length} ${result.suggestions.length === 1 ? "item" : "items"}. Nothing is hidden until you press Hide selected.`
      );
    } catch (caught) {
      setMessage(
        caught instanceof ApiError || caught instanceof Error
          ? caught.message
          : "The AI request failed."
      );
    } finally {
      setIsAsking(false);
    }
  }

  useEffect(() => {
    if (askSignal !== lastSignal.current) {
      lastSignal.current = askSignal;
      void askAi();
    }
    // askAi reads the current candidates; only a new signal should run it
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [askSignal]);

  function hideSelected(): void {
    for (const itemId of picked) {
      dispatch(
        setItemSelection({
          jobId: variant.id,
          itemId,
          change: { isVisible: false },
        })
      );
    }
    setPicked([]);
    setReasons({});
    setMessage("");
  }

  return (
    <Box sx={{ display: "grid", gap: 1 }}>
      <Typography sx={{ fontSize: 12, color: WORKSPACE_COLORS.muted }}>
        Least relevant first. Hiding only affects this job; the vault keeps
        everything.
      </Typography>
      {candidates.length === 0 && (
        <Typography sx={{ fontSize: 12 }}>No visible items to hide.</Typography>
      )}
      <Box component="ul" sx={{ listStyle: "none", m: 0, p: 0 }}>
        {candidates.map((candidate) => (
          <Box
            component="li"
            key={candidate.itemId}
            sx={{ display: "flex", alignItems: "flex-start", gap: 0.5 }}
          >
            <Checkbox
              size="small"
              checked={picked.includes(candidate.itemId)}
              slotProps={{ input: { "aria-label": `Hide ${candidate.label}` } }}
              onChange={(event) =>
                setPicked((current) =>
                  event.target.checked
                    ? [...current, candidate.itemId]
                    : current.filter((id) => id !== candidate.itemId)
                )
              }
            />
            <Box sx={{ pt: 0.75, minWidth: 0, flex: 1 }}>
              <Typography sx={{ fontSize: 13 }}>
                {candidate.label}{" "}
                <Box
                  component="span"
                  sx={{ color: WORKSPACE_COLORS.muted, fontSize: 12 }}
                >
                  · {candidate.sectionTitle} · saves {candidate.lines}{" "}
                  {candidate.lines === 1 ? "line" : "lines"}
                </Box>
              </Typography>
              {reasons[candidate.itemId] && (
                <Typography
                  sx={{ fontSize: 12, color: WORKSPACE_COLORS.aiText }}
                >
                  {reasons[candidate.itemId]}
                </Typography>
              )}
            </Box>
          </Box>
        ))}
      </Box>
      {isAsking && (
        <Typography role="status" sx={{ fontSize: 12 }}>
          Asking the AI…
        </Typography>
      )}
      {message && (
        <Alert severity="info" role="status">
          {message}
        </Alert>
      )}
      <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1 }}>
        <Button
          variant="contained"
          size="small"
          disabled={picked.length === 0}
          onClick={hideSelected}
        >
          Hide selected ({picked.length}
          {saved > 0
            ? `, saves ${saved} ${saved === 1 ? "line" : "lines"}`
            : ""}
          )
        </Button>
      </Box>
    </Box>
  );
}
