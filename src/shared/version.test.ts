import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { APP_VERSION } from "@shared/version";

const SEMVER = /^\d+\.\d+\.\d+$/;

describe("version", () => {
  it("is a SemVer number", () => {
    expect(APP_VERSION).toMatch(SEMVER);
  });

  it("matches package.json", () => {
    const pkg = JSON.parse(readFileSync("package.json", "utf8")) as {
      version: string;
    };
    expect(pkg.version).toBe(APP_VERSION);
  });

  it("is the newest released entry of CHANGELOG.md", () => {
    const changelog = readFileSync("CHANGELOG.md", "utf8");
    const released = [...changelog.matchAll(/^## \[(\d+\.\d+\.\d+)\]/gm)].map(
      (m) => m[1]
    );
    expect(released[0]).toBe(APP_VERSION);
    expect(changelog).toMatch(/^## \[Unreleased\]/m);
  });
});
