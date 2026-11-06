import {
  TailorRequest,
  TailorResult,
  TailorResultSchema,
} from "@custom-types/tailor-types";
import { Variant, VariantSchema } from "@custom-types/variant-types";
import { CvFile, CvFileSchema } from "@custom-types/vault-types";

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

export interface ApiClient {
  loadVault: () => Promise<CvFile>;
  saveVault: (file: CvFile) => Promise<void>;
  listVariants: () => Promise<VariantSummary[]>;
  loadVariant: (id: string) => Promise<Variant>;
  saveVariant: (variant: Variant) => Promise<void>;
  deleteVariant: (id: string) => Promise<void>;

  /** Whether the server has an AI key (it never says what it is) */
  getAiStatus: () => Promise<{
    isConfigured: boolean;
    provider: "claude" | "ollama";
  }>;

  /** Asks the AI how to present the saved CV for a job advert. Sends CV text to Anthropic. */
  tailor: (request: TailorRequest) => Promise<TailorResult>;

  /** The PDF of a saved variant, made by the server */
  createPdf: (variantId: string) => Promise<Blob>;
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
    async saveVariant(variant) {
      await request(
        fetchImpl,
        "PUT",
        `/api/variants/${encodeURIComponent(variant.id)}`,
        variant
      );
    },
    async getAiStatus() {
      return (await request(fetchImpl, "GET", "/api/ai/status")) as {
        isConfigured: boolean;
        provider: "claude" | "ollama";
      };
    },
    async tailor(body) {
      return TailorResultSchema.check(
        await request(fetchImpl, "POST", "/api/ai/tailor", body)
      );
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
    async deleteVariant(id) {
      await request(
        fetchImpl,
        "DELETE",
        `/api/variants/${encodeURIComponent(id)}`
      );
    },
  };
}
