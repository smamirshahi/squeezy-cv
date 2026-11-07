import { Chip, Tooltip } from "@mui/material";

/** From this score an item is "related" to the job */
const RELATED_FROM = 70;

/** From this score (up to RELATED_FROM) an item is "maybe" related */
const MAYBE_FROM = 40;

type RelevanceBand = "related" | "maybe" | "unrelated";

/** Which band a score falls in */
function relevanceBand(relevance: number): RelevanceBand {
  if (relevance >= RELATED_FROM) {
    return "related";
  }
  return relevance >= MAYBE_FROM ? "maybe" : "unrelated";
}

const BAND_COLOR = {
  related: "success",
  maybe: "warning",
  unrelated: "default",
} as const;

/**
 * How relevant an item is to the job (0-100, from tailoring or "Score items"), or "Not scored".
 * The colour shows the band (related, maybe, unrelated); the reason, when there is one, is the tooltip.
 */
export function RelevanceBadge({
  relevance,
  reason,
}: {
  relevance: number | undefined;
  reason?: string;
}): JSX.Element {
  const isScored = relevance !== undefined;
  const band = isScored ? relevanceBand(relevance) : undefined;
  const chip = (
    <Chip
      size="small"
      variant="outlined"
      color={band ? BAND_COLOR[band] : "default"}
      label={isScored ? `Relevance ${Math.round(relevance)}` : "Not scored"}
      aria-label={
        isScored
          ? `Relevance to this job: ${Math.round(relevance)} of 100 (${band})${reason ? `. ${reason}` : ""}`
          : "Relevance to this job: not scored"
      }
      sx={{ flex: "none", height: 20, fontSize: 11 }}
    />
  );
  return reason ? <Tooltip title={reason}>{chip}</Tooltip> : chip;
}
