import { describe, expect, it } from "vitest";
import sample from "@fixtures/sample-cv.json";
import { CVJsonSchema } from "@custom-types/json-types";
import {
  cvDataReducer,
  initialState,
  setCvData,
  setStyle,
} from "@store/cv-data/cv-data-slice";

describe("fixtures/sample-cv.json", () => {
  it("is valid against the current CV schema", () => {
    expect(() => CVJsonSchema.check(sample)).not.toThrow();
  });

  it("loads into the store the way the dev loader does", () => {
    const parsed = CVJsonSchema.check(sample);
    const state = cvDataReducer(
      cvDataReducer(initialState, setCvData(parsed.data)),
      setStyle(parsed.style)
    );
    expect(state.data.personalInfo.name).toBe("Jane Doe");
    expect(state.data.experiences).toHaveLength(3);
  });

  it("uses only reserved example email domains", () => {
    const parsed = CVJsonSchema.check(sample);
    expect(parsed.data.contactInfo.email).toMatch(/@example\.(com|org|net)$/);
  });
});
