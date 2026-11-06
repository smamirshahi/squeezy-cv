/**
 * Auto-fit: makes a CV fit its page limit (or fill its pages) by changing, in this order,
 * the spacing, the margins, the font size and finally which items are shown. The
 * browser measures how many pages the CV takes; this module only decides the next step,
 * so it is pure. Drive it with `startFit` and then `stepFit` after every measurement.
 */

/** The values auto-fit may change. 1 means "as the style says". */
export interface FitTuning {
  /** Multiplier for the gaps between lines, items and sections */
  spacing: number;

  /** Space between the paper edge and the text, in mm */
  marginMm: number;

  /** Multiplier for every font size */
  fontScale: number;
}

export type FitMode = "fit" | "fill";

export interface FitInput {
  mode: FitMode;

  /** How many pages the CV may take */
  pageLimit: number;

  /** The values before any change; also the maximum margin when fitting */
  base: FitTuning;

  /** Never go below these when shrinking */
  floors: FitTuning;

  /** Never go above these when filling */
  ceilings: Pick<FitTuning, "spacing" | "fontScale">;

  /** Items that can be hidden, least relevant first. Empty when nothing says what matters less. */
  hideCandidates: string[];
}

export type FitPhase = "spacing" | "margin" | "font" | "hide";

export type FitStatus =
  /** More measuring is needed */
  | "running"
  /** It fits the page limit */
  | "fits"
  /** Even at the floors it does not fit: the CV has to be shortened */
  | "does-not-fit"
  /** Fill mode finished */
  | "filled";

export interface FitState {
  tuning: FitTuning;

  /** Ids of items hidden to make it fit, in the order they were hidden */
  hidden: string[];

  phase: FitPhase;
  status: FitStatus;

  /** Fill mode: the tuning before the last growth, to go back to if it overflowed */
  previous: FitTuning | null;
}

/** How much one step changes a value */
export const FIT_STEPS = {
  spacing: 0.1,
  marginMm: 1,
  fontScale: 0.02,
} as const;

/** Sensible limits: gaps down to 40%, margins no smaller than 14 mm, body text no smaller than 9.5 pt */
export const FIT_DEFAULTS = {
  minSpacing: 0.4,
  minMarginMm: 14,
  minBodyPt: 9.5,
  maxSpacing: 1.6,
  maxFontScale: 1.1,
} as const;

/** What the user may type for each limit (spacing is a ratio; margin in mm; body text in pt) */
export const FIT_LIMIT_RANGES = {
  minSpacing: { min: 0.2, max: 1 },
  minMarginMm: { min: 5, max: 30 },
  minBodyPt: { min: 6, max: 14 },
} as const;

/** Keeps a typed limit inside its range; anything that is not a number becomes the default */
export function clampFitLimit(
  key: keyof typeof FIT_LIMIT_RANGES,
  value: number
): number {
  const { min, max } = FIT_LIMIT_RANGES[key];
  if (!Number.isFinite(value)) {
    return FIT_DEFAULTS[key];
  }
  return round(Math.min(max, Math.max(min, value)));
}

/** The user's limits with every value inside its range, so an empty or silly field cannot break auto-fit */
export function clampFitLimits<T extends Record<string, number | undefined>>(
  limits: T
): T {
  const result: Record<string, number | undefined> = { ...limits };
  for (const key of Object.keys(
    FIT_LIMIT_RANGES
  ) as (keyof typeof FIT_LIMIT_RANGES)[]) {
    const value = limits[key];
    if (value !== undefined) {
      result[key] = clampFitLimit(key, value);
    }
  }
  return result as T;
}

const SHRINK_ORDER: FitPhase[] = ["spacing", "margin", "font", "hide"];
const FILL_ORDER: FitPhase[] = ["spacing", "font"];

const DECIMALS = 100;

function round(value: number): number {
  return Math.round(value * DECIMALS) / DECIMALS;
}

export function startFit(input: FitInput): FitState {
  return {
    tuning: { ...input.base },
    hidden: [],
    phase: input.mode === "fit" ? SHRINK_ORDER[0] : FILL_ORDER[0],
    status: "running",
    previous: null,
  };
}

/** One notch smaller in `phase`, or null if it is at its floor */
function shrink(
  input: FitInput,
  state: FitState,
  phase: FitPhase
): FitState | null {
  const { tuning } = state;
  switch (phase) {
    case "spacing": {
      const spacing = round(tuning.spacing - FIT_STEPS.spacing);
      return spacing < input.floors.spacing
        ? null
        : { ...state, tuning: { ...tuning, spacing } };
    }
    case "margin": {
      const marginMm = tuning.marginMm - FIT_STEPS.marginMm;
      return marginMm < input.floors.marginMm
        ? null
        : { ...state, tuning: { ...tuning, marginMm } };
    }
    case "font": {
      const fontScale = round(tuning.fontScale - FIT_STEPS.fontScale);
      return fontScale < input.floors.fontScale
        ? null
        : { ...state, tuning: { ...tuning, fontScale } };
    }
    case "hide": {
      const next = input.hideCandidates.find(
        (id) => !state.hidden.includes(id)
      );
      return next === undefined
        ? null
        : { ...state, hidden: [...state.hidden, next] };
    }
  }
}

