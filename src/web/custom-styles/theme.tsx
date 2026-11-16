import {
  ReactNode,
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { CssBaseline, GlobalStyles, ThemeProvider } from "@mui/material";
import { createTheme } from "@mui/material/styles";
// Self-hosted (this app works offline): the weights the design uses
import "@fontsource/ibm-plex-sans/400.css";
import "@fontsource/ibm-plex-sans/500.css";
import "@fontsource/ibm-plex-sans/600.css";
import "@fontsource/ibm-plex-sans/700.css";

export type ThemeMode = "light" | "dark";

/** The colour tokens of design B (artifact B1), light and dark. Names are the design's. */
export const THEME_TOKENS: Record<ThemeMode, Record<string, string>> = {
  light: {
    bg: "#F3F4F5",
    pn: "#FFFFFF",
    pn2: "#ECEEF0",
    hv: "#E3E6E9",
    bd: "#DDE0E4",
    bd2: "#C5CAD0",
    ib: "#8B9098",
    tx: "#1F1F1C",
    mu: "#535962",
    cv: "#D6D9DD",
    acx: "#FFFFFF",
    ok: "#1B7F3B",
    oks: "#E3F3E8",
    okt: "#17602D",
    wr: "#8A5A00",
    wrs: "#FFF4D6",
    wrt: "#6B4400",
    wrb: "#E0B65A",
    er: "#B3261E",
    ers: "#FBE6E4",
    ert: "#8F1D17",
    erb: "#E8A39E",
    ai: "#6D3FC9",
    ais: "#F1ECFB",
    ait: "#4F2A9E",
    aib: "#CDBBEE",
    aix: "#FFFFFF",
    bar: "#1B1C1F",
    bartx: "#F2F2F0",
    ac: "#B8400D",
    acs: "#FCE9DF",
    act: "#8A2F08",
  },
  dark: {
    bg: "#121316",
    pn: "#1A1B1F",
    pn2: "#202126",
    hv: "#2A2C32",
    bd: "#2B2D33",
    bd2: "#464952",
    ib: "#7C808A",
    tx: "#ECECE9",
    mu: "#A8A8A1",
    cv: "#0D0E0E",
    acx: "#2A0E02",
    ok: "#5CCB84",
    oks: "#15301E",
    okt: "#9BE3B4",
    wr: "#F0B94A",
    wrs: "#33280F",
    wrt: "#F5D58D",
    wrb: "#6B5420",
    er: "#FF8A80",
    ers: "#3A1A18",
    ert: "#FFB4AC",
    erb: "#7A3A35",
    ai: "#B79AF2",
    ais: "#2A2142",
    ait: "#D6C6FA",
    aib: "#4A3A7A",
    aix: "#1A0F36",
    bar: "#0D0E0E",
    bartx: "#F2F2F0",
    ac: "#FF8A5B",
    acs: "#3A2018",
    act: "#FFC5AC",
  },
};

/** `cssVar("pn")` is `var(--pn)`: the colour follows the theme without re-rendering */
export function cssVar(token: string): string {
  return `var(--${token})`;
}

const STORAGE_KEY = "squeezy-cv-theme";
const FONT_FAMILY =
  '"IBM Plex Sans", system-ui, -apple-system, "Segoe UI", sans-serif';
const BORDER_RADIUS_PX = 4;

function initialMode(): ThemeMode {
  try {
    const saved = window.localStorage.getItem(STORAGE_KEY);
    if (saved === "light" || saved === "dark") {
      return saved;
    }
  } catch {
    // storage may be blocked; fall through to the system setting
  }
  return window.matchMedia?.("(prefers-color-scheme: dark)").matches
    ? "dark"
    : "light";
}

/** The MUI theme for a mode, built from the design's tokens */
function createAppTheme(mode: ThemeMode): ReturnType<typeof createTheme> {
  const t = THEME_TOKENS[mode];
  return createTheme({
    palette: {
      mode,
      primary: { main: t.ac, contrastText: t.acx },
      secondary: { main: t.ai, contrastText: t.aix },
      error: { main: t.er },
      warning: { main: t.wr },
      success: { main: t.ok },
      background: { default: t.bg, paper: t.pn },
      text: { primary: t.tx, secondary: t.mu },
      divider: t.bd,
    },
    shape: { borderRadius: BORDER_RADIUS_PX },
    typography: {
      fontFamily: FONT_FAMILY,
      fontSize: 13,
      button: { textTransform: "none", fontWeight: 500 },
    },
    components: {
      MuiButtonBase: { defaultProps: { disableRipple: true } },
      // The "neutral" button (MUI inherit) is outlined in grey: the least important action
      MuiButton: {
        variants: [
          {
            props: { variant: "outlined", color: "inherit" },
            style: { borderColor: t.bd2 },
          },
        ],
      },
      // Dialog content scrolls when the window is short. macOS hides its overlay scrollbars until
      // you scroll, so nothing shows that there is more below: draw a scrollbar that stays visible.
      MuiDialogContent: {
        styleOverrides: {
          root: {
            "&::-webkit-scrollbar": { width: 12 },
            "&::-webkit-scrollbar-track": { backgroundColor: t.hv },
            "&::-webkit-scrollbar-thumb": {
              backgroundColor: t.mu,
              borderRadius: 6,
              border: `3px solid ${t.hv}`,
            },
          },
        },
      },
    },
  });
}

interface ThemeContextValue {
  mode: ThemeMode;
  toggle: () => void;
}

const ThemeContext = createContext<ThemeContextValue>({
  mode: "light",
  toggle: () => undefined,
});

export function useThemeMode(): ThemeContextValue {
  return useContext(ThemeContext);
}

/** Light/dark theme for the editor chrome. The CV page itself stays black on white. */
export function AppThemeProvider({
  children,
}: {
  children: ReactNode;
}): JSX.Element {
  const [mode, setMode] = useState<ThemeMode>(initialMode);
  const theme = useMemo(() => createAppTheme(mode), [mode]);

  useEffect(() => {
    try {
      window.localStorage.setItem(STORAGE_KEY, mode);
    } catch {
      // not being able to remember the choice is fine
    }
  }, [mode]);

  const toggle = useCallback(
    () => setMode((current) => (current === "dark" ? "light" : "dark")),
    []
  );
  const value = useMemo(() => ({ mode, toggle }), [mode, toggle]);

  const vars = Object.fromEntries(
    Object.entries(THEME_TOKENS[mode]).map(([key, color]) => [
      `--${key}`,
      color,
    ])
  );

  return (
    <ThemeContext.Provider value={value}>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <GlobalStyles
          styles={{
            ":root": { ...vars, colorScheme: mode },
            body: { fontFamily: FONT_FAMILY, background: "var(--bg)" },
          }}
        />
        {children}
      </ThemeProvider>
    </ThemeContext.Provider>
  );
}
