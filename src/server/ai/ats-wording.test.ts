import { mkdtemp, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { FastifyInstance } from "fastify";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import sample from "@fixtures/sample-cv.json";
import { buildServer } from "@server/app";
import { AiClient, GenerateRequest } from "@server/ai/ai-types";
import { suggestAtsWording } from "@server/ai/ats-wording";
import { NothingToWorkFromError } from "@server/ai/generate-bullets";
import { FileCvStorage } from "@server/storage/file-cv-storage";
import { migrateCvFile } from "@shared/vault/migrate-vault";

const file = migrateCvFile(sample);
const { vault } = file;
const experience = vault.sections.find((s) => s.type === "experience")!;
const item = experience.items[0];
const description = "Built a React dashboard used by 200 internal users";
item.fields.description = description;

/** Answers with what the test gives it and remembers what it was sent */
class FakeAi implements AiClient {
  sent = "";
  constructor(private readonly answer: unknown) {}
  generate<T>(request: GenerateRequest<T>): Promise<T> {
    expect(request.promptName).toBe("ats-wording");
    this.sent = request.input;
    // the profile is given so the shared client can scrub it on the way out
    expect(request.personal?.profile.fullName).toBe(vault.profile.fullName);
    return Promise.resolve(request.schema.check(this.answer));
  }
}

const good = {
  suggestions: [
    {
      itemId: item.id,
      field: "description",
      text: "Built a React.js dashboard used by 200 internal users",
    },
  ],
  unplaced: ["GraphQL"],
};

describe("suggestAtsWording", () => {
  it("sends the terms and the texts, never the profile", async () => {
    const ai = new FakeAi(good);
    await suggestAtsWording(ai, vault, { terms: ["React.js", "GraphQL"] });
    const sent = JSON.parse(ai.sent);
    expect(sent.terms).toEqual(["React.js", "GraphQL"]);
    expect(
      sent.texts.find((text: { itemId: string }) => text.itemId === item.id)
    ).toMatchObject({
      itemId: item.id,
      field: "description",
      text: description,
    });
    expect(ai.sent).not.toContain(vault.profile.email);
  });

  it("returns the suggestion with its original and the terms it left out", async () => {
    const result = await suggestAtsWording(new FakeAi(good), vault, {
      terms: ["React.js", "GraphQL"],
      reworded: ["React.js"],
    });
    expect(result.suggestions).toHaveLength(1);
    expect(result.suggestions[0]).toMatchObject({
      itemId: item.id,
      original: description,
      flags: [],
    });
    expect(result.unplaced).toEqual(["GraphQL"]);
  });

  it("flags the advert's spelling when the CV does not already say it", async () => {
    const result = await suggestAtsWording(new FakeAi(good), vault, {
      terms: ["React.js", "GraphQL"],
    });
    expect(result.suggestions[0].flags.join(" ")).toContain("React.js");
  });

  it("flags a skill the text does not say (the model's own claim is not used)", async () => {
    const result = await suggestAtsWording(
      new FakeAi({
        suggestions: [
          {
            itemId: item.id,
            field: "description",
            text: `${description} with GraphQL and Kubernetes for 97% faster loads`,
          },
        ],
        unplaced: [],
      }),
      vault,
      { terms: ["GraphQL"] }
    );
    const flags = result.suggestions[0].flags.join(" ");
    expect(flags).toContain("97");
    expect(flags).toContain("Kubernetes");
  });

  it("drops unknown items, unchanged texts, repeats and terms it was not asked for", async () => {
    const result = await suggestAtsWording(
      new FakeAi({
        suggestions: [
          { itemId: "nope", field: "description", text: "x" },
          { itemId: item.id, field: "description", text: description },
          { itemId: item.id, field: "company", text: "Other Ltd" },
          { itemId: item.id, field: "description", text: `${description}.` },
          { itemId: item.id, field: "description", text: `${description}!` },
        ],
        unplaced: ["Rust", "GraphQL"],
      }),
      vault,
      { terms: ["GraphQL"] }
    );
    expect(result.suggestions.map((entry) => entry.text)).toEqual([
      `${description}.`,
    ]);
    expect(result.unplaced).toEqual(["GraphQL"]);
  });

  it("refuses without terms and without a text to work from", async () => {
    await expect(
      suggestAtsWording(new FakeAi(good), vault, { terms: [" ", ""] })
    ).rejects.toBeInstanceOf(NothingToWorkFromError);
    const empty = {
      ...vault,
      sections: vault.sections.map((section) => ({
        ...section,
        items: section.items.map((entry) => ({
          ...entry,
          fields: { ...entry.fields, description: "", text: "" },
        })),
      })),
    };
    await expect(
      suggestAtsWording(new FakeAi(good), empty, { terms: ["React"] })
    ).rejects.toBeInstanceOf(NothingToWorkFromError);
  });
});

describe("POST /api/ai/ats-wording", () => {
  let dir: string;
  let app: FastifyInstance;

  async function start(ai?: AiClient): Promise<void> {
    await app?.close();
    app = buildServer({ storage: new FileCvStorage(dir), ai });
  }

  beforeEach(async () => {
    dir = await mkdtemp(path.join(os.tmpdir(), "cv-ats-wording-"));
    await start(new FakeAi(good));
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

  it("answers with the suggestions", async () => {
    const response = await app.inject({
      method: "POST",
      url: "/api/ai/ats-wording",
      payload: { terms: ["React.js", "GraphQL"] },
    });
    expect(response.statusCode).toBe(200);
    expect(response.json()).toMatchObject({
      suggestions: [{ itemId: item.id, original: description }],
      unplaced: ["GraphQL"],
    });
  });

  it("refuses no terms, a bad body and a missing AI", async () => {
    const none = await app.inject({
      method: "POST",
      url: "/api/ai/ats-wording",
      payload: { terms: [] },
    });
    expect(none.statusCode).toBe(400);
    const bad = await app.inject({
      method: "POST",
      url: "/api/ai/ats-wording",
      payload: { terms: "React" },
    });
    expect(bad.statusCode).toBeGreaterThanOrEqual(400);
    await start(undefined);
    const missing = await app.inject({
      method: "POST",
      url: "/api/ai/ats-wording",
      payload: { terms: ["React"] },
    });
    expect(missing.statusCode).toBe(503);
  });

  it("only previews what would be sent when asked to (nothing reaches the model)", async () => {
    const response = await app.inject({
      method: "POST",
      url: "/api/ai/ats-wording",
      headers: { "x-ai-preview": "1" },
      payload: { terms: ["React.js"] },
    });
    expect(response.statusCode).toBe(200);
    const preview = response.json();
    expect(preview.calls[0].promptName).toBe("ats-wording");
    expect(preview.calls[0].input).toContain("React.js");
    expect(preview.calls[0].input).not.toContain(vault.profile.email);
  });
});
