import { buildBackup, restoreBackup } from "@shared/backup/full-backup";
import { buildApplicationsExport } from "@server/export/applications-export";
import { APP_VERSION } from "@shared/version";
import { randomBytes } from "node:crypto";
import Fastify, {
  FastifyInstance,
  FastifyReply,
  FastifyRequest,
} from "fastify";
import { ValidationError } from "runtypes";
import {
  ApplicationPatchSchema,
  NewApplicationSchema,
} from "@custom-types/application-types";
import { CvFileSchema } from "@custom-types/vault-types";
import { JobSchema, JOB_ID_PATTERN } from "@custom-types/job-types";
import { TemplateSchema } from "@custom-types/template-types";
import { Variant } from "@custom-types/variant-types";
import { AiClient, AiError } from "@server/ai/ai-types";
import { aiErrorResult, createAiRoutes } from "@server/ai/ai-routes";
import {
  FeedbackRequestSchema,
  MAX_FEEDBACK_APP_INFO_LENGTH,
  MAX_FEEDBACK_NOTE_LENGTH,
} from "@custom-types/feedback-types";
import { buildFeedbackIssue } from "@shared/feedback/feedback-issue";
import {
  FeedbackSendError,
  FeedbackSender,
} from "@server/feedback/github-feedback";
import { extractPdfText, PdfTextError } from "@shared/pdf/extract-pdf-text";
import { AiRegistry } from "@server/ai/ai-registry";
import { AI_USAGE_HEADER } from "@shared/ai/pricing";
import { AiProviderId } from "@shared/ai/providers";
import { MAX_IMPORT_PDF_BYTES } from "@custom-types/import-types";
import {
  CandidateInputError,
  createCandidate,
  updateCandidate,
} from "@shared/candidate/candidate-utils";
import {
  CandidatePatchSchema,
  NewCandidateSchema,
} from "@custom-types/candidate-types";
import {
  ApplicationInputError,
  ApplicationSource,
  createApplication,
  toIsoDay,
  updateApplication,
} from "@shared/application/application-utils";
import { resolveVariant } from "@shared/variant/template-job";
import { BackupService } from "@server/backup/backup-service";
import { PdfRenderer } from "@server/pdf/pdf-renderer";
import {
  CvStorage,
  StorageError,
  StorageErrorCode,
} from "@shared/storage/cv-storage";

/* eslint-disable @typescript-eslint/no-magic-numbers -- 10 MB, written out */
const MAX_BODY_BYTES = 10 * 1024 * 1024;
/** A backup holds every application PDF as text */
const MAX_BACKUP_BYTES = 500 * 1024 * 1024;
/* eslint-enable @typescript-eslint/no-magic-numbers */

const ID_SUFFIX_BYTES = 3;
const PDF_MAGIC = "%PDF";
const HTTP_BAD_REQUEST = 400;
const HTTP_FORBIDDEN = 403;
const HTTP_NOT_FOUND = 404;
const HTTP_PAYLOAD_TOO_LARGE = 413;
const HTTP_UNSUPPORTED_MEDIA = 415;
const HTTP_CONFLICT = 409;
const HTTP_SERVER_ERROR = 500;
const HTTP_NOT_IMPLEMENTED = 501;
const HTTP_BAD_GATEWAY = 502;
const HTTP_UNAVAILABLE = 503;

const LOCAL_HOSTS = ["localhost", "127.0.0.1", "[::1]"];

function statusOf(code: StorageErrorCode): number {
  switch (code) {
    case "not_found":
      return HTTP_NOT_FOUND;
    case "invalid_id":
      return HTTP_BAD_REQUEST;
    case "corrupt":
      return HTTP_SERVER_ERROR;
  }
}

/** True for localhost names with any port, e.g. "localhost:5173" */
function isLocalHost(hostHeader: string | undefined): boolean {
  if (!hostHeader) {
    return false;
  }
  const host = hostHeader.replace(/:\d+$/, "").toLowerCase();
  return LOCAL_HOSTS.includes(host);
}

