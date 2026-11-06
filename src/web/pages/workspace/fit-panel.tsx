import { useEffect, useMemo, useState } from "react";
import {
  Alert,
  Box,
  Button,
  Checkbox,
  Chip,
  CircularProgress,
  FormControlLabel,
  Typography,
} from "@mui/material";
import {
  pickItemsToHide,
  rankHideCandidates,
} from "@shared/layout/hide-candidates";
import { HideResult } from "@custom-types/hide-types";
import {
  AiStatus,
  ApiError,
  createApiClient,
  taskProvider,
} from "@store/persistence/api-client";
import { WORKSPACE_COLORS } from "@pages/workspace/workspace-tokens";
import { useAppDispatch, useAppSelector } from "@store/store-helper";
import {
  activeVariantSelector,
  setItemSelection,
} from "@store/variants/variants-slice";
import { vaultSelector } from "@store/vault/vault-slice";

const MAX_LISTED = 8;

/** Lines an item takes on the page now, measured from what is drawn */
function measureLines(itemId: string, lineHeightPx: number): number {
  const element = document.querySelector<HTMLElement>(
    `[data-cv-item="${itemId}"]`
  );
  return element ? Math.ceil(element.offsetHeight / lineHeightPx) : 0;
}

/**
 * "Hide to gain lines": the least relevant items, with what each would save. Ticking one
 * hides it in this variant at once, so the page shows the result; nothing leaves the vault.
 */
