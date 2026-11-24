import { describe, expect, it } from "vitest";
import { AiClient, GenerateRequest } from "@server/ai/ai-types";
import {
  extractJobFields,
  extractJobFromLink,
} from "@server/ai/extract-job-fields";
import sample from "@fixtures/sample-cv.json";
import { migrateCvFile } from "@shared/vault/migrate-vault";

const ANSWER = {
  company: " JUXT ",
  role: "Front End Developer ",
  location: "London Area, United Kingdom",
  advert: "About the job\n- Build React apps",
  workMode: "hybrid",
  employmentType: "permanent",
};

class FakeAi implements AiClient {
  request?: { promptName: string; input: string };
  generate<T>(request: GenerateRequest<T>): Promise<T> {
    this.request = {
      promptName: request.promptName,
      input: request.input,
    };
    return Promise.resolve(request.schema.check(ANSWER));
  }
}

describe("extractJobFields", () => {
  it("sends the pasted text with its own prompt, trims, and drops values the app does not know", async () => {
    const ai = new FakeAi();
    const { vault } = migrateCvFile(sample);
    const fields = await extractJobFields(ai, vault, "page text");
    expect(ai.request).toEqual({
      promptName: "extract-job-fields",
      input: "page text",
    });
    expect(fields).toEqual({
      company: "JUXT",
      role: "Front End Developer",
      location: "London Area, United Kingdom",
      advert: "About the job\n- Build React apps",
      workMode: "hybrid",
      employmentType: "",
    });
  });
});

describe("extractJobFromLink", () => {
  it("sends only the link", async () => {
    const ai = new FakeAi();
    await extractJobFromLink(ai, "https://example.com/jobs/1");
    expect(ai.request).toEqual({
      promptName: "extract-job-link",
      input: "https://example.com/jobs/1",
    });
  });
});
