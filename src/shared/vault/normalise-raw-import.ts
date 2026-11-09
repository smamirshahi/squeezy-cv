import { SectionTypeSchema } from "@custom-types/vault-types";

type Obj = { [key: string]: unknown };

function isObject(value: unknown): value is Obj {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/** A string for text, numbers and lists of those; undefined for anything else (null, objects, empty) */
function toText(value: unknown): string | undefined {
  if (typeof value === "string") return value.trim() === "" ? undefined : value;
  if (typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }
  if (Array.isArray(value)) {
    const parts = value.map(toText).filter((p): p is string => p !== undefined);
    return parts.length > 0 ? parts.join("\n") : undefined;
  }
  return undefined;
}

function toTextList(value: unknown): string[] {
  if (typeof value === "string") return value.trim() === "" ? [] : [value];
  if (!Array.isArray(value)) return [];
  return value.map(toText).filter((p): p is string => p !== undefined);
}

const PROFILE_KEYS = [
  "fullName",
  "headline",
  "email",
  "phone",
  "location",
  "rightToWork",
] as const;

/**
 * Small local models often answer almost right: `null` for a missing value, numbers for years,
 * a list for a text, a missing `links`, an unknown section type. This turns such an answer
 * into the shape `RawImportSchema` expects, without inventing anything. Whatever is still
 * wrong afterwards is reported by the schema as before.
 */
export function normaliseRawImport(value: unknown): unknown {
  if (!isObject(value)) return value;
  const rawProfile = isObject(value.profile) ? value.profile : {};
  const profile: Obj = { fullName: toText(rawProfile.fullName) ?? "" };
  for (const key of PROFILE_KEYS) {
    const text = toText(rawProfile[key]);
    if (key !== "fullName" && text !== undefined) profile[key] = text;
  }

  const links = (Array.isArray(value.links) ? value.links : [])
    .filter(isObject)
    .map((link) => ({
      label: toText(link.label) ?? toText(link.url) ?? "",
      url: toText(link.url) ?? "",
    }))
    .filter((link) => link.url !== "");

  const sections = (Array.isArray(value.sections) ? value.sections : [])
    .filter(isObject)
    .map((section) => {
      const type = SectionTypeSchema.guard(section.type)
        ? section.type
        : "custom";
      const items = (Array.isArray(section.items) ? section.items : [])
        .filter(isObject)
        .map((item) => {
          const fields: Record<string, string> = {};
          if (isObject(item.fields)) {
            for (const [key, field] of Object.entries(item.fields)) {
              const text = toText(field);
              if (text !== undefined) fields[key] = text;
            }
          }
          return {
            fields,
            bullets: toTextList(item.bullets),
            tags: toTextList(item.tags),
          };
        });
      return { type, title: toText(section.title) ?? "", items };
    });

  return { profile, links, sections };
}
