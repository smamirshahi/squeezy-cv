// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  recallListSearch,
  rememberListSearch,
} from "@pages/applications-page/last-search";

beforeEach(() => {
  sessionStorage.clear();
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("the remembered search of the applications list", () => {
  it("is empty until a search is remembered", () => {
    expect(recallListSearch()).toBe("");
  });

  it("gives back what was remembered, and the latest one", () => {
    rememberListSearch("?q=acme");
    expect(recallListSearch()).toBe("?q=acme");
    rememberListSearch("?status=interview");
    expect(recallListSearch()).toBe("?status=interview");
    rememberListSearch("");
    expect(recallListSearch()).toBe("");
  });

  it("does not fail when the storage is blocked", () => {
    vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new Error("blocked");
    });
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("blocked");
    });
    expect(() => rememberListSearch("?q=a")).not.toThrow();
    expect(recallListSearch()).toBe("");
  });
});
