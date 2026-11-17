import { RawImport } from "@custom-types/import-types";
import {
  CURRENT_VAULT_VERSION,
  Item,
  Section,
  Vault,
} from "@custom-types/vault-types";

const DATE_FIELDS = new Set(["startDate", "endDate"]);

/** "2021", "2021-03" or "2021-03-15" as the ISO day the app stores; anything else is not a date */
export function toIsoDate(text: string): string | null {
  const match = /^(\d{4})(?:-(\d{2}))?(?:-(\d{2}))?$/.exec(text.trim());
  if (!match) {
    return null;
  }
  return `${match[1]}-${match[2] ?? "01"}-${match[3] ?? "01"}`;
}

function normalise(text: string): string {
  return text.toLowerCase().replace(/\s+/g, " ").trim();
}

/** "2013-2016" in startDate with no endDate is a range the model did not split */
function splitYearRange(
  fields: Record<string, string>
): Record<string, string> {
  const range = /^(\d{4})\s*[-–]\s*(\d{4})$/.exec(
    fields.startDate?.trim() ?? ""
  );
  if (range && !fields.endDate?.trim()) {
    return { ...fields, startDate: range[1], endDate: range[2] };
  }
  return fields;
}

/** Keys the model (or an older prompt) may use for what the app calls something else */
function renameFields(
  type: string,
  fields: Record<string, string>
): Record<string, string> {
  if (
    type === "education" &&
    "institution" in fields &&
    !("institute" in fields)
  ) {
    const { institution, ...rest } = fields;
    return { ...rest, institute: institution };
  }
  return fields;
}

const INSTRUCTION_LIKE =
  /(ignore|disregard|forget)\s+(all\s+|any\s+)?(the\s+)?(previous|prior|above|earlier)\s+(instructions|prompts?)/i;

export interface ImportOutcome {
  vault: Vault;

  /** Things the user should look at: text that is not in what was pasted, dates that could not be read */
  warnings: string[];
}

/**
 * Turns the model's answer into a vault, with new ids from `newId`. Nothing is trusted: every
 * bullet, name, email and phone number that cannot be found in `source` is reported (the
 * model may have invented it), and dates that are not ISO are dropped with a note. Pure.
 */
export function importToVault(
  raw: RawImport,
  source: string,
  newId: () => string
): ImportOutcome {
  const haystack = normalise(source);
  const warnings: string[] = [];
  function check(label: string, text: string | undefined): void {
    if (text && !haystack.includes(normalise(text))) {
      warnings.push(`${label} is not in the text you pasted: “${text}”.`);
    }
  }

  if (INSTRUCTION_LIKE.test(source)) {
    warnings.push(
      "The pasted text contains a line that looks like an instruction to the AI. It was treated as text; check the result for anything you did not write."
    );
  }

  // only the known keys: a small model may add others (even ones taken from injected text)
  const { fullName, headline, email, phone, location, rightToWork } =
    raw.profile;
  const profile = Object.fromEntries(
    Object.entries({
      fullName,
      headline,
      email,
      phone,
      location,
      rightToWork,
    }).filter(([, value]) => typeof value === "string")
  ) as RawImport["profile"];
  check("The name", profile.fullName);
  check("The email", profile.email);
  check("The phone number", profile.phone);

  const sections: Section[] = raw.sections.map((section) => ({
    id: newId(),
    type: section.type,
    title: section.title,
    items: section.items.map((item): Item => {
      const fields: Record<string, string> = {};
      const bullets = item.bullets ?? [];
      const rawFields = splitYearRange(renameFields(section.type, item.fields));
      for (const [key, value] of Object.entries(rawFields)) {
        if (value.trim() === "" && !DATE_FIELDS.has(key)) {
          // small models fill unknown fields with ""
          continue;
        }
        if (DATE_FIELDS.has(key) && value.trim() !== "") {
          const iso = toIsoDate(value);
          if (iso) {
            fields[key] = iso;
          } else if (value.trim().toLowerCase() !== "present") {
            warnings.push(
              `Could not read the date “${value}” in ${section.title}; left empty.`
            );
          }
        } else {
          fields[key] = value;
        }
      }
      for (const bullet of bullets) {
        check(`A ${section.title} point`, bullet);
      }
      // Only a skills group keeps bullets (its skills); everywhere else the points become the
      // lines of the item's description (#244)
      const isKeepingBullets = section.type === "skills";
      if (!isKeepingBullets && bullets.length > 0) {
        fields.description = [fields.description ?? "", ...bullets]
          .filter((line) => line.trim() !== "")
          .join("\n");
      }
      return {
        id: newId(),
        fields,
        bullets: isKeepingBullets
          ? bullets.map((text) => ({
              id: newId(),
              text,
              tags: [],
            }))
          : [],
        tags: item.tags ?? [],
        shouldShow: true,
      };
    }),
  }));

  return {
    vault: {
      version: CURRENT_VAULT_VERSION,
      profile,
      links: raw.links.map((link) => ({
        id: newId(),
        label: link.label,
        url: link.url,
        tags: [],
      })),
      sections,
    },
    warnings,
  };
}

/** True when an item has any text in its fields or any bullets */
function hasContent(item: Item): boolean {
  return (
    item.bullets.length > 0 ||
    Object.values(item.fields).some(
      (value) => typeof value === "string" && value.trim() !== ""
    )
  );
}

/**
 * Adds an imported vault to an existing one without losing anything: empty profile fields are
 * filled (existing ones kept), items go into the section of the same type (a section is added
 * for a type that is missing), links are added unless the same URL is there. Pure.
 */
export function mergeIntoVault(existing: Vault, imported: Vault): Vault {
  const profile = { ...existing.profile };
  for (const [key, value] of Object.entries(imported.profile)) {
    if (typeof value !== "string") {
      // the list of other job titles is never imported
      continue;
    }
    const current = (profile as Record<string, unknown>)[key];
    if (!(typeof current === "string" && current.trim()) && value) {
      (profile as Record<string, unknown>)[key] = value;
    }
  }

  const sections = existing.sections.map((section) => ({
    ...section,
    items: [...section.items],
  }));
  for (const incoming of imported.sections) {
    // the first section of the same type is its home
    const target = sections.find((section) => section.type === incoming.type);
    // an item with nothing in it is not worth adding
    const items = incoming.items.filter(hasContent);
    if (target) {
      if (incoming.type === "summary") {
        // the summary is one text: an imported one never adds a second item, it only fills an empty one
        const kept = target.items.filter(hasContent);
        target.items = kept.length > 0 ? kept : items.slice(0, 1);
      } else {
        target.items.push(...items);
      }
    } else {
      sections.push({
        ...incoming,
        items: incoming.type === "summary" ? items.slice(0, 1) : items,
      });
    }
  }

  const urls = new Set(existing.links.map((link) => link.url));
  const links = [
    ...existing.links,
    ...imported.links.filter((link) => !urls.has(link.url)),
  ];

  return { ...existing, profile, links, sections };
}
