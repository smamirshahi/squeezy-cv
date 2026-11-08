import { mkdtemp, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { FastifyInstance } from "fastify";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import sample from "@fixtures/sample-cv.json";
import { buildServer } from "@server/app";
import { AiClient, GenerateRequest } from "@server/ai/ai-types";
import {
  generateBullets,
  ItemNotFoundError,
  NothingToWorkFromError,
} from "@server/ai/generate-bullets";
import { FileCvStorage } from "@server/storage/file-cv-storage";
import { migrateCvFile } from "@shared/vault/migrate-vault";
import { Vault } from "@custom-types/vault-types";

const file = migrateCvFile(sample);
const DESCRIPTION =
  "Ran the platform team at Example Ltd.\nCut deploy time with GitHub Actions.";

/** The sample vault where the first experience item has a description */
function vaultWithDescription(): { vault: Vault; itemId: string } {
  const vault: Vault = JSON.parse(JSON.stringify(file.vault));
  const item = vault.sections
    .filter((s) => s.type === "experience")
    .flatMap((s) => s.items)[0];
  item.fields.description = DESCRIPTION;
  return { vault, itemId: item.id };
}

class FakeAi implements AiClient {
  sent = "";
  constructor(private readonly bullets: string[]) {}
  generate<T>(request: GenerateRequest<T>): Promise<T> {
    expect(request.promptName).toBe("generate-bullets");
    this.sent = request.input;
    // the profile is given so the shared client can scrub it on the way out
    expect(request.personal?.profile.fullName).toBe(
      file.vault.profile.fullName
    );
    return Promise.resolve(request.schema.check({ bullets: this.bullets }));
  }
}

describe("generateBullets", () => {
  const { vault, itemId } = vaultWithDescription();

  it("sends the description, mode and requirements (never the profile) and returns clean bullets", async () => {
    const ai = new FakeAi(["  Ran the platform team ", "", "Cut deploy time"]);
    const result = await generateBullets(ai, vault, {
      itemId,
      mode: "make",
      requirements: ["CI/CD"],
    });
    expect(result.bullets).toEqual([
      { text: "Ran the platform team", flags: [] },
      { text: "Cut deploy time", flags: [] },
    ]);
    const sent = JSON.parse(ai.sent);
    expect(sent).toMatchObject({
      mode: "make",
      description: DESCRIPTION,
      current: [],
      requirements: ["CI/CD"],
    });
    expect(sent.item.description).toBeUndefined();
    expect(ai.sent).not.toContain(vault.profile.email);
  });

  it("flags what is not in the description (the model's own claim is not used)", async () => {
    const result = await generateBullets(
      new FakeAi(["Cut deploy time by 97% using Kubernetes"]),
      vault,
      { itemId, mode: "make" }
    );
    expect(result.bullets[0].flags.join(" ")).toContain("97");
  });

  it("keeps at most 8 bullets and passes the current ones for the other modes", async () => {
    const many = Array.from({ length: 12 }, (_, i) => `Cut deploy time ${i}`);
    const ai = new FakeAi(many);
    const result = await generateBullets(ai, vault, {
      itemId,
      mode: "emphasise",
      focus: "CI/CD",
      current: ["Cut deploy time"],
    });
    expect(result.bullets).toHaveLength(8);
    expect(JSON.parse(ai.sent)).toMatchObject({
      current: ["Cut deploy time"],
      focus: "CI/CD",
    });
  });

  it("refuses an unknown item, a missing description and a mode without current bullets", async () => {
    const ai = new FakeAi(["x"]);
    await expect(
      generateBullets(ai, vault, { itemId: "nope", mode: "make" })
    ).rejects.toBeInstanceOf(ItemNotFoundError);
    await expect(
      generateBullets(ai, file.vault, {
        itemId: file.vault.sections.flatMap((s) => s.items)[0].id,
        mode: "make",
      })
    ).rejects.toBeInstanceOf(NothingToWorkFromError);
    await expect(
      generateBullets(ai, vault, { itemId, mode: "shorten" })
    ).rejects.toBeInstanceOf(NothingToWorkFromError);
  });
});

describe("POST /api/ai/bullets", () => {
  let dir: string;
  let app: FastifyInstance;
  const { vault, itemId } = vaultWithDescription();

  async function start(ai?: AiClient): Promise<void> {
    await app?.close();
    app = buildServer({ storage: new FileCvStorage(dir), ai });
  }
  const payload = { itemId, mode: "make" };

  beforeEach(async () => {
    dir = await mkdtemp(path.join(os.tmpdir(), "cv-bullets-"));
    await start(new FakeAi(["Ran the platform team"]));
    await app.inject({
      method: "PUT",
      url: "/api/vault",
      payload: { ...file, vault },
    });
  });
  afterEach(async () => {
    await app.close();
    await rm(dir, { recursive: true, force: true });
  });

  it("answers with the proposed bullets", async () => {
    const response = await app.inject({
      method: "POST",
      url: "/api/ai/bullets",
      payload,
    });
    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({
      itemId,
      bullets: [{ text: "Ran the platform team", flags: [] }],
    });
  });

  it("refuses an unknown item (404), a bad mode or nothing to shorten (400) and a missing AI (503)", async () => {
    const unknown = await app.inject({
      method: "POST",
      url: "/api/ai/bullets",
      payload: { ...payload, itemId: "nope" },
    });
    expect(unknown.statusCode).toBe(404);
    for (const body of [
      { ...payload, mode: "delete" },
      { ...payload, mode: "shorten" },
    ]) {
      const bad = await app.inject({
        method: "POST",
        url: "/api/ai/bullets",
        payload: body,
      });
      expect(bad.statusCode).toBe(400);
    }
    await start(undefined);
    const none = await app.inject({
      method: "POST",
      url: "/api/ai/bullets",
      payload,
    });
    expect(none.statusCode).toBe(503);
  });
});
