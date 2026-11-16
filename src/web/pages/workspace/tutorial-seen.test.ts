// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  hasSeenTutorial,
  markTutorialSeen,
} from "@pages/workspace/tutorial-seen";

beforeEach(() => {
  localStorage.clear();
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("tutorials seen", () => {
  it("is false until the tutorial is marked as seen", () => {
    expect(hasSeenTutorial("apply")).toBe(false);
    markTutorialSeen("apply");
    expect(hasSeenTutorial("apply")).toBe(true);
  });

  it("remembers each tutorial on its own", () => {
    markTutorialSeen("template");
    expect(hasSeenTutorial("template")).toBe(true);
    expect(hasSeenTutorial("vault")).toBe(false);
    expect(hasSeenTutorial("apply")).toBe(false);
  });

  it("remembers the Applications tutorial under its own key", () => {
    markTutorialSeen("applications");
    expect(localStorage.getItem("squeezy-cv-applications-tutorial-seen")).toBe(
      "1"
    );
    expect(hasSeenTutorial("applications")).toBe(true);
    expect(hasSeenTutorial("apply")).toBe(false);
  });

  it("keeps the key the vault tutorial always used, so nobody sees it twice", () => {
    localStorage.setItem("squeezy-cv-vault-tutorial-seen", "1");
    expect(hasSeenTutorial("vault")).toBe(true);
  });

  it("does not nag when the storage is blocked", () => {
    vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new Error("blocked");
    });
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("blocked");
    });
    expect(hasSeenTutorial("apply")).toBe(true);
    expect(() => markTutorialSeen("apply")).not.toThrow();
  });
});
