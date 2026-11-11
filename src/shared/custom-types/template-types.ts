import {
  Boolean,
  Literal,
  Number,
  Object,
  Static,
  String,
  Union,
} from "runtypes";
import { StyleSchema } from "@custom-types/styles-types";
import {
  FitLimitsSchema,
  FitModeSchema,
  SkillDisplaySchema,
  SkillGroupBySchema,
  VariantLayoutSchema,
} from "@custom-types/variant-types";

/** Ids become file names, so only these characters (same rule as variants) */
export const TEMPLATE_ID_PATTERN = /^[A-Za-z0-9_-]{1,64}$/;

/** The current version of the template format. Bump it together with a migration. */
export const CURRENT_TEMPLATE_VERSION = 1;

/**
 * How a CV looks: layout, section order, style, page limit, skill display and the
 * auto-fit policy. What is shown is decided by a job (`JobSchema`), never here.
 */
export const TemplateSchema = Object({
  /** Stable id, also the file name */
  id: String,

  /** Format version of the template */
  version: Number,

  /** Name shown in lists, e.g. "Template 1" */
  name: String,

  /** Day the template was made (YYYY-MM-DD); missing in templates from before this field */
  createdAt: String.optional(),

  layout: VariantLayoutSchema,

  style: StyleSchema,

  /** Whether the preview shrinks (or fills) the CV to the page limit */
  isAutoFit: Boolean.optional(),

  fitMode: FitModeSchema.optional(),

  /** User limits for auto-fit (spacing, margin and body text floors) */
  fitLimits: FitLimitsSchema.optional(),

  skillDisplay: SkillDisplaySchema.optional(),

  /** Missing = by group */
  skillGroupBy: SkillGroupBySchema.optional(),

  /** Columns of the skill lists, 1 or 2 (default 1) */
  skillColumns: Union(Literal(1), Literal(2)).optional(),

  /** Skills with a level below this (1-5) are not shown. Unrated skills count as 0. */
  skillMinLevel: Number.optional(),
});

export type Template = Static<typeof TemplateSchema>;
