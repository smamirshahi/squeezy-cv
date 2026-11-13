import { AtsWordingRequestSchema } from "@custom-types/ats-wording-types";
import {
  BulletsRequestSchema,
  MAX_BULLETS_REQUIREMENTS,
} from "@custom-types/bullets-types";
import {
  ChatRequestSchema,
  MAX_CHAT_HISTORY,
  MAX_CHAT_MESSAGE_LENGTH,
} from "@custom-types/chat-types";
import {
  HideRequestSchema,
  MAX_HIDE_CANDIDATES,
} from "@custom-types/hide-types";
import {
  ImportRequestSchema,
  MAX_IMPORT_LENGTH,
} from "@custom-types/import-types";
import { MaskingSchema } from "@custom-types/masking-types";
import { MAX_PLACE_ITEMS, PlaceRequestSchema } from "@custom-types/place-types";
import { RewordRequestSchema } from "@custom-types/reword-types";
import {
  MAX_REWRITE_REQUIREMENTS,
  RewriteRequestSchema,
} from "@custom-types/rewrite-types";
import {
  AnalyseRequestSchema,
  ScoreSectionRequestSchema,
} from "@custom-types/score-types";
import { MAX_JOB_AD_LENGTH } from "@custom-types/tailor-types";
import { CvFile } from "@custom-types/vault-types";
import { AiChoiceError, AiRegistry } from "@server/ai/ai-registry";
import { AiClient, AiError, AiErrorCode } from "@server/ai/ai-types";
import {
  analyseJobAd,
  scoreJobTitles,
  scoreSection,
} from "@server/ai/analyse-job-ad";
import { suggestAtsWording } from "@server/ai/ats-wording";
import { chat } from "@server/ai/chat";
import {
  ItemNotFoundError,
  NothingToWorkFromError,
  generateBullets,
} from "@server/ai/generate-bullets";
import { importCv } from "@server/ai/import-cv";
import { pickHide } from "@server/ai/pick-hide";
import { placeItems } from "@server/ai/place-items";
import { BulletNotFoundError, rewriteBullet } from "@server/ai/rewrite-bullet";
import { rewordText } from "@server/ai/reword-text";
import {
  PreviewStop,
  Recorder,
  createRecorder,
  maskedClient,
} from "@server/ai/send-preview";
import { personalOf } from "@shared/ai/redact-personal";
import { AiTask } from "@shared/ai/providers";
import { JOB_TITLES_SECTION } from "@shared/vault/job-titles";

const HTTP_OK = 200;
const HTTP_BAD_REQUEST = 400;
const HTTP_NOT_FOUND = 404;
const HTTP_UNPROCESSABLE = 422;
const HTTP_BAD_GATEWAY = 502;
const HTTP_UNAVAILABLE = 503;
const HTTP_GATEWAY_TIMEOUT = 504;
const FOCUS_LIMIT = 10;
const FOCUS_LENGTH = 200;
const TERM_LENGTH = 100;
const BULLET_LENGTH = 600;

/** What a route answers: the status and the JSON body (the web framework or the browser sends it) */
export interface AiHttpResult {
  status: number;
  body: unknown;
}

/** The HTTP status that goes with a failed AI call */
function statusOfAi(code: AiErrorCode): number {
  switch (code) {
    case "not_configured":
      return HTTP_UNAVAILABLE;
    case "timeout":
      return HTTP_GATEWAY_TIMEOUT;
    case "refused":
    case "truncated":
      return HTTP_UNPROCESSABLE;
    case "api_error":
    case "invalid_output":
      return HTTP_BAD_GATEWAY;
  }
}

/** The answer for an `AiError` thrown by a route */
export function aiErrorResult(error: AiError): AiHttpResult {
  return fail(statusOfAi(error.code), `ai_${error.code}`, error.message);
}

function ok(body: unknown): AiHttpResult {
  return { status: HTTP_OK, body };
}

function fail(status: number, code: string, message: string): AiHttpResult {
  return { status, body: { code, message } };
}

