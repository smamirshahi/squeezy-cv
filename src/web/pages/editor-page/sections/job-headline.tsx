import {
  Box,
  Radio,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Typography,
} from "@mui/material";
import { RelevanceBadge } from "@pages/workspace/relevance-badge";
import { SectionTailor } from "@pages/workspace/section-tailor";
import { WORKSPACE_COLORS } from "@pages/workspace/workspace-tokens";
import {
  JOB_TITLES_SECTION,
  MIN_TITLES_TO_CHOOSE,
  jobTitlesOf,
} from "@shared/vault/job-titles";
import { useAppDispatch, useAppSelector } from "@store/store-helper";
import {
  activeJobSelector,
  activeVariantSelector,
  setJobHeadline,
} from "@store/jobs/jobs-slice";
import { vaultSelector } from "@store/vault/vault-slice";

/**
 * Which of the vault's job titles this job shows under the name: a table with the AI's
 * relevance for each title (after "Score job titles" or "Score all sections"), the best first,
 * so the right one is easy to pick.
 */
export function JobHeadline(): JSX.Element | null {
  const dispatch = useAppDispatch();
  const { profile } = useAppSelector(vaultSelector);
  const variant = useAppSelector(activeVariantSelector);
  const job = useAppSelector(activeJobSelector);
  const titles = jobTitlesOf(profile);

  if (titles.length < MIN_TITLES_TO_CHOOSE) {
    return null;
  }

  const scores = job.titleScores ?? {};
  const isScored = titles.some((title) => scores[title] !== undefined);
  const chosenTitle = variant.headline?.trim() || titles[0];
  const chosen = titles.includes(chosenTitle) ? chosenTitle : titles[0];
  // Best first once scored (equal scores keep the vault order); unscored titles come last
  const rows = isScored
    ? [...titles].sort(
        (a, b) => (scores[b]?.relevance ?? -1) - (scores[a]?.relevance ?? -1)
      )
    : titles;

  return (
    <Box
      sx={{
        px: 2.5,
        py: 1.5,
        borderTop: `1px solid ${WORKSPACE_COLORS.border}`,
        display: "grid",
        gap: 1,
      }}
    >
      <Box>
        <Typography sx={{ fontWeight: 600, fontSize: 14 }}>
          Job title
        </Typography>
        <Typography sx={{ fontSize: 12.5, color: WORKSPACE_COLORS.muted }}>
          The title shown under your name on this CV. Edit the list in the vault
          (Main Info).
        </Typography>
      </Box>
      <SectionTailor sectionId={JOB_TITLES_SECTION} />
      <Table
        size="small"
        aria-label="Job titles for this job"
        sx={{ "& td, & th": { px: 1, py: 0.5 } }}
      >
        <TableHead>
          <TableRow>
            <TableCell padding="checkbox">
              <Box component="span" sx={{ visibility: "hidden" }}>
                Use
              </Box>
            </TableCell>
            <TableCell>Title</TableCell>
            <TableCell sx={{ width: 150 }}>Relevance</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {rows.map((title) => (
            <TableRow
              key={title}
              hover
              selected={title === chosen}
              onClick={() =>
                dispatch(
                  setJobHeadline({
                    jobId: variant.id,
                    headline: title === titles[0] ? undefined : title,
                  })
                )
              }
              sx={{ cursor: "pointer" }}
            >
              <TableCell padding="checkbox">
                <Radio
                  size="small"
                  checked={title === chosen}
                  slotProps={{ input: { "aria-label": `Show ${title}` } }}
                  onChange={() => undefined}
                />
              </TableCell>
              <TableCell>
                <Typography sx={{ fontSize: 13 }}>{title}</Typography>
                {scores[title]?.reason && (
                  <Typography
                    sx={{ fontSize: 11.5, color: WORKSPACE_COLORS.muted }}
                  >
                    {scores[title].reason}
                  </Typography>
                )}
              </TableCell>
              <TableCell>
                <RelevanceBadge
                  relevance={scores[title]?.relevance}
                  reason={scores[title]?.reason}
                />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </Box>
  );
}
