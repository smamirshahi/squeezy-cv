import { Number, Object, Static, String } from "runtypes";

/**
 * What the server needs to know about a saved variant to store and list it. The full
 * variant schema replaces this when variants are modelled; extra fields are kept as they are.
 */
export const StoredVariantSchema = Object({
  /** Stable id, also the file name */
  id: String,

  /** Format version of the variant */
  version: Number,

  /** Name shown in lists, e.g. "Acme - Senior React Dev" */
  name: String,
});

export type StoredVariant = Static<typeof StoredVariantSchema>;

/** Variant ids become file names, so only these characters are allowed */
export const VARIANT_ID_PATTERN = /^[A-Za-z0-9_-]{1,64}$/;
