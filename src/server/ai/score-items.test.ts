import { mkdtemp, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { FastifyInstance } from "fastify";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import sample from "@fixtures/sample-cv.json";
import { buildServer } from "@server/app";
import { AiClient, GenerateRequest } from "@server/ai/ai-types";
import { scoreItems } from "@server/ai/score-items";
import { FileCvStorage } from "@server/storage/file-cv-storage";
import { migrateCvFile } from "@shared/vault/migrate-vault";

const file = migrateCvFile(sample);
const { vault } = file;
const itemCount = vault.sections.reduce((n, s) => n + s.items.length, 0);

const REQUIREMENTS = {
  jobTitle: "Dev",
  seniority: "",
  mustHave: ["Essential", "React"],
  niceToHave: [],
  keywords: [],
};

/** Answers the extraction, then scores every id it is shown with `relevance` */
class FakeAi implements AiClient {
  sent: string[] = [];
  extractions = 0;
  constructor(
    private readonly relevance: number | (() => number) = 80,
    private readonly extra: { id: string; relevance: number }[] = [],
    private readonly isSkippingFirst = false
  ) {}
  generate<T>(request: GenerateRequest<T>): Promise<T> {
    this.sent.push(request.input);
    expect(request.personal?.profile.fullName).toBe(vault.profile.fullName);
    if (request.promptName === "extract-requirements") {
      this.extractions += 1;
      return Promise.resolve(request.schema.check(REQUIREMENTS));
    }
    expect(request.promptName).toBe("score-items");
    const items = JSON.parse(request.input).items as { id: string }[];
    const shown = this.isSkippingFirst ? items.slice(1) : items;
    const value =
      typeof this.relevance === "function" ? this.relevance() : this.relevance;
    return Promise.resolve(
      request.schema.check({
        scores: [
          ...shown.map((i) => ({
            id: i.id,
            relevance: value,
            reason: " Matches React. ",
          })),
          ...this.extra,
        ],
      })
    );
  }
}

describe("scoreItems", () => {
  it("scores every item, trims the reason and sends no profile data", async () => {
    const ai = new FakeAi();
    const result = await scoreItems(ai, vault, "advert text");
    expect(result.scores).toHaveLength(itemCount);
    expect(result.scores[0]).toMatchObject({
      relevance: 80,
      reason: "Matches React.",
    });
    expect(ai.extractions).toBe(1);
    const sections = vault.sections.filter((s) => s.items.length > 0).length;
    expect(ai.sent).toHaveLength(1 + sections);
    expect(ai.sent.join("\n")).not.toContain(vault.profile.email);
    // short ids, not the real ones
    expect(ai.sent[1]).toContain('"id":"i1"');
    expect(ai.sent.join("\n")).not.toContain(result.scores[0].itemId);
    expect(result.warnings).toEqual([]);
  });

  it("drops unknown and repeated ids, clamps and rounds relevance, warns about unscored items", async () => {
    const ai = new FakeAi(150.4, [{ id: "i999", relevance: 10 }], true);
    const result = await scoreItems(ai, vault, "advert");
    expect(result.scores.every((s) => s.relevance === 100)).toBe(true);
    expect(result.warnings.some((w) => w.includes("unknown item"))).toBe(true);
    expect(result.warnings.some((w) => w.includes("got no score"))).toBe(true);
    expect(new Set(result.scores.map((s) => s.itemId)).size).toBe(
      result.scores.length
    );

    const negative = await scoreItems(new FakeAi(-5), vault, "advert");
    expect(negative.scores.every((s) => s.relevance === 0)).toBe(true);
  });

  it("splits a large section into batches", async () => {
    const big = structuredClone(vault);
    const section = big.sections.find((s) => s.items.length > 0)!;
    const template = section.items[0];
    section.items = Array.from({ length: 30 }, (_, index) => ({
      ...template,
      id: `copy-${index}`,
    }));
    const ai = new FakeAi();
    const result = await scoreItems(ai, big, "advert");
    expect(
      result.scores.filter((s) => s.itemId.startsWith("copy-"))
    ).toHaveLength(30);
    const calls = ai.sent.filter((s) => s.includes('"items"')).length;
    expect(calls).toBeGreaterThan(
      big.sections.filter((s) => s.items.length > 0).length
    );
  });
});

describe("POST /api/ai/score", () => {
  let dir: string;
  let app: FastifyInstance;

  async function start(ai?: AiClient): Promise<void> {
    await app?.close();
    app = buildServer({ storage: new FileCvStorage(dir), ai });
  }

  beforeEach(async () => {
    dir = await mkdtemp(path.join(os.tmpdir(), "cv-score-"));
    await start(new FakeAi(60));
    await app.inject({ method: "PUT", url: "/api/vault", payload: file });
  });
  afterEach(async () => {
    await app.close();
    await rm(dir, { recursive: true, force: true });
  });

  it("answers with a score per item", async () => {
    const response = await app.inject({
      method: "POST",
      url: "/api/ai/score",
      payload: { jobAd: "We need a React developer" },
    });
    expect(response.statusCode).toBe(200);
    expect(response.json().scores).toHaveLength(itemCount);
  });

  it("refuses an empty advert, a bad body and a missing AI", async () => {
    const empty = await app.inject({
      method: "POST",
      url: "/api/ai/score",
      payload: { jobAd: "   " },
    });
    expect(empty.statusCode).toBe(400);
    const tooLong = await app.inject({
      method: "POST",
      url: "/api/ai/score",
      payload: { jobAd: "x".repeat(20_001) },
    });
    expect(tooLong.statusCode).toBe(400);
    const bad = await app.inject({
      method: "POST",
      url: "/api/ai/score",
      payload: {},
    });
    expect(bad.statusCode).toBeGreaterThanOrEqual(400);
    expect(bad.statusCode).toBeLessThan(500);

    await start(undefined);
    const none = await app.inject({
      method: "POST",
      url: "/api/ai/score",
      payload: { jobAd: "advert" },
    });
    expect(none.statusCode).toBe(503);
    expect(none.json().code).toBe("ai_not_configured");
  });
});
