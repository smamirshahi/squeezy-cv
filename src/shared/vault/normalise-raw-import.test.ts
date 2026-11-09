import { RawImportSchema } from "@custom-types/import-types";
import { normaliseRawImport } from "@shared/vault/normalise-raw-import";
import { describe, expect, it } from "vitest";

describe("normaliseRawImport", () => {
  it("repairs a typical small-model answer", () => {
    const messy = {
      profile: { fullName: "Ada", headline: null, email: "", phone: 123 },
      sections: [
        {
          type: "work",
          title: "Work",
          items: [
            {
              fields: { jobTitle: "Dev", startDate: 2013, endDate: null },
              bullets: "Built things",
              tags: null,
            },
            { bullets: ["a", 5, null] },
          ],
        },
      ],
    };
    const result = RawImportSchema.check(normaliseRawImport(messy));
    expect(result.profile).toEqual({ fullName: "Ada", phone: "123" });
    expect(result.links).toEqual([]);
    expect(result.sections[0].type).toBe("custom");
    expect(result.sections[0].items[0].fields).toEqual({
      jobTitle: "Dev",
      startDate: "2013",
    });
    expect(result.sections[0].items[0].bullets).toEqual(["Built things"]);
    expect(result.sections[0].items[1].bullets).toEqual(["a", "5"]);
  });

  it("leaves non-objects for the schema to reject", () => {
    expect(() => RawImportSchema.check(normaliseRawImport("x"))).toThrow();
  });
});
