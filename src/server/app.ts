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
import { AiClient, AiError, AiErrorCode } from "@server/ai/ai-types";
import { tailor } from "@server/ai/tailor";
import { analyseJobAd, scoreSection } from "@server/ai/analyse-job-ad";
import {
  AnalyseRequestSchema,
  ScoreSectionRequestSchema,
} from "@custom-types/score-types";
import { previewTailorRequest } from "@server/ai/preview";
import { importCv } from "@server/ai/import-cv";
import { extractPdfText, PdfTextError } from "@server/pdf/extract-pdf-text";
import { pickHide } from "@server/ai/pick-hide";
import { placeItems } from "@server/ai/place-items";
import { personalOf } from "@shared/ai/redact-personal";
import { MAX_PLACE_ITEMS, PlaceRequestSchema } from "@custom-types/place-types";
import { chat } from "@server/ai/chat";
import {
  ChatRequestSchema,
  MAX_CHAT_HISTORY,
  MAX_CHAT_MESSAGE_LENGTH,
} from "@custom-types/chat-types";
import { AiChoiceError, AiRegistry } from "@server/ai/ai-registry";
import { MaskingSchema } from "@custom-types/masking-types";
import {
  PreviewStop,
  Recorder,
  createRecorder,
  maskedClient,
} from "@server/ai/send-preview";
import { AiProviderId, AiTask } from "@shared/ai/providers";
import {
  HideRequestSchema,
  MAX_HIDE_CANDIDATES,
} from "@custom-types/hide-types";
import {
  MAX_REWRITE_REQUIREMENTS,
  RewriteRequestSchema,
} from "@custom-types/rewrite-types";
import { BulletNotFoundError, rewriteBullet } from "@server/ai/rewrite-bullet";
import { rewordText } from "@server/ai/reword-text";
import { RewordRequestSchema } from "@custom-types/reword-types";
import {
  generateBullets,
  ItemNotFoundError,
  NothingToWorkFromError,
} from "@server/ai/generate-bullets";
import {
  BulletsRequestSchema,
  MAX_BULLETS_REQUIREMENTS,
} from "@custom-types/bullets-types";
import {
  MAX_JOB_AD_LENGTH,
  TailorRequestSchema,
} from "@custom-types/tailor-types";
import {
  ImportRequestSchema,
  MAX_IMPORT_LENGTH,
  MAX_IMPORT_PDF_BYTES,
} from "@custom-types/import-types";
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
} from "@server/storage/cv-storage";

/* eslint-disable @typescript-eslint/no-magic-numbers -- 10 MB, written out */
const MAX_BODY_BYTES = 10 * 1024 * 1024;
/* eslint-enable @typescript-eslint/no-magic-numbers */

const ID_SUFFIX_BYTES = 3;
const HTTP_BAD_REQUEST = 400;
const HTTP_FORBIDDEN = 403;
const HTTP_NOT_FOUND = 404;
const HTTP_PAYLOAD_TOO_LARGE = 413;
const HTTP_UNSUPPORTED_MEDIA = 415;
const HTTP_CONFLICT = 409;
const HTTP_SERVER_ERROR = 500;
const HTTP_NOT_IMPLEMENTED = 501;
const HTTP_UNPROCESSABLE = 422;
const HTTP_BAD_GATEWAY = 502;
const HTTP_UNAVAILABLE = 503;
const HTTP_GATEWAY_TIMEOUT = 504;

function statusOfAi(code: AiErrorCode): number {
  switch (code) {
    case "not_configured":
      return HTTP_UNAVAILABLE;
    case "timeout":
      return HTTP_GATEWAY_TIMEOUT;
    case "refused":
      return HTTP_UNPROCESSABLE;
    case "truncated":
      return HTTP_UNPROCESSABLE;
    case "api_error":
    case "invalid_output":
      return HTTP_BAD_GATEWAY;
  }
}
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
}

