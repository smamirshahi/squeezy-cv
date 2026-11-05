import { describe, expect, it } from "vitest";
import legacyV0 from "@fixtures/legacy-cv-v0.json";
import sample from "@fixtures/sample-cv.json";
import { CvFileSchema, Section } from "@custom-types/vault-types";
import { migrateCvFile, migrateLegacyFile } from "@store/vault/migrate-vault";

function counter(): () => string {
  let n = 0;
  return () => `gen-${++n}`;
}

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

describe("migrateLegacyFile (current legacy format)", () => {
  const result = migrateLegacyFile(sample, counter());
  function section(id: string): Section {
    return result.vault.sections.find((s) => s.id === id)!;
  }

  it("produces a valid, versioned vault file", () => {
    expect(() => CvFileSchema.check(result)).not.toThrow();
    expect(result.vault.version).toBe(1);
  });

  it("maps personal and contact info to the profile", () => {
    expect(result.vault.profile).toEqual({
      fullName: "Jane Doe",
      headline: "Software Developer",
      email: "jane.doe@example.com",
      phone: "+44 7700 900000",
      location: "London, UK",
    });
  });

  it("turns LinkedIn and GitHub ids into links", () => {
    expect(result.vault.links.map((l) => [l.label, l.url])).toEqual([
      ["LinkedIn", "https://www.linkedin.com/in/janedoe-example"],
      ["GitHub", "https://github.com/janedoe-example"],
    ]);
  });

  it("keeps experiences, ids, fields, bullets and visibility", () => {
    const items = section("experience").items;
    expect(items.map((i) => i.id)).toEqual(["exp-1", "exp-2", "exp-3"]);
    expect(items[0].fields).toEqual({
      jobTitle: "Senior Software Developer",
      company: "Example Ltd",
      location: "London, UK",
      startDate: "2022-03-01",
    });
    expect(items[0].fields).not.toHaveProperty("endDate");
    expect(items[1].fields.endDate).toBe("2022-02-28");
    expect(items[0].bullets.map((b) => b.text)).toEqual([
      "Led development of a React dashboard used by 200 internal users",
      "Introduced Redux Toolkit and cut state-related bugs",
      "Mentored two junior developers",
    ]);
    expect(items.map((i) => i.shouldShow)).toEqual([true, true, false]);
  });

  it("gives plain-string bullets new ids", () => {
    // gen-1 and gen-2 are the links, gen-3 the summary item
    expect(section("experience").items[0].bullets.map((b) => b.id)).toEqual([
      "gen-4",
      "gen-5",
      "gen-6",
    ]);
  });

  it("keeps education fields", () => {
    expect(section("education").items[0].fields.institute).toBe(
      "University of Example"
    );
  });

  it("keeps skill groups with ratings", () => {
    const frontend = section("skills").items[1];
    expect(frontend.fields.category).toBe("Frontend");
    expect(frontend.bullets.map((b) => [b.text, b.rating])).toEqual([
      ["React", 5],
      ["TypeScript", 4.5],
    ]);
  });

  it("puts the summary into a summary section", () => {
    expect(section("summary").items[0].fields.text).toMatch(
      /^Front-end developer/
    );
  });

  it("keeps the style and metadata", () => {
    expect(result.style).toEqual(sample.style);
    expect(result.metaData.title).toBe("Sample CV");
  });

  it("does not mutate its input", () => {
    const input = clone(sample);
    migrateLegacyFile(input, counter());
    expect(input).toEqual(sample);
  });
});

