/**
 * Post-checks for AI rewrites (plan section 10): the model may rephrase, never invent. Every number,
 * technology name and proper noun in a rewrite has to appear in the text it came from. Anything
 * that does not is flagged, and a flagged rewrite is never accepted automatically. Pure, no
 * network: it does not trust the model's own claim that it kept to the facts.
 */

export type FlagKind = "number" | "name";

export interface Flag {
  kind: FlagKind;

  /** The token that is not in the source, as written in the rewrite */
  token: string;
}

export interface CheckResult {
  /** True when nothing was flagged */
  isSafe: boolean;
  flags: Flag[];
}

/** "30 per cent" and "30%" are the same number */
function normaliseNumberWords(text: string): string {
  return text.replace(/\s*(per\s?cent|percent)\b/gi, "%");
}

const NUMBER_PATTERN = /\d[\d,]*(?:\.\d+)?\s?(?:%|bn|k|m)?/gi;

/** The numbers in a text, normalised: "£1,200" -> "1200", "30 %" -> "30%", "2.5M" -> "2.5m" */
export function extractNumbers(text: string): string[] {
  return (normaliseNumberWords(text).match(NUMBER_PATTERN) ?? []).map((n) =>
    n.replace(/[,\s]/g, "").toLowerCase()
  );
}

const WORD_PATTERN = /[A-Za-z0-9][A-Za-z0-9+#._'’-]*/g;

function cleanToken(token: string): string {
  return token
    .replace(/['’]s$/i, "")
    .replace(/[.'’_-]+$/g, "")
    .replace(/^[._'’-]+/g, "");
}

interface Word {
  text: string;
  isSentenceStart: boolean;
}

function wordsOf(text: string): Word[] {
  const words: Word[] = [];
  let previousEnd = 0;
  let isSentenceStart = true;
  for (const match of text.matchAll(WORD_PATTERN)) {
    const gap = text.slice(previousEnd, match.index);
    // a word token keeps a trailing full stop, so look at that as well as the gap
    if (/[:;\n]/.test(gap) || words.length === 0) {
      isSentenceStart = true;
    }
    const cleaned = cleanToken(match[0]);
    if (cleaned) {
      words.push({ text: cleaned, isSentenceStart });
    }
    isSentenceStart = /[.!?]$/.test(match[0]);
    previousEnd = (match.index ?? 0) + match[0].length;
  }
  return words;
}

/** Names of technologies, organisations, people and places: what is worth checking */
function isNotable(word: Word): boolean {
  const { text } = word;
  // plain numbers are checked as numbers
  if (!/[A-Za-z]/.test(text)) {
    return false;
  }
  // SQL, AWS, NHS, C++
  if (/^[A-Z0-9+#.]{2,}$/.test(text) && /[A-Z]/.test(text)) {
    return true;
  }
  // TypeScript, GitHub, iOS
  if (/[a-z][A-Z]/.test(text)) {
    return true;
  }
  // Python3, S3
  if (/\d/.test(text)) {
    return true;
  }
  if (
    /[A-Za-z][+#.][A-Za-z+#]?/.test(text) &&
    /^[A-Za-z]/.test(text) &&
    /[+#]|\.[a-z]/i.test(text)
  ) {
    return true;
  }
  // C#, Node.js, ASP.NET were matched above
  // Leeds, Redux, Acme (but not an ordinary word that starts a sentence)
  return /^[A-Z][a-z]+$/.test(text) && !word.isSentenceStart;
}

function sourceWords(sources: string[]): Set<string> {
  return new Set(
    sources.flatMap((s) => wordsOf(s).map((w) => w.text.toLowerCase()))
  );
}

/**
 * Checks a rewrite against the text it must be built from (the original bullet, plus
 * whatever else the rewrite may legitimately use, such as the item's other fields).
 */
export function checkRewrite(rewrite: string, sources: string[]): CheckResult {
  const flags: Flag[] = [];

  const knownNumbers = new Set(sources.flatMap(extractNumbers));
  const seenNumbers = new Set<string>();
  for (const number of extractNumbers(rewrite)) {
    if (!knownNumbers.has(number) && !seenNumbers.has(number)) {
      seenNumbers.add(number);
      flags.push({ kind: "number", token: number });
    }
  }

  const known = sourceWords(sources);
  const seenNames = new Set<string>();
  for (const word of wordsOf(rewrite)) {
    const key = word.text.toLowerCase();
    if (isNotable(word) && !known.has(key) && !seenNames.has(key)) {
      seenNames.add(key);
      flags.push({ kind: "name", token: word.text });
    }
  }

  return { isSafe: flags.length === 0, flags };
}

/** Flags in words for the user, e.g. "number 12", "name Kubernetes" */
export function describeFlags(flags: Flag[]): string[] {
  return flags.map(
    (f) =>
      `${f.kind === "number" ? "number" : "name"} "${f.token}" is not in your CV`
  );
}

/** A rewrite may be accepted without the user looking at it only if nothing was flagged */
export function canAutoAccept(flags: string[] | undefined): boolean {
  return !flags || flags.length === 0;
}