/** One notch larger in `phase`, or null if it is at its ceiling */
function grow(
  input: FitInput,
  state: FitState,
  phase: FitPhase
): FitState | null {
  const { tuning } = state;
  if (phase === "spacing") {
    const spacing = round(tuning.spacing + FIT_STEPS.spacing);
    return spacing > input.ceilings.spacing
      ? null
      : { ...state, tuning: { ...tuning, spacing }, previous: tuning };
  }
  if (phase === "font") {
    const fontScale = round(tuning.fontScale + FIT_STEPS.fontScale);
    return fontScale > input.ceilings.fontScale
      ? null
      : { ...state, tuning: { ...tuning, fontScale }, previous: tuning };
  }
  return null;
}

function stepFitting(
  input: FitInput,
  state: FitState,
  pageCount: number
): FitState {
  if (pageCount <= input.pageLimit) {
    return { ...state, status: "fits" };
  }
  for (
    let index = SHRINK_ORDER.indexOf(state.phase);
    index < SHRINK_ORDER.length;
    index += 1
  ) {
    const phase = SHRINK_ORDER[index];
    const next = shrink(input, { ...state, phase }, phase);
    if (next) {
      return next;
    }
  }
  return { ...state, status: "does-not-fit" };
}

function stepFilling(
  input: FitInput,
  state: FitState,
  pageCount: number
): FitState {
  let current = state;
  if (current.previous) {
    if (pageCount > input.pageLimit) {
      // The last growth overflowed: take it back and move on to the next kind
      current = {
        ...current,
        tuning: current.previous,
        previous: null,
        phase: FILL_ORDER[FILL_ORDER.indexOf(current.phase) + 1] ?? "hide",
      };
    }
  } else if (pageCount > input.pageLimit) {
    // Nothing to fill: it is already too long
    return { ...current, status: "does-not-fit" };
  }
  for (
    let index = FILL_ORDER.indexOf(current.phase);
    index >= 0 && index < FILL_ORDER.length;
    index += 1
  ) {
    const phase = FILL_ORDER[index];
    const next = grow(input, { ...current, phase }, phase);
    if (next) {
      return next;
    }
  }
  return { ...current, previous: null, status: "filled" };
}

/** The next state, given how many pages the CV takes with `state`'s values. Does nothing once finished. */
export function stepFit(
  input: FitInput,
  state: FitState,
  pageCount: number
): FitState {
  if (state.status !== "running") {
    return state;
  }
  return input.mode === "fit"
    ? stepFitting(input, state, pageCount)
    : stepFilling(input, state, pageCount);
}

/** Plain-language list of what was changed compared to the base values */
export function describeFit(input: FitInput, state: FitState): string[] {
  const lines: string[] = [];
  function percent(value: number): string {
    return `${Math.round(value * DECIMALS)}%`;
  }
  if (state.tuning.spacing !== input.base.spacing) {
    lines.push(
      `Spacing ${percent(input.base.spacing)} → ${percent(state.tuning.spacing)}`
    );
  }
  if (state.tuning.marginMm !== input.base.marginMm) {
    lines.push(
      `Margins ${input.base.marginMm} mm → ${state.tuning.marginMm} mm`
    );
  }
  if (state.tuning.fontScale !== input.base.fontScale) {
    lines.push(
      `Font size ${percent(input.base.fontScale)} → ${percent(state.tuning.fontScale)}`
    );
  }
  if (state.hidden.length > 0) {
    lines.push(`Hidden: ${state.hidden.join(", ")}`);
  }
  return lines;
}

/** What the user may change about how far auto-fit goes */
export interface FitLimits {
  /** Gaps never shrink below this multiple of the style's (0.4 = 40%) */
  minSpacing?: number;

  /** Margins never shrink below this many mm */
  minMarginMm?: number;

  /** Body text never shrinks below this many points */
  minBodyPt?: number;
}

/** The floors for a CV whose body text is `bodyPt` points: see `FIT_DEFAULTS`, or the user's `limits` */
export function defaultFloors(
  baseMarginMm: number,
  bodyPt: number,
  limits: FitLimits = {}
): FitTuning {
  return {
    spacing: limits.minSpacing ?? FIT_DEFAULTS.minSpacing,
    marginMm: Math.min(
      baseMarginMm,
      limits.minMarginMm ?? FIT_DEFAULTS.minMarginMm
    ),
    fontScale: Math.min(
      1,
      round((limits.minBodyPt ?? FIT_DEFAULTS.minBodyPt) / bodyPt)
    ),
  };
}
