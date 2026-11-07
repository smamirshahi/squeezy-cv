import {
  Object,
  String,
  Array,
  Static,
  Union,
  Literal,
  Boolean,
} from "runtypes";

export const SkillItemSchema = Object({
  /** The ID of the skill item */
  id: String,

  /** The name of the skill item */
  name: String,

  /* eslint-disable @typescript-eslint/no-magic-numbers */
  /** The number of the skill item from 0 (no skill) to 10 (excellent) */
  rating: Union(
    Literal(0),
    Literal(0.5),
    Literal(1.0),
    Literal(1.5),
    Literal(2.0),
    Literal(2.5),
    Literal(3.0),
    Literal(3.5),
    Literal(4.0),
    Literal(4.5),
    Literal(5.0)
  ),
});

export const SkillCategorySchema = Object({
  /** The ID of the skill category */
  id: String,

  /** The name of the skill */
  category: String,

  /** The name of the skill item */
  items: Array(SkillItemSchema),

  // /** Whether to hide this specific row or now */
  shouldShow: Boolean,
});
export type SkillItem = Static<typeof SkillItemSchema>;
