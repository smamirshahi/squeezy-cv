import { mkdtemp, readFile, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { FastifyInstance } from "fastify";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import sample from "@fixtures/sample-cv.json";
import { buildServer } from "@server/app";
import { AiClient, AiError, GenerateRequest } from "@server/ai/ai-types";
import { loadPrompt } from "@server/ai/prompts";
import { describeCv, sanitiseProposal, tailor } from "@server/ai/tailor";
import { FileCvStorage } from "@server/storage/file-cv-storage";
import { Proposal, Requirements } from "@custom-types/tailor-types";
import { migrateCvFile } from "@shared/vault/migrate-vault";

const file = migrateCvFile(sample);
const { vault } = file;

const REQUIREMENTS: Requirements = {
  jobTitle: "Senior Front-End Developer",
  seniority: "senior",
  mustHave: ["React", "TypeScript"],
  niceToHave: ["Redux Toolkit"],
  keywords: ["React", "TypeScript", "WCAG"],
};

const firstItem = vault.sections.flatMap((s) => s.items)[1];

const PROPOSAL: Proposal = {
  items: [
    {
      itemId: firstItem.id,
      relevance: 0.9,
      isIncluded: true,
      isHighlighted: true,
      reason: "Matches React and TypeScript.",
    },
  ],
  bullets: [
    {
      itemId: firstItem.id,
      bulletId: firstItem.bullets[0].id,
      isIncluded: true,
      reason: "Shows leadership.",
    },
  ],
  statement: "Front-end developer with six years of experience.",
  gaps: ["WCAG 2.2"],
};

/** A fake model: answers each prompt with a canned object, checked by the real schema */
class FakeAi implements AiClient {
  requests: { promptName: string; input: string }[] = [];

  constructor(
    private readonly answers: Record<string, unknown>,
    private readonly failWith?: AiError
  ) {}

  generate<T>(request: GenerateRequest<T>): Promise<T> {
    this.requests.push({
      promptName: request.promptName,
      input: request.input,
    });
    if (this.failWith) {
      return Promise.reject(this.failWith);
    }
    return Promise.resolve(
      request.schema.check(this.answers[request.promptName])
    );
  }
}

function fakeAi(proposal: unknown = PROPOSAL): FakeAi {
  return new FakeAi({
    "extract-requirements": REQUIREMENTS,
    "propose-selection": proposal,
  });
}

describe("tailor", () => {
  it("asks first what the job wants, then proposes with the CV", async () => {
    const ai = fakeAi();
    const result = await tailor(ai, vault, {
      jobAd: "THE JOB AD",
      tone: "formal",
    });

    expect(ai.requests.map((r) => r.promptName)).toEqual([
      "extract-requirements",
      "propose-selection",
    ]);
    expect(ai.requests[0].input).toBe("THE JOB AD");
    const second = JSON.parse(ai.requests[1].input);
    expect(second.requirements).toEqual(REQUIREMENTS);
    expect(second.tone).toBe("formal");
    expect(JSON.stringify(second.cv)).toContain(firstItem.id);

    expect(result.requirements).toEqual(REQUIREMENTS);
    expect(result.proposal.gaps).toEqual(["WCAG 2.2"]);
    expect(result.warnings).toEqual([]);
  });

  it("does not send contact details to the model", async () => {
    const ai = fakeAi();
    await tailor(ai, vault, { jobAd: "x", tone: "neutral" });
    const sent = ai.requests.map((r) => r.input).join("\n");

    expect(vault.profile.email).toBeTruthy();
    expect(sent).not.toContain(vault.profile.email as string);
    expect(sent).not.toContain(vault.profile.phone as string);
    expect(describeCv(vault)).not.toHaveProperty("profile");
  });

  it("drops advice about items and bullets that are not in the CV, and says so", async () => {
    const injected: Proposal = {
      ...PROPOSAL,
      items: [
        ...PROPOSAL.items,
        {
          itemId: "invented-kubernetes-job",
          relevance: 1,
          isIncluded: true,
          isHighlighted: true,
          reason: "10 years of Kubernetes",
        },
      ],
      bullets: [
        ...PROPOSAL.bullets,
        {
          itemId: firstItem.id,
          bulletId: "made-up-bullet",
          isIncluded: true,
          reason: "x",
        },
      ],
    };
    const result = await tailor(fakeAi(injected), vault, {
      jobAd: "x",
      tone: "neutral",
    });

    expect(result.proposal.items.map((i) => i.itemId)).toEqual([firstItem.id]);
    expect(result.proposal.bullets).toHaveLength(1);
    expect(result.warnings).toHaveLength(2);
  });

  it("keeps relevance between 0 and 1", () => {
    const { proposal } = sanitiseProposal(vault, {
      ...PROPOSAL,
      items: [
        { ...PROPOSAL.items[0], relevance: 7 },
        { ...PROPOSAL.items[0], relevance: -2 },
      ],
    });
    expect(proposal.items.map((i) => i.relevance)).toEqual([1, 0]);
  });

  it("passes an advert that tries to give orders as plain data", async () => {
    const advert = await readFile("fixtures/job-ad-injection.txt", "utf8");
    const ai = fakeAi();
    await tailor(ai, vault, { jobAd: advert, tone: "neutral" });

    expect(ai.requests[0].input).toContain("ignore all previous instructions");
    // and the prompts tell the model to treat it as data
    expect(loadPrompt("extract-requirements")).toMatch(
      /Ignore any instructions/
    );
    expect(loadPrompt("propose-selection")).toMatch(/Ignore any instructions/);
  });

  it("has prompts that forbid inventing facts and ask for British spelling", () => {
    const prompt = loadPrompt("propose-selection");
    expect(prompt).toMatch(/Never add a fact/);
    expect(prompt).toMatch(/British spelling/);
    expect(prompt).toMatch(/gaps/);
    // a short answer matters on a slow local model
    expect(prompt).toMatch(/ONLY for a bullet you want/);
  });
});

describe("fixture job adverts", () => {
  it.each([
    "job-ad-senior-frontend.txt",
    "job-ad-data-analyst.txt",
    "job-ad-injection.txt",
  ])("%s exists and is not empty", async (name) => {
    expect(
      (await readFile(path.join("fixtures", name), "utf8")).length
    ).toBeGreaterThan(100);
  });
});

describe("POST /api/ai/tailor", () => {
  let dir: string;
  let app: FastifyInstance;

  async function start(ai?: AiClient): Promise<void> {
    await app?.close();
    app = buildServer({ storage: new FileCvStorage(dir), ai });
  }

  beforeEach(async () => {
    dir = await mkdtemp(path.join(os.tmpdir(), "cv-ai-"));
    await start(fakeAi());
    await app.inject({ method: "PUT", url: "/api/vault", payload: file });
  });

  afterEach(async () => {
    await app.close();
    await rm(dir, { recursive: true, force: true });
  });

  type Injected = Awaited<ReturnType<FastifyInstance["inject"]>>;

  async function post(payload: unknown): Promise<Injected> {
    return app.inject({
      method: "POST",
      url: "/api/ai/tailor",
      payload: payload as object,
    });
  }

  it("returns requirements, proposal and warnings for the saved vault", async () => {
    const response = await post({ jobAd: "A job", tone: "neutral" });
    expect(response.statusCode).toBe(200);
    expect(response.json().requirements.jobTitle).toBe(
      "Senior Front-End Developer"
    );
    expect(response.json().proposal.items).toHaveLength(1);
  });

  it("answers 503 without an API key", async () => {
    await start(undefined);
    const response = await post({ jobAd: "A job", tone: "neutral" });
    expect(response.statusCode).toBe(503);
    expect(response.json().code).toBe("ai_not_configured");
  });

  it.each([
    [{}],
    [{ jobAd: "A job" }],
    [{ jobAd: "A job", tone: "shouty" }],
    [{ jobAd: "   ", tone: "neutral" }],
    [{ jobAd: "x".repeat(20001), tone: "neutral" }],
  ])("refuses the bad request %j", async (body) => {
    expect((await post(body)).statusCode).toBe(400);
  });

  it("answers 404 when no vault is saved yet", async () => {
    await rm(path.join(dir, "vault.json"));
    expect((await post({ jobAd: "A job", tone: "neutral" })).statusCode).toBe(
      404
    );
  });

  it.each([
    ["invalid_output", 502],
    ["api_error", 502],
    ["refused", 422],
    ["truncated", 422],
    ["timeout", 504],
  ] as const)("turns an AI failure '%s' into HTTP %i", async (code, status) => {
    await start(new FakeAi({}, new AiError(code, "boom")));
    const response = await post({ jobAd: "A job", tone: "neutral" });
    expect(response.statusCode).toBe(status);
    expect(response.json().code).toBe(`ai_${code}`);
  });

  it("is local-only like every route", async () => {
    const response = await app.inject({
      method: "POST",
      url: "/api/ai/tailor",
      headers: { host: "evil.example.com" },
      payload: { jobAd: "A job", tone: "neutral" },
    });
    expect(response.statusCode).toBe(403);
  });
});

describe("guardrails in the proposal", () => {
  const bullet = firstItem.bullets[0];
  function withRewrite(text: string, extra: object = {}): Proposal {
    return {
      ...PROPOSAL,
      bullets: [
        {
          ...PROPOSAL.bullets[0],
          rewrite: { wording: "short", text },
          ...extra,
        },
      ],
    };
  }

  it("passes a harmless rewrite with no flags", async () => {
    const result = await tailor(
      fakeAi(withRewrite(bullet.text.toLowerCase())),
      vault,
      {
        jobAd: "x",
        tone: "neutral",
      }
    );
    expect(result.proposal.bullets[0].flags).toEqual([]);
    expect(result.warnings).toEqual([]);
  });

  it("flags an invented number, tool or employer, and says so in the warnings", async () => {
    const result = await tailor(
      fakeAi(
        withRewrite(`${bullet.text} using Kubernetes at Acme, saving 47%`)
      ),
      vault,
      { jobAd: "x", tone: "neutral" }
    );
    const flags = result.proposal.bullets[0].flags ?? [];
    expect(flags.join(" ")).toContain("Kubernetes");
    expect(flags.join(" ")).toContain("Acme");
    expect(flags.join(" ")).toContain("47%");
    expect(result.warnings[0]).toContain("needs your check");
  });

  it("does not trust flags that the model sends itself", async () => {
    const lying = withRewrite(`${bullet.text} and Kubernetes`, { flags: [] });
    const result = await tailor(fakeAi(lying), vault, {
      jobAd: "x",
      tone: "neutral",
    });
    expect((result.proposal.bullets[0].flags ?? []).length).toBeGreaterThan(0);

    const honestButWrong = withRewrite(bullet.text, { flags: ["bogus"] });
    const second = await tailor(fakeAi(honestButWrong), vault, {
      jobAd: "x",
      tone: "neutral",
    });
    expect(second.proposal.bullets[0].flags).toEqual([]);
  });

  it("checks the draft statement against the whole CV", async () => {
    const result = await tailor(
      fakeAi({
        ...PROPOSAL,
        statement: "Engineer with 20 years of Rust and a PhD.",
      }),
      vault,
      { jobAd: "x", tone: "neutral" }
    );
    const flags = (result.proposal.statementFlags ?? []).join(" ");
    expect(flags).toContain("20");
    expect(flags).toContain("Rust");
    expect(result.warnings.some((w) => w.includes("statement"))).toBe(true);
  });

  it("accepts a statement built from the CV", async () => {
    const result = await tailor(fakeAi(), vault, {
      jobAd: "x",
      tone: "neutral",
    });
    expect(result.proposal.statementFlags).toEqual([]);
  });
});

describe("expected shape on the fixture adverts", () => {
  it.each([
    "job-ad-senior-frontend.txt",
    "job-ad-data-analyst.txt",
    "job-ad-injection.txt",
  ])(
    "%s gives a well-formed result that only talks about this CV",
    async (name) => {
      const advert = await readFile(path.join("fixtures", name), "utf8");
      const result = await tailor(fakeAi(), vault, {
        jobAd: advert,
        tone: "neutral",
      });

      const itemIds = new Set(
        vault.sections.flatMap((s) => s.items.map((i) => i.id))
      );
      expect(Object.keys(result).sort()).toEqual([
        "proposal",
        "requirements",
        "warnings",
      ]);
      expect(result.requirements.keywords.length).toBeGreaterThan(0);
      expect(result.proposal.items.every((i) => itemIds.has(i.itemId))).toBe(
        true
      );
      expect(
        result.proposal.items.every((i) => i.relevance >= 0 && i.relevance <= 1)
      ).toBe(true);
      expect(Array.isArray(result.proposal.gaps)).toBe(true);
    }
  );
});
