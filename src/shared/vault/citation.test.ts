import { describe, expect, it } from "vitest";
import {
  CitationSegment,
  citationLink,
  citationText,
  formatCitation,
  isOwnName,
  sortPublicationsNewestFirst,
  splitAuthors,
} from "@shared/vault/citation";

const PAPER = {
  authors: "Doe, J., Shahi, M., & Smith, J.",
  title: "Fast CV parsing",
  journal: "Journal of Hiring",
  year: "2024",
  link: "10.1234/abcd",
};
const OWN = "Mohammad Shahi";

function bold(segments: CitationSegment[]): string[] {
  return segments.filter((s) => s.bold).map((s) => s.text);
}

describe("splitAuthors", () => {
  it("reads surname-comma-initial pairs as one author each", () => {
    expect(splitAuthors("Doe, J., Roe, R.")).toEqual(["Doe, J.", "Roe, R."]);
  });

  it("drops the & and the 'and' before the last author", () => {
    expect(splitAuthors("Doe, J., Shahi, M., & Smith, J.")).toEqual([
      "Doe, J.",
      "Shahi, M.",
      "Smith, J.",
    ]);
    expect(splitAuthors("J. Doe and M. Shahi")).toEqual(["J. Doe", "M. Shahi"]);
  });

  it("splits on a semicolon when there is one", () => {
    expect(splitAuthors("Doe, Jane; Roe, Richard")).toEqual([
      "Doe, Jane",
      "Roe, Richard",
    ]);
  });

  it("gives nothing for empty text", () => {
    expect(splitAuthors("  ")).toEqual([]);
  });
});

describe("isOwnName", () => {
  it("matches surname plus initial in any common spelling, ignoring case", () => {
    expect(isOwnName("Shahi, M.", OWN)).toBe(true);
    expect(isOwnName("M. Shahi", OWN)).toBe(true);
    expect(isOwnName("SHAHI, mohammad", OWN)).toBe(true);
  });

  it("does not match another initial or surname", () => {
    expect(isOwnName("Shahi, A.", OWN)).toBe(false);
    expect(isOwnName("Doe, M.", OWN)).toBe(false);
  });

  it("accepts several spellings separated by a semicolon", () => {
    expect(isOwnName("Doe, J.", "Smith, A.; Doe, J.")).toBe(true);
  });

  it("matches nothing without a name", () => {
    expect(isOwnName("Shahi, M.", undefined)).toBe(false);
  });
});

describe("citationLink", () => {
  it("shows a bare DOI as doi.org/... and points at the full address", () => {
    expect(citationLink("10.1234/abcd")).toEqual({
      text: "doi.org/10.1234/abcd",
      href: "https://doi.org/10.1234/abcd",
    });
    expect(citationLink("doi: 10.1234/abcd")?.href).toBe(
      "https://doi.org/10.1234/abcd"
    );
  });

  it("shows an address without its scheme", () => {
    expect(citationLink("https://www.example.com/paper/")).toEqual({
      text: "example.com/paper",
      href: "https://www.example.com/paper/",
    });
  });

  it("gives nothing for an empty or unsafe link", () => {
    expect(citationLink("")).toBeUndefined();
    expect(citationLink("javascript:alert(1)")).toBeUndefined();
  });
});

describe("formatCitation", () => {
  it("APA: bold own name, italic journal, link as its own clickable run", () => {
    const parts = formatCitation(PAPER, { ownName: OWN });
    expect(citationText(parts)).toBe(
      "Doe, J., Shahi, M., & Smith, J. (2024). Fast CV parsing. Journal of Hiring. doi.org/10.1234/abcd"
    );
    expect(bold(parts)).toEqual(["Shahi, M."]);
    expect(parts.find((p) => p.italic)?.text).toBe("Journal of Hiring");
    expect(parts.at(-1)).toEqual({
      text: "doi.org/10.1234/abcd",
      href: "https://doi.org/10.1234/abcd",
    });
    expect(parts.filter((p) => p.href)).toHaveLength(1);
  });

  it("IEEE", () => {
    const parts = formatCitation(PAPER, { style: "ieee", ownName: OWN });
    expect(citationText(parts)).toBe(
      'Doe, J., Shahi, M., and Smith, J., "Fast CV parsing," Journal of Hiring, 2024. doi.org/10.1234/abcd'
    );
    expect(parts.find((p) => p.italic)?.text).toBe("Journal of Hiring");
  });

  it("plain has no authors", () => {
    expect(citationText(formatCitation(PAPER, { style: "plain" }))).toBe(
      "Fast CV parsing, Journal of Hiring, 2024. doi.org/10.1234/abcd"
    );
  });

  it("links none leaves the link out", () => {
    const parts = formatCitation(PAPER, { links: "none", ownName: OWN });
    expect(citationText(parts)).toBe(
      "Doe, J., Shahi, M., & Smith, J. (2024). Fast CV parsing. Journal of Hiring."
    );
    expect(parts.some((p) => p.href)).toBe(false);
  });

  it("bold off, or no match, bolds nothing", () => {
    expect(
      bold(formatCitation(PAPER, { ownName: OWN, highlightOwnName: false }))
    ).toEqual([]);
    expect(bold(formatCitation(PAPER, { ownName: "Nobody Else" }))).toEqual([]);
  });

  it("cuts a long author list with et al.", () => {
    const parts = formatCitation(
      { ...PAPER, authors: "Doe, J., Lee, K., Park, S., Shahi, M., Roe, R." },
      { maxAuthors: 3, links: "none" }
    );
    expect(citationText(parts)).toBe(
      "Doe, J., Lee, K., Park, S., et al. (2024). Fast CV parsing. Journal of Hiring."
    );
  });

  it("in APA keeps the user's name when it would be cut", () => {
    const parts = formatCitation(
      { ...PAPER, authors: "Doe, J., Lee, K., Park, S., Shahi, M., Roe, R." },
      { maxAuthors: 3, ownName: OWN, links: "none" }
    );
    expect(citationText(parts)).toContain(
      "Doe, J., Lee, K., Shahi, M., et al."
    );
    expect(bold(parts)).toEqual(["Shahi, M."]);
  });

  it("all keeps every author", () => {
    const authors = "A, a., B, b., C, c., D, d., E, e., F, f., G, g.";
    const parts = formatCitation(
      { authors, title: "T" },
      { maxAuthors: "all" }
    );
    expect(citationText(parts)).not.toContain("et al.");
  });

  it("copes with missing fields", () => {
    expect(citationText(formatCitation({ title: "Only a title" }))).toBe(
      "Only a title."
    );
    expect(
      citationText(formatCitation({ authors: "Doe, J." }, { style: "ieee" }))
    ).toBe("Doe, J.");
    expect(citationText(formatCitation({}))).toBe("");
  });
});

describe("sortPublicationsNewestFirst", () => {
  it("puts the newest first, items without a year last, and keeps ties in order", () => {
    const items = [
      { id: "a", fields: { year: "2019" } },
      { id: "b", fields: {} },
      { id: "c", fields: { year: "2021" } },
      { id: "d", fields: { year: "2019" } },
    ];
    expect(sortPublicationsNewestFirst(items).map((i) => i.id)).toEqual([
      "c",
      "a",
      "d",
      "b",
    ]);
  });
});
