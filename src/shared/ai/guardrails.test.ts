import { describe, expect, it } from "vitest";
import {
  canAutoAccept,
  checkRewrite,
  describeFlags,
  extractNumbers,
} from "@shared/ai/guardrails";

const SOURCE = [
  "Built reusable form components in TypeScript for Example Ltd",
  "Raised unit test coverage from 30% to 80% across 12 services",
  "Leeds, UK",
];

function flagged(rewrite: string, sources = SOURCE): string[] {
  return checkRewrite(rewrite, sources).flags.map((f) => f.token);
}

describe("extractNumbers", () => {
  it.each([
    ["from 30% to 80%", ["30%", "80%"]],
    ["30 per cent and 5 percent", ["30%", "5%"]],
    ["saved £1,200 and 2.5M users", ["1200", "2.5m"]],
    ["in 2022-2024", ["2022", "2024"]],
    ["no numbers here", []],
  ])("%s", (text, expected) => {
    expect(extractNumbers(text)).toEqual(expected);
  });
});

describe("checkRewrite: harmless rewrites pass", () => {
  it.each([
    "Built reusable form components in TypeScript",
    "Created reusable TypeScript form components at Example Ltd",
    "Raised coverage from 30 per cent to 80 per cent across 12 services",
    "Improved testing across twelve services, with TypeScript form components",
    "Developed form components.",
    "Based in Leeds",
  ])("%s", (rewrite) => {
    expect(checkRewrite(rewrite, SOURCE)).toEqual({ isSafe: true, flags: [] });
  });
});

describe("checkRewrite: invented facts are flagged", () => {
  it("an invented number", () => {
    expect(
      flagged("Raised coverage from 30% to 95% across 12 services")
    ).toEqual(["95%"]);
    expect(flagged("Managed a team of 15 developers")).toEqual(["15"]);
  });

  it("an invented tool or technology", () => {
    expect(
      flagged("Built form components in TypeScript and Kubernetes")
    ).toContain("Kubernetes");
    expect(flagged("Built components with GraphQL and AWS")).toEqual(
      expect.arrayContaining(["GraphQL", "AWS"])
    );
    expect(flagged("Wrote C++ and Node.js tools")).toEqual(
      expect.arrayContaining(["C++", "Node.js"])
    );
  });

  it("an invented employer or place", () => {
    expect(flagged("Built form components at Acme Corporation")).toEqual(
      expect.arrayContaining(["Acme", "Corporation"])
    );
    expect(flagged("Built form components in Manchester")).toContain(
      "Manchester"
    );
  });

  it("an invented qualification", () => {
    expect(flagged("Built form components, holding a PhD")).toContain("PhD");
  });

  it("reports each invented thing once, in the order written", () => {
    const result = checkRewrite(
      "Used Docker, then Docker again, with 7 and 7",
      SOURCE
    );
    expect(result.flags).toEqual([
      { kind: "number", token: "7" },
      { kind: "name", token: "Docker" },
    ]);
    expect(result.isSafe).toBe(false);
  });
});

describe("checkRewrite: details", () => {
  it("does not flag an ordinary word that starts a sentence", () => {
    expect(flagged("Delivered components. Improved quality.")).toEqual([]);
  });

  it("matches names regardless of case", () => {
    expect(flagged("Built typescript components for example ltd")).toEqual([]);
  });

  it("allows names that appear anywhere in the given sources", () => {
    expect(
      flagged("Used React and Redux", [...SOURCE, "Built with React and Redux"])
    ).toEqual([]);
  });

  it("treats a possessive like the name itself", () => {
    expect(flagged("Example Ltd's components in TypeScript")).toEqual([]);
  });
});

describe("describeFlags / canAutoAccept", () => {
  it("describes flags for the user", () => {
    expect(
      describeFlags([
        { kind: "number", token: "95%" },
        { kind: "name", token: "Kubernetes" },
      ])
    ).toEqual([
      'number "95%" is not in your CV',
      'name "Kubernetes" is not in your CV',
    ]);
  });

  it("blocks auto-accept for anything flagged", () => {
    expect(canAutoAccept(undefined)).toBe(true);
    expect(canAutoAccept([])).toBe(true);
    expect(canAutoAccept(['name "X" is not in your CV'])).toBe(false);
  });
});
