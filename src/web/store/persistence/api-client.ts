import { RestoreSummary } from "@shared/backup/full-backup";
import { gateAiFetch } from "@store/persistence/send-gate";
import {
  browserFetch,
  isBrowserMode,
} from "@store/persistence/browser/storage-mode";
import {
  ChatRequest,
  ChatResponse,
  ChatResponseSchema,
} from "@custom-types/chat-types";
import {
  AI_PROVIDER_INFO,
  AiChoice,
  AiProviderId,
  AiProviderInfo,
  AiTask,
} from "@shared/ai/providers";
import {
  AnalyseResult,
  AnalyseResultSchema,
  ScoreResult,
  ScoreResultSchema,
} from "@custom-types/score-types";
import {
  RewordRequest,
  RewordResult,
  RewordResultSchema,
} from "@custom-types/reword-types";
import {
  AtsWordingResult,
  AtsWordingResultSchema,
} from "@custom-types/ats-wording-types";
import { Requirements } from "@custom-types/requirements-types";
import {
  RewriteRequest,
  RewriteResult,
  RewriteResultSchema,
} from "@custom-types/rewrite-types";
import {
  BulletsRequest,
  BulletsResult,
  BulletsResultSchema,
} from "@custom-types/bullets-types";
import {
  HideRequest,
  HideResult,
  HideResultSchema,
} from "@custom-types/hide-types";
import {
  PlaceRequest,
  PlaceResult,
  PlaceResultSchema,
} from "@custom-types/place-types";
import {
  Candidate,
  CandidatePatch,
  CandidateSchema,
  NewCandidate,
} from "@custom-types/candidate-types";
import {
  Application,
  ApplicationPatch,
  ApplicationSchema,
  ApplicationSummary,
  NewApplication,
} from "@custom-types/application-types";
import { Job, JobSchema } from "@custom-types/job-types";
import { Template, TemplateSchema } from "@custom-types/template-types";
import { Variant, VariantSchema } from "@custom-types/variant-types";
import {
  CvFile,
  CvFileSchema,
  Vault,
  VaultSchema,
} from "@custom-types/vault-types";

/** What the server lists for a saved template */
interface TemplateSummary {
  id: string;
  name: string;
  isCorrupt: boolean;
}

/** What the server lists for a saved job */
export interface JobSummary {
  id: string;
  name: string;
  templateId: string;
  company?: string;
  role?: string;
  stage?: "draft" | "ready";
  createdAt: string;
  isCorrupt: boolean;
}

/**
 * A failed call. `code` is the server's error code ("not_found", "corrupt", ...), or
 * "unreachable" when no answer came at all (server not running).
 */
export class ApiError extends Error {
  readonly code: string;

  constructor(code: string, message: string) {
    super(message);
    this.name = "ApiError";
    this.code = code;
  }
}

type FetchLike = (input: string, init?: RequestInit) => Promise<Response>;

async function request(
  fetchImpl: FetchLike,
  method: string,
  url: string,
  body?: unknown,
  expects: "json" | "blob" = "json"
): Promise<unknown> {
  let response: Response;
  try {
    response = await fetchImpl(url, {
      method,
      ...(body === undefined
        ? {}
        : {
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body),
          }),
    });
  } catch {
    throw new ApiError("unreachable", "The local server cannot be reached.");
  }

  if (response.ok && expects === "blob") {
    return response.blob();
  }

  let payload: unknown;
  try {
    payload = await response.json();
  } catch {
    payload = undefined;
  }
  if (!response.ok) {
    const error = payload as { code?: string; message?: string } | undefined;
    throw new ApiError(
      error?.code ?? "unknown",
      error?.message ?? `The server answered ${response.status}.`
    );
  }
  return payload;
}

/** The result of sorting pasted CV text: a vault to review, and what looked wrong */
export interface ImportedCv {
  vault: Vault;
  warnings: string[];
}

/** What the server says about AI. `isConfigured` and `provider` are tailoring's; the rest is for the chooser. */
export interface AiStatus {
  isConfigured: boolean;
  provider: AiProviderId;
  providers?: (AiProviderInfo & { isConfigured: boolean })[];
  choice?: AiChoice;
}

