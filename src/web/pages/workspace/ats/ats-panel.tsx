import { MouseEvent, useState } from "react";
import {
  Box,
  Button,
  Chip,
  Collapse,
  IconButton,
  ToggleButton,
  ToggleButtonGroup,
  Tooltip,
  Typography,
} from "@components/ui";
import {
  CheckCircleOutlined as CheckCircleOutlinedIcon,
  CheckOutlined as CheckOutlinedIcon,
  ChevronRightOutlined as ChevronRightIcon,
  ExpandLessOutlined as ExpandLessIcon,
  ExpandMoreOutlined as ExpandMoreIcon,
  InfoOutlined as InfoOutlinedIcon,
  SyncOutlined as SyncIcon,
} from "@components/ui/icons";
import {
  AtsCategoryId,
  AtsSnapshot,
  ATS_GROUP_LABELS,
  ATS_LABELS,
  bandOf,
  BAND_TEXT,
  FixItem,
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
import { AtsWording } from "@pages/workspace/ats/ats-wording";
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
const KEYWORDS_SHORT = 8;

export const PAGE_RING_SIZE = 140;
const SECTION_RING_SIZE = 120;
const SECTION_PADDING = 1.5;
const PAGE_PADDING = 2;
const FAIR_FROM = 60;

/** "just now", "5 min ago" or the date */
export function sinceText(at: string): string {
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

/** One thing to fix: a link to the place where it is fixed */
function FixRow({
  fix,
  jobId,
  templateId,
  isHintShort = false,
}: {
  fix: FixItem;
  jobId: string;
  templateId: string;

  /** Inside a category the category name is already known */
  isHintShort?: boolean;
}): JSX.Element {
  const route = routeForFix(fix.target, jobId, templateId);
  return (
    <Box
      component="a"
      href={formatRoute(route)}
      onClick={(event: MouseEvent<HTMLElement>) => onAppLinkClick(event, route)}
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
          {isHintShort ? fix.hint : `${ATS_LABELS[fix.category]} · ${fix.hint}`}
        </Typography>
      </Typography>
      <ChevronRightIcon sx={{ fontSize: 18, mt: "1px" }} />
    </Box>
  );
}

function CategoryRow({
  id,
  now,
  first,
  delta,
  jobId,
  templateId,
}: {
  id: AtsCategoryId;
  now: AtsSnapshot | null;
  first: AtsSnapshot | null;
  delta: number | undefined;
  jobId: string;
  templateId: string;
}): JSX.Element {
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const entry = now?.categories[id];
  const fixes = now
    ? fixList(now.issues.filter((issue) => issue.category === id))
    : [];
  const panelId = `ats-issues-${id}`;
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
        {fixes.length > 0 && (
          <IconButton
            size="small"
            aria-expanded={isOpen}
            aria-controls={panelId}
            aria-label={`${isOpen ? "Hide" : "Show"} the issues in ${ATS_LABELS[id]}`}
            onClick={() => setIsOpen(!isOpen)}
            sx={{ p: 0.25, alignSelf: "center" }}
          >
            {isOpen ? (
              <ExpandLessIcon sx={{ fontSize: 18 }} />
            ) : (
              <ExpandMoreIcon sx={{ fontSize: 18 }} />
            )}
          </IconButton>
        )}
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
      {fixes.length > 0 && (
        <Collapse in={isOpen} unmountOnExit>
          <Box id={panelId} sx={{ pt: 0.5 }}>
            {fixes.map((fix) => (
              <FixRow
                key={fix.key}
                fix={fix}
                jobId={jobId}
                templateId={templateId}
                isHintShort
              />
            ))}
          </Box>
        </Collapse>
      )}
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
 * first. The score is all computed on this computer (no AI); only "Suggest wording" next to it uses a model, so only that is purple.
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
  const [keywordTab, setKeywordTab] = useState<"missing" | "covered">(
    "missing"
  );
  const [isAllKeywords, setIsAllKeywords] = useState<boolean>(false);
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

  const updateButton = (
    <Button
      variant="contained"
      fullWidth
      startIcon={
        now !== null && !ats.isStale ? <CheckOutlinedIcon /> : <SyncIcon />
      }
      onClick={ats.analyse}
      disabled={now !== null && !ats.isStale}
    >
      {now ? (ats.isStale ? "Update score" : "Up to date") : "Analyse CV"}
    </Button>
  );

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
      <Box
        role="note"
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
        <Typography sx={{ fontSize: 12.5, flex: 1 }}>
          <b>A guide, not a target.</b> {ATS_DISCLAIMER}
        </Typography>
      </Box>
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
      </Box>

      <Box
        sx={{
          gridColumn: "1 / -1",
          display: "grid",
          gap: 1.25,
        }}
      >
        <Box
          sx={{
            // On a phone the actions stay in reach while the panel scrolls
            position: { xs: "sticky", sm: "static" },
            top: 0,
            zIndex: 2,
            bgcolor: WORKSPACE_COLORS.panel,
            py: { xs: 1, sm: 0 },
          }}
        >
          {now && now.match !== null ? (
            <AtsWording
              missing={now.missing}
              reworded={now.reworded}
              leading={updateButton}
            />
          ) : (
            updateButton
          )}
        </Box>
        <Box
          sx={{
            display: "flex",
            justifyContent: "flex-start",
            alignItems: "flex-start",
            gap: 0.5,
          }}
        >
          <Typography
            sx={{
              fontSize: 12,
              color: WORKSPACE_COLORS.muted,
              textAlign: "left",
            }}
          >
            {now
              ? `${comparison ? "Updated" : "First scan"} · ${sinceText(now.at)}`
              : "Not scanned yet"}
          </Typography>
          <Tooltip
            title={`Calculated on this computer, no AI, nothing is sent. It looks at the CV's formatting, whether contact details and headings can be read, the content quality${ats.canMatch ? ` and the keywords of ${ats.jobName}` : ""}. The same CV always gives the same score, so the button only saves a new scan after you change something.`}
          >
            <InfoOutlinedIcon
              aria-label="How the score is calculated"
              sx={{ fontSize: 14, mt: "2px", color: WORKSPACE_COLORS.muted }}
            />
          </Tooltip>
        </Box>
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
            The CV changed after this scan. Update the score to see the new
            number.
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
            jobId={ats.jobId}
            templateId={ats.templateId}
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
                jobId={ats.jobId}
                templateId={ats.templateId}
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
          <Box sx={{ display: "grid", gap: 1 }}>
            <Typography
              sx={{
                fontSize: 11,
                fontWeight: 700,
                textTransform: "uppercase",
                letterSpacing: 0.4,
                color: WORKSPACE_COLORS.muted,
              }}
            >
              Keywords from the advert
            </Typography>
            <ToggleButtonGroup
              exclusive
              fullWidth
              size="small"
              value={keywordTab}
              aria-label="Keywords from the advert"
              onChange={(_event, value: "missing" | "covered" | null) => {
                if (value) {
                  setKeywordTab(value);
                  setIsAllKeywords(false);
                }
              }}
            >
              <ToggleButton value="missing">
                Missing {now.missing.length}
              </ToggleButton>
              <ToggleButton value="covered">
                On your CV {now.covered.length}
              </ToggleButton>
            </ToggleButtonGroup>
            {(() => {
              const words =
                keywordTab === "missing" ? now.missing : now.covered;
              const shown = isAllKeywords
                ? words
                : words.slice(0, KEYWORDS_SHORT);
              return (
                <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.5 }}>
                  {words.length === 0 && (
                    <Typography
                      sx={{ fontSize: 13, color: WORKSPACE_COLORS.muted }}
                    >
                      {keywordTab === "missing"
                        ? "Nothing missing."
                        : "None yet."}
                    </Typography>
                  )}
                  {shown.map((word) => (
                    <Chip
                      key={word}
                      size="small"
                      variant="outlined"
                      color={keywordTab === "missing" ? "warning" : "success"}
                      label={word}
                    />
                  ))}
                  {words.length > KEYWORDS_SHORT && (
                    <Button
                      size="small"
                      onClick={() => setIsAllKeywords(!isAllKeywords)}
                    >
                      {isAllKeywords
                        ? "Show fewer"
                        : `Show ${words.length - KEYWORDS_SHORT} more`}
                    </Button>
                  )}
                </Box>
              );
            })()}
            <Typography sx={{ fontSize: 12, color: WORKSPACE_COLORS.muted }}>
              Add them only where they are true, in the advert&apos;s words.
              Never add what you have not done.
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
                To fix
              </Typography>
              <Typography sx={{ fontSize: 12, color: WORKSPACE_COLORS.muted }}>
                {comparison
                  ? `${comparison.fixed.length} fixed · ${now.issues.length} to fix`
                  : `${now.issues.length} to fix`}
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
            {visibleFixes.map((fix) => (
              <FixRow
                key={fix.key}
                fix={fix}
                jobId={ats.jobId}
                templateId={ats.templateId}
              />
            ))}
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

      <AtsHelpDialog isOpen={isHelpOpen} onClose={() => setIsHelpOpen(false)} />
    </Box>
  );
}