/** The requirement(s) to emphasise, each cut to a sensible length (one text stays one text) */
function limitFocus(
  focus: string | string[] | undefined
): string | string[] | undefined {
  if (Array.isArray(focus)) {
    return focus
      .slice(0, FOCUS_LIMIT)
      .map((text) => text.slice(0, FOCUS_LENGTH));
  }
  return focus?.slice(0, FOCUS_LENGTH);
}

export interface AiRouteDeps {
  registry: AiRegistry;

  /** The saved CV the routes work from */
  loadVault: () => Promise<CvFile>;

  /** What to say when the provider of a task has no key: `tailoring` for the main tasks, `other` for the small ones */
  notConfigured: { tailoring: string; other: string };
}

interface RouteContext {
  body: unknown;
  /** The client for a task: the real one, or a recorder when only a preview is wanted. Undefined when not set up. */
  aiFor: (
    task: AiTask,
    options?: { callsToRecord?: number; standIn?: unknown }
  ) => AiClient | undefined;
  isMasking: boolean;
}

type Handler = (context: RouteContext) => Promise<AiHttpResult>;

/**
 * The `/api/ai/*` routes without any web framework, so the Fastify server and the browser
 * version (no server, the user's own key) run the very same code. Known failures are returned
 * as an `AiHttpResult`; unexpected ones (a body that fails its schema, `StorageError`,
 * `AiError`) are thrown for the caller to map (`aiErrorResult`).
 */
