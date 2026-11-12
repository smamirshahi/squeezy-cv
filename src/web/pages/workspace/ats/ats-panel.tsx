import { MouseEvent, useState } from "react";
import {
  Box,
  Button,
  Chip,
  IconButton,
  Tooltip,
  Typography,
} from "@mui/material";
import InfoOutlinedIcon from "@mui/icons-material/InfoOutlined";
import CheckCircleOutlinedIcon from "@mui/icons-material/CheckCircleOutlined";
import ChevronRightIcon from "@mui/icons-material/ChevronRight";
import {
  AtsCategoryId,
  AtsSnapshot,
  ATS_GROUP_LABELS,
  ATS_LABELS,
  bandOf,
  BAND_TEXT,
  fixList,
  formatDelta,
  NATURAL_RANGE,
} from "@shared/ats/ats-score";
import { formatRoute } from "@shared/routing/routes";
import { onAppLinkClick } from "@hooks/navigation";
import { WORKSPACE_COLORS } from "@pages/workspace/workspace-tokens";
import {
  ATS_CATEGORY_INFO,
  ATS_DISCLAIMER,
  AtsHelpDialog,
} from "@pages/workspace/ats/ats-help-dialog";
import { ScoreRing } from "@pages/workspace/ats/score-ring";
import { routeForFix, useAts } from "@pages/workspace/ats/use-ats";

const CV_CATEGORIES: AtsCategoryId[] = [
  "formatting",
  "searchability",
  "content",
];
const MATCH_CATEGORIES: AtsCategoryId[] = [
  "hardSkills",
  "softSkills",
  "titleExperience",
];
const SHORT_LIST = 3;
const BLOCK_SX = {
  display: "grid",
  gap: 1.25,
  alignContent: "start",
  minWidth: 0,
} as const;
const MS_PER_MINUTE = 60_000;
const PAGE_RING_SIZE = 140;
const SECTION_RING_SIZE = 120;
const SECTION_PADDING = 1.5;
const PAGE_PADDING = 2;
const FAIR_FROM = 60;

