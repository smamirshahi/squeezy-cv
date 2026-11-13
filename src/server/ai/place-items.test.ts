import { mkdtemp, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { FastifyInstance } from "fastify";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { buildServer } from "@server/app";
import { AiClient, GenerateRequest } from "@server/ai/ai-types";
import { normaliseRawPlace, placeItems } from "@server/ai/place-items";
import { FileCvStorage } from "@server/storage/file-cv-storage";
import sample from "@fixtures/sample-cv.json";
import { migrateCvFile } from "@shared/vault/migrate-vault";
import { PlaceRequest, RawPlaceSchema } from "@custom-types/place-types";

const request: PlaceRequest = {
  items: [
    { itemId: "real-1", label: "AWS cert", text: "Solutions Architect" },
    { itemId: "real-2", label: "Chess club", text: "Captain" },
  ],
  sections: [
    { sectionId: "sec-a", title: "Certifications", type: "certifications" },
    { sectionId: "sec-b", title: "Volunteering", type: "volunteering" },
  ],
};

class FakeAi implements AiClient {
  sent?: string;
  personal?: unknown;
  constructor(private readonly answer: unknown) {}
  generate<T>(r: GenerateRequest<T>): Promise<T> {
    this.sent = r.input;
    this.personal = r.personal;
    expect(r.promptName).toBe("place-items");
    return Promise.resolve(r.schema.check(this.answer));
  }
}

describe("placeItems", () => {
  it("sends short ids (never the real ids) and maps the answer back", async () => {
    const ai = new FakeAi({
      placements: [
        { id: "i1", section: "s1", reason: "A certificate" },
        { id: "i2", section: "s2" },
      ],
    });
    const result = await placeItems(ai, request);
    expect(ai.sent).toContain('"id":"i1"');
    expect(ai.sent).not.toContain("real-1");
    expect(ai.sent).not.toContain("sec-a");
    expect(result.suggestions).toEqual([
      { itemId: "real-1", sectionId: "sec-a", reason: "A certificate" },
      { itemId: "real-2", sectionId: "sec-b", reason: "" },
    ]);
    expect(result.warnings).toEqual([]);
  });

  it("drops unknown items and sections, and keeps only the first suggestion per item", async () => {
    const ai = new FakeAi({
      placements: [
        { id: "i9", section: "s1" },
        { id: "i1", section: "s9" },
        { id: "i1", section: "s1" },
        { id: "i1", section: "s2" },
      ],
    });
    const result = await placeItems(ai, request);
    expect(result.suggestions).toEqual([
      { itemId: "real-1", sectionId: "sec-a", reason: "" },
    ]);
    expect(result.warnings.join(" ")).toContain("unknown item (i9)");
    expect(result.warnings.join(" ")).toContain("unknown section (s9)");
  });
});

describe("POST /api/ai/place", () => {
  let dir: string;
  let app: FastifyInstance;

  beforeEach(async () => {
    dir = await mkdtemp(path.join(os.tmpdir(), "cv-place-"));
  });
  afterEach(async () => {
    await app.close();
    await rm(dir, { recursive: true, force: true });
  });

  it("answers 503 without AI", async () => {
    app = buildServer({ storage: new FileCvStorage(dir) });
    const response = await app.inject({
      method: "POST",
      url: "/api/ai/place",
      payload: request,
    });
    expect(response.statusCode).toBe(503);
  });

  it("returns suggestions, scrubs with the profile, and refuses an empty list", async () => {
    const ai = new FakeAi({ placements: [{ id: "i1", section: "s1" }] });
    const storage = new FileCvStorage(dir);
    await storage.saveVault(migrateCvFile(sample));
    app = buildServer({ storage, ai });
    const ok = await app.inject({
      method: "POST",
      url: "/api/ai/place",
      payload: request,
    });
    expect(ok.statusCode).toBe(200);
    expect(ok.json().suggestions).toHaveLength(1);
    expect(ai.personal).toBeDefined();
    const empty = await app.inject({
      method: "POST",
      url: "/api/ai/place",
      payload: { ...request, items: [] },
    });
    expect(empty.statusCode).toBe(400);
  });
});

describe("normaliseRawPlace (small models answer almost right)", () => {
  const good = { placements: [{ id: "i1", section: "s1", reason: "Fits" }] };

  it("leaves a correct answer as it is", () => {
    expect(normaliseRawPlace(good)).toEqual(good);
  });

  it("accepts a bare list instead of { placements }", () => {
    expect(normaliseRawPlace(good.placements)).toEqual(good);
  });

  it("accepts other key names and numbers for the ids", () => {
    expect(
      normaliseRawPlace({
        placements: [
          { item: "i1", sectionId: "s2" },
          { itemId: 3, section_id: 4, reason: 5 },
        ],
      })
    ).toEqual({
      placements: [
        { id: "i1", section: "s2" },
        { id: "3", section: "4", reason: "5" },
      ],
    });
  });

  it("drops a null reason and entries without an id or section", () => {
    expect(
      normaliseRawPlace({
        placements: [
          { id: "i1", section: "s1", reason: null },
          { id: "i2" },
          { section: "s1" },
          null,
          "i3",
        ],
      })
    ).toEqual({ placements: [{ id: "i1", section: "s1" }] });
  });

  it.each([null, undefined, 42, "text", {}, { placements: "none" }])(
    "gives an empty list for %j, which the schema accepts",
    (value) => {
      const result = normaliseRawPlace(value);
      expect(result).toEqual({ placements: [] });
      expect(RawPlaceSchema.guard(result)).toBe(true);
    }
  );

  it("is what placeItems uses, so a sloppy answer still gives suggestions", async () => {
    const ai = new FakeAi([
      { item: "i1", sectionId: "s1", reason: null },
      { id: "i2", section: "s2", reason: "Volunteer work" },
    ]);
    const result = await placeItems(ai, request);
    expect(result.suggestions).toEqual([
      { itemId: "real-1", sectionId: "sec-a", reason: "" },
      { itemId: "real-2", sectionId: "sec-b", reason: "Volunteer work" },
    ]);
  });
});
