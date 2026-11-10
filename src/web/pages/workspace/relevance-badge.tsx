import { Box, Chip, Tooltip } from "@mui/material";

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

/** What the percentage means, shown when pointing at the badge */
function Explanation({
  relevance,
  reason,
}: {
  relevance: number | undefined;
  reason?: string;
}): JSX.Element {
  return (
    <Box sx={{ display: "grid", gap: 0.5, maxWidth: 280 }}>
      <Box>
        {relevance === undefined
          ? "Not scored yet. Use Score entries (or Score all sections) after analysing the job description."
          : "How closely this matches what the job asks for, from 0% (unrelated) to 100% (central). The AI scores it from this entry's text and the job's keywords and requirements."}
      </Box>
      <Box>
        {RELATED_FROM}% or more: clearly supports a requirement. {MAYBE_FROM}%
        to {RELATED_FROM - 1}%: maybe. Below {MAYBE_FROM}%: not related.
      </Box>
      {reason && <Box>Why: {reason}</Box>}
    </Box>
  );
}

/**
 * How relevant an item is to the job (0-100%, from tailoring or "Score entries"), or "Not scored".
 * The colour shows the band (related, maybe, unrelated); pointing at it explains the number and
 * gives the reason, when there is one.
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
  return (
    <Tooltip title={<Explanation relevance={relevance} reason={reason} />}>
      <Chip
        size="small"
        variant="outlined"
        color={band ? BAND_COLOR[band] : "default"}
        label={isScored ? `Relevancy ${Math.round(relevance)}%` : "Not scored"}
        aria-label={
          isScored
            ? `Relevancy to this job: ${Math.round(relevance)} percent (${band})${reason ? `. ${reason}` : ""}`
            : "Relevancy to this job: not scored"
        }
        sx={{ flex: "none", height: 20, fontSize: 11 }}
      />
    </Tooltip>
  );
}
