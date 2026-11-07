import { mkdtemp, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { FastifyInstance } from "fastify";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import sample from "@fixtures/sample-cv.json";
import { buildServer } from "@server/app";
import { AiClient, GenerateRequest } from "@server/ai/ai-types";
import { rewriteBullet } from "@server/ai/rewrite-bullet";
import { FileCvStorage } from "@server/storage/file-cv-storage";
import { migrateCvFile } from "@shared/vault/migrate-vault";

const file = migrateCvFile(sample);
const { vault } = file;
const item = vault.sections
  .flatMap((s) => s.items)
  .find((i) => i.bullets.length >= 1)!;
const bullet = item.bullets[0];

class FakeAi implements AiClient {
  sent = "";
  constructor(private readonly text: string) {}
  generate<T>(request: GenerateRequest<T>): Promise<T> {
    expect(request.promptName).toBe("rewrite-bullet");
    this.sent = request.input;
    // the profile is given so the shared client can scrub it on the way out
    expect(request.personal?.profile.fullName).toBe(vault.profile.fullName);
    return Promise.resolve(request.schema.check({ text: this.text }));
  }
}

describe("rewriteBullet", () => {
  it("maps the mode to a wording and sends the mode, text and requirements", async () => {
    const ai = new FakeAi(bullet.text);
    const result = await rewriteBullet(ai, vault, {
      itemId: item.id,
      bulletId: bullet.id,
      mode: "shorten",
      requirements: ["React"],
    });
    expect(result).toMatchObject({
      itemId: item.id,
      bulletId: bullet.id,
      wording: "short",
      text: bullet.text,
      flags: [],
    });
    const sent = JSON.parse(ai.sent);
    expect(sent.mode).toBe("shorten");
    expect(sent.bullet).toBe(bullet.text);
    expect(sent.requirements).toEqual(["React"]);
    expect(ai.sent).not.toContain(vault.profile.email);
  });

  it("uses long for extend and formal for rephrase", async () => {
    const extend = await rewriteBullet(new FakeAi(bullet.text), vault, {
      itemId: item.id,
      bulletId: bullet.id,
      mode: "extend",
    });
    const rephrase = await rewriteBullet(new FakeAi(bullet.text), vault, {
      itemId: item.id,
      bulletId: bullet.id,
      mode: "rephrase",
    });
    expect([extend.wording, rephrase.wording]).toEqual(["long", "formal"]);
  });

  it("flags numbers and names that are not in the CV (the model's claim is not used)", async () => {
    const result = await rewriteBullet(
      new FakeAi(`${bullet.text} and cut costs by 97% using Kubernetes`),
      vault,
      { itemId: item.id, bulletId: bullet.id, mode: "extend" }
    );
    expect(result.flags.length).toBeGreaterThan(0);
    expect(result.flags.join(" ")).toContain("97");
  });
});

describe("POST /api/ai/rewrite", () => {
  let dir: string;
  let app: FastifyInstance;

  async function start(ai?: AiClient): Promise<void> {
    await app?.close();
    app = buildServer({ storage: new FileCvStorage(dir), ai });
  }
  const payload = { itemId: item.id, bulletId: bullet.id, mode: "shorten" };

  beforeEach(async () => {
    dir = await mkdtemp(path.join(os.tmpdir(), "cv-rewrite-"));
    await start(new FakeAi(bullet.text));
    await app.inject({ method: "PUT", url: "/api/vault", payload: file });
  });
  afterEach(async () => {
    await app.close();
    await rm(dir, { recursive: true, force: true });
  });

  it("answers with the proposed wording", async () => {
    const response = await app.inject({
      method: "POST",
      url: "/api/ai/rewrite",
      payload,
    });
    expect(response.statusCode).toBe(200);
    expect(response.json()).toMatchObject({ wording: "short", flags: [] });
  });

  it("refuses an unknown bullet, a bad mode and a missing AI", async () => {
    const unknown = await app.inject({
      method: "POST",
      url: "/api/ai/rewrite",
      payload: { ...payload, bulletId: "nope" },
    });
    expect(unknown.statusCode).toBe(404);
    const bad = await app.inject({
      method: "POST",
      url: "/api/ai/rewrite",
      payload: { ...payload, mode: "delete" },
    });
    expect(bad.statusCode).toBe(400);
    await start(undefined);
    const none = await app.inject({
      method: "POST",
      url: "/api/ai/rewrite",
      payload,
    });
    expect(none.statusCode).toBe(503);
  });
});
