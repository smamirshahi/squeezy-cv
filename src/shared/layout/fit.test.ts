import { describe, expect, it } from "vitest";
import {
  FIT_DEFAULTS,
  FitInput,
  FitState,
  FitTuning,
  clampFitLimit,
  clampFitLimits,
  defaultFloors,
  describeFit,
  startFit,
  stepFit,
} from "@shared/layout/fit";

const BASE: FitTuning = { spacing: 1, marginMm: 20, fontScale: 1 };
const PAGE = 100;

/** A made-up but monotone model: smaller values give a shorter CV */
function heightOf(content: number, tuning: FitTuning, hidden: number): number {
  const spaceFactor = 0.7 + 0.3 * tuning.spacing;
  const marginFactor = 1 + (tuning.marginMm - 20) * 0.01;
  return (
    content * spaceFactor * marginFactor * tuning.fontScale ** 2 - hidden * 0
  );
}

function makeInput(over: Partial<FitInput> = {}): FitInput {
  return {
    mode: "fit",
    pageLimit: 1,
    base: BASE,
    floors: defaultFloors(BASE.marginMm, 12),
    ceilings: { spacing: 1.6, fontScale: 1.1 },
    hideCandidates: [],
    ...over,
  };
}

/** Runs the steps like the browser does: measure, step, repeat */
function run(
  input: FitInput,
  content: number,
  visited: FitTuning[] = []
): FitState {
  let state = startFit(input);
  for (let guard = 0; guard < 1000 && state.status === "running"; guard += 1) {
    visited.push(state.tuning);
    const pages = Math.max(
      1,
      Math.ceil(
        heightOf(content, state.tuning, state.hidden.length) / PAGE - 1e-9
      )
    );
    state = stepFit(input, state, pages);
  }
  visited.push(state.tuning);
  return state;
}

describe("fit mode", () => {
  it("changes nothing when it already fits", () => {
    const state = run(makeInput(), 90);
    expect(state.status).toBe("fits");
    expect(state.tuning).toEqual(BASE);
    expect(describeFit(makeInput(), state)).toEqual([]);
  });

  it("only reduces spacing when that is enough", () => {
    const state = run(makeInput(), 105);
    expect(state.status).toBe("fits");
    expect(state.tuning.spacing).toBeLessThan(1);
    expect(state.tuning.marginMm).toBe(BASE.marginMm);
    expect(state.tuning.fontScale).toBe(1);
  });

  it("goes on to the margins when spacing is at its floor", () => {
    const state = run(makeInput(), 125);
    expect(state.tuning.spacing).toBe(FIT_DEFAULTS.minSpacing);
    expect(state.tuning.marginMm).toBeLessThan(BASE.marginMm);
    expect(state.tuning.fontScale).toBe(1);
  });

  it("then reduces the font size", () => {
    const input = makeInput();
    const state = run(input, 140);

    expect(state.status).toBe("fits");
    expect(state.tuning.spacing).toBe(FIT_DEFAULTS.minSpacing);
    expect(state.tuning.marginMm).toBe(FIT_DEFAULTS.minMarginMm);
    expect(state.tuning.fontScale).toBeLessThan(1);
    expect(describeFit(input, state)).toHaveLength(3);
  });

  it("stops at the first step that fits (not further than needed)", () => {
    const input = makeInput();
    const state = run(input, 105);
    const oneNotchLess = {
      ...state.tuning,
      spacing: state.tuning.spacing + 0.1,
    };
    expect(heightOf(105, oneNotchLess, 0)).toBeGreaterThan(PAGE);
  });

  it("reports that it cannot fit, and never goes below the floors", () => {
    const input = makeInput();
    const visited: FitTuning[] = [];
    const state = run(input, 1000, visited);

    expect(state.status).toBe("does-not-fit");
    for (const tuning of visited) {
      expect(tuning.spacing).toBeGreaterThanOrEqual(input.floors.spacing);
      expect(tuning.marginMm).toBeGreaterThanOrEqual(input.floors.marginMm);
      expect(tuning.fontScale).toBeGreaterThanOrEqual(input.floors.fontScale);
    }
    expect(state.tuning.spacing).toBe(input.floors.spacing);
    expect(state.tuning.marginMm).toBe(input.floors.marginMm);
    expect(state.tuning.fontScale - input.floors.fontScale).toBeLessThan(0.02);
  });

  it("does not touch margins that are already below the floor", () => {
    const input = makeInput({
      base: { ...BASE, marginMm: 10 },
      floors: defaultFloors(10, 12),
    });
    expect(input.floors.marginMm).toBe(10);
    const state = run(input, 1000);
    expect(state.tuning.marginMm).toBe(10);
  });

  it("hides the least relevant items last, one at a time, and lists them", () => {
    const input = makeInput({ hideCandidates: ["a", "b", "c"] });
    let state = startFit(input);
    // pretend it never fits until two items are hidden
    for (
      let guard = 0;
      guard < 1000 && state.status === "running";
      guard += 1
    ) {
      state = stepFit(input, state, state.hidden.length >= 2 ? 1 : 2);
    }
    expect(state.status).toBe("fits");
    expect(state.hidden).toEqual(["a", "b"]);
    expect(state.tuning.spacing).toBe(input.floors.spacing);
    expect(state.tuning.marginMm).toBe(input.floors.marginMm);
    expect(describeFit(input, state).at(-1)).toBe("Hidden: a, b");
  });

  it("does not hide anything when nothing says what matters less", () => {
    const state = run(makeInput(), 1000);
    expect(state.hidden).toEqual([]);
  });

  it("does not move once finished", () => {
    const input = makeInput();
    const done = run(input, 90);
    expect(stepFit(input, done, 5)).toBe(done);
  });

  it("respects a bigger page limit", () => {
    const state = run(makeInput({ pageLimit: 2 }), 180);
    expect(state.status).toBe("fits");
    expect(state.tuning).toEqual(BASE);
  });
});

