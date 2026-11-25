import { describe, expect, it } from "vitest";
import {
  CURRENT_VAULT_VERSION,
  Item,
  SectionType,
  Vault,
} from "@custom-types/vault-types";
import {
  ImportSource,
  applyPlan,
  gatherLines,
  isSameEntry,
  planImports,
  setDescriptionLines,
  unresolvedCount,
} from "@shared/vault/merge-imports";

let counter = 0;
const newId = (): string => `id-${++counter}`;

function item(fields: Record<string, string>): Item {
  return { id: newId(), fields, bullets: [], tags: [], shouldShow: true };
}

function vault(
  sections: { type: SectionType; items: Item[] }[] = [],
  profile: Vault["profile"] = { fullName: "" }
): Vault {
  return {
    version: CURRENT_VAULT_VERSION,
    profile,
    links: [],
    sections: sections.map((section) => ({
      id: newId(),
      type: section.type,
      title: section.type,
      items: section.items,
    })),
  };
}

function job(extra: Record<string, string> = {}): Item {
  return item({
    jobTitle: "Software Developer",
    company: "Northwind Labs",
    startDate: "2019-01-01",
    endDate: "2021-12-01",
    ...extra,
  });
}

function source(
  fileName: string,
  items: Item[],
  profile?: Vault["profile"]
): ImportSource {
  return { fileName, vault: vault([{ type: "experience", items }], profile) };
}

describe("isSameEntry", () => {
  it("matches the same employer with overlapping dates, ignoring case and spacing", () => {
    expect(
      isSameEntry("experience", job(), job({ company: "  northwind labs " }))
    ).toBe(true);
  });

  it("does not match different employers", () => {
    expect(isSameEntry("experience", job(), job({ company: "Acme" }))).toBe(
      false
    );
  });

  it("does not match the same employer in years that do not overlap", () => {
    expect(
      isSameEntry(
        "experience",
        job(),
        job({ startDate: "2023-01-01", endDate: "2024-01-01" })
      )
    ).toBe(false);
  });
});

describe("gatherLines", () => {
  it("drops repeated lines and remembers every file a line is in", () => {
    const lines = gatherLines([
      { from: "a.pdf", text: "Built the portal\nRan the migration" },
      { from: "b.pdf", text: "built  the portal\nLed the team" },
    ]);
    expect(lines.map((line) => line.text)).toEqual([
      "Built the portal",
      "Ran the migration",
      "Led the team",
    ]);
    expect(lines[0].from).toEqual(["a.pdf", "b.pdf"]);
  });
});

describe("planImports", () => {
  it("proposes an item that is not in the vault as new", () => {
    const plan = planImports(vault(), [source("a.pdf", [job()])], newId);
    expect(plan.proposals).toHaveLength(1);
    expect(plan.proposals[0].kind).toBe("new");
    expect(plan.proposals[0].sources).toEqual(["a.pdf"]);
  });

  it("combines the same job from several files and gathers the descriptions", () => {
    const plan = planImports(
      vault(),
      [
        source("a.pdf", [
          job({ description: "Built the portal\nRan the migration" }),
        ]),
        source("b.pdf", [
          job({ description: "Built the portal\nLed the team" }),
        ]),
      ],
      newId
    );
    expect(plan.proposals).toHaveLength(1);
    const [proposal] = plan.proposals;
    expect(proposal.kind).toBe("merged");
    expect(proposal.conflicts).toEqual([]);
    expect(proposal.item.fields.description).toBe(
      "Built the portal\nRan the migration\nLed the team"
    );
    expect(proposal.descriptionLines?.[0].from).toEqual(["a.pdf", "b.pdf"]);
  });

  it("turns different end dates into a conflict naming both files", () => {
    const plan = planImports(
      vault(),
      [
        source("a.pdf", [job()]),
        source("b.pdf", [job({ endDate: "2022-03-01" })]),
      ],
      newId
    );
    const [conflict] = plan.proposals[0].conflicts;
    expect(conflict.field).toBe("endDate");
    expect(conflict.options.map((option) => option.from)).toEqual([
      ["a.pdf"],
      ["b.pdf"],
    ]);
    expect(conflict.chosen).toBeUndefined();
  });

  it("updates a matching vault item with what is missing and keeps the original for the diff", () => {
    const own = job();
    const plan = planImports(
      vault([{ type: "experience", items: [own] }]),
      [source("a.pdf", [job({ location: "Leeds" })])],
      newId
    );
    const [proposal] = plan.proposals;
    expect(proposal.kind).toBe("update");
    expect(proposal.existingItemId).toBe(own.id);
    expect(proposal.before?.fields.location).toBeUndefined();
    expect(proposal.item.fields.location).toBe("Leeds");
    expect(proposal.conflicts).toEqual([]);
  });

  it("counts the vault as a source: a different date than the vault's is a conflict", () => {
    const plan = planImports(
      vault([{ type: "experience", items: [job()] }]),
      [source("a.pdf", [job({ endDate: "2022-03-01" })])],
      newId
    );
    expect(plan.proposals[0].conflicts[0].options[0].from).toEqual([
      "Your vault",
    ]);
  });

  it("fills an empty profile field and asks about a different job title", () => {
    const plan = planImports(
      vault([], { fullName: "Jane Doe", headline: "Software Developer" }),
      [
        source("a.pdf", [], {
          fullName: "Jane Doe",
          headline: "Frontend Developer",
          phone: "+44 7700 900000",
        }),
      ],
      newId
    );
    expect(plan.profileFill).toEqual({ phone: "+44 7700 900000" });
    expect(plan.profileConflicts).toHaveLength(1);
    expect(plan.profileConflicts[0].field).toBe("headline");
    expect(plan.profileConflicts[0].addOthers).toBe(true);
  });
});

