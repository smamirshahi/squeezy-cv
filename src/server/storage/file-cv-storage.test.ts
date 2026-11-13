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
import sample from "@fixtures/sample-cv.json";
import { CURRENT_VAULT_VERSION } from "@custom-types/vault-types";
import { migrateCvFile } from "@shared/vault/migrate-vault";
import { createVariant } from "@shared/variant/variant-utils";
import { FileCvStorage } from "@server/storage/file-cv-storage";
import { StorageError } from "@shared/storage/cv-storage";
import { KeyedQueue } from "@server/storage/file-utils";

function makeVariant(
  id: string,
  name: string
): ReturnType<typeof createVariant> {
  const file = migrateCvFile(sample);
  return createVariant(file.vault, file.style, id, name);
}

let dir: string;
let storage: FileCvStorage;

beforeEach(async () => {
  dir = await mkdtemp(path.join(os.tmpdir(), "cv-storage-"));
  storage = new FileCvStorage(dir);
});

afterEach(async () => {
  await rm(dir, { recursive: true, force: true });
});

async function expectCode(
  promise: Promise<unknown>,
  code: string
): Promise<void> {
  const error = await promise.then(
    () => undefined,
    (e: unknown) => e
  );
  expect(error).toBeInstanceOf(StorageError);
  expect((error as StorageError).code).toBe(code);
}

function vaultWithName(name: string): ReturnType<typeof migrateCvFile> {
  const file = migrateCvFile(sample);
  return {
    ...file,
    vault: {
      ...file.vault,
      profile: { ...file.vault.profile, fullName: name },
    },
  };
}

describe("vault", () => {
  it("reports that nothing was saved yet", async () => {
    await expectCode(storage.loadVault(), "not_found");
  });

  it("saves and loads a CV unchanged", async () => {
    const file = migrateCvFile(sample);
    await storage.saveVault(file);
    expect(await storage.loadVault()).toEqual(file);
  });

  it("creates the data folder if it does not exist", async () => {
    const nested = new FileCvStorage(path.join(dir, "a", "b"));
    await nested.saveVault(migrateCvFile(sample));
    expect((await nested.loadVault()).vault.profile.fullName).toBe("Jane Doe");
  });

  it("leaves no temporary files behind", async () => {
    await storage.saveVault(vaultWithName("One"));
    await storage.saveVault(vaultWithName("Two"));
    const names = await readdir(dir);
    expect(names.filter((n) => n.endsWith(".tmp"))).toEqual([]);
  });

  it("keeps the previous version as a backup", async () => {
    await storage.saveVault(vaultWithName("First"));
    await storage.saveVault(vaultWithName("Second"));
    const backup = JSON.parse(
      await readFile(path.join(dir, "vault.json.bak"), "utf8")
    );
    expect(backup.vault.profile.fullName).toBe("First");
    expect((await storage.loadVault()).vault.profile.fullName).toBe("Second");
  });

  it("reads files written before the vault existed", async () => {
    await writeFile(path.join(dir, "vault.json"), JSON.stringify(sample));
    expect((await storage.loadVault()).vault.version).toBe(
      CURRENT_VAULT_VERSION
    );
  });

  it("reports a file that is not JSON as corrupt and leaves it untouched", async () => {
    const file = path.join(dir, "vault.json");
    await writeFile(file, "{ not json");
    await expectCode(storage.loadVault(), "corrupt");
    expect(await readFile(file, "utf8")).toBe("{ not json");
  });

  it("reports a file that is JSON but not a CV as corrupt and leaves it untouched", async () => {
    const file = path.join(dir, "vault.json");
    await writeFile(file, '{"hello":"world"}');
    await expectCode(storage.loadVault(), "corrupt");
    expect(await readFile(file, "utf8")).toBe('{"hello":"world"}');
  });

  it("reports a file from a newer app version as corrupt without touching it", async () => {
    const newer = migrateCvFile(sample);
    newer.vault.version = 99;
    const file = path.join(dir, "vault.json");
    await writeFile(file, JSON.stringify(newer));
    await expectCode(storage.loadVault(), "corrupt");
    expect(JSON.parse(await readFile(file, "utf8")).vault.version).toBe(99);
  });

  it("moves an unreadable file aside when saving, and keeps the last good backup", async () => {
    await storage.saveVault(vaultWithName("Good"));
    // the backup now holds "Good"
    await storage.saveVault(vaultWithName("Good 2"));
    await writeFile(path.join(dir, "vault.json"), "garbage");

    await storage.saveVault(vaultWithName("After"));

    const names = await readdir(dir);
    const aside = names.find((n) => n.startsWith("vault.json.corrupt-"));
    expect(aside).toBeTruthy();
    expect(await readFile(path.join(dir, aside!), "utf8")).toBe("garbage");
    const backup = JSON.parse(
      await readFile(path.join(dir, "vault.json.bak"), "utf8")
    );
    expect(backup.vault.profile.fullName).toBe("Good");
    expect((await storage.loadVault()).vault.profile.fullName).toBe("After");
  });

  it("keeps all writes whole when many happen at once", async () => {
    await Promise.all(
      Array.from({ length: 20 }, (_unused, i) =>
        storage.saveVault(vaultWithName(`Name ${i}`))
      )
    );
    const loaded = await storage.loadVault();
    expect(loaded.vault.profile.fullName).toMatch(/^Name \d+$/);
    expect((await readdir(dir)).filter((n) => n.endsWith(".tmp"))).toEqual([]);
  });
});

