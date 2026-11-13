import { mkdtemp, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { FastifyInstance } from "fastify";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { buildServer } from "@server/app";
import {
  FeedbackSendError,
  FeedbackSender,
} from "@server/feedback/github-feedback";
import { FileCvStorage } from "@server/storage/file-cv-storage";
import { FeedbackIssue } from "@shared/feedback/feedback-issue";

let dir: string;
let app: FastifyInstance;
let created: FeedbackIssue[];
let sender: FeedbackSender;

beforeEach(async () => {
  dir = await mkdtemp(path.join(os.tmpdir(), "cv-feedback-"));
  created = [];
  sender = {
    create: (issue) => {
      created.push(issue);
      return Promise.resolve({ number: 7, url: "https://github.com/x/y/7" });
    },
  };
  app = buildServer({ storage: new FileCvStorage(dir), feedback: sender });
});

afterEach(async () => {
  await app.close();
  await rm(dir, { recursive: true, force: true });
});

async function send(
  target: FastifyInstance,
  payload: unknown
): Promise<{
  statusCode: number;
  body: string;
  json: () => Record<string, unknown>;
}> {
  return await target.inject({
    method: "POST",
    url: "/api/feedback",
    payload: payload as object,
  });
}

describe("POST /api/feedback", () => {
  it("creates the issue and answers with its number and link", async () => {
    const response = await send(app, {
      kind: "bug",
      note: "  Save does nothing  ",
      appInfo: "CV Builder 0.7.0 · Chrome 157 on macOS · jobs page",
    });
    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({
      number: 7,
      url: "https://github.com/x/y/7",
    });
    expect(created).toHaveLength(1);
    expect(created[0].title).toBe("[Bug] Save does nothing");
    expect(created[0].labels).toEqual(["customer-created", "bug"]);
    expect(created[0].body).toContain("**App info:** CV Builder 0.7.0");
  });

  it("keeps the mood of feedback", async () => {
    await send(app, { kind: "feedback", mood: "happy", note: "Nice" });
    expect(created[0].labels).toEqual(["customer-created", "feedback"]);
    expect(created[0].body).toContain("**Mood:** Happy");
  });

  it.each([
    ["an unknown kind", { kind: "praise", note: "Hi" }],
    ["an unknown mood", { kind: "feedback", mood: "angry", note: "Hi" }],
    ["no note", { kind: "bug" }],
    ["a note that is not text", { kind: "bug", note: 5 }],
    ["a blank note", { kind: "bug", note: "   " }],
    ["a note that is too long", { kind: "bug", note: "x".repeat(4001) }],
    [
      "app info that is too long",
      { kind: "bug", note: "Broken", appInfo: "x".repeat(501) },
    ],
  ])("refuses %s and creates nothing", async (_name, payload) => {
    const response = await send(app, payload);
    expect(response.statusCode).toBe(400);
    expect(created).toHaveLength(0);
  });

  it("answers 503 when sending is not set up", async () => {
    const bare = buildServer({ storage: new FileCvStorage(dir) });
    const response = await send(bare, { kind: "bug", note: "Broken" });
    await bare.close();
    expect(response.statusCode).toBe(503);
    expect(response.json().code).toBe("feedback_unavailable");
  });

  it("answers 502 with the reason when GitHub fails", async () => {
    const failing = buildServer({
      storage: new FileCvStorage(dir),
      feedback: {
        create: () => Promise.reject(new FeedbackSendError("GitHub is down.")),
      },
    });
    const response = await send(failing, { kind: "bug", note: "Broken" });
    await failing.close();
    expect(response.statusCode).toBe(502);
    expect(response.json()).toEqual({
      code: "feedback_failed",
      message: "GitHub is down.",
    });
  });

  it("answers 500 without details for an unexpected error", async () => {
    const broken = buildServer({
      storage: new FileCvStorage(dir),
      feedback: { create: () => Promise.reject(new Error("token abc")) },
    });
    const response = await send(broken, { kind: "bug", note: "Broken" });
    await broken.close();
    expect(response.statusCode).toBe(500);
    expect(response.body).not.toContain("token abc");
  });
});