describe("applyPlan", () => {
  const base = vault([], {
    fullName: "Jane Doe",
    headline: "Software Developer",
  });

  it("adds only the checked items and applies the chosen value", () => {
    const plan = planImports(
      base,
      [
        source("a.pdf", [
          job(),
          job({
            company: "Acme",
            startDate: "2015-01-01",
            endDate: "2016-01-01",
          }),
        ]),
        source("b.pdf", [job({ endDate: "2022-03-01" })]),
      ],
      newId
    );
    const northwind = plan.proposals.find((p) => p.conflicts.length > 0);
    const acme = plan.proposals.find((p) => p.conflicts.length === 0);
    if (!northwind || !acme) {
      throw new Error("expected both proposals");
    }
    northwind.conflicts[0].chosen = "2022-03-01";
    expect(unresolvedCount(plan, new Set([northwind.id]))).toBe(0);
    const result = applyPlan(base, plan, new Set([northwind.id]), newId);
    const items = result.sections.flatMap((section) => section.items);
    expect(items).toHaveLength(1);
    expect(items[0].fields.endDate).toBe("2022-03-01");
  });

  it("counts unresolved conflicts only for checked items, and always for the profile", () => {
    const plan = planImports(
      base,
      [
        source("a.pdf", [job()], {
          fullName: "Jane Doe",
          headline: "Frontend Developer",
        }),
        source("b.pdf", [job({ endDate: "2022-03-01" })]),
      ],
      newId
    );
    const id = plan.proposals[0].id;
    expect(unresolvedCount(plan, new Set([id]))).toBe(2);
    expect(unresolvedCount(plan, new Set())).toBe(1);
  });

  it("keeps the chosen job title and adds the other to the other job titles", () => {
    const plan = planImports(
      base,
      [
        source("a.pdf", [], {
          fullName: "Jane Doe",
          headline: "Frontend Developer",
        }),
      ],
      newId
    );
    plan.profileConflicts[0].chosen = "Software Developer";
    const result = applyPlan(base, plan, new Set(), newId);
    expect(result.profile.headline).toBe("Software Developer");
    expect(result.profile.headlineOptions).toEqual(["Frontend Developer"]);
  });

  it("does not add the other job title when that is switched off", () => {
    const plan = planImports(
      base,
      [
        source("a.pdf", [], {
          fullName: "Jane Doe",
          headline: "Frontend Developer",
        }),
      ],
      newId
    );
    plan.profileConflicts[0].chosen = "Frontend Developer";
    plan.profileConflicts[0].addOthers = false;
    const result = applyPlan(base, plan, new Set(), newId);
    expect(result.profile.headline).toBe("Frontend Developer");
    expect(result.profile.headlineOptions).toBeUndefined();
  });

  it("replaces the matching vault item on an update and leaves others alone", () => {
    const own = job();
    const other = job({
      company: "Acme",
      startDate: "2010-01-01",
      endDate: "2011-01-01",
    });
    const start = vault([{ type: "experience", items: [own, other] }]);
    const plan = planImports(
      start,
      [source("a.pdf", [job({ location: "Leeds" })])],
      newId
    );
    const result = applyPlan(
      start,
      plan,
      new Set([plan.proposals[0].id]),
      newId
    );
    const items = result.sections[0].items;
    expect(items).toHaveLength(2);
    expect(items[0].id).toBe(own.id);
    expect(items[0].fields.location).toBe("Leeds");
    expect(items[1]).toEqual(other);
  });

  it("creates a section for a type the vault does not have yet", () => {
    const plan = planImports(vault(), [source("a.pdf", [job()])], newId);
    const result = applyPlan(
      vault(),
      plan,
      new Set([plan.proposals[0].id]),
      newId
    );
    expect(result.sections.map((section) => section.type)).toEqual([
      "experience",
    ]);
  });
});

describe("setDescriptionLines", () => {
  it("rewrites the description from the lines that are left", () => {
    const plan = planImports(
      vault(),
      [
        source("a.pdf", [job({ description: "One\nTwo" })]),
        source("b.pdf", [job({ description: "Three" })]),
      ],
      newId
    );
    const [proposal] = plan.proposals;
    const lines = (proposal.descriptionLines ?? []).filter(
      (line) => line.text !== "Two"
    );
    const next = setDescriptionLines(plan, proposal.id, lines);
    expect(next.proposals[0].item.fields.description).toBe("One\nThree");
  });
});
