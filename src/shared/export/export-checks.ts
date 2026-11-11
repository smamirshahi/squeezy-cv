import { TailorRecord } from "@custom-types/variant-types";
import { Profile } from "@custom-types/vault-types";
import { isGapCoveredByCv } from "@shared/ai/gap-coverage";

type CheckLevel = "ok" | "warning";

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

  /** What tailoring said when the variant was made, and the words of the CV as it will be sent */
  tailor?: TailorRecord;
  cvText?: string;
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
 * measured here. The PDF itself always has a real text layer and no date of birth;
 * a photo is only there when the profile has one.
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
  checks.push(
    input.profile.photo
      ? {
          id: "uk",
          level: "warning",
          title: "Photo included",
          detail:
            "UK employers usually expect no photo. Remove it in Vault > Main Info if the role is in the UK.",
        }
      : {
          id: "uk",
          level: "ok",
          title: "No photo or date of birth",
          detail: "UK convention",
        }
  );
  if (input.hiddenItemCount > 0) {
    checks.push({
      id: "hidden",
      level: "ok",
      title: `${input.hiddenItemCount} ${input.hiddenItemCount === 1 ? "item" : "items"} hidden in this job`,
      detail: "Left out of the PDF, still in your vault.",
    });
  }
  if (input.tailor && input.cvText !== undefined) {
    checks.push(...tailorChecks(input.tailor, input.cvText));
  }
  return checks;
}

/** Quote at most this many items in a check's detail */
const MAX_LISTED = 5;

function list(items: string[]): string {
  const shown = items.slice(0, MAX_LISTED).join("; ");
  return items.length > MAX_LISTED
    ? `${shown}; and ${items.length - MAX_LISTED} more`
    : shown;
}

/**
 * Checks against the job this variant was tailored for: rewordings the checker flagged and
 * the user accepted (still in the CV?), and what the job insists on that the CV does not show.
 */
function tailorChecks(tailor: TailorRecord, cvText: string): ExportCheck[] {
  const checks: ExportCheck[] = [];
  const flagged = tailor.acceptedFlagged.filter((entry) =>
    cvText.includes(entry.text)
  );
  checks.push(
    flagged.length > 0
      ? {
          id: "flagged",
          level: "warning",
          title: `${flagged.length} reworded ${flagged.length === 1 ? "point was" : "points were"} flagged and are in the CV`,
          detail: `Check that every claim is true: ${list(flagged.map((entry) => `“${entry.text}” (${entry.flags.join(", ")})`))}.`,
        }
      : {
          id: "flagged",
          level: "ok",
          title: "No flagged rewordings in the CV",
          detail: "Every reworded point passed the checker or was left out.",
        }
  );

  const uncovered = tailor.requirements.mustHave.filter(
    (requirement) => !isGapCoveredByCv(requirement, cvText)
  );
  checks.push(
    uncovered.length > 0
      ? {
          id: "requirements",
          level: "warning",
          title: `${uncovered.length} must-have ${uncovered.length === 1 ? "requirement is" : "requirements are"} not shown`,
          detail: `${tailor.jobTitle || "The job"} asks for: ${list(uncovered)}. Only add them if they are true.`,
        }
      : {
          id: "requirements",
          level: "ok",
          title: "Every must-have requirement is shown",
          detail: `Checked against “${tailor.jobTitle || "the job"}”.`,
        }
  );
  return checks;
}
