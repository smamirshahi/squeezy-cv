import { MaskKind, MaskTerm, Masking } from "@custom-types/masking-types";
import { LinkItem, Profile, Section } from "@custom-types/vault-types";

/** The personal details that must never leave the machine */
export interface PersonalData {
  profile: Profile;
  links: LinkItem[];

  /**
   * Employer and school names to hide as well (optional mode, #133). Each name gets its own
   * placeholder, `[Company 1]` or `[School 1]`, numbered by its place in the list.
   */
  organisations?: Organisations;

  /** The user's own choices: extra text to hide, and automatic masks to leave off */
  masking?: Masking;
}

/** Names of employers and schools as written in the CV */
export interface Organisations {
  companies: string[];
  schools: string[];
}

/** placeholder (e.g. "[Email]") -> the real value */
export type PlaceholderMap = Record<string, string>;

export interface ScrubResult {
  text: string;
  /** Every placeholder that exists for this person, whether or not it was used in `text` */
  map: PlaceholderMap;
}

export interface RestoreResult {
  text: string;
  /** Placeholder-like tokens the model wrote that cannot be matched to a real value */
  unresolved: string[];
}

interface Rule {
  placeholder: string;
  value: string;
  pattern: RegExp;
}

const MIN_NAME_PART_LENGTH = 2;
const MIN_PHONE_DIGITS = 7;
const MIN_ORGANISATION_LENGTH = 3;

/** Endings of company names that a bullet may leave out ("at Example" for "Example Ltd") */
const LEGAL_SUFFIX =
  /[\s,]+(?:ltd\.?|limited|inc\.?|incorporated|llc|llp|plc|gmbh|corp\.?|corporation|co\.?)$/i;

/** Words of the placeholders themselves: a name part equal to one of them is not replaced */
const PLACEHOLDER_WORDS = new Set([
  "first",
  "last",
  "name",
  "candidate",
  "phone",
  "number",
  "email",
  "address",
  "link",
  "right",
  "to",
  "work",
]);

/** Start of the text inside a placeholder; used to spot ones the model mangled or invented */
const PLACEHOLDER_STARTS = [
  "candidate",
  "first name",
  "last name",
  "email",
  "phone",
  "address",
  "right to work",
  "link",
  "company",
  "school",
  "person",
  "location",
  "date",
  "other",
];

