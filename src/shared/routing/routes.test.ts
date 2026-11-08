import { describe, expect, it } from "vitest";
import {
  Route,
  formatRoute,
  isWorkspaceRoute,
  legacyRedirect,
  parseRoute,
} from "@shared/routing/routes";

describe("parseRoute", () => {
  it("reads every tool", () => {
    expect(parseRoute("/vault")).toEqual({ kind: "vault" });
    expect(parseRoute("/vault/experience")).toEqual({
      kind: "vault",
      sectionId: "experience",
      itemId: undefined,
    });
    expect(parseRoute("/vault/experience/i1")).toEqual({
      kind: "vault",
      sectionId: "experience",
      itemId: "i1",
    });
    expect(parseRoute("/jobs/main")).toEqual({
      kind: "jobs",
      jobId: "main",
      view: "page",
    });
    expect(parseRoute("/jobs/main", "?view=settings")).toEqual({
      kind: "jobs",
      jobId: "main",
      view: "settings",
    });
    expect(parseRoute("/templates")).toEqual({
      kind: "templates",
      tab: "templates",
    });
    expect(parseRoute("/templates/style")).toEqual({
      kind: "templates",
      tab: "style",
    });
    expect(parseRoute("/templates/t1/layout")).toEqual({
      kind: "templates",
      tab: "layout",
      templateId: "t1",
    });
    expect(parseRoute("/templates/a%20b/style")).toEqual({
      kind: "templates",
      tab: "style",
      templateId: "a b",
    });
    expect(parseRoute("/tailor")).toEqual({ kind: "tailor" });
    expect(parseRoute("/chat/main")).toEqual({ kind: "chat", jobId: "main" });
    expect(parseRoute("/ai")).toEqual({ kind: "ai" });
    expect(parseRoute("/print/main")).toEqual({ kind: "print", jobId: "main" });
  });

  it("reads the applications list with its query, and one application", () => {
    expect(parseRoute("/applications", "?status=offer&q=co")).toEqual({
      kind: "applications",
      search: "?status=offer&q=co",
    });
    expect(parseRoute("/applications/abc")).toEqual({
      kind: "application",
      id: "abc",
    });
  });

  it("treats / as the Jobs tool", () => {
    expect(parseRoute("/")).toEqual({ kind: "jobs", view: "page" });
  });

  it("decodes ids", () => {
    expect(parseRoute("/jobs/a%20b")).toMatchObject({ jobId: "a b" });
  });

  it("says not found for anything else", () => {
    for (const path of [
      "/nope",
      "/vault/a/b/c",
      "/jobs/a/b",
      "/templates/colours",
      "/templates/t1",
      "/templates/t1/colours",
      "/templates/t1/templates",
      "/templates/t1/layout/x",
      "/tailor/x",
      "/print",
      "/applications/a/b",
    ]) {
      expect(parseRoute(path).kind, path).toBe("notFound");
    }
  });
});

describe("formatRoute", () => {
  const routes: Route[] = [
    { kind: "vault" },
    { kind: "vault", sectionId: "experience" },
    { kind: "vault", sectionId: "experience", itemId: "i1" },
    { kind: "jobs", jobId: "main", view: "page" },
    { kind: "jobs", jobId: "main", view: "settings" },
    { kind: "templates", tab: "templates" },
    { kind: "templates", tab: "layout" },
    { kind: "templates", tab: "style" },
    { kind: "templates", tab: "layout", templateId: "t1" },
    { kind: "templates", tab: "style", templateId: "a b/c" },
    { kind: "tailor" },
    { kind: "chat", jobId: "main" },
    { kind: "chat" },
    { kind: "ai" },
    { kind: "applications", search: "" },
    { kind: "applications", search: "?status=offer" },
    { kind: "application", id: "abc" },
    { kind: "print", jobId: "main" },
  ];

  it("is the inverse of parseRoute", () => {
    for (const route of routes) {
      const url = formatRoute(route);
      const [path, ...query] = url.split("?");
      const parsed = parseRoute(
        path,
        query.length ? `?${query.join("?")}` : ""
      );
      expect(formatRoute(parsed), url).toBe(url);
    }
  });

  it("encodes ids and leaves out an item without a section", () => {
    expect(formatRoute({ kind: "jobs", jobId: "a b", view: "page" })).toBe(
      "/jobs/a%20b"
    );
    expect(formatRoute({ kind: "vault", itemId: "i1" })).toBe("/vault");
  });
});

describe("legacyRedirect", () => {
  it("maps the old query addresses to the new ones", () => {
    expect(legacyRedirect("/", "?applications")).toBe("/applications");
    expect(legacyRedirect("/", "?applications&status=offer&q=co")).toBe(
      "/applications?status=offer&q=co"
    );
    expect(legacyRedirect("/", "?application=abc")).toBe("/applications/abc");
    expect(legacyRedirect("/", "?print=main")).toBe("/print/main");
    expect(legacyRedirect("/", "")).toBe("/jobs");
  });

  it("leaves current addresses alone", () => {
    expect(legacyRedirect("/jobs/main", "")).toBeNull();
    expect(legacyRedirect("/applications", "?status=offer")).toBeNull();
  });
});

describe("isWorkspaceRoute", () => {
  it("is true for the tools, false for the other pages", () => {
    expect(isWorkspaceRoute({ kind: "vault" })).toBe(true);
    expect(isWorkspaceRoute({ kind: "application", id: "a" })).toBe(false);
    expect(isWorkspaceRoute({ kind: "print", jobId: "a" })).toBe(false);
  });
});
