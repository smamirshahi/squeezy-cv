import Fastify, { FastifyInstance, FastifyReply } from "fastify";
import { ValidationError } from "runtypes";
import { CvFileSchema } from "@custom-types/vault-types";
import { StoredVariantSchema } from "@custom-types/stored-variant-types";
import {
  CvStorage,
  StorageError,
  StorageErrorCode,
} from "@server/storage/cv-storage";

/* eslint-disable @typescript-eslint/no-magic-numbers -- 10 MB, written out */
const MAX_BODY_BYTES = 10 * 1024 * 1024;
/* eslint-enable @typescript-eslint/no-magic-numbers */

const HTTP_BAD_REQUEST = 400;
const HTTP_FORBIDDEN = 403;
const HTTP_NOT_FOUND = 404;
const HTTP_SERVER_ERROR = 500;
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
  isLoggingEnabled?: boolean;
}

/** Builds the API. It does not listen; `main.ts` (or a test) decides how to run it. */
export function buildServer({
  storage,
  isLoggingEnabled = false,
}: ServerOptions): FastifyInstance {
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

  app.get("/api/health", () => ({ status: "ok" }));

  app.get("/api/vault", () => storage.loadVault());

  app.put("/api/vault", async (request) => {
    await storage.saveVault(CvFileSchema.check(request.body));
    return { status: "saved" };
  });

  app.get("/api/variants", () => storage.listVariants());

  app.get<{ Params: { id: string } }>("/api/variants/:id", (request) =>
    storage.loadVariant(request.params.id)
  );

  app.put<{ Params: { id: string } }>(
    "/api/variants/:id",
    async (request, reply) => {
      const variant = StoredVariantSchema.check(request.body);
      if (variant.id !== request.params.id) {
        return sendError(
          reply,
          HTTP_BAD_REQUEST,
          "invalid",
          "The id in the body must match the id in the URL."
        );
      }
      await storage.saveVariant(variant);
      return { status: "saved" };
    }
  );

  app.delete<{ Params: { id: string } }>(
    "/api/variants/:id",
    async (request) => {
      await storage.deleteVariant(request.params.id);
      return { status: "deleted" };
    }
  );

  return app;
}
