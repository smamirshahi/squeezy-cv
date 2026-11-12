import {
  mkdtemp,
  readFile,
  readdir,
  rm,
  writeFile,
  mkdir,
} from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { Candidate } from "@custom-types/candidate-types";
import { createCandidate } from "@shared/candidate/candidate-utils";
import { StorageError } from "@server/storage/cv-storage";
import { FileCvStorage } from "@server/storage/file-cv-storage";

let dir: string;
let storage: FileCvStorage;

beforeEach(async () => {
  dir = await mkdtemp(path.join(os.tmpdir(), "cv-candidates-"));
  storage = new FileCvStorage(dir);
});

afterEach(async () => {
  await rm(dir, { recursive: true, force: true });
});

function make(id: string, company = "Acme"): Candidate {
  return createCandidate({ company, role: "Dev" }, id, "2026-11-12");
}

describe("candidates on disk", () => {
  it("lists nothing at first", async () => {
    expect(await storage.listCandidates()).toEqual([]);
  });

  it("saves, loads and lists, with meta in the file but not in the result", async () => {
    await storage.saveCandidate(make("c1"));
    await storage.saveCandidate(make("c2", "Beta"));
    expect((await storage.loadCandidate("c1")).company).toBe("Acme");
    expect((await storage.listCandidates()).map((c) => c.id)).toEqual([
      "c1",
      "c2",
    ]);
    const raw = JSON.parse(
      await readFile(path.join(dir, "candidates", "c1.json"), "utf8")
    );
    expect(raw.meta.kind).toBe("candidate");
    expect("meta" in (await storage.loadCandidate("c1"))).toBe(false);
  });

  it("deletes but keeps a .deleted copy, and says when there is none", async () => {
    await storage.saveCandidate(make("c1"));
    await storage.deleteCandidate("c1");
    expect(await storage.listCandidates()).toEqual([]);
    expect(await readdir(path.join(dir, "candidates"))).toEqual([
      "c1.json.deleted",
    ]);
    await expect(storage.deleteCandidate("c1")).rejects.toMatchObject({
      code: "not_found",
    });
  });

  it("refuses unsafe ids", async () => {
    await expect(storage.loadCandidate("../x")).rejects.toBeInstanceOf(
      StorageError
    );
  });

  it("skips a damaged file in the list and leaves it untouched", async () => {
    await storage.saveCandidate(make("c1"));
    await mkdir(path.join(dir, "candidates"), { recursive: true });
    await writeFile(path.join(dir, "candidates", "bad.json"), "{ nope");
    expect((await storage.listCandidates()).map((c) => c.id)).toEqual(["c1"]);
    expect(
      await readFile(path.join(dir, "candidates", "bad.json"), "utf8")
    ).toBe("{ nope");
  });
});
