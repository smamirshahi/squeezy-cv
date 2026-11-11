import { cssVar } from "@custom-styles/theme";

/**
 * Colours of the workspace chrome (design B). They are CSS variables set by
 * `AppThemeProvider`, so light and dark both work. The CV page itself stays black on white.
 */
export const WORKSPACE_COLORS = {
  bar: cssVar("bar"),
  barText: cssVar("bartx"),
  accent: cssVar("ac"),
  accentSoft: cssVar("acs"),
  accentText: cssVar("act"),
  accentContrast: cssVar("acx"),
  panel: cssVar("pn"),
  panelAlt: cssVar("pn2"),
  hover: cssVar("hv"),
  canvas: cssVar("cv"),
  border: cssVar("bd"),
  borderStrong: cssVar("bd2"),
  text: cssVar("tx"),
  muted: cssVar("mu"),
  ai: cssVar("ai"),
  aiSoft: cssVar("ais"),
  aiText: cssVar("ait"),
  aiBorder: cssVar("aib"),
  aiContrast: cssVar("aix"),
  /** Fit chip on the dark bar */
  okBg: "#1F4D32",
  okText: "#C4F2D3",
  errBg: "#5A2420",
  errText: "#FFCFC9",
} as const;

/**
 * The middle area of a page (vault, templates, job settings): a grey page with white cards,
 * white inputs with a clearly visible border, and an amber warning. Spread it into the `sx`
 * of the area, so only what is inside it changes.
 */
export const MIDDLE_AREA_SX = {
  bgcolor: cssVar("bg"),
  "& .MuiPaper-root:not(.MuiAlert-root)": {
    bgcolor: cssVar("pn"),
    border: `1px solid ${cssVar("bd")}`,
    boxShadow: "none",
    borderRadius: "6px",
  },
  "& .MuiOutlinedInput-root": {
    bgcolor: cssVar("pn"),
    "& .MuiOutlinedInput-notchedOutline": { borderColor: cssVar("ib") },
  },
  "& .MuiAlert-standardWarning": {
    bgcolor: cssVar("wrs"),
    color: cssVar("wrt"),
    "& .MuiAlert-icon": { color: cssVar("wr") },
  },
} as const;
