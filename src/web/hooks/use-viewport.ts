import { useMediaQuery, useTheme } from "@mui/material";

/**
 * The size class of the window. It follows MUI's breakpoints, so `sx` values written as
 * `{ xs, sm, md, lg }` and this hook always agree:
 * phone < 600, tablet 600-899, laptop 900-1199 (small laptops), desktop 1200 and up.
 *
 * Without `window.matchMedia` (jsdom in the unit tests) every query is false, so the answer is
 * `desktop`: the tests keep seeing the full layout. Use this hook only for what CSS cannot do
 * (a different set of controls); layout changes belong in `sx` media queries.
 */
export type Viewport = "phone" | "tablet" | "laptop" | "desktop";

export function useViewport(): Viewport {
  const { breakpoints } = useTheme();
  // noSsr: read the real width on the first render, so a phone never flashes the desktop layout
  const isBelowSm = useMediaQuery(breakpoints.down("sm"), { noSsr: true });
  const isBelowMd = useMediaQuery(breakpoints.down("md"), { noSsr: true });
  const isBelowLg = useMediaQuery(breakpoints.down("lg"), { noSsr: true });
  if (isBelowSm) {
    return "phone";
  }
  if (isBelowMd) {
    return "tablet";
  }
  return isBelowLg ? "laptop" : "desktop";
}
