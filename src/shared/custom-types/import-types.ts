import { Array, Object, Record, Static, String } from "runtypes";
import { SectionTypeSchema } from "@custom-types/vault-types";

/** What the model returns when it sorts pasted CV text. Loose on purpose; `importToVault` makes it a vault. */
export const RawImportSchema = Object({
  profile: Object({
    fullName: String,
    headline: String.optional(),
    email: String.optional(),
    phone: String.optional(),
    location: String.optional(),
    rightToWork: String.optional(),
  }),
  links: Array(Object({ label: String, url: String })),
  sections: Array(
    Object({
      type: SectionTypeSchema,
      title: String,
      items: Array(
        Object({
          fields: Record(String, String),
          /** Plain text; for skills groups the individual skills */
          bullets: Array(String),
          tags: Array(String).optional(),
        })
      ),
    })
  ),
});

export type RawImport = Static<typeof RawImportSchema>;

/** The longest text accepted for import, in characters */
export const MAX_IMPORT_LENGTH = 30_000;

export const ImportRequestSchema = Object({ text: String });
