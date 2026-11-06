import { mkdtemp, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { buildServer } from "@server/app";
import { FileCvStorage } from "@server/storage/file-cv-storage";
import { importCv } from "@server/ai/import-cv";
import { AiClient, GenerateRequest } from "@server/ai/ai-types";
import { RawImport } from "@custom-types/import-types";

const TEXT =
  "Alex Morgan\nalex@example.com\nDeveloper at Acme 2020-2022\nBuilt the API";

const ANSWER: RawImport = {
  profile: { fullName: "Alex Morgan", email: "alex@example.com" },
  links: [],
  sections: [
    {
      type: "experience",
      title: "Experience",
      items: [
        {
          fields: {
            jobTitle: "Developer",
            company: "Acme",
            startDate: "2020",
            endDate: "2022",
          },
          bullets: ["Built the API", "Won an award"],
        },
      ],
    },
  ],
};

class FakeAi implements AiClient {
  request?: { promptName: string; input: string; personal: unknown };
  generate<T>(request: GenerateRequest<T>): Promise<T> {
    this.request = {
      promptName: request.promptName,
      input: request.input,
      personal: request.personal,
    };
    return Promise.resolve(request.schema.check(ANSWER));
  }
}

describe("importCv", () => {
  it("sends the pasted text with the import prompt, and builds a vault from the answer", async () => {
    const ai = new FakeAi();
    const result = await importCv(ai, TEXT);
    expect(ai.request?.promptName).toBe("import-cv");
    expect(ai.request?.input).toBe(TEXT);
    expect(ai.request?.personal).toBeUndefined();
    expect(result.vault.profile.fullName).toBe("Alex Morgan");
    expect(result.vault.sections[0].items[0].fields.startDate).toBe(
      "2020-01-01"
    );
  });

  it("warns about a bullet that is not in the text", async () => {
    const result = await importCv(new FakeAi(), TEXT);
    expect(result.warnings).toEqual([
      "A Experience point is not in the text you pasted: “Won an award”.",
    ]);
  });
});

describe("POST /api/ai/import", () => {
  const dirs: string[] = [];
  afterEach(async () => {
    await Promise.all(dirs.splice(0).map((d) => rm(d, { recursive: true })));
  });

  async function server(
    ai?: AiClient
  ): Promise<ReturnType<typeof buildServer>> {
    const dir = await mkdtemp(path.join(os.tmpdir(), "cv-import-"));
    dirs.push(dir);
    return buildServer({ storage: new FileCvStorage(dir), ai });
  }

  it("returns the vault and warnings", async () => {
    const app = await server(new FakeAi());
    const response = await app.inject({
      method: "POST",
      url: "/api/ai/import",
      payload: { text: TEXT },
    });
    expect(response.statusCode).toBe(200);
    expect(response.json().vault.profile.fullName).toBe("Alex Morgan");
    expect(response.json().warnings).toHaveLength(1);
  });

  it("says AI is not set up (503) and rejects empty text (400)", async () => {
    const off = await server();
    expect(
      (
        await off.inject({
          method: "POST",
          url: "/api/ai/import",
          payload: { text: "x" },
        })
      ).statusCode
    ).toBe(503);
    const on = await server(new FakeAi());
    expect(
      (
        await on.inject({
          method: "POST",
          url: "/api/ai/import",
          payload: { text: "  " },
        })
      ).statusCode
    ).toBe(400);
  });
});
