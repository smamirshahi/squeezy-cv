import { mkdtemp, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { FastifyInstance } from "fastify";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { buildServer } from "@server/app";
import { AiClient, GenerateRequest } from "@server/ai/ai-types";
import { pickHide } from "@server/ai/pick-hide";
import { FileCvStorage } from "@server/storage/file-cv-storage";
import { HideRequest } from "@custom-types/hide-types";

const request: HideRequest = {
  linesOver: 5,
  candidates: [
    {
      itemId: "real-1",
      label: "Intern",
      section: "Experience",
      lines: 3,
      relevance: 10,
    },
    {
      itemId: "real-2",
      label: "Junior Dev",
      section: "Experience",
      lines: 4,
      relevance: 30,
    },
    {
      itemId: "real-3",
      label: "BSc",
      section: "Education",
      lines: 2,
      relevance: 60,
    },
  ],
  jobTitle: "Senior Dev",
  mustHave: ["React"],
};

class FakeAi implements AiClient {
  sent?: string;
  constructor(private readonly answer: unknown) {}
  generate<T>(r: GenerateRequest<T>): Promise<T> {
    this.sent = r.input;
    expect(r.promptName).toBe("pick-hide");
    expect(r.personal).toBeUndefined();
    return Promise.resolve(r.schema.check(this.answer));
  }
}

describe("pickHide", () => {
  it("sends short ids and labels (never the real ids) and maps the answer back", async () => {
    const ai = new FakeAi({
      hide: [
        { id: "c1", reason: "Oldest" },
        { id: "c2", reason: "Unrelated" },
      ],
    });
    const result = await pickHide(ai, request);
    expect(ai.sent).toContain('"id":"c1"');
    expect(ai.sent).not.toContain("real-1");
    expect(ai.sent).toContain("Senior Dev");
    expect(result.suggestions).toEqual([
      { itemId: "real-1", reason: "Oldest" },
      { itemId: "real-2", reason: "Unrelated" },
    ]);
    expect(result.warnings).toEqual([]);
  });

  it("drops unknown and repeated ids, and stops once enough lines are saved", async () => {
    const ai = new FakeAi({
      hide: [
        { id: "c9" },
        { id: "c1" },
        { id: "c1" },
        { id: "c2" },
        { id: "c3" },
      ],
    });
    const result = await pickHide(ai, request);
    expect(result.suggestions.map((s) => s.itemId)).toEqual([
      "real-1",
      "real-2",
    ]);
    expect(result.warnings.join(" ")).toContain("unknown item (c9)");
    expect(result.warnings.join(" ")).toContain("more than is needed");
  });

  it("says when the picks are not enough", async () => {
    const result = await pickHide(
      new FakeAi({ hide: [{ id: "c3" }] }),
      request
    );
    expect(result.warnings).toEqual([
      "Hiding these still leaves about 3 lines over.",
    ]);
  });
});

describe("POST /api/ai/hide", () => {
  let dir: string;
  let app: FastifyInstance;

  beforeEach(async () => {
    dir = await mkdtemp(path.join(os.tmpdir(), "cv-hide-"));
  });
  afterEach(async () => {
    await app.close();
    await rm(dir, { recursive: true, force: true });
  });

  it("answers 503 without AI", async () => {
    app = buildServer({ storage: new FileCvStorage(dir) });
    const response = await app.inject({
      method: "POST",
      url: "/api/ai/hide",
      payload: request,
    });
    expect(response.statusCode).toBe(503);
  });

  it("returns the suggestions, and refuses an empty list", async () => {
    app = buildServer({
      storage: new FileCvStorage(dir),
      ai: new FakeAi({ hide: [{ id: "c1", reason: "r" }, { id: "c2" }] }),
    });
    const ok = await app.inject({
      method: "POST",
      url: "/api/ai/hide",
      payload: request,
    });
    expect(ok.statusCode).toBe(200);
    expect(ok.json().suggestions).toHaveLength(2);
    const empty = await app.inject({
      method: "POST",
      url: "/api/ai/hide",
      payload: { ...request, candidates: [] },
    });
    expect(empty.statusCode).toBe(400);
  });
});
