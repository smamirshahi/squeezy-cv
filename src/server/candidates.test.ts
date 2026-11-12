import { mkdtemp, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { FastifyInstance } from "fastify";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { buildServer } from "@server/app";
import { FileCvStorage } from "@server/storage/file-cv-storage";

let dir: string;
let app: FastifyInstance;

beforeEach(async () => {
  dir = await mkdtemp(path.join(os.tmpdir(), "cv-candidate-routes-"));
  app = buildServer({
    storage: new FileCvStorage(dir),
    now: () => new Date(2026, 10, 12),
  });
});

afterEach(async () => {
  await app.close();
  await rm(dir, { recursive: true, force: true });
});

async function create(payload: object): Promise<{ id: string }> {
  const response = await app.inject({
    method: "POST",
    url: "/api/candidates",
    payload,
  });
  expect(response.statusCode).toBe(200);
  return response.json();
}

describe("candidate routes", () => {
  it("creates, lists, updates and deletes", async () => {
    const created = await create({
      company: "Acme",
      role: "Dev",
      applyBy: "2026-11-20",
    });
    expect(created).toMatchObject({
      status: "open",
      createdAt: "2026-11-12",
    });

    const list = await app.inject({ method: "GET", url: "/api/candidates" });
    expect(list.json()).toHaveLength(1);

    const patched = await app.inject({
      method: "PATCH",
      url: `/api/candidates/${created.id}`,
      payload: { status: "dropped" },
    });
    expect(patched.json().status).toBe("dropped");

    const removed = await app.inject({
      method: "DELETE",
      url: `/api/candidates/${created.id}`,
    });
    expect(removed.statusCode).toBe(200);
    const after = await app.inject({ method: "GET", url: "/api/candidates" });
    expect(after.json()).toEqual([]);
  });

  it("rejects an empty candidate and a bad day with a readable error", async () => {
    const empty = await app.inject({
      method: "POST",
      url: "/api/candidates",
      payload: { company: "", role: "" },
    });
    expect(empty.statusCode).toBe(400);
    const badDay = await app.inject({
      method: "POST",
      url: "/api/candidates",
      payload: { company: "A", role: "B", applyBy: "soon" },
    });
    expect(badDay.statusCode).toBe(400);
  });

  it("answers 404 for a candidate that does not exist", async () => {
    const response = await app.inject({
      method: "PATCH",
      url: "/api/candidates/nope",
      payload: { status: "dropped" },
    });
    expect(response.statusCode).toBe(404);
  });
});