describe("migrateLegacyFile (oldest export shape)", () => {
  const result = migrateLegacyFile(legacyV0, counter());
  function section(id: string): Section {
    return result.vault.sections.find((s) => s.id === id)!;
  }

  it("accepts it and produces a valid file", () => {
    expect(() => CvFileSchema.check(result)).not.toThrow();
  });

  it("keeps the ids of object bullets", () => {
    expect(section("experience").items[0].bullets[0].id).toBe("exp-1-b0");
  });

  it("defaults shouldShow to true when missing", () => {
    expect(section("education").items[0].shouldShow).toBe(true);
    expect(section("skills").items.every((s) => s.shouldShow)).toBe(true);
    expect(section("experience").items.every((s) => s.shouldShow)).toBe(true);
  });

  it("defaults the missing bulletPointIcon", () => {
    expect(result.style.bulletPointIcon).toBe("disc");
  });

  it("keeps a full LinkedIn URL as it is", () => {
    expect(result.vault.links[0].url).toBe(
      "https://www.linkedin.com/in/janedoe-example"
    );
  });
});

describe("migrateLegacyFile (edge cases)", () => {
  it("skips empty links, empty summary and empty profile fields", () => {
    const input = clone(sample);
    input.data.contactInfo.linkedInId = "";
    input.data.contactInfo.gitHubId = "";
    input.data.contactInfo.phone = "";
    input.data.professionalSummary = "";
    const result = migrateLegacyFile(input, counter());
    expect(result.vault.links).toEqual([]);
    expect(result.vault.profile.phone).toBeUndefined();
    expect(
      result.vault.sections.find((s) => s.id === "summary")!.items
    ).toEqual([]);
  });

  it("rejects data that is not a CV", () => {
    expect(() => migrateLegacyFile({ hello: "world" })).toThrow();
  });
});

describe("migrateCvFile", () => {
  it("migrates legacy files", () => {
    expect(migrateCvFile(sample).vault.version).toBe(1);
  });

  it("is idempotent and survives a JSON round trip", () => {
    const once = migrateCvFile(sample);
    const again = migrateCvFile(clone(once));
    expect(again).toEqual(once);
  });

  it.each([null, "text", 42, [], undefined])("rejects %s", (value) => {
    expect(() => migrateCvFile(value)).toThrow(/JSON object/);
  });

  it("rejects a vault without a valid version", () => {
    const file = clone(migrateCvFile(sample));
    const vault = file.vault as unknown as Record<string, unknown>;
    delete vault.version;
    expect(() => migrateCvFile(file)).toThrow(/vault version/);
    vault.version = 0;
    expect(() => migrateCvFile(file)).toThrow(/vault version/);
    vault.version = 1.5;
    expect(() => migrateCvFile(file)).toThrow(/vault version/);
  });

  it("rejects files from a newer app version", () => {
    const file = clone(migrateCvFile(sample));
    file.vault.version = 2;
    expect(() => migrateCvFile(file)).toThrow(/Update the app/);
  });

  it("rejects an invalid vault of the right version", () => {
    const file = clone(migrateCvFile(sample));
    (file.vault.sections[0] as { type: string }).type = "nonsense";
    expect(() => migrateCvFile(file)).toThrow();
  });

  it("runs the migration chain in order up to the current version", () => {
    const file = clone(migrateCvFile(sample));
    const calls: number[] = [];
    const result = migrateCvFile(file, {
      currentVersion: 3,
      migrations: {
        1: (raw) => {
          calls.push(1);
          return { ...raw, vault: { ...(raw.vault as object), version: 2 } };
        },
        2: (raw) => {
          calls.push(2);
          return { ...raw, vault: { ...(raw.vault as object), version: 3 } };
        },
      },
    });
    expect(calls).toEqual([1, 2]);
    expect(result.vault.version).toBe(3);
  });

  it("fails clearly when a migration step is missing", () => {
    const file = clone(migrateCvFile(sample));
    expect(() =>
      migrateCvFile(file, { currentVersion: 2, migrations: {} })
    ).toThrow(/No migration from vault version 1 to 2/);
  });

  it("fails when a migration returns something that is not an object", () => {
    const file = clone(migrateCvFile(sample));
    expect(() =>
      migrateCvFile(file, { currentVersion: 2, migrations: { 1: () => null } })
    ).toThrow(/did not return an object/);
  });
});
