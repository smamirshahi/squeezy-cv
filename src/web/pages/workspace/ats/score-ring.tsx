import { Box } from "@components/ui";
import { AtsBand, bandOf, NATURAL_RANGE } from "@shared/ats/ats-score";
import { WORKSPACE_COLORS } from "@pages/workspace/workspace-tokens";

const DEFAULT_SIZE = 120;
const TEXT_SHARE = 0.3;
const RADIUS = 52;
const OUTER_RADIUS = 64;
const FULL = 2 * Math.PI * RADIUS;
const OUTER_FULL = 2 * Math.PI * OUTER_RADIUS;

const BAND_COLOR: Record<AtsBand, string> = {
  low: "var(--er)",
  fair: "var(--wr)",
  natural: "var(--ok)",
  veryHigh: "var(--wr)",
};

interface Props {
  /** Null = not analysed yet */
  score: number | null;

  /** The first scan, when the CV has been analysed again: the gain is drawn in a lighter tone */
  firstScore?: number | null;
  size?: number;
  label: string;
}

/**
 * The score as a ring (0-100) with the natural range 75-90 marked on an outer arc, so the colour
 * is never the only signal: the number and the label are text too. A gain over the first scan
 * is a lighter arc after the first score.
 */
export function ScoreRing({
  score,
  firstScore = null,
  size = DEFAULT_SIZE,
  label,
}: Props): JSX.Element {
  const band = score === null ? "natural" : bandOf(score);
  const color = BAND_COLOR[band];
  const isGain = score !== null && firstScore !== null && score > firstScore;
  const solid = isGain ? firstScore : score;
  return (
    <Box
      role="img"
      aria-label={label}
      sx={{
        position: "relative",
        width: size,
        height: size,
        flex: "none",
        mx: "auto",
      }}
    >
      <svg viewBox="0 0 140 140" width={size} height={size} aria-hidden="true">
        <g transform="rotate(-90 70 70)">
          <circle
            cx="70"
            cy="70"
            r={RADIUS}
            fill="none"
            stroke="var(--hv)"
            strokeWidth="12"
          />
          <circle
            cx="70"
            cy="70"
            r={OUTER_RADIUS}
            fill="none"
            stroke="var(--ok)"
            strokeOpacity="0.4"
            strokeWidth="4"
            strokeDasharray={`${((NATURAL_RANGE.max - NATURAL_RANGE.min) / 100) * OUTER_FULL} ${OUTER_FULL}`}
            strokeDashoffset={-(NATURAL_RANGE.min / 100) * OUTER_FULL}
          />
          {solid !== null && solid > 0 && (
            <circle
              cx="70"
              cy="70"
              r={RADIUS}
              fill="none"
              stroke={color}
              strokeWidth="12"
              strokeDasharray={`${(solid / 100) * FULL} ${FULL}`}
            />
          )}
          {isGain && (
            <circle
              cx="70"
              cy="70"
              r={RADIUS}
              fill="none"
              stroke={color}
              strokeOpacity="0.5"
              strokeWidth="12"
              strokeDasharray={`${((score - firstScore) / 100) * FULL} ${FULL}`}
              strokeDashoffset={-(firstScore / 100) * FULL}
            />
          )}
        </g>
      </svg>
      <Box
        sx={{
          position: "absolute",
          inset: 0,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          color: WORKSPACE_COLORS.text,
        }}
      >
        <Box
          component="b"
          sx={{
            fontSize: size * TEXT_SHARE,
            lineHeight: 1,
            color: score === null ? WORKSPACE_COLORS.muted : undefined,
          }}
        >
          {score ?? "–"}
        </Box>
        <Box
          component="span"
          sx={{ fontSize: 11, color: WORKSPACE_COLORS.muted }}
        >
          {score === null ? "not analysed" : "of 100"}
        </Box>
      </Box>
    </Box>
  );
}
