import { describe, expect, it } from "vitest";
import {
  ApplicationStatus,
  ApplicationSummary,
} from "@custom-types/application-types";
import {
  DEFAULT_LIST_VIEW,
  arrangeApplications,
  queryToView,
  summariseApplications,
  viewToQuery,
} from "@shared/application/application-list";

function entry(
  id: string,
  company: string,
  appliedAt: string,
  status: ApplicationStatus = "applied",
  role = "Developer"
): ApplicationSummary {
  return {
    id,
    company,
    role,
    status,
    appliedAt,
    updatedAt: appliedAt,
    isCorrupt: false,
  };
}

const broken: ApplicationSummary = {
  id: "broken",
  company: "",
  role: "",
  status: "applied",
  appliedAt: "",
  updatedAt: "",
  isCorrupt: true,
};

const all = [
  entry("a", "Acme", "2026-10-01", "rejected"),
  entry("b", "Beta Labs", "2026-11-05", "interview", "Frontend Engineer"),
  entry("c", "acorn", "2026-11-05", "applied"),
  broken,
];

function ids(list: ApplicationSummary[]): string[] {
  return list.map((x) => x.id);
}

describe("arrangeApplications", () => {
  it("shows the newest first by default, with the same-day tie in a stable order", () => {
    expect(ids(arrangeApplications(all, DEFAULT_LIST_VIEW))).toEqual([
      "c",
      "b",
      "a",
      "broken",
    ]);
  });

  it("sorts by company, ignoring case, in either direction", () => {
    const view = { ...DEFAULT_LIST_VIEW, sortKey: "company" as const };
    expect(
      ids(arrangeApplications(all, { ...view, sortDirection: "asc" }))
    ).toEqual(["a", "c", "b", "broken"]);
    expect(
      ids(arrangeApplications(all, { ...view, sortDirection: "desc" }))
    ).toEqual(["b", "c", "a", "broken"]);
  });

  it("searches company and role", () => {
    expect(
      ids(arrangeApplications(all, { ...DEFAULT_LIST_VIEW, query: " AC " }))
    ).toEqual(["c", "a", "broken"]);
    expect(
      ids(arrangeApplications(all, { ...DEFAULT_LIST_VIEW, query: "frontend" }))
    ).toEqual(["b", "broken"]);
  });

  it("filters by status, and never hides a damaged entry", () => {
    expect(
      ids(arrangeApplications(all, { ...DEFAULT_LIST_VIEW, status: "applied" }))
    ).toEqual(["c", "broken"]);
  });

  it("does not change the list it is given", () => {
    const copy = [...all];
    arrangeApplications(all, DEFAULT_LIST_VIEW);
    expect(all).toEqual(copy);
  });
});

describe("summariseApplications", () => {
  it("counts by outcome", () => {
    const list = [
      entry("1", "A", "2026-11-01"),
      entry("2", "B", "2026-11-01"),
      entry("3", "C", "2026-11-01", "interview"),
      entry("4", "D", "2026-11-01", "rejected"),
      broken,
    ];
    expect(summariseApplications(list, "2026-11-06")).toBe(
      "4 applications: 2 waiting, 1 interview, 1 rejected"
    );
  });

  it("mentions applications with no reply", () => {
    const list = [entry("1", "A", "2026-09-01"), entry("2", "B", "2026-11-01")];
    expect(summariseApplications(list, "2026-11-06")).toBe(
      "2 applications: 2 waiting (1 with no reply)"
    );
  });

  it("handles none and one", () => {
    expect(summariseApplications([], "2026-11-06")).toBe("No applications yet");
    expect(summariseApplications([broken], "2026-11-06")).toBe(
      "No applications yet"
    );
    expect(
      summariseApplications(
        [entry("1", "A", "2026-11-01", "offer")],
        "2026-11-06"
      )
    ).toBe("1 application: 1 offer");
  });
});

describe("the list state in the address", () => {
  it("round-trips search, filter and sort", () => {
    const view = {
      query: "acme ltd",
      status: "interview" as const,
      sortKey: "company" as const,
      sortDirection: "asc" as const,
    };
    expect(queryToView(viewToQuery(view))).toEqual(view);
  });

  it("is short for the default view and ignores nonsense", () => {
    expect(viewToQuery(DEFAULT_LIST_VIEW)).toBe("?applications");
    expect(queryToView("?applications&status=hired&sort=x&dir=up")).toEqual(
      DEFAULT_LIST_VIEW
    );
  });
});