/** Builds the API. It does not listen; `main.ts` (or a test) decides how to run it. */
export function buildServer({
  storage,
  pdf,
  ai,
  aiProvider = "claude",
  aiRegistry,
  backup,
  now = () => new Date(),
  isLoggingEnabled = false,
}: ServerOptions): FastifyInstance {
  const registry = aiRegistry ?? AiRegistry.single(ai, aiProvider);

  // The AI client for one request. With the header `x-ai-preview: 1` it only records what would be
  // sent (answered as `PreviewStop`, see the error handler), and works without a key. A body
  // `masking` (the user's choices in the "Send to AI" dialog) is added to whatever is sent.
  const recorders = new WeakMap<FastifyRequest, Recorder>();
  function aiFor(
    task: AiTask,
    request: FastifyRequest,
    options: { callsToRecord?: number; standIn?: unknown } = {}
  ): AiClient | undefined {
    const { client, provider } = registry.forTask(task);
    const rawMasking = (request.body as { masking?: unknown } | undefined)
      ?.masking;
    const masking =
      rawMasking === undefined ? undefined : MaskingSchema.check(rawMasking);
    if (request.headers["x-ai-preview"] === "1") {
      const recorder = createRecorder({ provider, masking, ...options });
      recorders.set(request, recorder);
      return recorder;
    }
    return client ? maskedClient(client, masking) : undefined;
  }
  const app = Fastify({
    // eslint-disable-next-line @typescript-eslint/naming-convention -- Fastify option name
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

  // A preview of a task that ran to its end (it never reached a stop) is answered here
  app.addHook("onSend", (request, reply, payload, done) => {
    const recorder = recorders.get(request);
    if (
      recorder &&
      !recorder.isStopped &&
      reply.statusCode < HTTP_BAD_REQUEST
    ) {
      reply.type("application/json");
      done(null, JSON.stringify(recorder.finish()));
      return;
    }
    done(null, payload);
  });

  app.setErrorHandler((error, _request, reply) => {
    if (error instanceof PreviewStop) {
      return reply.send(error.preview);
    }
    if (error instanceof StorageError) {
      return sendError(reply, statusOf(error.code), error.code, error.message);
    }
    if (error instanceof AiError) {
      return sendError(
        reply,
        statusOfAi(error.code),
        `ai_${error.code}`,
        error.message
      );
    }
    if (error instanceof PdfTextError) {
      return sendError(
        reply,
        error.code === "too_large" ? HTTP_PAYLOAD_TOO_LARGE : HTTP_BAD_REQUEST,
        error.code,
        error.message
      );
    }
    if (error instanceof ApplicationInputError) {
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

  // `isConfigured` and `provider` are those of tailoring (older pages read only these);
  // `providers` and `choice` are for the chooser and for the other tasks' notices
  app.get("/api/ai/status", () => {
    const tailoring = registry.forTask("tailor");
    return {
      isConfigured: tailoring.client !== undefined,
      provider: tailoring.provider,
      providers: registry.providers(),
      choice: registry.choice(),
    };
  });

  // Which provider each task uses. Keys stay in .env; only the choice is stored.
  app.put("/api/ai/choice", async (request, reply) => {
    try {
      await registry.choose(request.body as Record<string, string>);
    } catch (error) {
      if (error instanceof AiChoiceError) {
        return sendError(
          reply,
          HTTP_BAD_REQUEST,
          "provider_unavailable",
          error.message
        );
      }
      throw error;
    }
    return { choice: registry.choice() };
  });

  app.post("/api/ai/tailor", async (request, reply) => {
    const ai = aiFor("tailor", request, {
      callsToRecord: 2,
      standIn: {
        jobTitle: "(answer of the first call)",
        mustHave: [],
        niceToHave: [],
        keywords: [],
      },
    });
    if (!ai) {
      return sendError(
        reply,
        HTTP_UNAVAILABLE,
        "ai_not_configured",
        "AI is not set up. Set ANTHROPIC_API_KEY, or AI_PROVIDER=ollama, in .env (see .env.example)."
      );
    }
    const body = TailorRequestSchema.check(request.body);
    const jobAd = body.jobAd.trim();
    if (jobAd.length === 0 || jobAd.length > MAX_JOB_AD_LENGTH) {
      return sendError(
        reply,
        HTTP_BAD_REQUEST,
        "invalid",
        `The job advert must be 1 to ${MAX_JOB_AD_LENGTH} characters.`
      );
    }
    const { vault } = await storage.loadVault();
    return tailor(
      ai,
      vault,
      { jobAd, tone: body.tone },
      { isMaskingOrganisations: registry.isMaskingOrganisations() }
    );
  });

  // Reads an advert once: keywords and requirements for the job (the user stores them; nothing is changed here)
  app.post("/api/ai/analyse", async (request, reply) => {
    const ai = aiFor("tailor", request);
    if (!ai) {
      return sendError(
        reply,
        HTTP_UNAVAILABLE,
        "ai_not_configured",
        "AI is not set up. Set ANTHROPIC_API_KEY, or AI_PROVIDER=ollama, in .env (see .env.example)."
      );
    }
    const jobAd = AnalyseRequestSchema.check(request.body).jobAd.trim();
    if (jobAd.length === 0 || jobAd.length > MAX_JOB_AD_LENGTH) {
      return sendError(
        reply,
        HTTP_BAD_REQUEST,
        "invalid",
        `The job advert must be 1 to ${MAX_JOB_AD_LENGTH} characters.`
      );
    }
    const { vault } = await storage.loadVault();
    return analyseJobAd(ai, vault, jobAd, {
      isMaskingOrganisations: registry.isMaskingOrganisations(),
    });
  });

  // A relevance score and reason for every entry (and skill) of ONE section (the user applies it; nothing is changed here)
  app.post("/api/ai/score-section", async (request, reply) => {
    // A preview records every batch of the section, answered with empty scores
    const ai = aiFor("tailor", request, {
      callsToRecord: Number.POSITIVE_INFINITY,
      standIn: { scores: [] },
    });
    if (!ai) {
      return sendError(
        reply,
        HTTP_UNAVAILABLE,
        "ai_not_configured",
        "AI is not set up. Set ANTHROPIC_API_KEY, or AI_PROVIDER=ollama, in .env (see .env.example)."
      );
    }
    const body = ScoreSectionRequestSchema.check(request.body);
    const { vault } = await storage.loadVault();
    const section = vault.sections.find((entry) => entry.id === body.sectionId);
    if (!section) {
      return sendError(
        reply,
        HTTP_NOT_FOUND,
        "not_found",
        "That section is not in the saved CV. Save first."
      );
    }
    return scoreSection(ai, vault, section, body.requirements, {
      isMaskingOrganisations: registry.isMaskingOrganisations(),
    });
  });

  // One chat turn: a reply and typed operations for the user to approve (nothing is changed here)
  app.post("/api/ai/chat", async (request, reply) => {
    const ai = aiFor("chat", request);
    if (!ai) {
      return sendError(
        reply,
        HTTP_UNAVAILABLE,
        "ai_not_configured",
        "AI is not set up. Set a key (or use Ollama) in .env, see .env.example, then choose it in AI setup."
      );
    }
    const body = ChatRequestSchema.check(request.body);
    const message = body.message.trim();
    if (message.length === 0 || message.length > MAX_CHAT_MESSAGE_LENGTH) {
      return sendError(
        reply,
        HTTP_BAD_REQUEST,
        "invalid",
        `The message must be 1 to ${MAX_CHAT_MESSAGE_LENGTH} characters.`
      );
    }
    const { vault } = await storage.loadVault();
    return chat(
      ai,
      vault,
      {
        ...body,
        message,
        history: (body.history ?? []).slice(-MAX_CHAT_HISTORY),
      },
      { isMaskingOrganisations: registry.isMaskingOrganisations() }
    );
  });

  // One bullet made shorter, longer or more formal (the user accepts it; nothing is changed here)
  app.post("/api/ai/rewrite", async (request, reply) => {
    const ai = aiFor("chat", request);
    if (!ai) {
      return sendError(
        reply,
        HTTP_UNAVAILABLE,
        "ai_not_configured",
        "AI is not set up. Set a key (or use Ollama) in .env, see .env.example, then choose it in AI setup."
      );
    }
    const body = RewriteRequestSchema.check(request.body);
    const requirements = (body.requirements ?? [])
      .slice(0, MAX_REWRITE_REQUIREMENTS)
      .map((text) => text.slice(0, 200));
    const { vault } = await storage.loadVault();
    try {
      return await rewriteBullet(
        ai,
        vault,
        { ...body, requirements },
        { isMaskingOrganisations: registry.isMaskingOrganisations() }
      );
    } catch (error) {
      if (error instanceof BulletNotFoundError) {
        return sendError(reply, HTTP_NOT_FOUND, "not_found", error.message);
      }
      throw error;
    }
  });

  // Bullets made from an item's description for a job (the user reviews them; nothing is changed here)
  app.post("/api/ai/bullets", async (request, reply) => {
    const ai = aiFor("chat", request);
    if (!ai) {
      return sendError(
        reply,
        HTTP_UNAVAILABLE,
        "ai_not_configured",
        "AI is not set up. Set a key (or use Ollama) in .env, see .env.example, then choose it in AI setup."
      );
    }
    const body = BulletsRequestSchema.check(request.body);
    const requirements = (body.requirements ?? [])
      .slice(0, MAX_BULLETS_REQUIREMENTS)
      .map((text) => text.slice(0, 200));
    const { vault } = await storage.loadVault();
    try {
      return await generateBullets(
        ai,
        vault,
        {
          ...body,
          requirements,
          focus: body.focus?.slice(0, 200),
          current: (body.current ?? []).map((text) => text.slice(0, 600)),
        },
        { isMaskingOrganisations: registry.isMaskingOrganisations() }
      );
    } catch (error) {
      if (error instanceof ItemNotFoundError) {
        return sendError(reply, HTTP_NOT_FOUND, "not_found", error.message);
      }
      if (error instanceof NothingToWorkFromError) {
        return sendError(
          reply,
          HTTP_BAD_REQUEST,
          "nothing_to_work_from",
          error.message
        );
      }
      throw error;
    }
  });

  // One text (summary, description) shortened, lengthened or fitted to the job's keywords (the user reviews it; nothing is changed here)
  app.post("/api/ai/reword", async (request, reply) => {
    const ai = aiFor("chat", request);
    if (!ai) {
      return sendError(
        reply,
        HTTP_UNAVAILABLE,
        "ai_not_configured",
        "AI is not set up. Set a key (or use Ollama) in .env, see .env.example, then choose it in AI setup."
      );
    }
    const body = RewordRequestSchema.check(request.body);
    const { vault } = await storage.loadVault();
    try {
      return await rewordText(
        ai,
        vault,
        {
          ...body,
          requirements: (body.requirements ?? []).map((text) =>
            text.slice(0, 200)
          ),
        },
        { isMaskingOrganisations: registry.isMaskingOrganisations() }
      );
    } catch (error) {
      if (error instanceof ItemNotFoundError) {
        return sendError(reply, HTTP_NOT_FOUND, "not_found", error.message);
      }
      if (error instanceof NothingToWorkFromError) {
        return sendError(
          reply,
          HTTP_BAD_REQUEST,
          "nothing_to_work_from",
          error.message
        );
      }
      throw error;
    }
  });

  // Which items to hide so the CV fits (the user confirms; nothing is changed here)
  app.post("/api/ai/hide", async (request, reply) => {
    const ai = aiFor("hide", request);
    if (!ai) {
      return sendError(
        reply,
        HTTP_UNAVAILABLE,
        "ai_not_configured",
        "AI is not set up. Set ANTHROPIC_API_KEY, or AI_PROVIDER=ollama, in .env (see .env.example)."
      );
    }
    const body = HideRequestSchema.check(request.body);
    if (
      body.candidates.length === 0 ||
      body.candidates.length > MAX_HIDE_CANDIDATES
    ) {
      return sendError(
        reply,
        HTTP_BAD_REQUEST,
        "invalid",
        `Send 1 to ${MAX_HIDE_CANDIDATES} items.`
      );
    }
    return pickHide(ai, body);
  });

  // Where items in the Unsorted section belong (the user confirms; nothing is moved here)
  app.post("/api/ai/place", async (request, reply) => {
    const ai = aiFor("place", request);
    if (!ai) {
      return sendError(
        reply,
        HTTP_UNAVAILABLE,
        "ai_not_configured",
        "AI is not set up. Set ANTHROPIC_API_KEY, or AI_PROVIDER=ollama, in .env (see .env.example)."
      );
    }
    const body = PlaceRequestSchema.check(request.body);
    if (
      body.items.length === 0 ||
      body.items.length > MAX_PLACE_ITEMS ||
      body.sections.length === 0
    ) {
      return sendError(
        reply,
        HTTP_BAD_REQUEST,
        "invalid",
        `Send 1 to ${MAX_PLACE_ITEMS} items and at least one section.`
      );
    }
    const { vault } = await storage.loadVault();
    return placeItems(
      ai,
      body,
      personalOf(vault, registry.isMaskingOrganisations())
    );
  });

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
  app.post("/api/ai/import", async (request, reply) => {
    const ai = aiFor("import", request);
    if (!ai) {
      return sendError(
        reply,
        HTTP_UNAVAILABLE,
        "ai_not_configured",
        "AI is not set up. Set ANTHROPIC_API_KEY, or AI_PROVIDER=ollama, in .env (see .env.example)."
      );
    }
    const body = ImportRequestSchema.check(request.body);
    const text = body.text.trim();
    if (text.length === 0 || text.length > MAX_IMPORT_LENGTH) {
      return sendError(
        reply,
        HTTP_BAD_REQUEST,
        "invalid",
        `The text must be 1 to ${MAX_IMPORT_LENGTH} characters.`
      );
    }
    return importCv(ai, text);
  });

  // What tailoring would send, without sending it (works without a key)
  app.post("/api/ai/tailor/preview", async (request, reply) => {
    const body = TailorRequestSchema.check(request.body);
    const jobAd = body.jobAd.trim();
    if (jobAd.length === 0 || jobAd.length > MAX_JOB_AD_LENGTH) {
      return sendError(
        reply,
        HTTP_BAD_REQUEST,
        "invalid",
        `The job advert must be 1 to ${MAX_JOB_AD_LENGTH} characters.`
      );
    }
    const { vault } = await storage.loadVault();
    return {
      provider: registry.forTask("tailor").provider,
      calls: await previewTailorRequest(
        vault,
        { jobAd, tone: body.tone },
        { isMaskingOrganisations: registry.isMaskingOrganisations() }
      ),
    };
  });

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
      await storage.loadTemplate(request.params.id);
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
        .send(bytes);
    }
  );

  // Freezes the saved CV (data and PDF) as what was sent. Nothing is stored unless both work.
  app.post("/api/applications", async (request, reply) => {
    if (!pdf) {
      return sendError(
        reply,
        HTTP_NOT_IMPLEMENTED,
        "pdf_unavailable",
        "PDF export is not set up on this server, so the CV cannot be saved with the application."
      );
    }
    const input = NewApplicationSchema.check(request.body);
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
      .send(bytes);
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
