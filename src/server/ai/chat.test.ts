import { mkdtemp, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { FastifyInstance } from "fastify";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import sample from "@fixtures/sample-cv.json";
import { buildServer } from "@server/app";
import { AiClient, GenerateRequest } from "@server/ai/ai-types";
import { chat, toOperations } from "@server/ai/chat";
import { buildRefs } from "@server/ai/tailor";
import { FileCvStorage } from "@server/storage/file-cv-storage";
import { ChatRequest } from "@custom-types/chat-types";
import { migrateCvFile } from "@shared/vault/migrate-vault";

const file = migrateCvFile(sample);
const { vault } = file;
const refs = buildRefs(vault);
const items = vault.sections.flatMap((s) => s.items);
const job = items[0];
const withBullets = items.find((i) => i.bullets.length >= 2)!;
const itemRef = `i${items.indexOf(withBullets) + 1}`;
const sectionIds = vault.sections.map((s) => s.id);

describe("toOperations", () => {
  it("turns short names into real ids and understands the operation names loosely", () => {
    const { operations, warnings } = toOperations(vault, refs, {
      operations: [
        { op: "hideItem", item: "i1" },
        { op: "show_item", item: "i1" },
        { op: "Highlight Item", item: "i2", isEmphasised: true },
        { op: "moveItem", item: "i2", position: 1 },
        { op: "moveSection", section: "s2", position: 1.4 },
        { op: "hideBullet", bullet: `${itemRef}.b1`, isHidden: true },
        { op: "setTone", tone: "formal" },
        { op: "setPageLimit", pages: 1 },
      ],
    });
    expect(warnings).toEqual([]);
    expect(operations).toEqual([
      { op: "hideItem", itemId: job.id, isHidden: true },
      { op: "hideItem", itemId: job.id, isHidden: false },
      { op: "emphasiseItem", itemId: items[1].id, isEmphasised: true },
      { op: "moveItem", itemId: items[1].id, position: 1 },
      { op: "moveSection", sectionId: sectionIds[1], position: 1 },
      {
        op: "hideBullet",
        itemId: withBullets.id,
        bulletId: withBullets.bullets[0].id,
        isHidden: true,
      },
      { op: "setTone", tone: "formal" },
      { op: "setPageLimit", pages: 1 },
    ]);
  });

  it("accepts a real id the model copied, and drops unknown ones with a warning", () => {
    const { operations, warnings } = toOperations(vault, refs, {
      operations: [
        { op: "hideItem", item: job.id },
        { op: "hideItem", item: "i99" },
        { op: "moveSection", section: "s99", position: 1 },
        { op: "hideBullet", bullet: "i99.b1" },
        { op: "deleteEverything" },
      ],
    });
    expect(operations).toHaveLength(1);
    expect(warnings).toHaveLength(4);
    expect(warnings.join(" ")).toContain("unknown item (i99)");
    expect(warnings.join(" ")).toContain("cannot do (deleteEverything)");
  });

  it("rejects bad tones and page limits", () => {
    const { operations, warnings } = toOperations(vault, refs, {
      operations: [
        { op: "setTone", tone: "angry" },
        { op: "setPageLimit", pages: 5 },
      ],
    });
    expect(operations).toEqual([]);
    expect(warnings).toHaveLength(2);
  });

  it("only uses an existing wording, but allows going back to the original", () => {
    const bullet = withBullets.bullets[0];
    const withAlt = structuredClone(vault);
    const target = withAlt.sections
      .flatMap((s) => s.items)
      .find((i) => i.id === withBullets.id)!.bullets[0];
    target.alt = { short: "Short version" };
    const altRefs = buildRefs(withAlt);
    const result = toOperations(withAlt, altRefs, {
      operations: [
        { op: "useWording", bullet: `${itemRef}.b1`, wording: "short" },
        { op: "useWording", bullet: `${itemRef}.b1`, wording: "long" },
        { op: "useWording", bullet: `${itemRef}.b1`, wording: "original" },
      ],
    });
    expect(result.operations).toEqual([
      {
        op: "useWording",
        itemId: withBullets.id,
        bulletId: bullet.id,
        wording: "short",
      },
      {
        op: "useWording",
        itemId: withBullets.id,
        bulletId: bullet.id,
        wording: "text",
      },
    ]);
    expect(result.warnings.join(" ")).toContain("no long wording");
  });

  it("flags a rewording that adds something, and ignores the model's own claim", () => {
    const original = withBullets.bullets[0];
    const { operations, warnings } = toOperations(vault, refs, {
      operations: [
        {
          op: "rewriteBullet",
          bullet: `${itemRef}.b1`,
          wording: "short",
          text: "Ran Kubernetes clusters for 40 teams",
        },
        {
          op: "rewriteBullet",
          bullet: `${itemRef}.b2`,
          wording: "short",
          text: withBullets.bullets[1].text,
        },
        {
          op: "rewriteBullet",
          bullet: `${itemRef}.b1`,
          wording: "poetic",
          text: "x",
        },
      ],
    });
    const flagged = operations[0];
    expect(
      flagged.op === "rewriteBullet" && (flagged.flags?.length ?? 0) > 0
    ).toBe(true);
    expect(operations[1]).toMatchObject({ op: "rewriteBullet", flags: [] });
    expect(operations).toHaveLength(2);
    expect(warnings.join(" ")).toContain(original.text.slice(0, 20));
  });

  it("keeps at most 20 changes", () => {
    const many = Array.from({ length: 25 }, () => ({
      op: "setPageLimit",
      pages: 1,
    }));
    const { operations, warnings } = toOperations(vault, refs, {
      operations: many,
    });
    expect(operations).toHaveLength(20);
    expect(warnings.join(" ")).toContain("first 20");
  });
});

class FakeAi implements AiClient {
  sent = "";
  constructor(private readonly answer: unknown) {}
  generate<T>(request: GenerateRequest<T>): Promise<T> {
    expect(request.promptName).toBe("chat-edit");
    this.sent = request.input;
    // the profile is scrubbed on the way out by the shared client; here it must at least be given
    expect(request.personal?.profile.fullName).toBe(vault.profile.fullName);
    return Promise.resolve(request.schema.check(this.answer));
  }
}

const baseRequest: ChatRequest = {
  message: "Hide the oldest job",
  context: {
    tone: "neutral",
    pageLimit: 1,
    hiddenItemIds: [job.id],
    emphasisedItemIds: [items[1].id],
    sectionOrder: sectionIds,
  },
  history: [{ role: "user", content: "hi" }],
};

describe("chat", () => {
  it("sends short names and the variant's state, never real ids or the profile", async () => {
    const ai = new FakeAi({
      reply: "Hiding it.",
      operations: [{ op: "hideItem", item: "i3" }],
    });
    const result = await chat(ai, vault, baseRequest);
    const sent = JSON.parse(ai.sent);
    expect(sent.message).toBe("Hide the oldest job");
    expect(sent.variant).toEqual({
      tone: "neutral",
      pageLimit: 1,
      hiddenItems: ["i1"],
      highlightedItems: ["i2"],
      sectionOrder: sectionIds.map((_id, i) => `s${i + 1}`),
    });
    expect(ai.sent).not.toContain(job.id);
    expect(ai.sent).not.toContain(vault.profile.email ?? "no email");
    expect(result.reply).toBe("Hiding it.");
    expect(result.operations).toEqual([
      { op: "hideItem", itemId: items[2].id, isHidden: true },
    ]);
  });

  it("has a sensible reply when the model gives none", async () => {
    const some = await chat(
      new FakeAi({ operations: [{ op: "hideItem", item: "i1" }] }),
      vault,
      baseRequest
    );
    expect(some.reply).toBe("Here is what I would change.");
    const none = await chat(new FakeAi({}), vault, baseRequest);
    expect(none.reply).toContain("could not turn that");
    expect(none.operations).toEqual([]);
  });
});

describe("POST /api/ai/chat", () => {
  let dir: string;
  let app: FastifyInstance;

  async function start(ai?: AiClient): Promise<void> {
    await app?.close();
    app = buildServer({ storage: new FileCvStorage(dir), ai });
  }
  beforeEach(async () => {
    dir = await mkdtemp(path.join(os.tmpdir(), "cv-chat-"));
    await start(new FakeAi({ reply: "ok", operations: [] }));
    await app.inject({ method: "PUT", url: "/api/vault", payload: file });
  });
  afterEach(async () => {
    await app.close();
    await rm(dir, { recursive: true, force: true });
  });

  it("answers with reply, operations and warnings", async () => {
    const response = await app.inject({
      method: "POST",
      url: "/api/ai/chat",
      payload: baseRequest,
    });
    expect(response.statusCode).toBe(200);
    expect(response.json()).toMatchObject({
      reply: "ok",
      operations: [],
      warnings: [],
    });
  });

  it("refuses an empty or very long message, and a malformed body", async () => {
    for (const message of ["   ", "x".repeat(2001)]) {
      const r = await app.inject({
        method: "POST",
        url: "/api/ai/chat",
        payload: { ...baseRequest, message },
      });
      expect(r.statusCode).toBe(400);
    }
    const bad = await app.inject({
      method: "POST",
      url: "/api/ai/chat",
      payload: { message: "x" },
    });
    expect(bad.statusCode).toBe(400);
  });

  it("answers 503 without AI", async () => {
    await start(undefined);
    const r = await app.inject({
      method: "POST",
      url: "/api/ai/chat",
      payload: baseRequest,
    });
    expect(r.statusCode).toBe(503);
  });
});
