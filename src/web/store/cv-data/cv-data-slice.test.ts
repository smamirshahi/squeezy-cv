import { describe, expect, it } from "vitest";
import {
  cvDataReducer,
  initialState,
  resetCvDataState,
  setBulletPointIcon,
  setDateFormat,
  setMetaData,
  setPaperMargin,
  setRatingIcon,
  setSkillsLayout,
  setStyle,
  setTypography,
} from "@store/cv-data/cv-data-slice";

describe("cvDataSlice", () => {
  it("replaces the meta data and leaves the style alone", () => {
    const metaData = { title: "Acme", jobUrl: "https://example.com/job" };
    const next = cvDataReducer(initialState, setMetaData(metaData));
    expect(next.metaData).toEqual(metaData);
    expect(next.style).toEqual(initialState.style);
  });

  it("replaces the whole style", () => {
    const style = { ...initialState.style, paperMargin: "normal" as const };
    const next = cvDataReducer(initialState, setStyle(style));
    expect(next.style).toEqual(style);
    expect(next.metaData).toEqual(initialState.metaData);
  });

  it("changes single style settings independently", () => {
    let state = cvDataReducer(initialState, setDateFormat("DD/MM/YYYY"));
    state = cvDataReducer(state, setPaperMargin("normal"));
    state = cvDataReducer(state, setRatingIcon("circle"));
    state = cvDataReducer(state, setBulletPointIcon("dash"));
    expect(state.style).toMatchObject({
      dateFormat: "DD/MM/YYYY",
      paperMargin: "normal",
      ratingIcon: "circle",
      bulletPointIcon: "dash",
    });
    expect(state.style.typography).toEqual(initialState.style.typography);
  });

  it("sets the skills layout, which is missing until chosen", () => {
    expect(initialState.style.skillsLayout).toBeUndefined();
    const next = cvDataReducer(initialState, setSkillsLayout("three"));
    expect(next.style.skillsLayout).toBe("three");
    expect(next.style.ratingIcon).toBe(initialState.style.ratingIcon);
  });

  it("changes one typography variant only", () => {
    const fontStyle = {
      fontSize: "20pt",
      fontWeight: "700",
      color: "#000000",
    } as const;
    const next = cvDataReducer(
      initialState,
      setTypography({ variant: "headingLg", fontStyle })
    );
    expect(next.style.typography.headingLg).toEqual(fontStyle);
    expect(next.style.typography.bodyMd).toEqual(
      initialState.style.typography.bodyMd
    );
  });

  it("resets to the initial state", () => {
    const changed = cvDataReducer(initialState, setPaperMargin("normal"));
    expect(cvDataReducer(changed, resetCvDataState())).toEqual(initialState);
  });
});