describe("floors", () => {
  it("keeps body text at 9.5 pt or more", () => {
    expect(defaultFloors(20, 12).fontScale).toBeCloseTo(9.5 / 12, 2);
    expect(defaultFloors(20, 9).fontScale).toBe(1);
  });

  it("uses the limits the user set", () => {
    const floors = defaultFloors(20, 10, {
      minSpacing: 0.7,
      minMarginMm: 16,
      minBodyPt: 9,
    });
    expect(floors).toEqual({ spacing: 0.7, marginMm: 16, fontScale: 0.9 });
  });

  it("never raises a margin above the one the style has", () => {
    expect(defaultFloors(10, 10, { minMarginMm: 16 }).marginMm).toBe(10);
  });
});

describe("fill mode", () => {
  function fill(over: Partial<FitInput> = {}): FitInput {
    return makeInput({ mode: "fill", ...over });
  }

  it("grows spacing until just before the limit would be exceeded", () => {
    const input = fill();
    const state = run(input, 80);

    expect(state.status).toBe("filled");
    expect(state.tuning.spacing).toBeGreaterThan(1);
    expect(heightOf(80, state.tuning, 0)).toBeLessThanOrEqual(PAGE);
    const oneMore = {
      ...state.tuning,
      fontScale: state.tuning.fontScale + 0.02,
    };
    const another = { ...state.tuning, spacing: state.tuning.spacing + 0.1 };
    expect(
      heightOf(80, oneMore, 0) > PAGE || heightOf(80, another, 0) > PAGE
    ).toBe(true);
  });

  it("never goes above the ceilings", () => {
    const state = run(fill(), 10);
    expect(state.status).toBe("filled");
    expect(state.tuning.spacing).toBeLessThanOrEqual(1.6);
    expect(state.tuning.fontScale).toBeLessThanOrEqual(1.1);
  });

  it("leaves a CV that is already too long alone", () => {
    const state = run(fill(), 150);
    expect(state.status).toBe("does-not-fit");
    expect(state.tuning).toEqual(BASE);
  });

  it("never ends on a state that overflows", () => {
    for (const content of [20, 50, 70, 85, 95, 99]) {
      const state = run(fill(), content);
      expect(heightOf(content, state.tuning, 0)).toBeLessThanOrEqual(
        PAGE + 1e-9
      );
    }
  });
});

describe("limits typed by the user", () => {
  it("are kept inside their range, and rounded", () => {
    expect(clampFitLimit("minSpacing", 0)).toBe(0.2);
    expect(clampFitLimit("minSpacing", 5)).toBe(1);
    expect(clampFitLimit("minMarginMm", 0)).toBe(5);
    expect(clampFitLimit("minMarginMm", 100)).toBe(30);
    expect(clampFitLimit("minBodyPt", 2)).toBe(6);
    expect(clampFitLimit("minBodyPt", 9.5)).toBe(9.5);
  });

  it("fall back to the default for something that is not a number", () => {
    expect(clampFitLimit("minBodyPt", Number.NaN)).toBe(FIT_DEFAULTS.minBodyPt);
  });

  it("clamps a whole set of limits and leaves unset ones unset", () => {
    expect(clampFitLimits({ minSpacing: 0, minBodyPt: 99 })).toEqual({
      minSpacing: 0.2,
      minBodyPt: 14,
    });
  });
});