export function createAiRoutes(deps: AiRouteDeps): {
  /** Undefined when `method path` is not an AI route */
  handle: (
    method: string,
    path: string,
    body: unknown,
    options?: { isPreview?: boolean }
  ) => Promise<AiHttpResult | undefined>;
} {
  const { registry, loadVault, notConfigured } = deps;
  const notSetUp = (kind: "tailoring" | "other"): AiHttpResult =>
    fail(HTTP_UNAVAILABLE, "ai_not_configured", notConfigured[kind]);

  /** A route that needs the client of `task` and the saved vault */
  function withAi(
    task: AiTask,
    kind: "tailoring" | "other",
    run: (ai: AiClient, context: RouteContext) => Promise<AiHttpResult>,
    options?: { callsToRecord?: number; standIn?: unknown }
  ): Handler {
    return (context) => {
      const ai = context.aiFor(task, options);
      return ai ? run(ai, context) : Promise.resolve(notSetUp(kind));
    };
  }

  const masking = (): { isMaskingOrganisations: boolean } => ({
    isMaskingOrganisations: registry.isMaskingOrganisations(),
  });

  const routes: Record<string, Handler> = {
    "GET /api/ai/status": () => {
      const tailoring = registry.forTask("tailor");
      return Promise.resolve(
        ok({
          isConfigured: tailoring.client !== undefined,
          provider: tailoring.provider,
          providers: registry.providers(),
          choice: registry.choice(),
        })
      );
    },

    // Which provider each task uses. Keys are kept apart; only the choice is stored.
    "PUT /api/ai/choice": async ({ body }) => {
      try {
        await registry.choose(body as Record<string, string>);
      } catch (error) {
        if (error instanceof AiChoiceError) {
          return fail(HTTP_BAD_REQUEST, "provider_unavailable", error.message);
        }
        throw error;
      }
      return ok({ choice: registry.choice() });
    },

    // Reads an advert once: keywords and requirements for the job
    "POST /api/ai/analyse": withAi(
      "tailor",
      "tailoring",
      async (ai, { body }) => {
        const jobAd = AnalyseRequestSchema.check(body).jobAd.trim();
        if (jobAd.length === 0 || jobAd.length > MAX_JOB_AD_LENGTH) {
          return fail(
            HTTP_BAD_REQUEST,
            "invalid",
            `The job advert must be 1 to ${MAX_JOB_AD_LENGTH} characters.`
          );
        }
        const { vault } = await loadVault();
        return ok(await analyseJobAd(ai, vault, jobAd, masking()));
      }
    ),

    // A relevance score and reason for every entry (and skill) of ONE section. A preview
    // records every batch of the section, answered with empty scores.
    "POST /api/ai/score-section": withAi(
      "tailor",
      "tailoring",
      async (ai, { body }) => {
        const request = ScoreSectionRequestSchema.check(body);
        const { vault } = await loadVault();
        if (request.sectionId === JOB_TITLES_SECTION) {
          return ok(
            await scoreJobTitles(ai, vault, request.requirements, masking())
          );
        }
        const section = vault.sections.find(
          (entry) => entry.id === request.sectionId
        );
        if (!section) {
          return fail(
            HTTP_NOT_FOUND,
            "not_found",
            "That section is not in the saved CV. Save first."
          );
        }
        return ok(
          await scoreSection(
            ai,
            vault,
            section,
            request.requirements,
            masking()
          )
        );
      },
      { callsToRecord: Number.POSITIVE_INFINITY, standIn: { scores: [] } }
    ),

    // One chat turn: a reply and typed operations for the user to approve
    "POST /api/ai/chat": withAi("chat", "other", async (ai, { body }) => {
      const request = ChatRequestSchema.check(body);
      const message = request.message.trim();
      if (message.length === 0 || message.length > MAX_CHAT_MESSAGE_LENGTH) {
        return fail(
          HTTP_BAD_REQUEST,
          "invalid",
          `The message must be 1 to ${MAX_CHAT_MESSAGE_LENGTH} characters.`
        );
      }
      const { vault } = await loadVault();
      return ok(
        await chat(
          ai,
          vault,
          {
            ...request,
            message,
            history: (request.history ?? []).slice(-MAX_CHAT_HISTORY),
          },
          masking()
        )
      );
    }),

    // One bullet made shorter, longer or more formal
    "POST /api/ai/rewrite": withAi("chat", "other", async (ai, { body }) => {
      const request = RewriteRequestSchema.check(body);
      const requirements = (request.requirements ?? [])
        .slice(0, MAX_REWRITE_REQUIREMENTS)
        .map((text) => text.slice(0, FOCUS_LENGTH));
      const { vault } = await loadVault();
      try {
        return ok(
          await rewriteBullet(
            ai,
            vault,
            { ...request, requirements },
            masking()
          )
        );
      } catch (error) {
        if (error instanceof BulletNotFoundError) {
          return fail(HTTP_NOT_FOUND, "not_found", error.message);
        }
        throw error;
      }
    }),

    // Bullets made from an item's description for a job
    "POST /api/ai/bullets": withAi("chat", "other", async (ai, { body }) => {
      const request = BulletsRequestSchema.check(body);
      const requirements = (request.requirements ?? [])
        .slice(0, MAX_BULLETS_REQUIREMENTS)
        .map((text) => text.slice(0, FOCUS_LENGTH));
      const { vault } = await loadVault();
      try {
        return ok(
          await generateBullets(
            ai,
            vault,
            {
              ...request,
              requirements,
              focus: limitFocus(request.focus),
              current: (request.current ?? []).map((text) =>
                text.slice(0, BULLET_LENGTH)
              ),
            },
            masking()
          )
        );
      } catch (error) {
        if (error instanceof ItemNotFoundError) {
          return fail(HTTP_NOT_FOUND, "not_found", error.message);
        }
        if (error instanceof NothingToWorkFromError) {
          return fail(HTTP_BAD_REQUEST, "nothing_to_work_from", error.message);
        }
        throw error;
      }
    }),

    // One text (summary, description) shortened, lengthened or fitted to the job's keywords
    "POST /api/ai/reword": withAi("chat", "other", async (ai, { body }) => {
      const request = RewordRequestSchema.check(body);
      const { vault } = await loadVault();
      try {
        return ok(
          await rewordText(
            ai,
            vault,
            {
              ...request,
              requirements: (request.requirements ?? []).map((text) =>
                text.slice(0, FOCUS_LENGTH)
              ),
              focus: limitFocus(request.focus),
            },
            masking()
          )
        );
      } catch (error) {
        if (error instanceof ItemNotFoundError) {
          return fail(HTTP_NOT_FOUND, "not_found", error.message);
        }
        if (error instanceof NothingToWorkFromError) {
          return fail(HTTP_BAD_REQUEST, "nothing_to_work_from", error.message);
        }
        throw error;
      }
    }),

    // The advert's words worked into the CV's own texts, where they already say it
    "POST /api/ai/ats-wording": withAi(
      "chat",
      "other",
      async (ai, { body }) => {
        const request = AtsWordingRequestSchema.check(body);
        const { vault } = await loadVault();
        try {
          return ok(
            await suggestAtsWording(
              ai,
              vault,
              {
                terms: request.terms.map((term) => term.slice(0, TERM_LENGTH)),
                reworded: (request.reworded ?? []).map((term) =>
                  term.slice(0, TERM_LENGTH)
                ),
              },
              masking()
            )
          );
        } catch (error) {
          if (error instanceof NothingToWorkFromError) {
            return fail(
              HTTP_BAD_REQUEST,
              "nothing_to_work_from",
              error.message
            );
          }
          throw error;
        }
      }
    ),

    // Which items to hide so the CV fits
    "POST /api/ai/hide": withAi("hide", "tailoring", async (ai, { body }) => {
      const request = HideRequestSchema.check(body);
      if (
        request.candidates.length === 0 ||
        request.candidates.length > MAX_HIDE_CANDIDATES
      ) {
        return fail(
          HTTP_BAD_REQUEST,
          "invalid",
          `Send 1 to ${MAX_HIDE_CANDIDATES} items.`
        );
      }
      return ok(await pickHide(ai, request));
    }),

    // Where items in the Unsorted section belong
    "POST /api/ai/place": withAi("place", "tailoring", async (ai, { body }) => {
      const request = PlaceRequestSchema.check(body);
      if (
        request.items.length === 0 ||
        request.items.length > MAX_PLACE_ITEMS ||
        request.sections.length === 0
      ) {
        return fail(
          HTTP_BAD_REQUEST,
          "invalid",
          `Send 1 to ${MAX_PLACE_ITEMS} items and at least one section.`
        );
      }
      const { vault } = await loadVault();
      return ok(
        await placeItems(
          ai,
          request,
          personalOf(vault, registry.isMaskingOrganisations())
        )
      );
    }),

    // Sorts pasted CV text into a vault (shown for review; nothing is saved here)
    "POST /api/ai/import": withAi(
      "import",
      "tailoring",
      async (ai, { body }) => {
        const request = ImportRequestSchema.check(body);
        const text = request.text.trim();
        if (text.length === 0 || text.length > MAX_IMPORT_LENGTH) {
          return fail(
            HTTP_BAD_REQUEST,
            "invalid",
            `The text must be 1 to ${MAX_IMPORT_LENGTH} characters.`
          );
        }
        return ok(await importCv(ai, text));
      }
    ),
  };

  return {
    async handle(method, path, body, options = {}) {
      const route = routes[`${method} ${path}`];
      if (!route) {
        return undefined;
      }
      // With `isPreview` the client only records what would be sent (and works without a key). A
      // body `masking` (the user's choices in the "Send to AI" dialog) is added to what is sent.
      let recorder: Recorder | undefined;
      const aiFor: RouteContext["aiFor"] = (task, recordOptions = {}) => {
        const { client, provider } = registry.forTask(task);
        const rawMasking = (body as { masking?: unknown } | undefined)?.masking;
        const userMasking =
          rawMasking === undefined
            ? undefined
            : MaskingSchema.check(rawMasking);
        if (options.isPreview) {
          recorder = createRecorder({
            provider,
            masking: userMasking,
            ...recordOptions,
          });
          return recorder;
        }
        return client ? maskedClient(client, userMasking) : undefined;
      };
      try {
        const result = await route({
          body,
          aiFor,
          isMasking: registry.isMaskingOrganisations(),
        });
        // A preview of a task that ran to its end (it never reached a stop) is answered here
        if (
          recorder &&
          !recorder.isStopped &&
          result.status < HTTP_BAD_REQUEST
        ) {
          return ok(recorder.finish());
        }
        return result;
      } catch (error) {
        if (error instanceof PreviewStop) {
          return ok(error.preview);
        }
        throw error;
      }
    },
  };
}
