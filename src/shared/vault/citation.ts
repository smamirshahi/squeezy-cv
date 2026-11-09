export type CitationStyle = "apa" | "ieee" | "plain";

export const CITATION_STYLES: { value: CitationStyle; label: string }[] = [
  { value: "apa", label: "Authors (Year). Title. Journal." },
  { value: "ieee", label: 'Authors, "Title," Journal, Year.' },
  { value: "plain", label: "Title, Journal, Year" },
];

export const DEFAULT_CITATION_STYLE: CitationStyle = "apa";

/** The facts of one publication, as stored in the item's fields */
type PublicationLike = Record<string, string | undefined>;

/** Joins the non-empty pieces and makes sure the sentence ends with one full stop */
function end(text: string): string {
  return text === "" || /[.?!]$/.test(text) ? text : `${text}.`;
}

/** One publication as a line of text in the chosen style; the link is drawn separately */
export function formatCitation(
  fields: PublicationLike,
  style: CitationStyle = DEFAULT_CITATION_STYLE
): string {
  const title = (fields.title ?? "").trim();
  const authors = (fields.authors ?? "").trim();
  const journal = (fields.journal ?? "").trim();
  const year = (fields.year ?? "").trim();
  switch (style) {
    case "ieee": {
      const rest = [journal, year].filter(Boolean).join(", ");
      let line = authors;
      if (title) {
        line += `${line ? ", " : ""}"${title}${rest ? "," : "."}"`;
      }
      if (rest) {
        line += `${line ? " " : ""}${rest}`;
      }
      return title && !rest ? line : end(line);
    }
    case "plain":
      return [title, journal, year].filter(Boolean).join(", ");
    case "apa":
      return [
        authors && year ? `${authors} (${year}).` : end(authors || year),
        end(title),
        end(journal),
      ]
        .filter(Boolean)
        .join(" ");
  }
}
