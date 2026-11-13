import { ValidationError } from "runtypes";
import {
  ApplicationPatchSchema,
  NewApplicationSchema,
} from "@custom-types/application-types";
import {
  CandidatePatchSchema,
  NewCandidateSchema,
} from "@custom-types/candidate-types";
import { CvFileSchema } from "@custom-types/vault-types";
import { JobSchema } from "@custom-types/job-types";
import { TemplateSchema } from "@custom-types/template-types";
import {
  ApplicationInputError,
  ApplicationSource,
  createApplication,
  toIsoDay,
  updateApplication,
} from "@shared/application/application-utils";
import {
  CandidateInputError,
  createCandidate,
  updateCandidate,
} from "@shared/candidate/candidate-utils";
import { CvStorage, StorageError } from "@shared/storage/cv-storage";
import { resolveVariant } from "@shared/variant/template-job";

const HTTP_OK = 200;
const HTTP_BAD_REQUEST = 400;
const HTTP_NOT_FOUND = 404;
const HTTP_CONFLICT = 409;
const HTTP_SERVER_ERROR = 500;
const HTTP_NOT_IMPLEMENTED = 501;
const ID_SUFFIX_BYTES = 3;
const HEX_RADIX = 16;
const PDF_MAGIC = [0x25, 0x50, 0x44, 0x46];

type FetchLike = (input: string, init?: RequestInit) => Promise<Response>;

function json(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    // eslint-disable-next-line @typescript-eslint/naming-convention -- HTTP header name
    headers: { "Content-Type": "application/json" },
  });
}

function failure(status: number, code: string, message: string): Response {
  return json(status, { code, message });
}

function randomHex(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(ID_SUFFIX_BYTES));
  return [...bytes].map((b) => b.toString(HEX_RADIX).padStart(2, "0")).join("");
}

function statusOf(error: StorageError): number {
  switch (error.code) {
    case "not_found":
      return HTTP_NOT_FOUND;
    case "invalid_id":
      return HTTP_BAD_REQUEST;
    case "corrupt":
      return HTTP_SERVER_ERROR;
  }
}

/** Features that need the server (AI, PDF, import) until they are ported to the browser */
function unavailable(): Response {
  return failure(
    HTTP_NOT_IMPLEMENTED,
    "browser_unavailable",
    "This feature is not available in the browser version yet."
  );
}

/**
 * The server's storage routes, answered in the browser from a `CvStorage`. It has the same
 * addresses, bodies and error codes as the Fastify routes in `server/app.ts`, so the API client
 * (and everything above it) works the same in browser mode. Routes that need the server
 * (AI, PDF, PDF import) answer 501 `browser_unavailable`.
 */
