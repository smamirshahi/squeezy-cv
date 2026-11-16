import { normaliseLink } from "@shared/vault/link-utils";

export type CitationStyle = "apa" | "ieee" | "plain";

export const CITATION_STYLES: { value: CitationStyle; label: string }[] = [
  { value: "apa", label: "Authors (Year). Title. Journal." },
  { value: "ieee", label: 'Authors, "Title," Journal, Year.' },
  { value: "plain", label: "Title, Journal, Year" },
];

export const DEFAULT_CITATION_STYLE: CitationStyle = "apa";

export type PublicationLinks = "end" | "none";
export type MaxAuthors = 3 | 6 | "all";

export const DEFAULT_PUBLICATION_LINKS: PublicationLinks = "end";
export const DEFAULT_MAX_AUTHORS: MaxAuthors = 6;

/** The facts of one publication, as stored in the item's fields */
type PublicationLike = Record<string, string | undefined>;

/** One run of a citation with the same look; a link has an `href` */
export interface CitationSegment {
  text: string;
  bold?: boolean;
  italic?: boolean;
  href?: string;
}

export interface CitationOptions {
  style?: CitationStyle;
  /** "end" (default) draws the link as visible text at the end of the line */
  links?: PublicationLinks;
  /** Bold the author that is the user (default true) */
  highlightOwnName?: boolean;
  /** Authors named before "et al." (default 6) */
  maxAuthors?: MaxAuthors;
  /** How the user is written in the authors; several spellings separated by ";" */
  ownName?: string;
}

const INITIALS = /^(?:\p{Lu}\.?[-\s]?)+$/u;

/**
 * The authors of a free-text list. Names are separated by ";" or "and" / "&"; without those,
 * "Doe, J., Roe, R." is read as two authors because "J." and "R." are initials, not names.
 */
export function splitAuthors(raw: string): string[] {
  const text = raw.trim().replace(/\s*(?:&|\band\b)\s*/gi, ", ");
  if (text === "") {
    return [];
  }
  if (raw.includes(";")) {
    return raw
      .split(";")
      .map((part) => part.replace(/^\s*(?:&|and)\s+/i, "").trim())
      .filter(Boolean);
  }
  const authors: string[] = [];
  for (const token of text
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean)) {
    const last = authors.length - 1;
    if (last >= 0 && INITIALS.test(token) && !INITIALS.test(authors[last])) {
      authors[last] = `${authors[last]}, ${token}`;
    } else {
      authors.push(token);
    }
  }
  return authors;
}

function words(text: string): string[] {
  return text
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    .split(/[^\p{L}]+/u)
    .filter(Boolean);
}

/** Surname and first initial of "Doe, J.", "J. Doe" or "Jane Doe" */
function nameKey(name: string): { surname: string; initial: string } | null {
  const comma = name.indexOf(",");
  const surnameWords = words(comma >= 0 ? name.slice(0, comma) : name);
  const givenWords = words(comma >= 0 ? name.slice(comma + 1) : name);
  if (comma >= 0) {
    return surnameWords.length > 0 && givenWords.length > 0
      ? {
          surname: surnameWords.join(" "),
          initial: givenWords[0].charAt(0),
        }
      : null;
  }
  const all = words(name);
  if (all.length < 2) {
    return null;
  }
  // "J. Doe" and "Jane Doe": the surname is the last word, the initial the first letter before it
  return { surname: all[all.length - 1], initial: all[0].charAt(0) };
}

/** Whether `author` is one of the spellings the user wrote their name as (surname plus initial, case-insensitive) */
export function isOwnName(
  author: string,
  ownName: string | undefined
): boolean {
  const spellings = (ownName ?? "")
    .split(";")
    .map((spelling) => spelling.trim())
    .filter(Boolean);
  const mine = nameKey(author);
  return (
    mine !== null &&
    spellings.some((spelling) => {
      const wanted = nameKey(spelling);
      return (
        wanted !== null &&
        wanted.surname === mine.surname &&
        wanted.initial === mine.initial
      );
    })
  );
}

/** A DOI typed bare ("10.1234/abcd") or as "doi:..." */
const BARE_DOI = /^(?:doi:\s*)?(10\.\d{4,9}\/\S+)$/i;

