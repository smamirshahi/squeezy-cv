import { APP_VERSION } from "@shared/version";
import { randomBytes } from "node:crypto";
import Fastify, { FastifyInstance, FastifyReply } from "fastify";
import { ValidationError } from "runtypes";
import {
  ApplicationPatchSchema,
  NewApplicationSchema,
} from "@custom-types/application-types";
import { CvFileSchema } from "@custom-types/vault-types";
import { JobSchema, JOB_ID_PATTERN } from "@custom-types/job-types";
import { TemplateSchema } from "@custom-types/template-types";
import {
  VARIANT_ID_PATTERN,
  Variant,
  VariantSchema,
} from "@custom-types/variant-types";
import { AiClient, AiError, AiErrorCode } from "@server/ai/ai-types";
import { tailor } from "@server/ai/tailor";
import { previewTailorRequest } from "@server/ai/preview";
import { importCv } from "@server/ai/import-cv";
import { pickHide } from "@server/ai/pick-hide";
import { chat } from "@server/ai/chat";
import {
  ChatRequestSchema,
  MAX_CHAT_HISTORY,
  MAX_CHAT_MESSAGE_LENGTH,
} from "@custom-types/chat-types";
import { AiChoiceError, AiRegistry } from "@server/ai/ai-registry";
import { AiProviderId } from "@shared/ai/providers";
import {
  HideRequestSchema,
  MAX_HIDE_CANDIDATES,
} from "@custom-types/hide-types";
import {
  MAX_JOB_AD_LENGTH,
  TailorRequestSchema,
} from "@custom-types/tailor-types";
import {
  ImportRequestSchema,
  MAX_IMPORT_LENGTH,
} from "@custom-types/import-types";
import {
  ApplicationInputError,
  createApplication,
  toIsoDay,
  updateApplication,
} from "@shared/application/application-utils";
import { resolveVariant } from "@shared/variant/template-job";
import { isVariantLocked } from "@shared/variant/variant-lock";
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

  app.setErrorHandler((error, _request, reply) => {
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
    if (error instanceof ApplicationInputError) {
      return sendError(reply, HTTP_BAD_REQUEST, "invalid", error.message);
    }
    if (error instanceof ValidationError) {
      return sendError(reply, HTTP_BAD_REQUEST, "invalid", error.message);
    }
    const status = (error as { statusCode?: number }).statusCode;
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
      maskOrganisations: registry.isMaskingOrganisations(),
    };
  });

  // Also hide employer and school names (as [Company 1], [School 1]) in what is sent to a model
  app.put("/api/ai/privacy", async (request, reply) => {
    const body = request.body as { maskOrganisations?: unknown } | null;
    if (typeof body?.maskOrganisations !== "boolean") {
      return sendError(
        reply,
        HTTP_BAD_REQUEST,
        "invalid",
        "maskOrganisations must be true or false."
      );
    }
    await registry.setMaskOrganisations(body.maskOrganisations);
    return { maskOrganisations: registry.isMaskingOrganisations() };
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
    const { client: ai } = registry.forTask("tailor");
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

  // One chat turn: a reply and typed operations for the user to approve (nothing is changed here)
  app.post("/api/ai/chat", async (request, reply) => {
    const { client: ai } = registry.forTask("chat");
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

  // Which items to hide so the CV fits (the user confirms; nothing is changed here)
  app.post("/api/ai/hide", async (request, reply) => {
    const { client: ai } = registry.forTask("hide");
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

  // Sorts pasted CV text into a vault (shown for review; nothing is saved here)
  app.post("/api/ai/import", async (request, reply) => {
    const { client: ai } = registry.forTask("import");
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

  app.get("/api/variants", () => storage.listVariants());

  app.get<{ Params: { id: string } }>("/api/variants/:id", (request) =>
    storage.loadVariant(request.params.id)
  );

  // A variant that was sent (an application with status "applied") is read-only unless the
  // request says ?unlock=true, so a stale tab or a script cannot change it by accident.
  async function refuseIfLocked(
    reply: FastifyReply,
    variantId: string,
    unlock: string | undefined
  ): Promise<boolean> {
    if (unlock === "true") {
      return false;
    }
    if (isVariantLocked(variantId, await storage.listApplications())) {
      await sendError(
        reply,
        HTTP_CONFLICT,
        "locked",
        "This variant was sent to an employer and is locked. Unlock it first, or create a new variant from it."
      );
      return true;
    }
    return false;
  }

  app.put<{ Params: { id: string }; Querystring: { unlock?: string } }>(
    "/api/variants/:id",
    async (request, reply) => {
      const variant = VariantSchema.check(request.body);
      if (variant.id !== request.params.id) {
        return sendError(
          reply,
          HTTP_BAD_REQUEST,
          "invalid",
          "The id in the body must match the id in the URL."
        );
      }
      if (await refuseIfLocked(reply, variant.id, request.query.unlock)) {
        return reply;
      }
      await storage.saveVariant(variant);
      return { status: "saved" };
    }
  );

  app.delete<{ Params: { id: string }; Querystring: { unlock?: string } }>(
    "/api/variants/:id",
    async (request, reply) => {
      if (
        await refuseIfLocked(reply, request.params.id, request.query.unlock)
      ) {
        return reply;
      }
      await storage.deleteVariant(request.params.id);
      return { status: "deleted" };
    }
  );

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

  // The variant a job shows with its template: what the print page and the preview draw
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

  // The variant of an application: a job drawn with its template (a job id is the variant id
  // the page sends), or an older variant file that has no job
  async function loadVariantOrJob(id: string): Promise<Variant> {
    try {
      const job = await storage.loadJob(id);
      return resolveVariant(await storage.loadTemplate(job.templateId), job);
    } catch (error) {
      if (error instanceof StorageError && error.code === "not_found") {
        return storage.loadVariant(id);
      }
      throw error;
    }
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
    const variant = await loadVariantOrJob(input.variantId);
    const application = createApplication(
      input,
      vault,
      variant,
      toIsoDay(now()),
      randomBytes(ID_SUFFIX_BYTES).toString("hex")
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

  /** Renders the saved variant or job `id` and sends the PDF, or a readable error */
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

  app.post<{ Body: { variantId?: unknown; jobId?: unknown } }>(
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
      if (jobId !== undefined) {
        if (typeof jobId !== "string" || !JOB_ID_PATTERN.test(jobId)) {
          return sendError(
            reply,
            HTTP_BAD_REQUEST,
            "invalid",
            "jobId is not valid."
          );
        }
        // The job and its template must exist and be readable before a browser is started
        const job = await storage.loadJob(jobId);
        await storage.loadTemplate(job.templateId);
        return sendPdf(reply, jobId);
      }
      const variantId = request.body?.variantId;
      if (
        typeof variantId !== "string" ||
        !VARIANT_ID_PATTERN.test(variantId)
      ) {
        return sendError(
          reply,
          HTTP_BAD_REQUEST,
          "invalid",
          "variantId is missing or not valid."
        );
      }
      // The page that gets printed loads the variant from here, so it must exist and be readable
      await storage.loadVariant(variantId);
      return sendPdf(reply, variantId);
    }
  );

  app.addHook("onClose", async () => {
    await pdf?.close();
  });

  return app;
}