describe("old variant files", () => {
  const variant = makeVariant("acme-react", "Acme - Senior React Dev");

  async function writeVariantFile(id: string, text: string): Promise<void> {
    await mkdir(path.join(dir, "variants"), { recursive: true });
    await writeFile(path.join(dir, "variants", `${id}.json`), text);
  }

  it("starts with no templates or jobs", async () => {
    expect(await storage.listJobs()).toEqual([]);
    expect(await storage.listTemplates()).toEqual([]);
  });

  it("skips a broken variant file and leaves it as it is", async () => {
    await writeVariantFile("acme-react", JSON.stringify(variant));
    await writeVariantFile("broken", "{{{");
    await writeVariantFile(
      "wrong-id",
      JSON.stringify({ id: "other", version: 1, name: "X" })
    );
    expect((await storage.listJobs()).map((j) => j.id)).toEqual(["acme-react"]);
    expect(
      await readFile(path.join(dir, "variants", "broken.json"), "utf8")
    ).toBe("{{{");
  });

  it("ignores files that are not variants", async () => {
    await mkdir(path.join(dir, "variants"), { recursive: true });
    await writeFile(path.join(dir, "variants", "notes.txt"), "hi");
    await writeFile(path.join(dir, "variants", "x.json.bak"), "{}");
    expect(await storage.listJobs()).toEqual([]);
  });

  it("never reads a variant file with an unsafe name", async () => {
    await writeVariantFile("a.b", JSON.stringify(variant));
    expect(await storage.listJobs()).toEqual([]);
  });
});

describe("KeyedQueue", () => {
  it("runs tasks of one key in order, even when an earlier one fails", async () => {
    const queue = new KeyedQueue();
    const log: string[] = [];
    const slow = queue.run("k", async () => {
      await new Promise((resolve) => setTimeout(resolve, 20));
      log.push("slow");
      throw new Error("boom");
    });
    const fast = queue.run("k", () => {
      log.push("fast");
      return Promise.resolve("done");
    });
    await expect(slow).rejects.toThrow("boom");
    await expect(fast).resolves.toBe("done");
    expect(log).toEqual(["slow", "fast"]);
  });

  it("does not make different keys wait for each other", async () => {
    const queue = new KeyedQueue();
    const log: string[] = [];
    const a = queue.run("a", async () => {
      await new Promise((resolve) => setTimeout(resolve, 30));
      log.push("a");
    });
    const b = queue.run("b", () => {
      log.push("b");
      return Promise.resolve();
    });
    await Promise.all([a, b]);
    expect(log).toEqual(["b", "a"]);
  });
});
