import { LinkItem, Profile } from "@custom-types/vault-types";

/** The personal details that must never leave the machine */
export interface PersonalData {
  profile: Profile;
  links: LinkItem[];
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

/**
 * The replacements for this person, in the order they are applied: the longest and most
 * specific first (email and links contain the name), name parts last.
 */
function buildRules(data: PersonalData): Rule[] {
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
