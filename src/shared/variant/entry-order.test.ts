import { describe, expect, it } from "vitest";
import { orderForTemplate, sortByDates } from "@shared/variant/entry-order";

const entry = (id: string, startDate: string, endDate?: string) => ({
  id,
  fields: { startDate, ...(endDate ? { endDate } : {}) },
});

const ITEMS = [
  entry("old", "2014-09-01", "2018-06-01"),
  entry("now", "2022-03-01"),
  entry("mid", "2018-09-01", "2022-02-01"),
];

describe("sortByDates", () => {
  it("newest first puts the entry that is still going on first", () => {
    expect(sortByDates(ITEMS, "newest").map((i) => i.id)).toEqual([
      "now",
      "mid",
      "old",
    ]);
  });

  it("oldest first reverses it", () => {
    expect(sortByDates(ITEMS, "oldest").map((i) => i.id)).toEqual([
      "old",
      "mid",
      "now",
    ]);
  });

  it("uses the start date when the end dates are equal, and keeps equal entries in order", () => {
    const items = [
      entry("a", "2020-01-01", "2021-01-01"),
      entry("b", "2019-01-01", "2021-01-01"),
      entry("c", "2019-01-01", "2021-01-01"),
    ];
    expect(sortByDates(items, "newest").map((i) => i.id)).toEqual([
      "a",
      "b",
      "c",
    ]);
  });
});

describe("orderForTemplate", () => {
  const style = {
    experienceOrder: "oldest",
    educationOrder: "newest",
  } as const;

  it("work and education each follow their own setting", () => {
    expect(
      orderForTemplate("experience", ITEMS, style, false).map((i) => i.id)
    ).toEqual(["old", "mid", "now"]);
    expect(
      orderForTemplate("education", ITEMS, style, false).map((i) => i.id)
    ).toEqual(["now", "mid", "old"]);
  });

  it("defaults to newest first", () => {
    expect(orderForTemplate("experience", ITEMS, {}, false)[0].id).toBe("now");
  });

  it("an order the job chose by hand wins", () => {
    expect(orderForTemplate("experience", ITEMS, style, true)).toBe(ITEMS);
  });

  it("publications go newest first unless manual", () => {
    const pubs = [
      { id: "a", fields: { year: "2019" } },
      { id: "b", fields: { year: "2022" } },
    ];
    expect(orderForTemplate("publications", pubs, {}, false)[0].id).toBe("b");
    expect(
      orderForTemplate(
        "publications",
        pubs,
        { publicationOrder: "manual" },
        false
      )[0].id
    ).toBe("a");
  });

  it("leaves other sections alone", () => {
    expect(orderForTemplate("skills", ITEMS, style, false)).toBe(ITEMS);
  });
});
