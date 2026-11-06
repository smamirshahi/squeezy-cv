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
  HideRequest,
  HideResult,
  HideResultSchema,
} from "@custom-types/hide-types";
import {
  Application,
  ApplicationPatch,
  ApplicationSchema,
  ApplicationSummary,
  NewApplication,
} from "@custom-types/application-types";
import {
  TailorRequest,
  TailorResult,
  TailorResultSchema,
} from "@custom-types/tailor-types";
import { Variant, VariantSchema } from "@custom-types/variant-types";
import {
  CvFile,
  CvFileSchema,
  Vault,
  VaultSchema,
} from "@custom-types/vault-types";

/** What the server lists for a saved variant */
export interface VariantSummary {
  id: string;
  name: string;
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
            // eslint-disable-next-line @typescript-eslint/naming-convention -- HTTP header name
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

/** The messages tailoring would send, see the server's `previewTailorRequest` */
export interface TailorPreview {
  provider: AiProviderId;
  calls: { promptName: string; system: string; input: string }[];
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
  loadVault: () => Promise<CvFile>;
  saveVault: (file: CvFile) => Promise<void>;
  listVariants: () => Promise<VariantSummary[]>;
  loadVariant: (id: string) => Promise<Variant>;
  /** `isUnlocked`: the user approved changing a variant that was sent (otherwise the server answers 409 "locked") */
  saveVariant: (
    variant: Variant,
    options?: { isUnlocked?: boolean }
  ) => Promise<void>;
  deleteVariant: (
    id: string,
    options?: { isUnlocked?: boolean }
  ) => Promise<void>;

  /** Which AI providers are set up and which one each task uses (never a key) */
  getAiStatus: () => Promise<AiStatus>;

  /** Chooses the provider for some tasks. The server refuses one that is not set up. */
  setAiChoice: (change: Partial<AiChoice>) => Promise<AiChoice>;

  /** Asks the AI how to present the saved CV for a job advert. Sends CV text to Anthropic. */
  tailor: (request: TailorRequest) => Promise<TailorResult>;

  /** Sorts pasted CV text into a vault with the AI. Sends the whole text to the AI provider. Nothing is saved. */
  importCv: (text: string) => Promise<ImportedCv>;

  /** One chat turn: a reply and typed operations for the user to approve. Sends CV text (no name or contact details) to the chosen provider. */
  chat: (request: ChatRequest) => Promise<ChatResponse>;

  /** Asks the AI which items to hide so the CV fits. Sends item labels, not personal details. Nothing is changed. */
  suggestHide: (request: HideRequest) => Promise<HideResult>;

  /** What tailoring would send to the AI for this advert, with personal details masked. Sends nothing. */
  previewTailor: (request: TailorRequest) => Promise<TailorPreview>;

  /** The PDF of a saved variant, made by the server */
  createPdf: (variantId: string) => Promise<Blob>;

  listApplications: () => Promise<ApplicationSummary[]>;
  loadApplication: (id: string) => Promise<Application>;

  /** Freezes the saved variant (data and PDF) as an application. Save the variant first. */
  createApplication: (input: NewApplication) => Promise<Application>;
  updateApplication: (
    id: string,
    patch: ApplicationPatch
  ) => Promise<Application>;
  deleteApplication: (id: string) => Promise<void>;
}

/** Where the browser can show or download the PDF that was sent with an application */
export function applicationPdfUrl(id: string): string {
  return `/api/applications/${encodeURIComponent(id)}/pdf`;
}

function unlockQuery(options?: { isUnlocked?: boolean }): string {
  return options?.isUnlocked ? "?unlock=true" : "";
}

/** Typed access to the local server. Everything it returns is checked against the shared schemas. */
export function createApiClient(
  fetchImpl: FetchLike = (input, init) => fetch(input, init)
): ApiClient {
  return {
    async loadVault() {
      return CvFileSchema.check(await request(fetchImpl, "GET", "/api/vault"));
    },
    async saveVault(file) {
      await request(fetchImpl, "PUT", "/api/vault", file);
    },
    async listVariants() {
      return (await request(
        fetchImpl,
        "GET",
        "/api/variants"
      )) as VariantSummary[];
    },
    async loadVariant(id) {
      return VariantSchema.check(
        await request(
          fetchImpl,
          "GET",
          `/api/variants/${encodeURIComponent(id)}`
        )
      );
    },
    async saveVariant(variant, options) {
      await request(
        fetchImpl,
        "PUT",
        `/api/variants/${encodeURIComponent(variant.id)}${unlockQuery(options)}`,
        variant
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
    async tailor(body) {
      return TailorResultSchema.check(
        await request(fetchImpl, "POST", "/api/ai/tailor", body)
      );
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
    async suggestHide(body) {
      return HideResultSchema.check(
        await request(fetchImpl, "POST", "/api/ai/hide", body)
      );
    },
    async previewTailor(body) {
      return (await request(
        fetchImpl,
        "POST",
        "/api/ai/tailor/preview",
        body
      )) as TailorPreview;
    },
    async createPdf(variantId) {
      return (await request(
        fetchImpl,
        "POST",
        "/api/pdf",
        { variantId },
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
    async deleteVariant(id, options) {
      await request(
        fetchImpl,
        "DELETE",
        `/api/variants/${encodeURIComponent(id)}${unlockQuery(options)}`
      );
    },
  };
}