function escapeRegExp(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/** Matches the text as a whole word (not inside a longer word), ignoring case */
function wordPattern(source: string): RegExp {
  return new RegExp(`(?<![\\p{L}\\p{N}])${source}(?![\\p{L}\\p{N}])`, "giu");
}

function literalPattern(text: string): RegExp {
  return wordPattern(escapeRegExp(text).replace(/\s+/g, "\\s+"));
}

/** Digits of a phone number in the ways a UK number is written (07…, +44 7…, 0044 7…) */
function phoneDigitVariants(phone: string): string[] {
  const digits = phone.replace(/\D/g, "").replace(/^00/, "");
  if (digits.length < MIN_PHONE_DIGITS) {
    return [];
  }
  const variants = new Set([digits]);
  if (digits.startsWith("44")) {
    variants.add(`0${digits.slice(2)}`);
  } else if (digits.startsWith("0")) {
    variants.add(`44${digits.slice(1)}`);
  }
  // "+44 (0)7…" has the trunk 0 as well
  for (const variant of [...variants]) {
    if (variant.startsWith("44")) {
      variants.add(`440${variant.slice(2)}`);
    }
  }
  return [...variants];
}

/** The digits with any separators (spaces, dots, dashes, brackets) between them */
function phonePattern(phone: string): RegExp | undefined {
  const variants = phoneDigitVariants(phone);
  if (variants.length === 0) {
    return undefined;
  }
  const separator = "[\\s().-]*";
  const alternatives = variants.map((digits) =>
    digits.split("").map(escapeRegExp).join(separator)
  );
  return new RegExp(
    `(?<![\\p{L}\\p{N}])(?:(?:\\+|00)${separator})?(?:${alternatives.join("|")})(?![\\p{N}])`,
    "gu"
  );
}

/** A link in the ways it is written: with or without https://, www. and a trailing slash */
function urlPattern(url: string): RegExp | undefined {
  const bare = url
    .trim()
    .replace(/^[a-z][a-z0-9+.-]*:\/\//i, "")
    .replace(/^www\./i, "")
    .replace(/\/+$/, "");
  if (bare === "") {
    return undefined;
  }
  return new RegExp(
    `(?:[a-z][a-z0-9+.-]*:\\/\\/)?(?:www\\.)?${escapeRegExp(bare)}\\/*(?![\\p{L}\\p{N}])`,
    "giu"
  );
}

function isUsable(value: string | undefined): value is string {
  return value !== undefined && value.trim() !== "";
}

/** A name for an organisation: the full name, or without its "Ltd"/"Inc" ending */
function organisationPattern(name: string): RegExp {
  const full = escapeRegExp(name).replace(/\s+/g, "\\s+");
  const short = name.replace(LEGAL_SUFFIX, "").trim();
  if (short.length >= MIN_ORGANISATION_LENGTH && short !== name) {
    const shortSource = escapeRegExp(short).replace(/\s+/g, "\\s+");
    return wordPattern(`(?:${full}|${shortSource})`);
  }
  return wordPattern(full);
}

/** Longest names first, so "Example Labs" is replaced before "Example" */
function organisationRules(organisations: Organisations | undefined): Rule[] {
  if (!organisations) {
    return [];
  }
  const rules: Rule[] = [];
  const groups: [string, string[]][] = [
    ["Company", organisations.companies],
    ["School", organisations.schools],
  ];
  for (const [label, names] of groups) {
    names.forEach((raw, index) => {
      const name = raw.trim();
      if (name.length >= MIN_ORGANISATION_LENGTH) {
        rules.push({
          placeholder: `[${label} ${index + 1}]`,
          value: name,
          pattern: organisationPattern(name),
        });
      }
    });
  }
  return rules.sort((a, b) => b.value.length - a.value.length);
}

/** The employers (experience sections) and schools (education sections) named in the CV, once each */
export function organisationsOf(sections: Section[]): Organisations {
  function names(type: Section["type"], key: string): string[] {
    const found = new Map<string, string>();
    for (const section of sections.filter((entry) => entry.type === type)) {
      for (const item of section.items) {
        const name = (item.fields[key] ?? "").trim();
        if (name && !found.has(name.toLowerCase())) {
          found.set(name.toLowerCase(), name);
        }
      }
    }
    return [...found.values()];
  }
  return {
    companies: names("experience", "company"),
    schools: names("education", "institute"),
  };
}

/** What to keep out of a request for this CV; `isMaskingOrganisations` adds employers and schools */
export function personalOf(
  vault: { profile: Profile; links: LinkItem[]; sections: Section[] },
  isMaskingOrganisations: boolean
): PersonalData {
  return {
    profile: vault.profile,
    links: vault.links,
    ...(isMaskingOrganisations
      ? { organisations: organisationsOf(vault.sections) }
      : {}),
  };
}

/**
 * The replacements for this person, in the order they are applied: the longest and most
 * specific first (email and links contain the name), name parts last.
 */
function buildRules(
  data: PersonalData,
  options: { isKeepingSkipped?: boolean } = {}
): Rule[] {
  const rules = buildAutomaticRules(data);
  const custom = customRules(data);
  // Longest first, so a hand-picked "Acme Labs" goes before the employer "Acme"
  const organisationNames = new Set(
    organisationRules(data.organisations).map((rule) => rule.placeholder)
  );
  const orgRules = rules.filter((rule) =>
    organisationNames.has(rule.placeholder)
  );
  const others = rules.filter(
    (rule) => !organisationNames.has(rule.placeholder)
  );
  const firstOrganisation = rules.findIndex((rule) =>
    organisationNames.has(rule.placeholder)
  );
  const merged = [...orgRules, ...custom].sort(
    (a, b) => b.value.length - a.value.length
  );
  const head =
    firstOrganisation < 0 ? others : others.slice(0, firstOrganisation);
  const tail = firstOrganisation < 0 ? [] : others.slice(firstOrganisation);
  const all = [...head, ...merged, ...tail];
  if (options.isKeepingSkipped) {
    return all;
  }
  const skipped = new Set((data.masking?.skip ?? []).map(normaliseTerm));
  return all.filter((rule) => !skipped.has(normaliseTerm(rule.value)));
}

function normaliseTerm(text: string): string {
  return text.trim().toLowerCase().replace(/\s+/g, " ");
}

const KIND_LABELS: Record<MaskKind, string> = {
  company: "Company",
  school: "School",
  person: "Person",
  location: "Location",
  date: "Date",
  other: "Other",
};

/** The placeholders of text the user masked by hand; the same text always gets the same one */
function customRules(data: PersonalData): Rule[] {
  const rules: Rule[] = [];
  const seen = new Map<string, string>();
  const counters: Record<MaskKind, number> = {
    company: data.organisations?.companies.length ?? 0,
    school: data.organisations?.schools.length ?? 0,
    person: 0,
    location: 0,
    date: 0,
    other: 0,
  };
  for (const { text, kind } of data.masking?.custom ?? []) {
    const value = text.trim();
    const key = normaliseTerm(value);
    if (value === "" || seen.has(key)) {
      continue;
    }
    counters[kind] += 1;
    const placeholder = `[${KIND_LABELS[kind]} ${counters[kind]}]`;
    seen.set(key, placeholder);
    rules.push({ placeholder, value, pattern: literalPattern(value) });
  }
  return rules;
}

function buildAutomaticRules(data: PersonalData): Rule[] {
  const { profile, links } = data;
  const rules: Rule[] = [];
  function add(placeholder: string, value: string, pattern?: RegExp): void {
    if (pattern) {
      rules.push({ placeholder, value, pattern });
    }
  }

  if (isUsable(profile.email)) {
    add("[Email]", profile.email.trim(), literalPattern(profile.email.trim()));
  }
  links.forEach((link, index) => {
    if (isUsable(link.url)) {
      add(`[Link ${index + 1}]`, link.url.trim(), urlPattern(link.url));
    }
  });
  if (isUsable(profile.phone)) {
    add("[Phone Number]", profile.phone.trim(), phonePattern(profile.phone));
  }
  for (const rule of organisationRules(data.organisations)) {
    rules.push(rule);
  }
  if (isUsable(profile.fullName)) {
    add(
      "[Candidate Name]",
      profile.fullName.trim(),
      literalPattern(profile.fullName.trim())
    );
  }
  if (isUsable(profile.location)) {
    add("[Address]", profile.location.trim(), literalPattern(profile.location));
  }
  if (isUsable(profile.rightToWork)) {
    add(
      "[Right To Work]",
      profile.rightToWork.trim(),
      literalPattern(profile.rightToWork.trim())
    );
  }

  const nameParts = profile.fullName.trim().split(/\s+/).filter(Boolean);
  function usablePart(part: string): boolean {
    return (
      part.length >= MIN_NAME_PART_LENGTH &&
      !PLACEHOLDER_WORDS.has(part.toLowerCase())
    );
  }
  if (nameParts.length > 1) {
    const first = nameParts[0];
    const last = nameParts[nameParts.length - 1];
    if (usablePart(first)) {
      add("[First Name]", first, literalPattern(first));
    }
    if (usablePart(last) && last.toLowerCase() !== first.toLowerCase()) {
      add("[Last Name]", last, literalPattern(last));
    }
  }
  return rules;
}

/**
 * Replaces the person's details in `text` with placeholders. The source of truth is the
 * profile and links, not guessing: the same values are found anywhere in the text (a job
 * advert saying "Dear Mohammad", a bullet naming the person), ignoring case, with phone numbers
 * in any spacing or `+44`/`0` form and links with or without `https://www.`.
 */
export function scrub(text: string, data: PersonalData): ScrubResult {
  const rules = buildRules(data);
  let result = text;
  for (const rule of rules) {
    result = result.replace(rule.pattern, rule.placeholder);
  }
  return {
    text: result,
    map: Object.fromEntries(rules.map((r) => [r.placeholder, r.value])),
  };
}

function placeholderPattern(placeholder: string): RegExp {
  const inner = placeholder
    .slice(1, -1)
    .split(/\s+/)
    .map(escapeRegExp)
    .join("\\s*");
  return new RegExp(`\\[\\s*${inner}\\s*\\]`, "giu");
}

/**
 * Puts the real values back. Placeholders are matched forgivingly (case, spaces inside the
 * brackets). Ones that cannot be matched stay as they are and are listed in `unresolved`, so
 * the caller can warn instead of failing. With `isForJson` the values are escaped so they are
 * safe inside a JSON string (use it on the raw reply, before it is parsed).
 */
export function restore(
  text: string,
  map: PlaceholderMap,
  options: { isForJson?: boolean } = {}
): RestoreResult {
  let result = text;
  for (const [placeholder, value] of Object.entries(map)) {
    const replacement = options.isForJson
      ? JSON.stringify(value).slice(1, -1)
      : value;
    result = result.replace(placeholderPattern(placeholder), () => replacement);
  }
  const unresolved = [...result.matchAll(/\[([^\]\n[]{1,40})\]/g)]
    .filter(([, inner]) => {
      const normalised = inner.trim().toLowerCase().replace(/\s+/g, " ");
      return PLACEHOLDER_STARTS.some((start) => normalised.startsWith(start));
    })
    .map(([token]) => token);
  return { text: result, unresolved: [...new Set(unresolved)] };
}

/**
 * Everything that would be replaced in `text` (the raw text, before masking), how often, and
 * whether it is on: for the "Send to AI" dialog. Counts follow the order the replacements
 * are applied, so a value inside a longer one is not counted twice. Automatic masks the user
 * turned off are listed (`isMasked: false`); automatic ones that do not appear are left out.
 */
export function describeMasking(text: string, data: PersonalData): MaskTerm[] {
  const skipped = new Set((data.masking?.skip ?? []).map(normaliseTerm));
  const customPlaceholders = new Set(
    customRules(data).map((rule) => rule.placeholder)
  );
  let result = text;
  const terms: MaskTerm[] = [];
  for (const rule of buildRules(data, { isKeepingSkipped: true })) {
    const isMasked = !skipped.has(normaliseTerm(rule.value));
    const count = [...result.matchAll(rule.pattern)].length;
    if (isMasked) {
      result = result.replace(rule.pattern, rule.placeholder);
    }
    const isCustom = customPlaceholders.has(rule.placeholder);
    if (count > 0 || isCustom) {
      terms.push({
        placeholder: rule.placeholder,
        value: rule.value,
        count,
        isMasked,
        isCustom,
      });
    }
  }
  return terms;
}

const EMAIL_IN_TEXT = /[\p{L}\p{N}._%+-]+@[\p{L}\p{N}.-]+\.\p{L}{2,}/gu;
const URL_IN_TEXT = /(?:https?:\/\/|www\.)[^\s<>"')\],;]+/giu;
const PHONE_IN_TEXT =
  /(?<![\p{L}\p{N}])\+?\d[\d\s().-]{7,}\d(?![\p{L}\p{N}])/gu;
const MIN_SUGGESTED_PHONE_DIGITS = 8;
const DATE_SHAPE = /^\d{1,4}[-./\s]\d{1,2}[-./\s]\d{1,4}$/;

/**
 * Emails, links and phone numbers still in the text after masking (other people's, or ones the
 * profile does not list): the dialog offers to mask them. Names of people and firms inside
 * sentences cannot be found reliably without an AI, so those are left for the user to select.
 */
export function suggestMasks(text: string, data: PersonalData): string[] {
  const masked = scrub(text, data).text;
  const found = new Set<string>();
  for (const pattern of [EMAIL_IN_TEXT, URL_IN_TEXT, PHONE_IN_TEXT]) {
    for (const [match] of masked.matchAll(pattern)) {
      const value = match.trim().replace(/[.,;:]+$/, "");
      const isPhone = pattern === PHONE_IN_TEXT;
      // A date such as 2026-03-01 or 01/03/2026 has the shape of a phone number but is not one
      if (isPhone && DATE_SHAPE.test(value)) {
        continue;
      }
      if (
        isPhone &&
        value.replace(/\D/g, "").length < MIN_SUGGESTED_PHONE_DIGITS
      ) {
        continue;
      }
      found.add(value);
    }
  }
  const alreadyCustom = new Set(
    (data.masking?.custom ?? []).map((entry) => normaliseTerm(entry.text))
  );
  return [...found].filter((value) => !alreadyCustom.has(normaliseTerm(value)));
}
