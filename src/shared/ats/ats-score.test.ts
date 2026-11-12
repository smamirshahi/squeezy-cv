import { describe, expect, it } from "vitest";
import sample from "@fixtures/sample-cv.json";
import { Requirements } from "@custom-types/requirements-types";
import { Variant } from "@custom-types/variant-types";
import {
  AtsInput,
  ATS_WEIGHTS,
  AtsResult,
  bandOf,
  compareScans,
  fixList,
  formatDelta,
  hasRequirements,
  scoreAts,
  snapshotOf,
} from "@shared/ats/ats-score";
import { migrateCvFile } from "@shared/vault/migrate-vault";
import { render } from "@shared/variant/render";
import { createDefaultVariant } from "@shared/variant/variant-utils";

const file = migrateCvFile(sample);
const TODAY = new Date("2026-11-12");

function inputFor(
  change: (variant: Variant) => Variant = (variant) => variant,
  more: Partial<AtsInput> = {}
): AtsInput {
  const variant = change(createDefaultVariant(file, "main"));
  return {
    document: render(file.vault, variant),
    profile: file.vault.profile,
    headline: "Software Developer",
    pageCount: 1,
    pageLimit: 1,
    linesOver: 0,
    isPhotoShown: true,
    today: TODAY,
    ...more,
  };
}

const requirements: Requirements = {
  jobTitle: "Frontend Engineer",
  seniority: "senior",
  mustHave: ["React", "TypeScript", "GraphQL"],
  niceToHave: ["Jest"],
  keywords: ["CI/CD", "React.js"],
};

function idsOf(result: AtsResult): string[] {
  return result.issues.map((entry) => entry.id);
}

describe("scoreAts: your CV (needs no job)", () => {
  it("scores the CV alone and has no match group without requirements", () => {
    const result = scoreAts(inputFor());
    expect(result.match).toBeNull();
    expect(result.total).toBe(result.cv.score);
    expect(result.cv.categories.map((entry) => entry.id)).toEqual([
      "formatting",
      "searchability",
      "content",
    ]);
    for (const entry of result.cv.categories) {
      expect(entry.score).toBeGreaterThanOrEqual(0);
      expect(entry.score).toBeLessThanOrEqual(100);
    }
  });

  it("is deterministic", () => {
    expect(scoreAts(inputFor())).toEqual(scoreAts(inputFor()));
  });

  it("flags a photo, but not when the style switches it off", () => {
    const profile = {
      ...file.vault.profile,
      photo: "data:image/png;base64,AA",
    };
    expect(idsOf(scoreAts(inputFor(undefined, { profile })))).toContain(
      "formatting:photo"
    );
    expect(
      idsOf(scoreAts(inputFor(undefined, { profile, isPhotoShown: false })))
    ).not.toContain("formatting:photo");
  });

  it("flags two columns, going over the page limit and a long CV", () => {
    const twoColumns = inputFor();
    const section = twoColumns.document.columns.fullWidth.find(
      (part) => part.kind === "section"
    );
    expect(section).toBeDefined();
    const withColumns: AtsInput = {
      ...twoColumns,
      document: {
        ...twoColumns.document,
        columns: {
          fullWidth: [],
          left: twoColumns.document.columns.fullWidth.filter(
            (part) => part.kind === "section"
          ),
          right: twoColumns.document.columns.fullWidth.filter(
            (part) => part.kind === "section"
          ),
        },
      },
    };
    expect(idsOf(scoreAts(withColumns))).toContain("formatting:two-columns");
    const long = scoreAts(inputFor(undefined, { pageCount: 3, linesOver: 4 }));
    expect(idsOf(long)).toEqual(
      expect.arrayContaining(["formatting:over-limit", "formatting:long"])
    );
    expect(long.cv.categories[0].score).toBeLessThan(
      scoreAts(inputFor()).cv.categories[0].score
    );
  });

  it("flags skill levels drawn as symbols", () => {
    const withStars = inputFor();
    const skills = withStars.document.columns.fullWidth
      .concat(withStars.document.columns.left, withStars.document.columns.right)
      .find((part) => part.kind === "section" && part.type === "skills");
    expect(skills).toBeDefined();
    if (skills?.kind === "section") {
      skills.skillStyle = { display: "stars", columns: 1 };
    }
    expect(idsOf(scoreAts(withStars))).toContain("formatting:skill-symbols");
  });

  it("flags missing contact details, each with its own weight", () => {
    const result = scoreAts(
      inputFor(undefined, {
        profile: {
          ...file.vault.profile,
          email: "",
          phone: undefined,
          location: " ",
        },
      })
    );
    expect(idsOf(result)).toEqual(
      expect.arrayContaining([
        "searchability:contact-email",
        "searchability:contact-phone",
        "searchability:contact-location",
      ])
    );
    const searchability = result.cv.categories[1];
    // 20 + 15 + 5 points off
    expect(searchability.score).toBe(60);
    // one line in the fix list for all three
    expect(
      fixList(result.issues).filter(
        (fix) => fix.key === "searchability:contact"
      )
    ).toHaveLength(1);
  });

  it("flags a missing title under the name and unusual headings", () => {
    const input = inputFor(undefined, { headline: "  " });
    const sections = input.document.columns.fullWidth
      .concat(input.document.columns.left, input.document.columns.right)
      .filter((part) => part.kind === "section");
    const first = sections[0];
    if (first.kind === "section") {
      first.title = "My Journey So Far";
    }
    const result = scoreAts(input);
    expect(idsOf(result)).toEqual(
      expect.arrayContaining([
        "searchability:headline",
        "searchability:headings",
      ])
    );
    expect(
      result.issues.find((entry) => entry.id === "searchability:headings")
        ?.title
    ).toContain("My Journey So Far");
  });

  it("flags entries without a start date and a job that ends before it starts", () => {
    const input = inputFor();
    const experience = input.document.columns.fullWidth
      .concat(input.document.columns.left, input.document.columns.right)
      .find((part) => part.kind === "section" && part.type === "experience");
    if (experience?.kind !== "section") {
      throw new Error("no experience in the sample");
    }
    experience.items[0].fields.startDate = "";
    experience.items[1].fields.startDate = "2020-01-01";
    experience.items[1].fields.endDate = "2019-01-01";
    expect(idsOf(scoreAts(input))).toEqual(
      expect.arrayContaining([
        "searchability:dates",
        "searchability:dates-order",
      ])
    );
  });

  it("flags lines without numbers, weak openings and a very short CV", () => {
    const input = inputFor();
    const experience = input.document.columns.fullWidth
      .concat(input.document.columns.left, input.document.columns.right)
      .find((part) => part.kind === "section" && part.type === "experience");
    if (experience?.kind !== "section") {
      throw new Error("no experience in the sample");
    }
    experience.items[0].fields.description =
      "Responsible for the dashboard\nWorked on forms\nLed a team of 5";
    const result = scoreAts(input);
    const content = result.issues.filter(
      (entry) => entry.category === "content"
    );
    expect(content.map((entry) => entry.id)).toEqual(
      expect.arrayContaining(["content:numbers", "content:weak-openings"])
    );
    expect(
      content.find((entry) => entry.id === "content:weak-openings")?.title
    ).toContain("2 lines");
  });
});