/** The provider a task uses and whether it is set up, from a status (older answers have only tailoring's) */
export function taskProvider(
  status: AiStatus,
  task: AiTask
): { info: AiProviderInfo; isConfigured: boolean } {
  const id = status.choice?.[task] ?? status.provider;
  const entry = status.providers?.find((p) => p.id === id);
  return {
    info: AI_PROVIDER_INFO[id],
    isConfigured: entry ? entry.isConfigured : status.isConfigured,
  };
}

export interface ApiClient {
  /** Every record in one backup file (JSON) */
  downloadBackup: () => Promise<Blob>;

  /** Writes a backup file's records (same ids are replaced); refuses a file that is not a backup or is newer */
  restoreBackup: (backup: unknown) => Promise<RestoreSummary>;

  loadVault: () => Promise<CvFile>;
  saveVault: (file: CvFile) => Promise<void>;
  listTemplates: () => Promise<TemplateSummary[]>;
  loadTemplate: (id: string) => Promise<Template>;
  saveTemplate: (template: Template) => Promise<void>;
  deleteTemplate: (id: string) => Promise<void>;
  listJobs: () => Promise<JobSummary[]>;
  loadJob: (id: string) => Promise<Job>;
  saveJob: (job: Job) => Promise<void>;
  deleteJob: (id: string) => Promise<void>;

  /** The variant a saved job shows with its template: what the print page draws */
  loadResolvedJob: (id: string) => Promise<Variant>;

  /** Which AI providers are set up and which one each task uses (never a key) */
  getAiStatus: () => Promise<AiStatus>;

  /** Chooses the provider for some tasks. The server refuses one that is not set up. */
  setAiChoice: (change: Partial<AiChoice>) => Promise<AiChoice>;

  /** Also hide employer and school names ([Company 1], [Institution 1]) in what is sent to a model */

  /** The text layer of a PDF, read by the local server (the file is not stored). Nothing is sent to an AI here. */
  extractPdfText: (file: Blob) => Promise<{ text: string; pages: number }>;

  /** Sorts pasted CV text into a vault with the AI. Sends the whole text to the AI provider. Nothing is saved. */
  importCv: (text: string) => Promise<ImportedCv>;

  /** One chat turn: a reply and typed operations for the user to approve. Sends CV text (no name or contact details) to the chosen provider. */
  chat: (request: ChatRequest) => Promise<ChatResponse>;

  /** One bullet made shorter, longer or more formal. Sends that item's CV text (no name or contact details) to the chosen provider. Nothing is changed. */
  rewriteBullet: (request: RewriteRequest) => Promise<RewriteResult>;
  generateBullets: (request: BulletsRequest) => Promise<BulletsResult>;

  /** One text (summary, description) shortened, lengthened or fitted to the keywords. Sends that item's saved text (no name or contact details) to the chosen provider. Nothing is changed. */
  rewordText: (request: RewordRequest) => Promise<RewordResult>;
  suggestAtsWording: (
    terms: string[],
    reworded: string[]
  ) => Promise<AtsWordingResult>;

  /** Reads an advert once: what it asks for. Sends only the advert text to the chosen provider. Nothing is changed. */
  analyseJobAd: (jobAd: string) => Promise<AnalyseResult>;

  /** Scores every entry (and skill) of one saved section against what the advert asks for. Sends that section's text (no name or contact details) to the chosen provider. Nothing is changed. */
  scoreSection: (
    sectionId: string,
    requirements: Requirements
  ) => Promise<ScoreResult>;

  /** Asks the AI which items to hide so the CV fits. Sends item labels, not personal details. Nothing is changed. */
  suggestHide: (request: HideRequest) => Promise<HideResult>;

  /** Asks the AI which section each unsorted item belongs in. Sends item words and section names. Nothing is moved. */
  suggestPlacement: (request: PlaceRequest) => Promise<PlaceResult>;

  /** The PDF of a saved job (its id is also a variant id), made by the server */
  createPdf: (jobId: string) => Promise<Blob>;

  listApplications: () => Promise<ApplicationSummary[]>;
  loadApplication: (id: string) => Promise<Application>;

  /** Freezes the saved job (data and PDF) as an application. Save the variant first. */
  createApplication: (input: NewApplication) => Promise<Application>;

  /** Stores the PDF of a CV sent outside the app next to an application that has no frozen CV */
  uploadApplicationPdf: (id: string, file: Blob) => Promise<void>;
  updateApplication: (
    id: string,
    patch: ApplicationPatch
  ) => Promise<Application>;
  deleteApplication: (id: string) => Promise<void>;