function isLocalOrigin(origin: string): boolean {
  try {
    return isLocalHost(new URL(origin).host);
  } catch {
    return false;
  }
}

function sendError(
  reply: FastifyReply,
  status: number,
  code: string,
  message: string
): FastifyReply {
  return reply.status(status).send({ code, message });
}

export interface ServerOptions {
  storage: CvStorage;

  /** Makes PDFs. Without it, /api/pdf answers 501. */
  pdf?: PdfRenderer;

  /** The AI client. Without it (no key set), the AI routes answer 503. */
  ai?: AiClient;

  /** Which provider `ai` is, for the page to say where the CV goes */
  aiProvider?: AiProviderId;

  /** Several providers and the user's choice per task. When given, `ai` and `aiProvider` are not used. */
  aiRegistry?: AiRegistry;

  /** The clock, so tests can fix "today" */
  now?: () => Date;

  /** Versions the data folder. Without it, /api/backup says it is off. */
  backup?: BackupService;
  isLoggingEnabled?: boolean;

  /** Creates GitHub issues from feedback. Without it (no token set), /api/feedback answers 503. */
  feedback?: FeedbackSender;
}

/** Builds the API. It does not listen; `main.ts` (or a test) decides how to run it. */
export function buildServer({
  storage,
  pdf,
  ai,
  aiProvider = "claude",
  aiRegistry,
  backup,
  feedback,
  now = () => new Date(),
  isLoggingEnabled = false,
}: ServerOptions): FastifyInstance {
  const registry = aiRegistry ?? AiRegistry.single(ai, aiProvider);

  const app = Fastify({
    logger: isLoggingEnabled,
    bodyLimit: MAX_BODY_BYTES,
  });

  // Only pages served from this machine may talk to the API (guards against other
  // websites and DNS-rebinding tricks reaching a local server)
  app.addHook("onRequest", (request, reply, done) => {
    const origin = request.headers.origin;
    if (
      !isLocalHost(request.headers.host) ||
      (origin !== undefined && !isLocalOrigin(origin))
    ) {
      void sendError(
        reply,
        HTTP_FORBIDDEN,
        "forbidden",
        "Only local access is allowed."
      );
      return;
    }
    done();
  });

  app.setErrorHandler((error, _request, reply) => {
    if (error instanceof StorageError) {
      return sendError(reply, statusOf(error.code), error.code, error.message);
    }
    if (error instanceof AiError) {
      const result = aiErrorResult(error);
      return reply.status(result.status).send(result.body);
    }
    if (error instanceof PdfTextError) {
      return sendError(
        reply,
        error.code === "too_large" ? HTTP_PAYLOAD_TOO_LARGE : HTTP_BAD_REQUEST,
        error.code,
        error.message
      );
    }
    if (
      error instanceof ApplicationInputError ||
      error instanceof CandidateInputError
    ) {
      return sendError(reply, HTTP_BAD_REQUEST, "invalid", error.message);
    }
    if (error instanceof ValidationError) {
      return sendError(reply, HTTP_BAD_REQUEST, "invalid", error.message);
    }
    const status = (error as { statusCode?: number }).statusCode;
    if (status === HTTP_PAYLOAD_TOO_LARGE) {
      return sendError(
        reply,
        status,
        "too_large",
        "The file is too large to import."
      );
    }
    if (status === HTTP_UNSUPPORTED_MEDIA) {
      return sendError(reply, status, "not_pdf", "This file is not a PDF.");
    }
    if (
      typeof status === "number" &&
      status >= HTTP_BAD_REQUEST &&
      status < HTTP_SERVER_ERROR
    ) {
      return sendError(reply, status, "bad_request", (error as Error).message);
    }
    app.log.error(error);
    return sendError(
      reply,
      HTTP_SERVER_ERROR,
      "internal",
      "Something went wrong."
    );
  });

  app.get("/api/health", () => ({ status: "ok", version: APP_VERSION }));

  // A bug, feedback or feature note becomes a GitHub issue. Only the note, the kind and the mood are used.
  app.post("/api/feedback", async (request, reply) => {
    const body = FeedbackRequestSchema.check(request.body);
    const note = body.note.trim();
    if (
      note.length === 0 ||
      note.length > MAX_FEEDBACK_NOTE_LENGTH ||
      (body.appInfo?.length ?? 0) > MAX_FEEDBACK_APP_INFO_LENGTH
    ) {
      return sendError(
        reply,
        HTTP_BAD_REQUEST,
        "invalid",
        `The note must be 1 to ${MAX_FEEDBACK_NOTE_LENGTH} characters.`
      );
    }
    if (!feedback) {
      return sendError(
        reply,
        HTTP_UNAVAILABLE,
        "feedback_unavailable",
        "Sending is not set up on this computer."
      );
    }
    try {
      return await feedback.create(buildFeedbackIssue({ ...body, note }));
    } catch (error) {
      if (error instanceof FeedbackSendError) {
        return sendError(
          reply,
          HTTP_BAD_GATEWAY,
          "feedback_failed",
          error.message
        );
      }
      throw error;
    }
  });

  app.get(
    "/api/backup",
    async () =>
      (await backup?.status()) ?? {
        isEnabled: false,
        hasRemote: false,
        unpushedCommits: 0,
      }
  );

  app.post("/api/backup/push", async (_request, reply) => {
    if (!backup?.isEnabled) {
      return sendError(
        reply,
        HTTP_NOT_IMPLEMENTED,
        "backup_unavailable",
        "The data folder is not a git repository, so there is nothing to push."
      );
    }
    try {
      return await backup.push();
    } catch (error) {
      return sendError(
        reply,
        HTTP_BAD_GATEWAY,
        "backup_failed",
        error instanceof Error ? error.message : "The push failed."
      );
    }
  });

  // The whole dataset as one file (vault, templates, jobs, candidates, applications with PDFs), and
  // the way back in. Records with the same id are replaced.
  app.get("/api/backup/file", async (_request, reply) => {
    const { backup } = await buildBackup(storage, now());
    return reply
      .header("Content-Type", "application/json")
      .header(
        "Content-Disposition",
        `attachment; filename="squeezy-cv-backup-${toIsoDay(now())}.json"`
      )
      .send(JSON.stringify(backup));
  });

  app.post(
    "/api/backup/file",
    { bodyLimit: MAX_BACKUP_BYTES },
    async (request, reply) => {
      try {
        return await restoreBackup(storage, request.body);
      } catch (error) {
        if (error instanceof StorageError) {
          throw error;
        }
        return sendError(
          reply,
          HTTP_BAD_REQUEST,
          "invalid",
          error instanceof Error ? error.message : "The backup cannot be read."
        );
      }
    }
  );

  // The AI routes (status, choice, analyse, score, chat, rewrite, bullets, reword, ats-wording, hide,
  // place) are plain functions shared with the browser version, see `ai/ai-routes.ts`
  const aiRoutes = createAiRoutes({
    registry,
    loadVault: () => storage.loadVault(),
    notConfigured: {
      tailoring:
        "AI is not set up. Set ANTHROPIC_API_KEY, or AI_PROVIDER=ollama, in .env (see .env.example).",
      other:
        "AI is not set up. Set a key (or use Ollama) in .env, see .env.example, then choose it in AI setup.",
    },
  });
  async function sendAi(
    request: FastifyRequest,
    reply: FastifyReply
  ): Promise<FastifyReply> {
    const result = await aiRoutes.handle(
      request.method,
      request.url.split("?")[0],
      request.body,
      { isPreview: request.headers["x-ai-preview"] === "1" }
    );
    if (result?.usage) {
      reply.header(AI_USAGE_HEADER, JSON.stringify(result.usage));
    }
    return reply.status(result?.status ?? HTTP_NOT_FOUND).send(result?.body);
  }
  app.get("/api/ai/status", sendAi);
  app.put("/api/ai/choice", sendAi);
  for (const name of [
    "analyse",
    "score-section",
    "chat",
    "rewrite",
    "bullets",
    "reword",
    "ats-wording",
    "hide",
    "place",
    "job-fields",
    "job-link",
  ]) {
    app.post(`/api/ai/${name}`, sendAi);
  }

  // Reads the text out of an uploaded PDF (in memory; the file is never stored).
  // The text goes back to the browser to be checked and edited before it is sorted.
  app.addContentTypeParser(
    "application/pdf",
    { parseAs: "buffer", bodyLimit: MAX_IMPORT_PDF_BYTES + 1024 },
    (_request, body, done) => done(null, body)
  );
  app.post("/api/import/pdf", async (request) =>
    extractPdfText(
      Buffer.isBuffer(request.body) ? request.body : new Uint8Array()
    )
  );

  // Sorts pasted CV text into a vault (shown for review; nothing is saved here)
  app.post("/api/ai/import", sendAi);

  app.get("/api/vault", () => storage.loadVault());

  app.put("/api/vault", async (request) => {
    await storage.saveVault(CvFileSchema.check(request.body));
    return { status: "saved" };
  });

  app.get("/api/templates", () => storage.listTemplates());

  app.get<{ Params: { id: string } }>("/api/templates/:id", (request) =>
    storage.loadTemplate(request.params.id)
  );

  app.put<{ Params: { id: string } }>(
    "/api/templates/:id",
    async (request, reply) => {
      const template = TemplateSchema.check(request.body);
      if (template.id !== request.params.id) {
        return sendError(
          reply,
          HTTP_BAD_REQUEST,
          "invalid",
          "The id in the body must match the id in the URL."
        );
      }
      await storage.saveTemplate(template);
      return { status: "saved" };
    }
  );

  // A template that a job still uses cannot go: the job would have no look
  app.delete<{ Params: { id: string } }>(
    "/api/templates/:id",
    async (request, reply) => {
      // A template that cannot be read may still be removed (a copy is kept): that is how the
      // "cannot be read" banner is cleared. A missing one is still a 404.
      try {
        await storage.loadTemplate(request.params.id);
      } catch (error) {
        if (!(error instanceof StorageError && error.code === "corrupt")) {
          throw error;
        }
      }
      const jobs = (await storage.listJobs()).filter(
        (job) => job.templateId === request.params.id
      );
      if (jobs.length > 0) {
        return sendError(
          reply,
          HTTP_CONFLICT,
          "in_use",
          `This template is used by ${jobs.length} job(s): ${jobs
            .map((job) => job.name)
            .join(", ")}. Move them to another template first.`
        );
      }
      await storage.deleteTemplate(request.params.id);
      return { status: "deleted" };
    }
  );

  app.get("/api/jobs", () => storage.listJobs());

  app.get<{ Params: { id: string } }>("/api/jobs/:id", (request) =>
    storage.loadJob(request.params.id)
  );

  // The resolved variant: the job drawn with its template: what the print page and the preview draw
  app.get<{ Params: { id: string } }>(
    "/api/jobs/:id/resolved",
    async (request) => {
      const job = await storage.loadJob(request.params.id);
      return resolveVariant(await storage.loadTemplate(job.templateId), job);
    }
  );

  app.put<{ Params: { id: string } }>(
    "/api/jobs/:id",
    async (request, reply) => {
      const job = JobSchema.check(request.body);
      if (job.id !== request.params.id) {
        return sendError(
          reply,
          HTTP_BAD_REQUEST,
          "invalid",
          "The id in the body must match the id in the URL."
        );
      }
      try {
        await storage.loadTemplate(job.templateId);
      } catch (error) {
        if (error instanceof StorageError && error.code !== "invalid_id") {
          return sendError(
            reply,
            HTTP_BAD_REQUEST,
            "invalid",
            `The job's template ${job.templateId} cannot be used: ${error.message}`
          );
        }
        throw error;
      }
      await storage.saveJob(job);
      return { status: "saved" };
    }
  );

  app.delete<{ Params: { id: string } }>("/api/jobs/:id", async (request) => {
    await storage.deleteJob(request.params.id);
    return { status: "deleted" };
  });

  // What an application is made from: a job drawn with its template. Old variant files are
  // already read as jobs by the storage, so their id works here too.
  async function loadSource(
    id: string
  ): Promise<{ variant: Variant; source: ApplicationSource }> {
    const job = await storage.loadJob(id);
    const template = await storage.loadTemplate(job.templateId);
    return {
      variant: resolveVariant(template, job),
      source: {
        jobId: job.id,
        templateId: template.id,
        jobName: job.name,
        templateName: template.name,
      },
    };
  }

  app.get("/api/applications", () => storage.listApplications());

  // Every application with its PDF in one ZIP; damaged ones are listed in index.json
  app.get("/api/applications/export", async (_request, reply) => {
    const result = await buildApplicationsExport(storage, now());
    if (result.exportedCount === 0 && result.problems.length === 0) {
      return sendError(
        reply,
        HTTP_NOT_FOUND,
        "not_found",
        "There are no applications to export."
      );
    }
    return reply
      .header("Content-Type", "application/zip")
      .header(
        "Content-Disposition",
        `attachment; filename="${result.fileName}"`
      )
      .header("X-Export-Problems", String(result.problems.length))
      .send(result.zip);
  });

  app.get<{ Params: { id: string } }>("/api/applications/:id", (request) =>
    storage.loadApplication(request.params.id)
  );

  app.get<{ Params: { id: string } }>(
    "/api/applications/:id/pdf",
    async (request, reply) => {
      const bytes = await storage.loadApplicationPdf(request.params.id);
      return reply
        .header("Content-Type", "application/pdf")
        .header(
          "Content-Disposition",
          `inline; filename="${request.params.id}.pdf"`
        )
        .send(Buffer.from(bytes));
    }
  );

  // Freezes the saved CV (data and PDF) as what was sent. Nothing is stored unless both work.
  app.post("/api/applications", async (request, reply) => {
    const input = NewApplicationSchema.check(request.body);
    if (input.withoutCv) {
      // Applied elsewhere without a CV: only the facts are stored
      const source = input.jobId
        ? (await loadSource(input.jobId).catch(() => undefined))?.source
        : undefined;
      const application = createApplication(
        input,
        undefined,
        undefined,
        toIsoDay(now()),
        randomBytes(ID_SUFFIX_BYTES).toString("hex"),
        source
      );
      await storage.saveApplication(application);
      return application;
    }
    if (!input.jobId) {
      return sendError(
        reply,
        HTTP_BAD_REQUEST,
        "invalid_request",
        "Choose the job whose CV was sent."
      );
    }
    if (!pdf) {
      return sendError(
        reply,
        HTTP_NOT_IMPLEMENTED,
        "pdf_unavailable",
        "PDF export is not set up on this server, so the CV cannot be saved with the application."
      );
    }
    const { vault } = await storage.loadVault();
    const { variant, source } = await loadSource(input.jobId);
    const application = createApplication(
      input,
      vault,
      variant,
      toIsoDay(now()),
      randomBytes(ID_SUFFIX_BYTES).toString("hex"),
      source
    );
    let bytes: Buffer;
    try {
      bytes = await pdf.render(variant.id);
    } catch (error) {
      app.log.error(error);
      const reason = error instanceof Error ? error.message : "unknown error";
      return sendError(
        reply,
        HTTP_SERVER_ERROR,
        "pdf_failed",
        `The PDF could not be made: ${reason}. Is the web app running, and is Chromium installed (pnpm exec playwright install chromium)?`
      );
    }
    await storage.saveApplication(application, bytes);
    return application;
  });

  // The PDF of a CV that was sent outside the app (applied elsewhere): stored next to the facts
  app.put<{ Params: { id: string } }>(
    "/api/applications/:id/pdf",
    async (request, reply) => {
      const bytes = Buffer.isBuffer(request.body) ? request.body : undefined;
      if (
        !bytes ||
        bytes.subarray(0, PDF_MAGIC.length).toString() !== PDF_MAGIC
      ) {
        return sendError(
          reply,
          HTTP_BAD_REQUEST,
          "invalid_pdf",
          "That file is not a PDF."
        );
      }
      const existing = await storage.loadApplication(request.params.id);
      if (existing.submitted) {
        return sendError(
          reply,
          HTTP_CONFLICT,
          "conflict",
          "This application already has the CV that was sent."
        );
      }
      await storage.saveApplication(existing, bytes);
      return { status: "saved" };
    }
  );

  app.patch<{ Params: { id: string } }>(
    "/api/applications/:id",
    async (request) => {
      const patch = ApplicationPatchSchema.check(request.body);
      const existing = await storage.loadApplication(request.params.id);
      const updated = updateApplication(existing, patch, toIsoDay(now()));
      await storage.saveApplication(updated);
      return updated;
    }
  );

  app.delete<{ Params: { id: string } }>(
    "/api/applications/:id",
    async (request) => {
      await storage.deleteApplication(request.params.id);
      return { status: "deleted" };
    }
  );

  // Jobs parked to apply for later (no CV yet)
  app.get("/api/candidates", () => storage.listCandidates());

  app.post("/api/candidates", async (request) => {
    const input = NewCandidateSchema.check(request.body);
    const candidate = createCandidate(
      input,
      randomBytes(ID_SUFFIX_BYTES).toString("hex"),
      toIsoDay(now())
    );
    await storage.saveCandidate(candidate);
    return candidate;
  });

  app.patch<{ Params: { id: string } }>(
    "/api/candidates/:id",
    async (request) => {
      const patch = CandidatePatchSchema.check(request.body);
      const updated = updateCandidate(
        await storage.loadCandidate(request.params.id),
        patch
      );
      await storage.saveCandidate(updated);
      return updated;
    }
  );

  app.delete<{ Params: { id: string } }>(
    "/api/candidates/:id",
    async (request) => {
      await storage.deleteCandidate(request.params.id);
      return { status: "deleted" };
    }
  );

  /** Renders the saved job `id` and sends the PDF, or a readable error */
  async function sendPdf(
    reply: FastifyReply,
    id: string
  ): Promise<FastifyReply> {
    let bytes: Buffer;
    try {
      bytes = await (pdf as PdfRenderer).render(id);
    } catch (error) {
      app.log.error(error);
      const reason = error instanceof Error ? error.message : "unknown error";
      return sendError(
        reply,
        HTTP_SERVER_ERROR,
        "pdf_failed",
        `The PDF could not be made: ${reason}. Is the web app running, and is Chromium installed (pnpm exec playwright install chromium)?`
      );
    }
    return reply
      .header("Content-Type", "application/pdf")
      .header("Content-Disposition", `attachment; filename="${id}.pdf"`)
      .send(Buffer.from(bytes));
  }

  app.post<{ Body: { jobId?: unknown } }>(
    "/api/pdf",
    async (request, reply) => {
      if (!pdf) {
        return sendError(
          reply,
          HTTP_NOT_IMPLEMENTED,
          "pdf_unavailable",
          "PDF export is not set up on this server."
        );
      }
      const jobId = request.body?.jobId;
      if (typeof jobId !== "string" || !JOB_ID_PATTERN.test(jobId)) {
        return sendError(
          reply,
          HTTP_BAD_REQUEST,
          "invalid",
          "jobId is missing or not valid."
        );
      }
      // The job and its template must exist and be readable before a browser is started
      const job = await storage.loadJob(jobId);
      await storage.loadTemplate(job.templateId);
      return sendPdf(reply, jobId);
    }
  );

  app.addHook("onClose", async () => {
    await pdf?.close();
  });

  return app;
}