describe("scoreAts: match to this job", () => {
  const base = inputFor(undefined, {
    requirements,
    jobAd:
      "5+ years of experience. Strong communication and collaboration. A degree.",
  });

  it("counts covered and missing keywords in the advert's words", () => {
    const result = scoreAts(base);
    expect(result.match).not.toBeNull();
    expect(result.covered).toEqual(
      expect.arrayContaining(["React", "TypeScript"])
    );
    expect(result.missing).toEqual(
      expect.arrayContaining(["GraphQL", "Jest", "CI/CD"])
    );
    expect(result.total).toBe(
      Math.round((result.cv.score + (result.match?.score ?? 0)) / 2)
    );
  });

  it("counts a different spelling as covered, a little less, and lists it", () => {
    const result = scoreAts(base);
    expect(result.reworded).toContain("React.js");
    expect(result.missing).not.toContain("React.js");
    expect(idsOf(result)).toContain("hardSkills:wording:react.js");
  });

  it("weights must-haves double", () => {
    function only(list: Partial<Requirements>): number {
      return (
        scoreAts(
          inputFor(undefined, {
            requirements: {
              jobTitle: "",
              seniority: "",
              mustHave: [],
              niceToHave: [],
              keywords: [],
              ...list,
            },
          })
        ).match?.categories[0].score ?? -1
      );
    }
    // React is on the CV, GraphQL is not; a must-have counts double
    expect(only({ mustHave: ["React", "GraphQL"] })).toBe(50);
    expect(only({ niceToHave: ["React", "GraphQL"] })).toBe(50);
    expect(only({ mustHave: ["React"], niceToHave: ["GraphQL"] })).toBe(67);
    expect(only({ mustHave: ["GraphQL"], niceToHave: ["React"] })).toBe(33);
  });

  it("checks soft skills only when the advert names some", () => {
    const withSoft = scoreAts(base);
    const soft = withSoft.match?.categories.find(
      (entry) => entry.id === "softSkills"
    );
    expect(soft?.issues.map((entry) => entry.title).join(" ")).toContain(
      "communication"
    );
    const without = scoreAts({ ...base, jobAd: "Build things." });
    expect(
      without.match?.categories.some((entry) => entry.id === "softSkills")
    ).toBe(false);
  });

  it("checks the job title and the years asked for", () => {
    const result = scoreAts(base);
    const title = result.match?.categories.find(
      (entry) => entry.id === "titleExperience"
    );
    expect(title?.issues.map((entry) => entry.id)).toEqual(
      expect.arrayContaining(["titleExperience:title"])
    );
    const later = scoreAts({ ...base, today: new Date("2030-01-01") });
    expect(idsOf(later)).not.toContain("titleExperience:years");
    const early = scoreAts({
      ...base,
      jobAd: "10+ years of experience",
      today: new Date("2020-01-01"),
    });
    expect(idsOf(early)).toContain("titleExperience:years");
    const matching = scoreAts({
      ...base,
      headline: "Frontend Engineer",
      requirements: { ...requirements, jobTitle: "Frontend Engineer" },
    });
    expect(idsOf(matching)).not.toContain("titleExperience:title");
  });

  it("knows when an advert gave nothing to match", () => {
    expect(hasRequirements(undefined)).toBe(false);
    expect(
      hasRequirements({
        jobTitle: "x",
        seniority: "",
        mustHave: [" "],
        niceToHave: [],
        keywords: [],
      })
    ).toBe(false);
    expect(hasRequirements(requirements)).toBe(true);
  });
});