  listCandidates: () => Promise<Candidate[]>;
  createCandidate: (input: NewCandidate) => Promise<Candidate>;
  updateCandidate: (id: string, patch: CandidatePatch) => Promise<Candidate>;
  deleteCandidate: (id: string) => Promise<void>;
}

/**
 * Where the browser can show or download the PDF that was sent with an application. In browser
 * mode there is no server to ask, so this is a page of the app that shows the frozen CV (or the
 * uploaded PDF) and prints to PDF.
 */
export function applicationPdfUrl(id: string): string {
  return isBrowserMode()
    ? `/print-application/${encodeURIComponent(id)}`
    : applicationPdfApiUrl(id);
}

/** The API address of an application's stored PDF (answered by the server or by the browser storage) */
export function applicationPdfApiUrl(id: string): string {
  return `/api/applications/${encodeURIComponent(id)}/pdf`;
}

/** `fetch` for the app's own API addresses: the server, or the browser storage in browser mode */
export function apiFetch(url: string, init?: RequestInit): Promise<Response> {
  return isBrowserMode() ? browserFetch()(url, init) : fetch(url, init);
}

/** Typed access to the local server. Everything it returns is checked against the shared schemas. */
export function createApiClient(
  fetchImpl: FetchLike = gateAiFetch((input, init) => apiFetch(input, init))
): ApiClient {
  return {
    async downloadBackup() {
      return (await request(
        fetchImpl,
        "GET",
        "/api/backup/file",
        undefined,
        "blob"
      )) as Blob;
    },
    async restoreBackup(backup) {
      return (await request(
        fetchImpl,
        "POST",
        "/api/backup/file",
        backup
      )) as RestoreSummary;
    },
    async loadVault() {
      return CvFileSchema.check(await request(fetchImpl, "GET", "/api/vault"));
    },
    async saveVault(file) {
      await request(fetchImpl, "PUT", "/api/vault", file);
    },
    async listTemplates() {
      return (await request(
        fetchImpl,
        "GET",
        "/api/templates"
      )) as TemplateSummary[];
    },
    async loadTemplate(id) {
      return TemplateSchema.check(
        await request(
          fetchImpl,
          "GET",
          `/api/templates/${encodeURIComponent(id)}`
        )
      );
    },
    async saveTemplate(template) {
      await request(
        fetchImpl,
        "PUT",
        `/api/templates/${encodeURIComponent(template.id)}`,
        template
      );
    },
    async deleteTemplate(id) {
      await request(
        fetchImpl,
        "DELETE",
        `/api/templates/${encodeURIComponent(id)}`
      );
    },
    async listJobs() {
      return (await request(fetchImpl, "GET", "/api/jobs")) as JobSummary[];
    },
    async loadJob(id) {
      return JobSchema.check(
        await request(fetchImpl, "GET", `/api/jobs/${encodeURIComponent(id)}`)
      );
    },
    async saveJob(job) {
      await request(
        fetchImpl,
        "PUT",
        `/api/jobs/${encodeURIComponent(job.id)}`,
        job
      );
    },
    async deleteJob(id) {
      await request(fetchImpl, "DELETE", `/api/jobs/${encodeURIComponent(id)}`);
    },
    async loadResolvedJob(id) {
      return VariantSchema.check(
        await request(
          fetchImpl,
          "GET",
          `/api/jobs/${encodeURIComponent(id)}/resolved`
        )
      );
    },
    async getAiStatus() {
      return (await request(fetchImpl, "GET", "/api/ai/status")) as AiStatus;
    },
    async setAiChoice(change) {
      const answer = (await request(
        fetchImpl,
        "PUT",
        "/api/ai/choice",
        change
      )) as { choice: AiChoice };
      return answer.choice;
    },
    async extractPdfText(file) {
      let response: Response;
      try {
        response = await fetchImpl("/api/import/pdf", {
          method: "POST",

          headers: { "Content-Type": "application/pdf" },
          body: file,
        });
      } catch {
        throw new ApiError(
          "unreachable",
          "The local server cannot be reached."
        );
      }
      const payload = (await response.json().catch(() => undefined)) as
        | { code?: string; message?: string; text?: string; pages?: number }
        | undefined;
      if (!response.ok || typeof payload?.text !== "string") {
        throw new ApiError(
          payload?.code ?? "unknown",
          payload?.message ?? `The server answered ${response.status}.`
        );
      }
      return { text: payload.text, pages: payload.pages ?? 0 };
    },
    async importCv(text) {
      const result = (await request(fetchImpl, "POST", "/api/ai/import", {
        text,
      })) as { vault: unknown; warnings: string[] };
      return {
        vault: VaultSchema.check(result.vault),
        warnings: result.warnings,
      };
    },
    async chat(body) {
      return ChatResponseSchema.check(
        await request(fetchImpl, "POST", "/api/ai/chat", body)
      );
    },
    async rewriteBullet(body) {
      return RewriteResultSchema.check(
        await request(fetchImpl, "POST", "/api/ai/rewrite", body)
      );
    },
    async generateBullets(body) {
      return BulletsResultSchema.check(
        await request(fetchImpl, "POST", "/api/ai/bullets", body)
      );
    },
    async analyseJobAd(jobAd) {
      return AnalyseResultSchema.check(
        await request(fetchImpl, "POST", "/api/ai/analyse", { jobAd })
      );
    },
    async rewordText(body) {
      return RewordResultSchema.check(
        await request(fetchImpl, "POST", "/api/ai/reword", body)
      );
    },
    async suggestAtsWording(terms, reworded) {
      return AtsWordingResultSchema.check(
        await request(fetchImpl, "POST", "/api/ai/ats-wording", {
          terms,
          reworded,
        })
      );
    },
    async scoreSection(sectionId, requirements) {
      return ScoreResultSchema.check(
        await request(fetchImpl, "POST", "/api/ai/score-section", {
          sectionId,
          requirements,
        })
      );
    },
    async suggestHide(body) {
      return HideResultSchema.check(
        await request(fetchImpl, "POST", "/api/ai/hide", body)
      );
    },
    async suggestPlacement(body) {
      return PlaceResultSchema.check(
        await request(fetchImpl, "POST", "/api/ai/place", body)
      );
    },
    async createPdf(jobId) {
      return (await request(
        fetchImpl,
        "POST",
        "/api/pdf",
        { jobId },
        "blob"
      )) as Blob;
    },
    async listApplications() {
      return (await request(
        fetchImpl,
        "GET",
        "/api/applications"
      )) as ApplicationSummary[];
    },
    async loadApplication(id) {
      return ApplicationSchema.check(
        await request(
          fetchImpl,
          "GET",
          `/api/applications/${encodeURIComponent(id)}`
        )
      );
    },
    async uploadApplicationPdf(id, file) {
      let response: Response;
      try {
        response = await fetchImpl(
          `/api/applications/${encodeURIComponent(id)}/pdf`,
          {
            method: "PUT",

            headers: { "Content-Type": "application/pdf" },
            body: file,
          }
        );
      } catch {
        throw new ApiError(
          "unreachable",
          "The local server cannot be reached."
        );
      }
      if (!response.ok) {
        const payload = (await response.json().catch(() => undefined)) as
          { code?: string; message?: string } | undefined;
        throw new ApiError(
          payload?.code ?? "unknown",
          payload?.message ?? `The server answered ${response.status}.`
        );
      }
    },
    async createApplication(input) {
      return ApplicationSchema.check(
        await request(fetchImpl, "POST", "/api/applications", input)
      );
    },
    async updateApplication(id, patch) {
      return ApplicationSchema.check(
        await request(
          fetchImpl,
          "PATCH",
          `/api/applications/${encodeURIComponent(id)}`,
          patch
        )
      );
    },
    async deleteApplication(id) {
      await request(
        fetchImpl,
        "DELETE",
        `/api/applications/${encodeURIComponent(id)}`
      );
    },
    async listCandidates() {
      const raw = await request(fetchImpl, "GET", "/api/candidates");
      return Array.isArray(raw) ? raw.map((c) => CandidateSchema.check(c)) : [];
    },
    async createCandidate(input) {
      return CandidateSchema.check(
        await request(fetchImpl, "POST", "/api/candidates", input)
      );
    },
    async updateCandidate(id, patch) {
      return CandidateSchema.check(
        await request(
          fetchImpl,
          "PATCH",
          `/api/candidates/${encodeURIComponent(id)}`,
          patch
        )
      );
    },
    async deleteCandidate(id) {
      await request(
        fetchImpl,
        "DELETE",
        `/api/candidates/${encodeURIComponent(id)}`
      );
    },
  };
}
