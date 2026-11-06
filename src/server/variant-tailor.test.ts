import { mkdtemp, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { FastifyInstance } from "fastify";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import sample from "@fixtures/sample-cv.json";
import { createVariant } from "@shared/variant/variant-utils";
import { migrateCvFile } from "@shared/vault/migrate-vault";
import { buildServer } from "@server/app";
import { FileCvStorage } from "@server/storage/file-cv-storage";

const file = migrateCvFile(sample);
let dir: string;
let app: FastifyInstance;

beforeEach(async () => {
  dir = await mkdtemp(path.join(os.tmpdir(), "cv-tailor-record-"));
  app = buildServer({ storage: new FileCvStorage(dir) });
});

afterEach(async () => {
  await app.close();
  await rm(dir, { recursive: true, force: true });
});

describe("a variant made by tailoring", () => {
  const variant = {
    ...createVariant(file.vault, file.style, "t", "Tailored"),
    tailor: {
      at: "2026-11-06",
      jobTitle: "Dev",
      requirements: {
        jobTitle: "Dev",
        seniority: "",
        mustHave: ["React"],
        niceToHave: [],
        keywords: [],
      },
      gaps: ["GraphQL"],
      acceptedFlagged: [],
    },
  };

  it("keeps its tailor record through a save and a load", async () => {
    const put = await app.inject({
      method: "PUT",
      url: "/api/variants/t",
      payload: variant,
    });
    expect(put.statusCode).toBe(200);
    const got = await app.inject({ method: "GET", url: "/api/variants/t" });
    expect(got.json().tailor).toEqual(variant.tailor);
  });

  it("refuses a malformed record", async () => {
    const put = await app.inject({
      method: "PUT",
      url: "/api/variants/t",
      payload: { ...variant, tailor: { at: 5 } },
    });
    expect(put.statusCode).toBe(400);
  });
});
