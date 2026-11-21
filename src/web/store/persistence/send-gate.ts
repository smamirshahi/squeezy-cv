import { MASK_KINDS, Masking, MaskTerm } from "@custom-types/masking-types";
import { AI_USAGE_HEADER, parseUsageHeader } from "@shared/ai/pricing";
import { AI_PROVIDER_INFO, AiProviderId, AiTask } from "@shared/ai/providers";
import { recordAiUsage } from "@store/persistence/ai-usage-log";

/** What the server says it would send: see `SendPreview` in `server/ai/send-preview.ts` */
export interface SendPreviewData {
  provider: AiProviderId;

  /** The model that would answer (the cost estimate depends on it) */
  model?: string;

  /** The task the request belongs to (to change its model) */
  task?: AiTask;
  calls: { promptName: string; system: string; input: string }[];
  terms: MaskTerm[];
  suggestions: string[];
}

/** One AI request waiting for the user's approval */
export interface SendApprovalRequest {
  /** What is being sent, in words ("Your whole CV and the job advert") */
  scope: string;

  /** Whether the text includes a job advert (the user may mark it as private) */
  hasAdvert: boolean;

  preview: SendPreviewData;

  /** Masking the first preview was made with (the user's remembered masks) */
  initial: Masking;

  /** The same preview again with other masking, after the user changed it */
  refresh: (masking: Masking) => Promise<SendPreviewData>;
}

export interface SendApproval {
  masking: Masking;
}

type SendHost = (request: SendApprovalRequest) => Promise<SendApproval | null>;

/** The AI requests that send text to a model, and what each sends */
const GATED: Record<string, { scope: string; hasAdvert: boolean }> = {
  "/api/ai/analyse": { scope: "The job advert only", hasAdvert: true },
  "/api/ai/score-section": {
    scope: "One section of your CV",
    hasAdvert: false,
  },
  "/api/ai/chat": {
    scope: "Your message and an outline of your CV",
    hasAdvert: false,
  },
  "/api/ai/rewrite": { scope: "One bullet and its item", hasAdvert: false },
  "/api/ai/bullets": {
    scope: "One item's description",
    hasAdvert: false,
  },
  "/api/ai/reword": { scope: "One text of your CV", hasAdvert: false },
  "/api/ai/ats-wording": {
    scope: "Your summary and descriptions, and the advert's keywords",
    hasAdvert: false,
  },
  "/api/ai/hide": { scope: "Short labels of items", hasAdvert: false },
  "/api/ai/place": {
    scope: "Unsorted items and section names",
    hasAdvert: false,
  },
  "/api/ai/import": { scope: "The whole text you pasted", hasAdvert: false },
};

/** What each request is called in the usage log */
const USAGE_LABELS: Record<string, string> = {
  "/api/ai/analyse": "Analyse a job advert",
  "/api/ai/score-section": "Score a section",
  "/api/ai/chat": "Chat edit",
  "/api/ai/rewrite": "Reword a bullet",
  "/api/ai/bullets": "Make bullets",
  "/api/ai/reword": "Reword a text",
  "/api/ai/ats-wording": "ATS wording",
  "/api/ai/hide": "Pick what to hide",
  "/api/ai/place": "Place unsorted items",
  "/api/ai/import": "Sort pasted CV text",
};

const MASKS_KEY = "squeezy-cv-always-mask";
const MAX_REMEMBERED_MASKS = 100;

let host: SendHost | undefined;
let batch: { entries: BatchEntry[]; approval?: SendApproval } | undefined;

/** The dialog registers itself here; without one (tests, print page) nothing is asked */
export function registerSendHost(next: SendHost): () => void {
  host = next;
  return () => {
    if (host === next) {
      host = undefined;
    }
  };
}

/** The masks the user asked to keep for next time (browser storage only) */
function readRememberedMasks(): Masking["custom"] {
  try {
    const parsed: unknown = JSON.parse(
      window.localStorage.getItem(MASKS_KEY) ?? "[]"
    );
    if (!Array.isArray(parsed)) {
      return [];
    }
    return parsed
      .filter(
        (entry): entry is Masking["custom"][number] =>
          typeof entry === "object" &&
          entry !== null &&
          typeof entry.text === "string" &&
          (MASK_KINDS as readonly string[]).includes(entry.kind)
      )
      .slice(0, MAX_REMEMBERED_MASKS);
  } catch {
    return [];
  }
}

export function writeRememberedMasks(custom: Masking["custom"]): void {
  try {
    window.localStorage.setItem(
      MASKS_KEY,
      JSON.stringify(custom.slice(0, MAX_REMEMBERED_MASKS))
    );
  } catch {
    // Storage may be blocked; the masks then only last for this request
  }
}

