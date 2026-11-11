import { useEffect, useState } from "react";
import { Box, Button, Checkbox, Typography } from "@mui/material";
import { rankHideCandidates } from "@shared/layout/hide-candidates";
import { WORKSPACE_COLORS } from "@pages/workspace/workspace-tokens";
import {
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

/** Candidates the job could hide (visible items, least relevant first) with the lines each takes on the paper now */
export function useHideCandidates(): {
  itemId: string;
  label: string;
  sectionTitle: string;
  relevance: number;
  lines: number;
}[] {
  const vault = useAppSelector(vaultSelector);
  const variant = useAppSelector(activeVariantSelector);
  const fit = useAppSelector((s) => s.app.fit);
  const [, setMeasured] = useState<number>(0);

  // The lines are measured from the drawn page, which is only in the DOM after a render: measure
  // again once it is drawn and whenever its size or what the job shows changes
  useEffect(() => {
    setMeasured((count) => count + 1);
  }, [fit, variant.selection]);

  return rankHideCandidates(vault, variant)
    .filter((candidate) => !candidate.isHidden)
    .map((candidate) => ({
      ...candidate,
      lines: measureLines(candidate.itemId, fit.lineHeightPx),
    }))
    .filter((candidate) => candidate.lines > 0);
}

/**
 * Choose items to hide so the CV fits: the visible items, least relevant first, each with the
 * lines it would save. Ticking only selects; "Hide selected" changes the job (the vault is
 * never touched). The AI's own suggestions are in the AI card (`AiHidePicks`).
 */
export function HideToFit(): JSX.Element {
  const dispatch = useAppDispatch();
  const variant = useAppSelector(activeVariantSelector);
  const [picked, setPicked] = useState<string[]>([]);
  const candidates = useHideCandidates();
  const saved = candidates
    .filter((candidate) => picked.includes(candidate.itemId))
    .reduce((sum, candidate) => sum + candidate.lines, 0);

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
            </Box>
          </Box>
        ))}
      </Box>
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
