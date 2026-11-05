import { describe, expect, it } from "vitest";
import {
  CvDataState,
  cvDataReducer,
  initialState,
  resetCvDataState,
  setCvData,
  setEducationVisibilityById,
  setExperienceVisibilityById,
  setSkillVisibilityById,
} from "@store/cv-data/cv-data-slice";

function stateWithOneOfEach(): CvDataState {
  return {
    ...initialState,
    data: {
      ...initialState.data,
      experiences: [
        {
          id: "exp-1",
          company: "Acme",
          jobTitle: "Dev",
          location: "London",
          startDate: "2020-01-01",
          bulletPoints: [],
          shouldShow: true,
        },
      ],
      educations: [
        {
          id: "edu-1",
          institute: "Uni",
          degree: "BSc",
          location: "Leeds",
          startDate: "2010-01-01",
          endDate: "2014-01-01",
          shouldShow: true,
        },
      ],
      skills: [
        {
          id: "skill-1",
          category: "Frontend",
          items: [{ id: "item-1", name: "React", rating: 5 }],
          shouldShow: true,
        },
      ],
    },
  };
}

describe("cvDataSlice visibility reducers", () => {
  it("hides and re-shows an experience by id", () => {
    const hidden = cvDataReducer(
      stateWithOneOfEach(),
      setExperienceVisibilityById({ id: "exp-1", shouldShow: false })
    );
    expect(hidden.data.experiences[0].shouldShow).toBe(false);

    const shown = cvDataReducer(
      hidden,
      setExperienceVisibilityById({ id: "exp-1", shouldShow: true })
    );
    expect(shown.data.experiences[0].shouldShow).toBe(true);
  });

  it("hides an education by id", () => {
    const next = cvDataReducer(
      stateWithOneOfEach(),
      setEducationVisibilityById({ id: "edu-1", shouldShow: false })
    );
    expect(next.data.educations[0].shouldShow).toBe(false);
  });

  it("hides a skill category by id", () => {
    const next = cvDataReducer(
      stateWithOneOfEach(),
      setSkillVisibilityById({ id: "skill-1", shouldShow: false })
    );
    expect(next.data.skills[0].shouldShow).toBe(false);
  });

  it("ignores unknown ids without changing state", () => {
    const before = stateWithOneOfEach();
    const next = cvDataReducer(
      before,
      setSkillVisibilityById({ id: "missing", shouldShow: false })
    );
    expect(next).toEqual(before);
  });
});

describe("cvDataSlice data reducers", () => {
  it("replaces data with setCvData and leaves style and metadata alone", () => {
    const data = stateWithOneOfEach().data;
    const next = cvDataReducer(initialState, setCvData(data));
    expect(next.data).toEqual(data);
    expect(next.style).toEqual(initialState.style);
    expect(next.metaData).toEqual(initialState.metaData);
  });

  it("resets to the initial state", () => {
    const next = cvDataReducer(stateWithOneOfEach(), resetCvDataState());
    expect(next).toEqual(initialState);
  });
});
