import { describe, expect, it } from "vitest";
import legacy from "@fixtures/legacy-cv-v0.json";
import sample from "@fixtures/sample-cv.json";
import {
  assertNotNewer,
  readExportMeta,
  withExportMeta,
  withoutExportMeta,
} from "@shared/migration/export-meta";
import {
  MigrationStep,
  runMigrations,
} from "@shared/migration/migration-registry";
import { migrateCvFile } from "@shared/vault/migrate-vault";
import { serializeCvFile } from "@shared/vault/cv-file";
import { APP_VERSION } from "@shared/version";

const NOW = new Date("2026-11-12T10:00:00Z");

describe("export metadata", () => {
  it("records app version, format version, time and kind", () => {
    const file = withExportMeta({ a: 1 }, "job", 3, NOW);
    expect(file).toEqual({
      a: 1,
      meta: {
        appVersion: APP_VERSION,
        formatVersion: 3,
        exportedAt: NOW.toISOString(),
        kind: "job",
      },
    });
    expect(readExportMeta(file)?.kind).toBe("job");
    expect(withoutExportMeta(file)).toEqual({ a: 1 });
  });

  it("treats a file without metadata as the oldest format", () => {
    expect(readExportMeta({ a: 1 })).toBeUndefined();
    expect(() => assertNotNewer({ a: 1 })).not.toThrow();
  });

  it("refuses a file from a newer app with a readable message", () => {
    const newer = {
      meta: { appVersion: "99.0.0", formatVersion: 1, kind: "job" },
    };
    expect(() => assertNotNewer(newer)).toThrow(/made by Squeezy CV 99\.0\.0/);
    expect(() => assertNotNewer(newer, "99.0.0")).not.toThrow();
  });

  it("the CV export carries the metadata and still opens", () => {
    const file = migrateCvFile(structuredClone(sample));
    const text = serializeCvFile(file);
    expect(readExportMeta(JSON.parse(text))).toMatchObject({
      kind: "cv-file",
      appVersion: APP_VERSION,
      formatVersion: file.vault.version,
    });
    expect(migrateCvFile(JSON.parse(text)).vault.profile).toEqual(
      file.vault.profile
    );
  });

  it("migrateCvFile refuses a CV file from a newer app", () => {
    const raw = {
      ...structuredClone(sample),
      meta: { appVersion: "99.0.0", formatVersion: 9, kind: "cv-file" },
    };
    expect(() => migrateCvFile(raw)).toThrow(/Update the app/);
  });

  it("migrates a file of the oldest format (fixture) to the current one", () => {
    const file = migrateCvFile(structuredClone(legacy));
    expect(file.vault.version).toBeGreaterThanOrEqual(2);
  });
});

describe("runMigrations", () => {
  const steps: MigrationStep[] = [1, 2, 3].map((from) => ({
    kind: "job",
    fromVersion: from,
    toVersion: from + 1,
    migrate: (json) => ({
      ...json,
      trail: [...((json.trail as number[]) ?? []), from],
    }),
  }));

  it("returns the file unchanged when it is current", () => {
    expect(runMigrations({ x: 1 }, "job", 4, 4, steps)).toEqual({ x: 1 });
  });

  it("runs one step", () => {
    expect(runMigrations({}, "job", 3, 4, steps)).toEqual({ trail: [3] });
  });

  it("runs several steps in order", () => {
    expect(runMigrations({}, "job", 1, 4, steps)).toEqual({ trail: [1, 2, 3] });
  });

  it("refuses a newer version", () => {
    expect(() => runMigrations({}, "job", 5, 4, steps)).toThrow(
      /only supports up to 4/
    );
  });

  it("reports a missing step", () => {
    expect(() => runMigrations({}, "template", 1, 2, steps)).toThrow(
      /No migration from template version 1 to 2/
    );
  });
});

describe("template 1 to 2 (#477)", () => {
  it("adds the publication and entry-order settings and keeps what was set", async () => {
    const old = (await import("@fixtures/template-v1.json")).default;
    const { upgradeFile } = await import("@shared/migration/migration-chains");
    const { file, notice } = upgradeFile(structuredClone(old), "template");
    const upgraded = file as {
      version: number;
      style: Record<string, unknown>;
    };
    expect(upgraded.version).toBe(2);
    expect(upgraded.style).toMatchObject({
      citationStyle: "ieee",
      publicationLinks: "end",
      highlightOwnName: true,
      maxAuthors: 6,
      publicationOrder: "newest",
      experienceOrder: "newest",
      educationOrder: "newest",
    });
    expect(notice).toMatchObject({ fromFormat: 1, toFormat: 2 });
  });
});