export function createLocalFetch(
  storage: CvStorage,
  now: () => Date = () => new Date()
): FetchLike {
  async function loadSource(id: string): Promise<{
    variant: ReturnType<typeof resolveVariant>;
    source: ApplicationSource;
  }> {
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

  async function route(
    method: string,
    path: string,
    body: unknown,
    rawBody: BodyInit | null | undefined
  ): Promise<Response> {
    const parts = path
      .split("/")
      .filter(Boolean)
      .slice(1)
      .map(decodeURIComponent);
    const [area, id, sub] = parts;

    if (area === "health") {
      return json(HTTP_OK, { status: "ok" });
    }
    if (area === "ai" && id === "status" && method === "GET") {
      return json(HTTP_OK, { isConfigured: false, provider: "claude" });
    }

    if (area === "vault" && !id) {
      if (method === "GET") {
        return json(HTTP_OK, await storage.loadVault());
      }
      if (method === "PUT") {
        await storage.saveVault(CvFileSchema.check(body));
        return json(HTTP_OK, { status: "saved" });
      }
    }

    if (area === "templates") {
      if (!id && method === "GET") {
        return json(HTTP_OK, await storage.listTemplates());
      }
      if (id && method === "GET") {
        return json(HTTP_OK, await storage.loadTemplate(id));
      }
      if (id && method === "PUT") {
        const template = TemplateSchema.check(body);
        if (template.id !== id) {
          return failure(
            HTTP_BAD_REQUEST,
            "invalid",
            "The id in the body must match the id in the URL."
          );
        }
        await storage.saveTemplate(template);
        return json(HTTP_OK, { status: "saved" });
      }
      if (id && method === "DELETE") {
        await storage.loadTemplate(id);
        const users = (await storage.listJobs()).filter(
          (job) => job.templateId === id
        );
        if (users.length > 0) {
          return failure(
            HTTP_CONFLICT,
            "in_use",
            `This template is used by ${users.length} job(s): ${users
              .map((job) => job.name)
              .join(", ")}. Move them to another template first.`
          );
        }
        await storage.deleteTemplate(id);
        return json(HTTP_OK, { status: "deleted" });
      }
    }

    if (area === "jobs") {
      if (!id && method === "GET") {
        return json(HTTP_OK, await storage.listJobs());
      }
      if (id && sub === "resolved" && method === "GET") {
        const job = await storage.loadJob(id);
        return json(
          HTTP_OK,
          resolveVariant(await storage.loadTemplate(job.templateId), job)
        );
      }
      if (id && !sub && method === "GET") {
        return json(HTTP_OK, await storage.loadJob(id));
      }
      if (id && !sub && method === "PUT") {
        const job = JobSchema.check(body);
        if (job.id !== id) {
          return failure(
            HTTP_BAD_REQUEST,
            "invalid",
            "The id in the body must match the id in the URL."
          );
        }
        try {
          await storage.loadTemplate(job.templateId);
        } catch (error) {
          if (error instanceof StorageError && error.code !== "invalid_id") {
            return failure(
              HTTP_BAD_REQUEST,
              "invalid",
              `The job's template ${job.templateId} cannot be used: ${error.message}`
            );
          }
          throw error;
        }
        await storage.saveJob(job);
        return json(HTTP_OK, { status: "saved" });
      }
      if (id && !sub && method === "DELETE") {
        await storage.deleteJob(id);
        return json(HTTP_OK, { status: "deleted" });
      }
    }

    if (area === "applications") {
      if (!id && method === "GET") {
        return json(HTTP_OK, await storage.listApplications());
      }
      if (id && id !== "export" && !sub && method === "GET") {
        return json(HTTP_OK, await storage.loadApplication(id));
      }
      if (id && sub === "pdf" && method === "GET") {
        const bytes = await storage.loadApplicationPdf(id);
        return new Response(bytes as BlobPart, {
          status: HTTP_OK,
          // eslint-disable-next-line @typescript-eslint/naming-convention -- HTTP header name
          headers: { "Content-Type": "application/pdf" },
        });
      }
      if (!id && method === "POST") {
        const input = NewApplicationSchema.check(body);
        if (!input.withoutCv) {
          // Needs the PDF export, which comes to the browser later
          return unavailable();
        }
        const source = input.jobId
          ? (await loadSource(input.jobId).catch(() => undefined))?.source
          : undefined;
        const application = createApplication(
          input,
          undefined,
          undefined,
          toIsoDay(now()),
          randomHex(),
          source
        );
        await storage.saveApplication(application);
        return json(HTTP_OK, application);
      }
      if (id && sub === "pdf" && method === "PUT") {
        const bytes =
          rawBody instanceof Blob
            ? new Uint8Array(await rawBody.arrayBuffer())
            : undefined;
        if (!bytes || !PDF_MAGIC.every((byte, i) => bytes[i] === byte)) {
          return failure(
            HTTP_BAD_REQUEST,
            "invalid_pdf",
            "That file is not a PDF."
          );
        }
        const existing = await storage.loadApplication(id);
        if (existing.submitted) {
          return failure(
            HTTP_CONFLICT,
            "conflict",
            "This application already has the CV that was sent."
          );
        }
        await storage.saveApplication(existing, bytes);
        return json(HTTP_OK, { status: "saved" });
      }
      if (id && !sub && method === "PATCH") {
        const patch = ApplicationPatchSchema.check(body);
        const updated = updateApplication(
          await storage.loadApplication(id),
          patch,
          toIsoDay(now())
        );
        await storage.saveApplication(updated);
        return json(HTTP_OK, updated);
      }
      if (id && !sub && method === "DELETE") {
        await storage.deleteApplication(id);
        return json(HTTP_OK, { status: "deleted" });
      }
    }

    if (area === "candidates") {
      if (!id && method === "GET") {
        return json(HTTP_OK, await storage.listCandidates());
      }
      if (!id && method === "POST") {
        const candidate = createCandidate(
          NewCandidateSchema.check(body),
          randomHex(),
          toIsoDay(now())
        );
        await storage.saveCandidate(candidate);
        return json(HTTP_OK, candidate);
      }
      if (id && method === "PATCH") {
        const updated = updateCandidate(
          await storage.loadCandidate(id),
          CandidatePatchSchema.check(body)
        );
        await storage.saveCandidate(updated);
        return json(HTTP_OK, updated);
      }
      if (id && method === "DELETE") {
        await storage.deleteCandidate(id);
        return json(HTTP_OK, { status: "deleted" });
      }
    }

    return unavailable();
  }

  return async (input, init) => {
    const method = (init?.method ?? "GET").toUpperCase();
    const path = new URL(input, "http://local").pathname;
    const rawBody = init?.body;
    let body: unknown;
    if (typeof rawBody === "string") {
      try {
        body = JSON.parse(rawBody);
      } catch {
        return failure(
          HTTP_BAD_REQUEST,
          "invalid",
          "The body is not valid JSON."
        );
      }
    }
    try {
      return await route(method, path, body, rawBody);
    } catch (error) {
      if (error instanceof StorageError) {
        return failure(statusOf(error), error.code, error.message);
      }
      if (
        error instanceof ValidationError ||
        error instanceof ApplicationInputError ||
        error instanceof CandidateInputError
      ) {
        return failure(HTTP_BAD_REQUEST, "invalid", error.message);
      }
      return failure(HTTP_SERVER_ERROR, "internal", "Something went wrong.");
    }
  };
}