/** "just now", "5 min ago" or the date */
function sinceText(at: string): string {
  const minutes = Math.floor((Date.now() - Date.parse(at)) / MS_PER_MINUTE);
  if (minutes < 1) {
    return "just now";
  }
  if (minutes < FAIR_FROM) {
    return `${minutes} min ago`;
  }
  return new Date(at).toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

function barColor(score: number): string {
  if (score >= NATURAL_RANGE.min) {
    return "var(--ok)";
  }
  return score >= FAIR_FROM ? "var(--wr)" : "var(--er)";
}

function deltaColor(value: number): string {
  if (value > 0) {
    return "var(--okt)";
  }
  return value < 0 ? "var(--ert)" : WORKSPACE_COLORS.muted;
}

function Delta({ value }: { value: number | undefined }): JSX.Element | null {
  if (value === undefined) {
    return null;
  }
  return (
    <Box
      component="span"
      aria-label={
        value === 0
          ? "no change since the first scan"
          : `${value > 0 ? "up" : "down"} ${Math.abs(value)} since the first scan`
      }
      sx={{
        ml: 0.75,
        fontSize: 12,
        fontWeight: 700,
        color: deltaColor(value),
      }}
    >
      {formatDelta(value)}
    </Box>
  );
}

function CategoryRow({
  id,
  now,
  first,
  delta,
}: {
  id: AtsCategoryId;
  now: AtsSnapshot | null;
  first: AtsSnapshot | null;
  delta: number | undefined;
}): JSX.Element {
  const entry = now?.categories[id];
  const before = first?.categories[id]?.score;
  const isChanged = delta !== undefined && delta !== 0;
  return (
    <Box
      data-testid={`ats-category-${id}`}
      sx={{
        py: 0.75,
        px: isChanged ? 1 : 0,
        mx: isChanged ? -1 : 0,
        borderRadius: 1,
        bgcolor: isChanged ? "var(--oks)" : undefined,
      }}
    >
      <Box sx={{ display: "flex", alignItems: "baseline", gap: 0.5 }}>
        <Typography
          component="span"
          sx={{
            fontSize: 13.5,
            flex: 1,
            display: "flex",
            alignItems: "center",
          }}
        >
          {ATS_LABELS[id]}
          <Tooltip title={ATS_CATEGORY_INFO[id]} enterTouchDelay={0}>
            <IconButton
              size="small"
              aria-label={`What ${ATS_LABELS[id]} checks`}
              sx={{ p: 0.25, ml: 0.25 }}
            >
              <InfoOutlinedIcon sx={{ fontSize: 14 }} />
            </IconButton>
          </Tooltip>
        </Typography>
        <Typography
          component="span"
          sx={{ fontSize: 12.5, color: WORKSPACE_COLORS.muted }}
        >
          {entry ? (
            <>
              <b style={{ color: WORKSPACE_COLORS.text }}>{entry.score}</b>
              {" · "}
              {entry.issues === 0
                ? "No issues"
                : `${entry.issues} ${entry.issues === 1 ? "issue" : "issues"}`}
              <Delta value={delta} />
            </>
          ) : (
            "–"
          )}
        </Typography>
      </Box>
      <Box
        sx={{
          position: "relative",
          height: 6,
          borderRadius: 3,
          bgcolor: "var(--hv)",
          mt: 0.5,
        }}
      >
        {entry && (
          <Box
            sx={{
              height: "100%",
              width: `${entry.score}%`,
              borderRadius: 3,
              bgcolor: barColor(entry.score),
            }}
          />
        )}
        {before !== undefined && delta !== undefined && delta !== 0 && (
          <Box
            aria-hidden="true"
            sx={{
              position: "absolute",
              top: -2,
              bottom: -2,
              left: `${before}%`,
              width: 2,
              bgcolor: WORKSPACE_COLORS.text,
            }}
          />
        )}
      </Box>
    </Box>
  );
}

function GroupHeader({
  title,
  score,
  delta,
}: {
  title: string;
  score: number | null;
  delta?: number | null;
}): JSX.Element {
  return (
    <Box
      sx={{
        display: "flex",
        alignItems: "baseline",
        gap: 1,
        mt: 1,
        pb: 0.5,
        borderBottom: `1px solid ${WORKSPACE_COLORS.border}`,
      }}
    >
      <Typography component="b" sx={{ fontSize: 14, flex: 1 }}>
        {title}
      </Typography>
      <Typography component="b" sx={{ fontSize: 14 }}>
        {score ?? "–"}
        {delta !== null && delta !== undefined && <Delta value={delta} />}
      </Typography>
    </Box>
  );
}

/**
 * The ATS score of the active job (#258, design "ATS score"): a ring, the two groups of
 * categories with "n issues", what to fix next and, after a second scan, the change since the
 * first. It is all computed on this computer: there is no AI in it, so nothing here is purple.
 */
export function AtsPanel({
  variant = "section",
}: {
  /** "section": inside the desktop sidebar; "page": its own panel on smaller screens */
  variant?: "section" | "page";
}): JSX.Element {
  const ats = useAts();
  const [isHelpOpen, setIsHelpOpen] = useState<boolean>(false);
  const [isAllShown, setIsAllShown] = useState<boolean>(false);
  const { now, first, comparison } = ats;
  const detailsRoute = {
    kind: "jobs",
    jobId: ats.jobId,
    view: "details",
  } as const;

  const help = (
    <Tooltip title="How is this score calculated?">
      <IconButton
        size="small"
        aria-label="How is this score calculated?"
        onClick={() => setIsHelpOpen(true)}
      >
        <InfoOutlinedIcon fontSize="small" />
      </IconButton>
    </Tooltip>
  );

  const header = (
    <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
      <Typography
        sx={{
          flex: 1,
          fontSize: 11,
          fontWeight: 700,
          textTransform: "uppercase",
          letterSpacing: 0.4,
          color: WORKSPACE_COLORS.muted,
        }}
      >
        ATS score
      </Typography>
      {now && variant === "page" && (
        <Typography sx={{ fontSize: 12, color: WORKSPACE_COLORS.muted }}>
          {first && comparison ? "Analysed again" : "First scan"} ·{" "}
          {sinceText(now.at)}
        </Typography>
      )}
      {help}
    </Box>
  );

  if (!ats.hasJob) {
    return (
      <Box
        component="section"
        aria-label="ATS score"
        sx={{
          display: "grid",
          gap: 1,
          p: variant === "section" ? SECTION_PADDING : PAGE_PADDING,
        }}
      >
        {header}
        <Typography sx={{ fontSize: 13, color: WORKSPACE_COLORS.muted }}>
          Start a job application first. The score needs a job to compare the CV
          with.
        </Typography>
        <AtsHelpDialog
          isOpen={isHelpOpen}
          onClose={() => setIsHelpOpen(false)}
        />
      </Box>
    );
  }

  const total = now?.total ?? null;
  const fixes = now ? fixList(now.issues) : [];
  const visibleFixes = isAllShown ? fixes : fixes.slice(0, SHORT_LIST);
  const gainLabel =
    comparison && first
      ? `, ${comparison.total >= 0 ? "up" : "down"} ${Math.abs(comparison.total)} from the first scan of ${first.total}`
      : "";

  return (
    <Box
      component="section"
      aria-label="ATS score"
      sx={{
        display: "grid",
        gap: 1.25,
        p: variant === "section" ? SECTION_PADDING : PAGE_PADDING,
        alignContent: "start",
        // On a tablet the page panel is wide and short: ring, bars and fixes go side by side
        ...(variant === "page" && {
          gridTemplateColumns: {
            xs: "minmax(0, 1fr)",
            sm: "repeat(3, minmax(0, 1fr))",
            md: "minmax(0, 1fr)",
          },
          columnGap: 3,
        }),
      }}
    >
      <Box sx={{ gridColumn: "1 / -1" }}>{header}</Box>
      <Box sx={BLOCK_SX}>
        <ScoreRing
          score={total}
          firstScore={first?.total ?? null}
          size={variant === "page" ? PAGE_RING_SIZE : SECTION_RING_SIZE}
          label={
            total === null
              ? "ATS score: not analysed yet"
              : `ATS score ${total} out of 100${gainLabel}`
          }
        />
        {now && (
          <Box
            sx={{
              display: "flex",
              justifyContent: "center",
              gap: 0.75,
              flexWrap: "wrap",
            }}
          >
            {comparison && first ? (
              <>
                <Chip size="small" label={`First scan ${first.total}`} />
                <Chip
                  size="small"
                  color={comparison.total >= 0 ? "success" : "warning"}
                  label={`Now ${now.total} · ${formatDelta(comparison.total)}`}
                />
              </>
            ) : (
              <Chip
                size="small"
                color={bandOf(now.total) === "natural" ? "success" : "default"}
                label={BAND_TEXT[bandOf(now.total)]}
              />
            )}
          </Box>
        )}
        <Typography
          sx={{
            fontSize: 12,
            color: WORKSPACE_COLORS.muted,
            textAlign: "center",
          }}
        >
          Natural range {NATURAL_RANGE.min}–{NATURAL_RANGE.max}
          {comparison ? ". The tick on a bar marks your first scan." : ""}
        </Typography>
        <Button
          variant="contained"
          size={variant === "page" ? "large" : "medium"}
          fullWidth
          onClick={ats.analyse}
        >
          {now ? "Analyse again" : "Analyse CV"}
        </Button>
        <Typography
          sx={{
            fontSize: 12,
            color: WORKSPACE_COLORS.muted,
            textAlign: "center",
            mt: -0.5,
          }}
        >
          {now
            ? `${comparison ? "Analysed again" : "First scan"} · ${sinceText(now.at)}`
            : `Checks the CV itself${ats.canMatch ? ` and how well it matches ${ats.jobName}` : ""}. Runs on this computer, no AI.`}
        </Typography>
        {ats.isStale && (
          <Typography
            role="status"
            sx={{
              fontSize: 12.5,
              p: 1,
              borderRadius: 1,
              bgcolor: "var(--wrs)",
              color: "var(--wrt)",
            }}
          >
            The CV changed after this scan. Analyse again to update the score.
          </Typography>
        )}
      </Box>

      <Box sx={BLOCK_SX}>
        <GroupHeader
          title={ATS_GROUP_LABELS.cv}
          score={now?.cv ?? null}
          delta={comparison?.cv}
        />
        {CV_CATEGORIES.map((id) => (
          <CategoryRow
            key={id}
            id={id}
            now={now}
            first={first}
            delta={comparison?.categories[id]}
          />
        ))}

        <GroupHeader
          title={ATS_GROUP_LABELS.match}
          score={now?.match ?? null}
          delta={comparison?.match}
        />
        {ats.canMatch || (now?.match !== null && now?.match !== undefined) ? (
          MATCH_CATEGORIES.filter((id) => !now || now.categories[id]).map(
            (id) => (
              <CategoryRow
                key={id}
                id={id}
                now={now}
                first={first}
                delta={comparison?.categories[id]}
              />
            )
          )
        ) : (
          <Typography sx={{ fontSize: 13, color: WORKSPACE_COLORS.muted }}>
            Add and analyse the job advert in{" "}
            <Box
              component="a"
              href={formatRoute(detailsRoute)}
              onClick={(event: MouseEvent<HTMLElement>) =>
                onAppLinkClick(event, detailsRoute)
              }
              sx={{ color: WORKSPACE_COLORS.accentText }}
            >
              Job application
            </Box>{" "}
            to score how well the CV matches it.
          </Typography>
        )}
      </Box>

      <Box sx={BLOCK_SX}>
        {now && now.match !== null && (
          <Box sx={{ display: "grid", gap: 0.5 }}>
            <Typography sx={{ fontSize: 13 }}>
              <b>On the CV:</b>{" "}
              {now.covered.length > 0 ? now.covered.join(", ") : "none yet"}
            </Typography>
            <Typography sx={{ fontSize: 13 }}>
              <b>Not on the CV:</b>{" "}
              {now.missing.length > 0 ? now.missing.join(", ") : "nothing"}
            </Typography>
          </Box>
        )}

        {now && (
          <Box>
            <Box sx={{ display: "flex", alignItems: "baseline", mt: 0.5 }}>
              <Typography
                sx={{
                  flex: 1,
                  fontSize: 11,
                  fontWeight: 700,
                  textTransform: "uppercase",
                  letterSpacing: 0.4,
                  color: WORKSPACE_COLORS.muted,
                }}
              >
                {comparison ? "Since the first scan" : "Fix next"}
              </Typography>
              <Typography sx={{ fontSize: 12, color: WORKSPACE_COLORS.muted }}>
                {comparison
                  ? `${comparison.fixed.length} fixed · ${now.issues.length} open`
                  : `${now.issues.length} open`}
              </Typography>
            </Box>
            {comparison?.fixed.map((entry) => (
              <Box
                key={entry.id}
                sx={{
                  display: "flex",
                  gap: 1,
                  py: 0.75,
                  alignItems: "flex-start",
                }}
              >
                <CheckCircleOutlinedIcon
                  sx={{ fontSize: 18, color: "var(--ok)", mt: "1px" }}
                />
                <Typography sx={{ fontSize: 13 }}>
                  <Box
                    component="span"
                    sx={{ position: "absolute", left: -9999 }}
                  >
                    Fixed:{" "}
                  </Box>
                  {entry.title}
                </Typography>
              </Box>
            ))}
            {fixes.length === 0 && (
              <Typography
                sx={{ fontSize: 13, color: WORKSPACE_COLORS.muted, py: 0.75 }}
              >
                Nothing left to fix that the score can see.
              </Typography>
            )}
            {visibleFixes.map((fix) => {
              const route = routeForFix(fix.target, ats.jobId, ats.templateId);
              return (
                <Box
                  key={fix.key}
                  component="a"
                  href={formatRoute(route)}
                  onClick={(event: MouseEvent<HTMLElement>) =>
                    onAppLinkClick(event, route)
                  }
                  sx={{
                    display: "flex",
                    gap: 1,
                    py: 0.75,
                    alignItems: "flex-start",
                    color: "inherit",
                    textDecoration: "none",
                    "&:hover": { bgcolor: WORKSPACE_COLORS.hover },
                  }}
                >
                  <Box
                    aria-hidden="true"
                    sx={{
                      flex: "none",
                      width: 8,
                      height: 8,
                      borderRadius: "50%",
                      bgcolor: "var(--wr)",
                      mt: "6px",
                    }}
                  />
                  <Typography component="span" sx={{ flex: 1, fontSize: 13 }}>
                    {fix.title}
                    <Typography
                      component="span"
                      sx={{
                        display: "block",
                        fontSize: 12,
                        color: WORKSPACE_COLORS.muted,
                      }}
                    >
                      {ATS_LABELS[fix.category]} · {fix.hint}
                    </Typography>
                  </Typography>
                  <ChevronRightIcon sx={{ fontSize: 18, mt: "1px" }} />
                </Box>
              );
            })}
            {fixes.length > SHORT_LIST && (
              <Button size="small" onClick={() => setIsAllShown(!isAllShown)}>
                {isAllShown ? "Show fewer" : `See all ${fixes.length}`}
              </Button>
            )}
            {comparison && (
              <Button size="small" onClick={ats.resetBaseline}>
                Use this scan as the new first scan
              </Button>
            )}
          </Box>
        )}
      </Box>

      <Box
        sx={{
          gridColumn: "1 / -1",
          display: "flex",
          gap: 1,
          p: 1,
          borderRadius: 1,
          bgcolor: WORKSPACE_COLORS.panelAlt,
          alignItems: "flex-start",
        }}
      >
        <InfoOutlinedIcon sx={{ fontSize: 16, mt: "2px" }} />
        <Typography sx={{ fontSize: 12.5 }}>
          <b>A guide, not a target.</b> {ATS_DISCLAIMER}
        </Typography>
      </Box>
      <AtsHelpDialog isOpen={isHelpOpen} onClose={() => setIsHelpOpen(false)} />
    </Box>
  );
}