/** One request of a batch: the route and the body it will be sent with */
export interface BatchEntry {
  url: string;
  body: unknown;
}

/** The previews of several requests as one: all messages, the terms added up, the suggestions once */
function mergePreviews(previews: SendPreviewData[]): SendPreviewData {
  const terms = new Map<string, MaskTerm>();
  for (const term of previews.flatMap((preview) => preview.terms)) {
    const before = terms.get(term.placeholder);
    terms.set(
      term.placeholder,
      before ? { ...before, count: before.count + term.count } : term
    );
  }
  return {
    provider: previews[0].provider,
    model: previews[0].model,
    task: previews[0].task,
    calls: previews.flatMap((preview) => preview.calls),
    terms: [...terms.values()],
    suggestions: [...new Set(previews.flatMap((p) => p.suggestions))],
  };
}

/**
 * Runs several AI requests with ONE approval: the first asks, the rest reuse the answer (for
 * example scoring every section of a CV). The window shows the messages of ALL `entries` (what
 * `run` will send), so nothing goes out that was not shown. A cancel stops the rest as it does
 * for one request.
 */
export async function withOneApproval<T>(
  entries: BatchEntry[],
  run: () => Promise<T>
): Promise<T> {
  batch = { entries };
  try {
    return await run();
  } finally {
    batch = undefined;
  }
}

function cancelled(): Response {
  return new Response(
    JSON.stringify({
      code: "cancelled",
      message: "Cancelled. Nothing was sent.",
    }),

    { status: 409, headers: { "Content-Type": "application/json" } }
  );
}

type FetchLike = (input: string, init?: RequestInit) => Promise<Response>;

/**
 * Puts the "Send to AI" step in front of every request that would send text to an online
 * model: the server first says what it would send (masked), the user reviews and adjusts the
 * masking, and only then is the real request made with those choices. A local model needs no
 * step. Anything else goes straight through.
 */
export function gateAiFetch(fetchImpl: FetchLike): FetchLike {
  const gated = gateRequests(fetchImpl);
  return async (input, init) => {
    const response = await gated(input, init);
    // What the request really used (also when it failed after some attempts): add it to the log
    const usage = parseUsageHeader(response.headers.get(AI_USAGE_HEADER));
    if (usage && USAGE_LABELS[input]) {
      recordAiUsage(USAGE_LABELS[input], usage);
    }
    return response;
  };
}

function gateRequests(fetchImpl: FetchLike): FetchLike {
  return async (input, init) => {
    const kind = GATED[input];
    if (
      !host ||
      !kind ||
      init?.method !== "POST" ||
      typeof init.body !== "string"
    ) {
      return fetchImpl(input, init);
    }
    const body = JSON.parse(init.body) as Record<string, unknown>;
    const withMasking = (masking: Masking): RequestInit => ({
      ...init,
      body: JSON.stringify({ ...body, masking }),
    });
    const previewOf = (masking: Masking): Promise<Response> =>
      fetchImpl(input, {
        ...withMasking(masking),
        headers: {
          ...(init.headers as Record<string, string> | undefined),

          "x-ai-preview": "1",
        },
      });

    if (batch?.approval) {
      return fetchImpl(input, withMasking(batch.approval.masking));
    }

    const initial: Masking = { custom: readRememberedMasks(), skip: [] };
    // In a batch the window shows every request of the batch, not only this one
    const previewAll = async (
      masking: Masking
    ): Promise<SendPreviewData | Response> => {
      const requests = batch?.entries.length
        ? batch.entries.map((entry) =>
            fetchImpl(entry.url, {
              ...init,
              body: JSON.stringify({ ...(entry.body as object), masking }),
              headers: {
                ...(init.headers as Record<string, string> | undefined),

                "x-ai-preview": "1",
              },
            })
          )
        : [previewOf(masking)];
      const answers = await Promise.all(requests);
      const failed = answers.find((answer) => !answer.ok);
      if (failed) {
        return failed;
      }
      return mergePreviews(
        (await Promise.all(
          answers.map((answer) => answer.json())
        )) as SendPreviewData[]
      );
    };
    const first = await previewAll(initial);
    if (first instanceof Response) {
      return first;
    }
    const preview = first;
    if (!AI_PROVIDER_INFO[preview.provider].isOnline) {
      return fetchImpl(input, init);
    }
    const approval = await host({
      ...kind,
      preview,
      initial,
      refresh: async (masking) => {
        const again = await previewAll(masking);
        if (again instanceof Response) {
          throw new Error("The preview could not be made.");
        }
        return again;
      },
    });
    if (!approval) {
      return cancelled();
    }
    if (batch) {
      batch.approval = approval;
    }
    return fetchImpl(input, withMasking(approval.masking));
  };
}
