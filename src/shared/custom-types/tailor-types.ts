import {
  Array,
  Boolean,
  Literal,
  Null,
  Number,
  Object,
  Static,
  String,
  Union,
} from "runtypes";
import { ToneSchema } from "@custom-types/variant-types";

/** What a job advert asks for (step 1 of tailoring) */
export const RequirementsSchema = Object({
  jobTitle: String,

  /** e.g. "junior", "mid", "senior", "lead"; empty if the advert does not say */
  seniority: String,

  /** Skills and experience the advert insists on */
  mustHave: Array(String),

  /** Skills and experience that are a plus */
  niceToHave: Array(String),

  /** Words an applicant-tracking system is likely to look for */
  keywords: Array(String),
});

export const RewriteWordingSchema = Union(
  Literal("short"),
  Literal("long"),
  Literal("formal")
);

/** How relevant an item is to the job, and whether to show and highlight it */
export const ItemProposalSchema = Object({
  itemId: String,

  /** 0 (irrelevant) to 1 (central to the job) */
  relevance: Number,

  isIncluded: Boolean,
  isHighlighted: Boolean,

  /** One short sentence for the user: why */
  reason: String,
});

export const BulletProposalSchema = Object({
  itemId: String,
  bulletId: String,
  isIncluded: Boolean,

  /** A rewording of the same facts; the original text is never replaced */
  rewrite: Object({
    wording: RewriteWordingSchema,
    text: String,
  }).optional(),

  reason: String,

  /**
   * Set by the server, never trusted from the model: what in the rewrite is not in the
   * CV (empty when nothing). A flagged rewrite must not be accepted automatically.
   */
  flags: Array(String).optional(),
});

/** The model's proposal (step 2 of tailoring) */
export const ProposalSchema = Object({
  items: Array(ItemProposalSchema),
  bullets: Array(BulletProposalSchema),

  /**
   * Section ids (real ones) in the order the model suggests, when it suggests a change.
   * Set by `sanitiseProposal` to a complete list without duplicates, or left out.
   */
  sectionOrder: Array(String).optional(),

  /** One short sentence: why the sections are moved */
  sectionOrderReason: String.optional(),

  /** A draft personal statement, only from facts in the CV */
  statement: String,

  /** Set by the server: what in the statement is not in the CV */
  statementFlags: Array(String).optional(),

  /** Things the job asks for that the CV does not show. For the user to decide on. */
  gaps: Array(String),
});

/**
 * What a model may send back for the proposal. Deliberately forgiving about what small models
 * get wrong (a missing reason, a null, extra keys): `toProposal` fills the gaps and turns it
 * into a strict `Proposal`. Everything that matters (ids, facts) is still checked after that.
 */
export const RawProposalSchema = Object({
  items: Array(
    Object({
      itemId: String,
      relevance: Number.optional(),
      isIncluded: Boolean.optional(),
      isHighlighted: Boolean.optional(),
      reason: String.optional(),
    })
  ).optional(),
  bullets: Array(
    Object({
      bulletId: String,
      itemId: String.optional(),
      isIncluded: Boolean.optional(),
      rewrite: Union(
        Object({ wording: String.optional(), text: String }),
        Null
      ).optional(),
      reason: String.optional(),
    })
  ).optional(),
  /** Section ids ("s1", "s2", ...) in the suggested order */
  sectionOrder: Array(String).optional(),
  sectionOrderReason: String.optional(),
  statement: String.optional(),
  gaps: Array(String).optional(),
});

export const TailorRequestSchema = Object({
  /** The text of the job advert */
  jobAd: String,
  tone: ToneSchema,
});

export const TailorResultSchema = Object({
  requirements: RequirementsSchema,
  proposal: ProposalSchema,

  /** Things dropped or changed before showing the proposal, in words */
  warnings: Array(String),
});

export type RawProposal = Static<typeof RawProposalSchema>;
export type Requirements = Static<typeof RequirementsSchema>;
export type ItemProposal = Static<typeof ItemProposalSchema>;
export type BulletProposal = Static<typeof BulletProposalSchema>;
export type Proposal = Static<typeof ProposalSchema>;
export type TailorRequest = Static<typeof TailorRequestSchema>;
export type TailorResult = Static<typeof TailorResultSchema>;

/** The longest job advert accepted, in characters */
export const MAX_JOB_AD_LENGTH = 20_000;