export function FitPanel(): JSX.Element | null {
  const dispatch = useAppDispatch();
  const vault = useAppSelector(vaultSelector);
  const variant = useAppSelector(activeVariantSelector);
  const { linesOver, lineHeightPx } = useAppSelector((s) => s.app.fit);
  const api = useMemo(() => createApiClient(), []);
  const [aiStatus, setAi] = useState<AiStatus | null>(null);
  const ai = aiStatus ? taskProvider(aiStatus, "hide") : null;
  const [isAsking, setIsAsking] = useState<boolean>(false);
  const [aiResult, setAiResult] = useState<HideResult | null>(null);
  const [aiError, setAiError] = useState<string>("");
  const [dismissed, setDismissed] = useState<boolean>(false);

  useEffect(() => {
    api
      .getAiStatus()
      .then(setAi)
      .catch(() => setAi(null));
  }, [api]);

  const candidates = rankHideCandidates(vault, variant);
  const hiddenCount = candidates.filter((c) => c.isHidden).length;
  if (linesOver === 0 && hiddenCount === 0) {
    return null;
  }

  function setHidden(itemId: string, isHidden: boolean): void {
    dispatch(
      setItemSelection({
        variantId: variant.id,
        itemId,
        change: { isVisible: !isHidden },
      })
    );
  }

  async function askAi(): Promise<void> {
    setIsAsking(true);
    setAiError("");
    setAiResult(null);
    setDismissed(false);
    try {
      const visible = candidates
        .filter((candidate) => !candidate.isHidden)
        .map((candidate) => ({
          itemId: candidate.itemId,
          label: candidate.label,
          section: candidate.sectionTitle,
          lines: measureLines(candidate.itemId, lineHeightPx),
          relevance: candidate.relevance,
        }))
        .filter((candidate) => candidate.lines > 0);
      setAiResult(
        await api.suggestHide({
          linesOver,
          candidates: visible,
          ...(variant.tailor
            ? {
                jobTitle: variant.tailor.jobTitle,
                mustHave: variant.tailor.requirements.mustHave,
              }
            : {}),
        })
      );
    } catch (caught) {
      setAiError(
        caught instanceof ApiError || caught instanceof Error
          ? caught.message
          : "The AI request failed."
      );
    } finally {
      setIsAsking(false);
    }
  }

  const suggestions = (aiResult?.suggestions ?? []).filter((suggestion) =>
    candidates.some((c) => c.itemId === suggestion.itemId && !c.isHidden)
  );
  const labelOf = (itemId: string): string =>
    candidates.find((c) => c.itemId === itemId)?.label ?? "";

  const listed = candidates.slice(0, MAX_LISTED);
  return (
    <Box
      sx={{
        border: `1px solid ${WORKSPACE_COLORS.border}`,
        borderRadius: 1,
        p: 1.5,
        display: "flex",
        flexDirection: "column",
        gap: 0.5,
      }}
    >
      <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
        <Typography sx={{ fontWeight: 700, flex: 1 }}>
          Hide to gain lines
        </Typography>
        <Chip
          size="small"
          label={linesOver > 0 ? `${linesOver} over` : "fits"}
          color={linesOver > 0 ? "warning" : "success"}
        />
      </Box>
      <Typography sx={{ fontSize: 12, color: WORKSPACE_COLORS.muted }}>
        Least relevant first. Tick to hide in this variant; it stays in your
        vault.
      </Typography>
      {listed.map((candidate) => {
        const lines = measureLines(candidate.itemId, lineHeightPx);
        return (
          <FormControlLabel
            key={candidate.itemId}
            sx={{ m: 0, alignItems: "flex-start" }}
            control={
              <Checkbox
                size="small"
                checked={candidate.isHidden}
                inputProps={{ "aria-label": `Hide ${candidate.label}` }}
                onChange={(event) =>
                  setHidden(candidate.itemId, event.target.checked)
                }
              />
            }
            label={
              <Box>
                <Typography sx={{ fontSize: 13, fontWeight: 600 }}>
                  {candidate.label}
                </Typography>
                <Typography
                  sx={{ fontSize: 11.5, color: WORKSPACE_COLORS.muted }}
                >
                  {candidate.sectionTitle} · relevance {candidate.relevance}
                  {lines > 0 ? ` · −${lines} lines` : ""}
                </Typography>
              </Box>
            }
          />
        );
      })}
      {linesOver > 0 && (
        <Button
          size="small"
          variant="outlined"
          onClick={() => {
            const ids = pickItemsToHide(
              candidates,
              (id) => measureLines(id, lineHeightPx),
              linesOver
            );
            ids.forEach((id) => setHidden(id, true));
          }}
        >
          Hide the least relevant until it fits
        </Button>
      )}
      {linesOver > 0 && ai?.isConfigured && (
        <>
          <Button
            size="small"
            variant="outlined"
            disabled={isAsking}
            onClick={() => void askAi()}
          >
            Ask AI to pick what to hide
          </Button>
          <Typography sx={{ fontSize: 11.5, color: WORKSPACE_COLORS.muted }}>
            {ai.info.isOnline
              ? `Sends item titles, section names and the job's must-haves to ${ai.info.recipient}; not your name or contact details.`
              : "Item titles and the job's must-haves go to your local model only."}
          </Typography>
          {isAsking && <CircularProgress size={18} />}
          {aiError && <Alert severity="error">{aiError}</Alert>}
          {!dismissed && aiResult && (
            <Box
              role="region"
              aria-label="AI suggestion"
              sx={{
                mt: 0.5,
                p: 1,
                borderRadius: 1,
                bgcolor: WORKSPACE_COLORS.aiSoft,
                color: WORKSPACE_COLORS.aiText,
              }}
            >
              <Typography sx={{ fontSize: 13, fontWeight: 700 }}>
                The AI would hide
              </Typography>
              {suggestions.length === 0 && (
                <Typography sx={{ fontSize: 12 }}>
                  Nothing usable. Pick by hand above.
                </Typography>
              )}
              {suggestions.map((suggestion) => (
                <Typography
                  key={suggestion.itemId}
                  sx={{ fontSize: 12.5, mt: 0.5 }}
                >
                  <strong>{labelOf(suggestion.itemId)}</strong>
                  {suggestion.reason ? `: ${suggestion.reason}` : ""}
                </Typography>
              ))}
              {aiResult.warnings.map((warning) => (
                <Typography key={warning} sx={{ fontSize: 11.5, mt: 0.5 }}>
                  {warning}
                </Typography>
              ))}
              <Box sx={{ display: "flex", gap: 1, mt: 1 }}>
                <Button
                  size="small"
                  variant="contained"
                  disabled={suggestions.length === 0}
                  onClick={() => {
                    suggestions.forEach((s) => setHidden(s.itemId, true));
                    setDismissed(true);
                  }}
                >
                  Hide these
                </Button>
                <Button size="small" onClick={() => setDismissed(true)}>
                  Dismiss
                </Button>
              </Box>
            </Box>
          )}
        </>
      )}
    </Box>
  );
}
