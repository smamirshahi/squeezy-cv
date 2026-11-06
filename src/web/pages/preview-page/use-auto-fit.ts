import { useEffect, useMemo, useState } from "react";
import {
  FitLimitsValue,
  FitMode,
  FitTuning,
} from "@custom-types/variant-types";
import {
  FIT_DEFAULTS,
  FitInput,
  FitState,
  defaultFloors,
  describeFit,
  startFit,
  stepFit,
} from "@shared/layout/fit";

interface Options {
  isEnabled: boolean;
  mode: FitMode;
  pageLimit: number;

  /** The values as the style says */
  base: FitTuning;

  /** The user's floors for spacing, margin and body text */
  limits?: FitLimitsValue;

  /** Body text size in pt, to keep it readable */
  bodyPt: number;

  /** A string that changes whenever the content or the limit changes, and not otherwise */
  restartKey: string;
}

interface Result {
  /** What to draw with right now */
  tuning: FitTuning;

  state: FitState;

  /** What was changed, in words */
  changes: string[];

  /** True while measuring and adjusting */
  isRunning: boolean;

  /** Takes the next step, given the page count measured for `tuning` */
  step: (pageCount: number) => void;
}

/**
 * Holds the state of `stepFit`. The caller draws with `tuning`, waits until the page count
 * for exactly those values has been measured, then calls `step`; repeat until it is done
 * (fits, or cannot). Starts again whenever `restartKey` changes.
 */
export function useAutoFit(
  options: Options,
  onDone: (tuning: FitTuning) => void
): Result {
  const { isEnabled, mode, pageLimit, base, bodyPt, limits, restartKey } =
    options;

  const input: FitInput = useMemo(
    () => ({
      mode,
      pageLimit,
      base,
      floors: defaultFloors(base.marginMm, bodyPt, limits),
      ceilings: {
        spacing: FIT_DEFAULTS.maxSpacing,
        fontScale: FIT_DEFAULTS.maxFontScale,
      },
      // Nothing yet says which items matter less, so none are hidden automatically
      hideCandidates: [],
    }),
    [mode, pageLimit, base, bodyPt, limits]
  );

  const [state, setState] = useState<FitState>(() => startFit(input));

  // New content, limit or mode: start again from the style's own values
  useEffect(() => {
    setState(startFit(input));
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only a real change restarts
  }, [restartKey, isEnabled]);

  // Hand over the result
  useEffect(() => {
    if (isEnabled && state.status !== "running") {
      onDone(state.tuning);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- report once per result
  }, [isEnabled, state.status, state.tuning]);

  return {
    tuning: isEnabled ? state.tuning : base,
    state,
    changes: isEnabled ? describeFit(input, state) : [],
    isRunning: isEnabled && state.status === "running",
    step: (pageCount) =>
      setState((current) => stepFit(input, current, pageCount)),
  };
}
