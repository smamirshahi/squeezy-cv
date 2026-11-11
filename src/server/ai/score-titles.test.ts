import { describe, expect, it } from "vitest";
import { buildServer } from "@server/app";
import { AiClient, GenerateRequest } from "@server/ai/ai-types";
import { scoreJobTitles } from "@server/ai/analyse-job-ad";
import { Requirements } from "@custom-types/requirements-types";
import { Vault } from "@custom-types/vault-types";
import { createDefaultVault } from "@shared/vault/default-vault";
import { JOB_TITLES_SECTION } from "@shared/vault/job-titles";

const requirements: Requirements = {
  jobTitle: "Frontend Developer",
  seniority: "senior",
  mustHave: ["React"],
  niceToHave: [],
  keywords: ["React"],
};

function vaultWithTitles(): Vault {
  const vault = createDefaultVault();
  return {
    ...vault,
    profile: {
      ...vault.profile,
      fullName: "Jane Doe",
      headline: "Software Developer",
      headlineOptions: ["Frontend Developer", "Designer"],
    },
  };
}

/** A model that records what it was asked and answers with the given scores */
function fakeAi(answer: unknown): { ai: AiClient; inputs: string[] } {
  const inputs: string[] = [];
  const ai: AiClient = {
    generate<T>(request: GenerateRequest<T>): Promise<T> {
      inputs.push(request.input);
      return Promise.resolve(request.schema.check(answer));
    },
  };
  return { ai, inputs };
}

describe("scoreJobTitles", () => {
  it("scores each title as one entry and returns the title text as the id", async () => {
    const { ai, inputs } = fakeAi({
      scores: [
        { id: "i1", relevance: 55, reason: "Broad title" },
        { id: "i2", relevance: 95, reason: "Exact match" },
        { id: "i3", relevance: 130.4, reason: "Clamped" },
      ],
    });
    const result = await scoreJobTitles(ai, vaultWithTitles(), requirements);
    expect(result.scores.map((s) => [s.itemId, s.relevance])).toEqual([
      ["Software Developer", 55],
      ["Frontend Developer", 95],
      ["Designer", 100],
    ]);
    expect(result.scores.every((s) => s.bullets.length === 0)).toBe(true);
    const sent = JSON.parse(inputs[0]);
    expect(sent.items.map((i: { section: string }) => i.section)).toEqual([
      "Job titles",
      "Job titles",
      "Job titles",
    ]);
    // the profile is never part of what is sent
    expect(inputs[0]).not.toContain("Jane Doe");
  });

  it("drops unknown or repeated ids and warns about a title with no score", async () => {
    const { ai } = fakeAi({
      scores: [
        { id: "i1", relevance: 50 },
        { id: "i1", relevance: 80 },
        { id: "i9", relevance: 80 },
      ],
    });
    const result = await scoreJobTitles(ai, vaultWithTitles(), requirements);
    expect(result.scores).toHaveLength(1);
    expect(result.scores[0].relevance).toBe(50);
    expect(result.warnings.join(" ")).toMatch(/2 job titles got no score/);
  });

  it("asks nothing when there are no titles", async () => {
    const { ai, inputs } = fakeAi({ scores: [] });
    const vault = createDefaultVault();
    const result = await scoreJobTitles(ai, vault, requirements);
    expect(result).toEqual({ scores: [], warnings: [] });
    expect(inputs).toHaveLength(0);
  });
});

describe("POST /api/ai/score-section for the job titles", () => {
  it("scores the saved CV's titles instead of a section", async () => {
    const { ai } = fakeAi({
      scores: [{ id: "i2", relevance: 90, reason: "Exact" }],
    });
    const vault = vaultWithTitles();
    const app = buildServer({
      ai,
      aiProvider: "ollama",
      storage: {
        loadVault: () =>
          Promise.resolve({ vault, style: {} as never, metaData: {} as never }),
      } as never,
    });
    const response = await app.inject({
      method: "POST",
      url: "/api/ai/score-section",
      payload: { sectionId: JOB_TITLES_SECTION, requirements },
    });
    expect(response.statusCode).toBe(200);
    expect(response.json().scores[0]).toMatchObject({
      itemId: "Frontend Developer",
      relevance: 90,
    });
  });
});
