import { describe, expect, it } from "vitest";
import {
  CURRENT_FORMAT_VERSIONS,
  MIGRATION_CHAINS,
} from "@shared/migration/migration-chains";
import { ChainKind } from "@shared/migration/migration-chains";
import { upgradeFile } from "@shared/migration/migration-chains";
import { withExportMeta } from "@shared/migration/export-meta";

const KINDS = Object.keys(MIGRATION_CHAINS) as ChainKind[];

describe("migration guard", () => {
  it.each(KINDS)(
    "%s has a step for every version before the current one",
    (kind) => {
      const { current, steps } = MIGRATION_CHAINS[kind];
      expect(current).toBe(CURRENT_FORMAT_VERSIONS[kind]);
      for (let from = 1; from < current; from++) {
        const step = steps.find(
          (s) => s.kind === kind && s.fromVersion === from
        );
        expect(step, `${kind}: no step from version ${from}`).toBeDefined();
        expect(step?.toVersion).toBe(from + 1);
      }
    }
  );

  it.each(KINDS)("%s without meta still opens, without a notice", (kind) => {
    const version = MIGRATION_CHAINS[kind].current;
    const { file, notice } = upgradeFile({ version, id: "x" }, kind);
    expect(file).toEqual({ version, id: "x" });
    expect(notice).toBeUndefined();
  });

  it.each(KINDS)("%s from a newer app is refused", (kind) => {
    const raw = withExportMeta({ version: 1 }, kind, 1);
    raw.meta.appVersion = "999.0.0";
    expect(() => upgradeFile(raw, kind)).toThrow(/Update the app/);
  });
});
