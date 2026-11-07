import { Operation, OperationSchema } from "@custom-types/chat-types";

/** One message of the chat, as shown in the panel and kept between visits */
export interface Turn {
  id: number;
  role: "user" | "assistant";
  content: string;
  operations?: Operation[];
  warnings?: string[];

  /** Which operations are ticked (all, except flagged rewordings) */
  selected?: boolean[];

  /** Set once applied: how many history steps there were then, so Undo only shows while it is still the last step */
  appliedAtStep?: number;
  appliedCount?: number;
}

/** Only the newest turns are kept, so the browser's storage never fills up */
export const MAX_REMEMBERED_TURNS = 40;

const KEY_PREFIX = "cv-builder-chat:";

function keyOf(jobId: string): string {
  return `${KEY_PREFIX}${jobId}`;
}

function isTurn(value: unknown): value is Turn {
  if (typeof value !== "object" || value === null) {
    return false;
  }
  const turn = value as Record<string, unknown>;
  return (
    typeof turn.id === "number" &&
    (turn.role === "user" || turn.role === "assistant") &&
    typeof turn.content === "string"
  );
}

/** Keeps only operations that are still valid; the rest of the turn is kept as text */
function cleanTurn(turn: Turn): Turn {
  const operations = (turn.operations ?? []).filter((op) =>
    OperationSchema.guard(op)
  );
  const hasAll = operations.length === (turn.operations ?? []).length;
  return {
    ...turn,
    operations,
    // the ticks only make sense next to the operations they belong to
    selected: hasAll ? turn.selected : operations.map(() => false),
    // the undo steps of an earlier visit are gone: -1 never matches the current step, so no Undo is offered
    ...(turn.appliedAtStep === undefined ? {} : { appliedAtStep: -1 }),
  };
}

/** The chat of a variant from this browser, or nothing if there is none or it cannot be read */
export function loadChat(
  jobId: string,
  storage: Pick<Storage, "getItem"> = localStorage
): Turn[] {
  try {
    const parsed: unknown = JSON.parse(storage.getItem(keyOf(jobId)) ?? "");
    return Array.isArray(parsed) ? parsed.filter(isTurn).map(cleanTurn) : [];
  } catch {
    return [];
  }
}

/** Remembers the chat of a variant in this browser only (never in the data folder). An empty chat is forgotten. */
export function saveChat(
  jobId: string,
  turns: Turn[],
  storage: Pick<Storage, "setItem" | "removeItem"> = localStorage
): void {
  try {
    if (turns.length === 0) {
      storage.removeItem(keyOf(jobId));
      return;
    }
    storage.setItem(
      keyOf(jobId),
      JSON.stringify(turns.slice(-MAX_REMEMBERED_TURNS))
    );
  } catch {
    // storage full or blocked: the chat just is not remembered
  }
}