describe("weights, bands and the fix list", () => {
  it("keeps the weights of each group at 1", () => {
    const cv =
      ATS_WEIGHTS.formatting + ATS_WEIGHTS.searchability + ATS_WEIGHTS.content;
    const match =
      ATS_WEIGHTS.hardSkills +
      ATS_WEIGHTS.softSkills +
      ATS_WEIGHTS.titleExperience;
    expect(cv).toBeCloseTo(1);
    expect(match).toBeCloseTo(1);
  });

  it("puts a score in a band, with 75-90 as the natural range", () => {
    expect([40, 59, 60, 74, 75, 90, 91].map(bandOf)).toEqual([
      "low",
      "low",
      "fair",
      "fair",
      "natural",
      "natural",
      "veryHigh",
    ]);
  });

  it("makes one line of the missing keywords and sorts by what they cost", () => {
    const result = scoreAts(inputFor(undefined, { requirements }));
    const fixes = fixList(result.issues);
    const keywords = fixes.find(
      (fix) => fix.key === "hardSkills:missing-keywords"
    );
    expect(keywords?.count).toBe(result.missing.length);
    expect(keywords?.title).toMatch(
      /^Add the keywords .* and .* where they are true$/
    );
    expect(fixes.length).toBeLessThan(result.issues.length);
    // the keywords are worth the most points here, so they come first
    expect(fixes[0].key).toBe("hardSkills:missing-keywords");
  });
});

describe("comparing scans", () => {
  const before = scoreAts(inputFor(undefined, { requirements }));
  const better = scoreAts(
    inputFor(undefined, {
      requirements: { ...requirements, mustHave: ["React"], niceToHave: [] },
    })
  );

  it("gives the change per category, and what was fixed", () => {
    const first = snapshotOf(before, new Date("2026-11-12T10:00:00Z"));
    const now = snapshotOf(better, new Date("2026-11-12T11:00:00Z"));
    const change = compareScans(first, now);
    expect(change.total).toBe(now.total - first.total);
    expect(change.categories.hardSkills).toBe(
      (now.categories.hardSkills?.score ?? 0) -
        (first.categories.hardSkills?.score ?? 0)
    );
    expect(change.categories.hardSkills).toBeGreaterThan(0);
    expect(change.fixed.map((entry) => entry.id)).toContain(
      "hardSkills:missing:graphql"
    );
    expect(compareScans(first, first).fixed).toEqual([]);
    expect(compareScans(first, first).total).toBe(0);
  });

  it("has no match change when one of the scans had no advert", () => {
    const alone = snapshotOf(scoreAts(inputFor()), new Date());
    const matched = snapshotOf(before, new Date());
    expect(compareScans(alone, matched).match).toBeNull();
  });

  it("notices when the CV or the advert changed (the content key)", () => {
    expect(before.contentKey).toBe(
      scoreAts(inputFor(undefined, { requirements })).contentKey
    );
    expect(better.contentKey).not.toBe(before.contentKey);
  });

  it("writes deltas with a sign", () => {
    expect([formatDelta(5), formatDelta(-3), formatDelta(0)]).toEqual([
      "+5",
      "-3",
      "0",
    ]);
  });
});
