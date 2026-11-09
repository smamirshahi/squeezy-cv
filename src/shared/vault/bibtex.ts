/** The fields of a publication item that a BibTeX entry can fill */
export interface PublicationFields {
  title: string;
  authors: string;
  journal: string;
  year: string;
  link: string;
}

const ACCENTS: Record<string, Record<string, string>> = {
  '"': { a: "ä", e: "ë", i: "ï", o: "ö", u: "ü", A: "Ä", O: "Ö", U: "Ü" },
  "'": { a: "á", e: "é", i: "í", o: "ó", u: "ú", A: "Á", E: "É", O: "Ó" },
  "`": { a: "à", e: "è", i: "ì", o: "ò", u: "ù" },
  "^": { a: "â", e: "ê", i: "î", o: "ô", u: "û" },
  "~": { n: "ñ", a: "ã", o: "õ", N: "Ñ" },
  c: { c: "ç", C: "Ç" },
};

/** LaTeX text as plain text: accents, braces, escapes and `--` dashes */
function latexToPlain(text: string): string {
  return text
    .replace(/\\([cv])\s*\{?([A-Za-z])\}?/g, (_match, command, letter) =>
      command === "c" ? (ACCENTS.c[letter] ?? letter) : letter
    )
    .replace(
      /\\(["'`^~])\s*\{?\\?([A-Za-z])\}?/g,
      (_match, accent, letter) => ACCENTS[accent]?.[letter] ?? letter
    )
    .replace(/\\ss\b/g, "ß")
    .replace(/\\&/g, "&")
    .replace(/\\([%$#_])/g, "$1")
    .replace(/\\(?:emph|textit|textbf|textrm|mathrm)\s*\{([^}]*)\}/g, "$1")
    .replace(/--+/g, "–")
    .replace(/[{}]/g, "")
    .replace(/~/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** The text between the braces or quotes that start at `start`, and where it ends */
function readValue(
  source: string,
  start: number
): { value: string; end: number } {
  const open = source[start];
  if (open === "{") {
    let depth = 0;
    for (let i = start; i < source.length; i++) {
      if (source[i] === "{") {
        depth++;
      } else if (source[i] === "}") {
        depth--;
        if (depth === 0) {
          return { value: source.slice(start + 1, i), end: i + 1 };
        }
      }
    }
    return { value: source.slice(start + 1), end: source.length };
  }
  if (open === '"') {
    let depth = 0;
    for (let i = start + 1; i < source.length; i++) {
      if (source[i] === "{") {
        depth++;
      } else if (source[i] === "}") {
        depth--;
      } else if (source[i] === '"' && depth === 0) {
        return { value: source.slice(start + 1, i), end: i + 1 };
      }
    }
    return { value: source.slice(start + 1), end: source.length };
  }
  const match = /^[^,}\s]*/.exec(source.slice(start));
  const value = match?.[0] ?? "";
  return { value, end: start + value.length };
}

/** "Doe, Jane and John Smith" as "Jane Doe, John Smith" */
function readAuthors(raw: string): string {
  return raw
    .split(/\s+and\s+/i)
    .map((name) => latexToPlain(name))
    .filter((name) => name !== "")
    .map((name) => {
      const parts = name.split(",").map((part) => part.trim());
      return parts.length === 2 && parts[1] ? `${parts[1]} ${parts[0]}` : name;
    })
    .join(", ");
}

/**
 * Reads the first entry of a BibTeX text (`@article{key, title = {...}, ...}`) and gives the
 * publication fields, or undefined when there is no entry. Venue is journal, booktitle,
 * publisher or howpublished (the first present); the link is the DOI as a URL, else `url`.
 */
export function parseBibtex(text: string): PublicationFields | undefined {
  const entry = /@\s*([A-Za-z]+)\s*[{(]/.exec(text);
  if (!entry || entry[1].toLowerCase() === "comment") {
    return undefined;
  }
  const body = text.slice(entry.index + entry[0].length);
  const raw: Record<string, string> = {};
  // skip the citation key
  let position = body.indexOf(",") + 1;
  if (position === 0) {
    return undefined;
  }
  while (position < body.length) {
    const rest = body.slice(position);
    const field = /^[\s,]*([A-Za-z][\w-]*)\s*=\s*/.exec(rest);
    if (!field) {
      break;
    }
    const valueStart = position + field[0].length;
    const { value, end } = readValue(body, valueStart);
    raw[field[1].toLowerCase()] = value;
    position = end;
  }

  const doi = latexToPlain(raw.doi ?? "").replace(
    /^https?:\/\/(dx\.)?doi\.org\//i,
    ""
  );
  const year =
    (raw.year ?? "").match(/\d{4}/)?.[0] ??
    (raw.date ?? "").match(/\d{4}/)?.[0] ??
    "";
  const fields: PublicationFields = {
    title: latexToPlain(raw.title ?? ""),
    authors: readAuthors(raw.author ?? ""),
    journal: latexToPlain(
      raw.journal ??
        raw.journaltitle ??
        raw.booktitle ??
        raw.publisher ??
        raw.howpublished ??
        ""
    ),
    year,
    link: doi ? `https://doi.org/${doi}` : (raw.url ?? "").trim(),
  };
  return fields.title || fields.authors ? fields : undefined;
}