/** What a link shows on the CV and where it points; undefined when it is empty or not http(s) */
export function citationLink(
  link: string | undefined
): { text: string; href: string } | undefined {
  const raw = (link ?? "").trim();
  const doi = BARE_DOI.exec(raw);
  if (doi) {
    return { text: `doi.org/${doi[1]}`, href: `https://doi.org/${doi[1]}` };
  }
  const href = normaliseLink(raw);
  if (href === undefined) {
    return undefined;
  }
  return {
    text: raw
      .replace(/^https?:\/\//i, "")
      .replace(/^www\./i, "")
      .replace(/\/$/, ""),
    href,
  };
}

/** Joins the non-empty pieces and makes sure the sentence ends with one full stop */
function end(text: string): string {
  return text === "" || /[.?!]$/.test(text) ? text : `${text}.`;
}

/** Appends a plain run; a run with the same look as the last one is merged into it */
function add(out: CitationSegment[], segment: CitationSegment): void {
  if (segment.text === "") {
    return;
  }
  const last = out[out.length - 1];
  if (
    last &&
    !last.bold === !segment.bold &&
    !last.italic === !segment.italic &&
    last.href === segment.href
  ) {
    last.text += segment.text;
  } else {
    out.push({ ...segment });
  }
}

function addAll(out: CitationSegment[], segments: CitationSegment[]): void {
  segments.forEach((segment) => add(out, segment));
}

/** The text of a citation, without its look */
export function citationText(segments: CitationSegment[]): string {
  return segments.map((segment) => segment.text).join("");
}

/** A full stop after the last run, unless it already ends a sentence */
function closeSentence(out: CitationSegment[]): void {
  const last = out[out.length - 1];
  if (last && !/[.?!]$/.test(last.text)) {
    add(out, { text: "." });
  }
}

interface ShownAuthor {
  text: string;
  isOwn: boolean;
}

/** The authors that are named (the first N; in APA the user is always kept) and whether the list was cut */
function shownAuthors(
  authors: string[],
  options: CitationOptions,
  style: CitationStyle
): { shown: ShownAuthor[]; isCut: boolean } {
  const limit = options.maxAuthors ?? DEFAULT_MAX_AUTHORS;
  const all = authors.map((text) => ({
    text,
    isOwn: isOwnName(text, options.ownName),
  }));
  if (limit === "all" || all.length <= limit) {
    return { shown: all, isCut: false };
  }
  const first = all.slice(0, limit);
  const ownLater = all.slice(limit).find((author) => author.isOwn);
  if (style === "apa" && ownLater && !first.some((author) => author.isOwn)) {
    return { shown: [...first.slice(0, limit - 1), ownLater], isCut: true };
  }
  return { shown: first, isCut: true };
}

function authorSegments(
  authors: string[],
  options: CitationOptions,
  style: CitationStyle
): CitationSegment[] {
  const { shown, isCut } = shownAuthors(authors, options, style);
  const bold = options.highlightOwnName !== false;
  const out: CitationSegment[] = [];
  shown.forEach((author, index) => {
    if (index > 0) {
      const isLast = index === shown.length - 1;
      const glue =
        isCut || !isLast
          ? ", "
          : shown.length === 2
            ? style === "apa"
              ? " & "
              : " and "
            : style === "apa"
              ? ", & "
              : ", and ";
      add(out, { text: glue });
    }
    add(out, { text: author.text, ...(bold && author.isOwn ? { bold } : {}) });
  });
  if (isCut) {
    add(out, { text: ", et al." });
  }
  return out;
}

/**
 * One publication as runs of text in the chosen style: the user's name bold, the journal in
 * italics and the link as visible text at the end (its own run, with the `href`).
 */
export function formatCitation(
  fields: PublicationLike,
  options: CitationOptions = {}
): CitationSegment[] {
  const style = options.style ?? DEFAULT_CITATION_STYLE;
  const title = (fields.title ?? "").trim();
  const authorText = (fields.authors ?? "").trim();
  const journal = (fields.journal ?? "").trim();
  const year = (fields.year ?? "").trim();
  const authors = authorSegments(splitAuthors(authorText), options, style);
  const out: CitationSegment[] = [];

  switch (style) {
    case "ieee": {
      const hasRest = journal !== "" || year !== "";
      addAll(out, authors);
      if (title) {
        add(out, {
          text: `${out.length > 0 ? ", " : ""}"${title}${hasRest ? "," : "."}"`,
        });
      }
      if (hasRest) {
        add(out, { text: out.length > 0 ? " " : "" });
        add(out, { text: journal, italic: true });
        add(out, { text: journal && year ? ", " : "" });
        add(out, { text: year });
      }
      if (!(title && !hasRest)) {
        closeSentence(out);
      }
      break;
    }
    case "plain": {
      const parts: CitationSegment[][] = [
        title ? [{ text: title }] : [],
        journal ? [{ text: journal }] : [],
        year ? [{ text: year }] : [],
      ].filter((part) => part.length > 0);
      parts.forEach((part, index) => {
        add(out, { text: index > 0 ? ", " : "" });
        addAll(out, part);
      });
      closeSentence(out);
      break;
    }
    case "apa": {
      if (authorText && year) {
        addAll(out, authors);
        add(out, { text: ` (${year}).` });
      } else if (authorText) {
        addAll(out, authors);
        closeSentence(out);
      } else if (year) {
        add(out, { text: end(year) });
      }
      if (title) {
        add(out, { text: `${out.length > 0 ? " " : ""}${end(title)}` });
      }
      if (journal) {
        add(out, { text: out.length > 0 ? " " : "" });
        add(out, { text: journal.replace(/\.$/, ""), italic: true });
        add(out, { text: "." });
      }
      break;
    }
  }

  const link =
    (options.links ?? DEFAULT_PUBLICATION_LINKS) === "end"
      ? citationLink(fields.link)
      : undefined;
  if (link) {
    add(out, { text: out.length > 0 ? " " : "" });
    add(out, { text: link.text, href: link.href });
  }
  return out;
}

/** The year of a publication as a number; undefined when none can be read */
function yearOf(fields: PublicationLike): number | undefined {
  const match = /\d{4}/.exec(fields.year ?? "");
  return match ? Number(match[0]) : undefined;
}

/** Newest first; publications without a year come last. Items of the same year keep their order. */
export function sortPublicationsNewestFirst<
  T extends { fields: PublicationLike },
>(items: T[]): T[] {
  return items
    .map((item, index) => ({ item, index, year: yearOf(item.fields) }))
    .sort((a, b) => {
      if (a.year === b.year) {
        return a.index - b.index;
      }
      if (a.year === undefined) {
        return 1;
      }
      if (b.year === undefined) {
        return -1;
      }
      return b.year - a.year;
    })
    .map(({ item }) => item);
}
