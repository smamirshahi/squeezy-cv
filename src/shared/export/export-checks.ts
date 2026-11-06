import { Profile } from "@custom-types/vault-types";

export type CheckLevel = "ok" | "warning";

export interface ExportCheck {
  id: string;
  level: CheckLevel;
  title: string;
  detail: string;
}

export interface ExportCheckInput {
  profile: Profile;
  pageCount: number;
  pageLimit: number;
  usedPercent: number;
  linesOver: number;

  /** Items the variant hides, to say what is left out */
  hiddenItemCount: number;
}

/** A file name without characters that file systems dislike, words joined with dashes */
export function suggestFileName(fullName: string, variantName: string): string {
  const clean = (text: string): string =>
    text
      .normalize("NFKD")
      .replace(/[^A-Za-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");
  const parts = [clean(fullName), "CV", clean(variantName)].filter(Boolean);
  return parts.length > 1 ? parts.join("-") : "CV";
}

/**
 * The checks shown before exporting. Pure: only what is known about the CV, nothing is
 * measured here. The PDF itself always has a real text layer and no photo or date of birth
 * (the vault has no field for them), so those are stated, not computed.
 */
export function exportChecks(input: ExportCheckInput): ExportCheck[] {
  const checks: ExportCheck[] = [];
  const isOverLimit = input.pageCount > input.pageLimit || input.linesOver > 0;
  checks.push(
    isOverLimit
      ? {
          id: "fit",
          level: "warning",
          title: `Does not fit ${input.pageLimit} ${input.pageLimit === 1 ? "page" : "pages"}`,
          detail: `${input.linesOver} ${input.linesOver === 1 ? "line is" : "lines are"} over. Hide items, auto-fit or allow more pages first.`,
        }
      : {
          id: "fit",
          level: "ok",
          title: `Fits ${input.pageLimit} ${input.pageLimit === 1 ? "page" : "pages"}`,
          detail: `${input.usedPercent}% of the page used`,
        }
  );

  const missing = [
    input.profile.fullName.trim() ? "" : "name",
    input.profile.email?.trim() ? "" : "email",
    input.profile.phone?.trim() ? "" : "phone",
  ].filter(Boolean);
  checks.push(
    missing.length > 0
      ? {
          id: "contact",
          level: "warning",
          title: "Contact details incomplete",
          detail: `Missing: ${missing.join(", ")}.`,
        }
      : {
          id: "contact",
          level: "ok",
          title: "Name, email and phone are there",
          detail: "A recruiter can reach you.",
        }
  );

  checks.push({
    id: "text",
    level: "ok",
    title: "Text is selectable",
    detail: "Real text layer, standard headings, no images of text",
  });
  checks.push({
    id: "uk",
    level: "ok",
    title: "No photo or date of birth",
    detail: "UK convention",
  });
  if (input.hiddenItemCount > 0) {
    checks.push({
      id: "hidden",
      level: "ok",
      title: `${input.hiddenItemCount} ${input.hiddenItemCount === 1 ? "item" : "items"} hidden in this variant`,
      detail: "Left out of the PDF, still in your vault.",
    });
  }
  return checks;
}
