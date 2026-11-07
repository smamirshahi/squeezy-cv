import { Chip } from "@mui/material";

/** How relevant an item is to the job (0-100, from tailoring), or "Not scored" */
export function RelevanceBadge({
  relevance,
}: {
  relevance: number | undefined;
}): JSX.Element {
  const isScored = relevance !== undefined;
  return (
    <Chip
      size="small"
      variant="outlined"
      label={isScored ? `Relevance ${Math.round(relevance)}` : "Not scored"}
      aria-label={
        isScored
          ? `Relevance to this job: ${Math.round(relevance)} of 100`
          : "Relevance to this job: not scored"
      }
      sx={{ flex: "none", height: 20, fontSize: 11 }}
    />
  );
}
