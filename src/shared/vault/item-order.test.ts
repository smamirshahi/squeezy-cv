import { describe, expect, it } from "vitest";
import { Item, Section } from "@custom-types/vault-types";
import {
  itemYear,
  keepInDateOrder,
  sortedSection,
} from "@shared/vault/vault-utils";
import { getItemLabel } from "@shared/variant/item-label";

function item(id: string, fields: Record<string, string>): Item {
  return { id, fields, bullets: [], tags: [], shouldShow: true };
}

function section(type: Section["type"], items: Item[]): Section {
  return { id: type, type, title: type, items };
}

describe("itemYear", () => {
  it("reads the year, date or start date", () => {
    expect(itemYear(item("a", { year: "2016" }))).toBe(2016);
    expect(itemYear(item("a", { date: "Mar 2024" }))).toBe(2024);
    expect(itemYear(item("a", { startDate: "2019-09-01" }))).toBe(2019);
  });

  it("is null without a four-digit year", () => {
    expect(itemYear(item("a", {}))).toBeNull();
    expect(itemYear(item("a", { year: "soon" }))).toBeNull();
  });
});

describe("publications and awards stay newest year first", () => {
  const items = [
    item("old", { year: "2016", date: "2016" }),
    item("none", {}),
    item("new", { year: "2022", date: "2022" }),
    item("mid", { year: "2018", date: "2018" }),
  ];

  it.each(["publications", "awards"] as const)("%s", (type) => {
    const result = sortedSection(section(type, items));
    expect(result.items.map((i) => i.id)).toEqual([
      "new",
      "mid",
      "old",
      "none",
    ]);
  });

  it("keepInDateOrder sorts in place and leaves other types alone", () => {
    const publications = section("publications", [...items]);
    keepInDateOrder(publications);
    expect(publications.items[0].id).toBe("new");
    const custom = section("custom", [...items]);
    keepInDateOrder(custom);
    expect(custom.items.map((i) => i.id)).toEqual(items.map((i) => i.id));
  });

  it("returns the same section when it is already in order", () => {
    const ordered = section("awards", [
      item("a", { date: "2024" }),
      item("b", { date: "2020" }),
    ]);
    expect(sortedSection(ordered)).toBe(ordered);
  });
});

describe("getItemLabel", () => {
  it("cuts at 60 characters by default and not when asked for the full text", () => {
    const title = "A very long publication title ".repeat(4).trim();
    const shortLabel = getItemLabel(item("a", { title }));
    expect(shortLabel.length).toBeLessThanOrEqual(60);
    expect(shortLabel.endsWith("…")).toBe(true);
    expect(getItemLabel(item("a", { title }), Infinity)).toBe(title);
  });
});
