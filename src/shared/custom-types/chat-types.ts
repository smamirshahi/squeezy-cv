import {
  Array,
  Boolean,
  Literal,
  Number,
  Object,
  Static,
  String,
  Union,
} from "runtypes";
import { ToneSchema } from "@custom-types/variant-types";

const WordingKind = Union(Literal("short"), Literal("long"), Literal("formal"));

/**
 * What the chat may do to the active variant. Everything is a choice about presentation
 * (shown, emphasised, order, which wording, tone, page limit) except `rewriteBullet`, which adds
 * an alternative wording to the vault bullet; the original text is never changed. Every
 * operation goes through the same reducers as a manual edit.
 */
export const OperationSchema = Union(
  Object({ op: Literal("hideItem"), itemId: String, isHidden: Boolean }),
  Object({
    op: Literal("emphasiseItem"),
    itemId: String,
    isEmphasised: Boolean,
  }),
  /** position is 1-based among the items of its section */
  Object({ op: Literal("moveItem"), itemId: String, position: Number }),
  /** position is 1-based among the sections */
  Object({ op: Literal("moveSection"), sectionId: String, position: Number }),
  Object({
    op: Literal("hideBullet"),
    itemId: String,
    bulletId: String,
    isHidden: Boolean,
  }),
  Object({
    op: Literal("useWording"),
    itemId: String,
    bulletId: String,
    wording: Union(WordingKind, Literal("text")),
  }),
  Object({
    op: Literal("rewriteBullet"),
    itemId: String,
    bulletId: String,
    wording: WordingKind,
    text: String,

    /** Set by the server, never taken from the model: what in the rewording is not in the CV */
    flags: Array(String).optional(),
  }),
  Object({ op: Literal("setTone"), tone: ToneSchema }),
  Object({ op: Literal("setPageLimit"), pages: Number })
);

export type Operation = Static<typeof OperationSchema>;

/** What the model may send back. Loose on purpose; the server turns it into `Operation`s. */
export const RawChatAnswerSchema = Object({
  reply: String.optional(),
  operations: Array(
    Object({
      op: String,
      item: String.optional(),
      section: String.optional(),
      bullet: String.optional(),
      isHidden: Boolean.optional(),
      isEmphasised: Boolean.optional(),
      position: Number.optional(),
      wording: String.optional(),
      text: String.optional(),
      tone: String.optional(),
      pages: Number.optional(),
    })
  ).optional(),
});

export type RawChatAnswer = Static<typeof RawChatAnswerSchema>;

/** The active variant as the model needs to know it (ids are the real ones) */
const ChatContextSchema = Object({
  tone: ToneSchema,
  pageLimit: Number,
  hiddenItemIds: Array(String),
  emphasisedItemIds: Array(String),

  /** Section ids in the order they are on the page */
  sectionOrder: Array(String),
});

const ChatMessageSchema = Object({
  role: Union(Literal("user"), Literal("assistant")),
  content: String,
});

export const ChatRequestSchema = Object({
  message: String,
  context: ChatContextSchema,

  /** The last few messages, so "and the one before it" can be understood */
  history: Array(ChatMessageSchema).optional(),
});

export const ChatResponseSchema = Object({
  reply: String,
  operations: Array(OperationSchema),
  warnings: Array(String),
});

export type ChatContext = Static<typeof ChatContextSchema>;
export type ChatRequest = Static<typeof ChatRequestSchema>;
export type ChatResponse = Static<typeof ChatResponseSchema>;

export const MAX_CHAT_MESSAGE_LENGTH = 2_000;
export const MAX_CHAT_HISTORY = 10;
