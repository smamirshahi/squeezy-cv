import { Requirements } from "@custom-types/requirements-types";
import { Profile } from "@custom-types/vault-types";
import { isGapCoveredByCv } from "@shared/ai/gap-coverage";
import { documentText } from "@shared/variant/document-text";
import { RenderedDocument, RenderedSection } from "@shared/variant/render";

/**
 * The ATS score (#258): two separate checks, both deterministic and local (no AI).
 * 1. "Your CV": can a parser read it, and are the basics there (does not depend on a job).
 * 2. "Match to this job": how well the words of the CV meet what the advert asks for.
 * It is a guide built on common advice, not what any real ATS (Workday, Greenhouse, Lever,
 * iCIMS ...) computes: they parse the CV into fields and recruiters search them.
 */

/* eslint-disable @typescript-eslint/no-magic-numbers -- the penalties and weights are the scoring rules */

export type AtsGroupId = "cv" | "match";

export type AtsCategoryId =
  | "formatting"
  | "searchability"
  | "content"
  | "hardSkills"
  | "softSkills"
  | "titleExperience";

/** Where the fix is made: the app turns this into a link */
export type AtsFixTarget = "vault" | "content" | "layout" | "style" | "details";

export interface AtsIssue {
  /** Stable between scans, so a later scan can tell which issues are fixed */
  id: string;
  category: AtsCategoryId;
  title: string;

  /** How to fix it */
  hint: string;

  /** Points taken off the category (0-100) */
  penalty: number;
  target: AtsFixTarget;

  /** Issues with the same key are shown as one line in the "fix next" list */
  fixKey: string;
}

interface AtsCategory {
  id: AtsCategoryId;
  group: AtsGroupId;
  label: string;

  /** 0-100 */
  score: number;
  issues: AtsIssue[];
}

interface AtsGroup {
  score: number;
  categories: AtsCategory[];
}

export interface AtsResult {
  /** The score shown in the ring: the average of both groups, or the CV alone without a job */
  total: number;
  cv: AtsGroup;

  /** Null while the job has no requirements to compare with */
  match: AtsGroup | null;
  issues: AtsIssue[];

  /** What the advert asks for that the CV does, and does not, show (in the advert's words) */
  covered: string[];
  missing: string[];

  /** Changes when the words of the CV or the requirements change: tells a stale scan */
  contentKey: string;
}

export interface AtsInput {
  document: RenderedDocument;
  profile: Profile;

  /** The job title the CV shows under the name */
  headline?: string;
  pageCount: number;
  pageLimit: number;
  linesOver: number;

  /** False when the style switches the photo off */
  isPhotoShown: boolean;

  /** What the advert asks for; without it only "Your CV" is scored */
  requirements?: Requirements;

  /** The advert as pasted, used for years of experience and soft skills */
  jobAd?: string;

  /** Today, so the years of experience can be counted (a parameter keeps this pure) */
  today: Date;
}

/** Share of the group score that each category carries (inside its group; they add up to 1) */
export const ATS_WEIGHTS: Record<AtsCategoryId, number> = {
  formatting: 0.4,
  searchability: 0.35,
  content: 0.25,
  hardSkills: 0.6,
  softSkills: 0.15,
  titleExperience: 0.25,
};

export const ATS_LABELS: Record<AtsCategoryId, string> = {
  formatting: "Formatting",
  searchability: "Searchability",
  content: "Content quality",
  hardSkills: "Hard skills",
  softSkills: "Soft skills",
  titleExperience: "Title & experience",
};

export const ATS_GROUP_OF: Record<AtsCategoryId, AtsGroupId> = {
  formatting: "cv",
  searchability: "cv",
  content: "cv",
  hardSkills: "match",
  softSkills: "match",
  titleExperience: "match",
};

export const ATS_GROUP_LABELS: Record<AtsGroupId, string> = {
  cv: "Your CV",
  match: "Match to this job",
};

/** Scores from here to here are what a natural, honest CV usually gets; 100 usually means stuffing */
export const NATURAL_RANGE = { min: 75, max: 90 } as const;

export type AtsBand = "low" | "fair" | "natural" | "veryHigh";

export function bandOf(score: number): AtsBand {
  if (score > NATURAL_RANGE.max) {
    return "veryHigh";
  }
  if (score >= NATURAL_RANGE.min) {
    return "natural";
  }
  return score >= 60 ? "fair" : "low";
}

export const BAND_TEXT: Record<AtsBand, string> = {
  low: "Needs work",
  fair: "Getting there",
  natural: "In the natural range",
  veryHigh: "Very high: check for keyword stuffing",
};

/** Section headings that parsers recognise (lower case) */
const STANDARD_HEADINGS = new Set([
  "summary",
  "professional summary",
  "profile",
  "personal statement",
  "career summary",
  "experience",
  "work experience",
  "professional experience",
  "employment",
  "employment history",
  "work history",
  "education",
  "education and training",
  "education & training",
  "qualifications",
  "skills",
  "key skills",
  "core skills",
  "technical skills",
  "projects",
  "certifications",
  "certificates",
  "licences",
  "publications",
  "volunteering",
  "volunteer experience",
  "awards",
  "achievements",
  "languages",
  "interests",
  "references",
]);

/** Openings that say what the job was, not what the person did */
const WEAK_OPENINGS = [
  "responsible for",
  "worked on",
  "worked with",
  "helped",
  "duties included",
  "involved in",
  "tasked with",
  "assisted with",
];

/** Soft skills an advert names: the text to look for (a stem catches "collaborate", "collaboration") and its name */
const SOFT_SKILLS: { stem: string; label: string }[] = [
  { stem: "communicat", label: "communication" },
  { stem: "collaborat", label: "collaboration" },
  { stem: "teamwork", label: "teamwork" },
  { stem: "team player", label: "team player" },
  { stem: "leadership", label: "leadership" },
  { stem: "mentor", label: "mentoring" },
  { stem: "problem solving", label: "problem solving" },
  { stem: "problem-solving", label: "problem solving" },
  { stem: "stakeholder", label: "stakeholder management" },
  { stem: "adaptab", label: "adaptability" },
  { stem: "ownership", label: "ownership" },
  { stem: "initiative", label: "initiative" },
  { stem: "time management", label: "time management" },
  { stem: "critical thinking", label: "critical thinking" },
  { stem: "creativ", label: "creativity" },
  { stem: "empath", label: "empathy" },
];

/** Words of a job title that say nothing about the kind of job */
const TITLE_FILLER = new Set([
  "senior",
  "junior",
  "lead",
  "principal",
  "staff",
  "mid",
  "level",
  "the",
  "and",
  "of",
  "a",
  "an",
  "i",
  "ii",
  "iii",
]);

const SHORT_CV_WORDS = 150;
const LONG_CV_WORDS = 900;

function wordCount(text: string): number {
  return text.split(/\s+/).filter(Boolean).length;
}

function sectionsOf(document: RenderedDocument): RenderedSection[] {
  return (["fullWidth", "left", "right"] as const)
    .flatMap((side) => document.columns[side])
    .filter((part): part is RenderedSection => part.kind === "section");
}

/** Lines that describe what was done: bullets and the lines of a description (not skills) */
function achievementLines(sections: RenderedSection[]): string[] {
  return sections
    .filter(
      (section) =>
        section.type === "experience" ||
        section.type === "projects" ||
        section.type === "volunteering"
    )
    .flatMap((section) => section.items)
    .flatMap((item) => [
      ...(item.fields.description ?? "").split("\n"),
      ...item.bullets.map((bullet) => bullet.text),
    ])
    .map((line) => line.replace(/^[\s•\-*]+/, "").trim())
    .filter((line) => line.length > 0);
}

function issue(
  category: AtsCategoryId,
  id: string,
  fields: Omit<AtsIssue, "id" | "category" | "fixKey"> & { fixKey?: string }
): AtsIssue {
  return { id: `${category}:${id}`, category, fixKey: id, ...fields };
}

interface CategoryResult {
  /** Null when there was nothing to compare */
  score: number | null;
  issues: AtsIssue[];
}

function formattingIssues(
  input: AtsInput,
  sections: RenderedSection[]
): AtsIssue[] {
  const issues: AtsIssue[] = [];
  const hasLeft = input.document.columns.left.some(
    (part) => part.kind === "section"
  );
  const hasRight = input.document.columns.right.some(
    (part) => part.kind === "section"
  );
  if (hasLeft && hasRight) {
    issues.push(
      issue("formatting", "two-columns", {
        title: "The CV has two columns",
        hint: "Many parsers read across the columns and mix the text up. A single column is the safest.",
        penalty: 25,
        target: "layout",
      })
    );
  }
  if (input.profile.photo && input.isPhotoShown) {
    issues.push(
      issue("formatting", "photo", {
        title: "A photo is on the CV",
        hint: "A photo adds nothing for a parser and UK employers usually expect none. Switch it off in the style.",
        penalty: 15,
        target: "style",
      })
    );
  }
  if (input.pageCount > input.pageLimit || input.linesOver > 0) {
    issues.push(
      issue("formatting", "over-limit", {
        title: `The CV does not fit ${input.pageLimit} ${input.pageLimit === 1 ? "page" : "pages"}`,
        hint: "Hide items, use auto-fit or allow another page.",
        penalty: 15,
        target: "content",
      })
    );
  }
  if (input.pageCount > 2) {
    issues.push(
      issue("formatting", "long", {
        title: `The CV is ${input.pageCount} pages long`,
        hint: "Recruiters expect one or two pages. Hide the less relevant items.",
        penalty: 15,
        target: "content",
      })
    );
  }
  const hasSymbolLevels = sections.some(
    (section) =>
      section.type === "skills" &&
      section.skillStyle?.display !== undefined &&
      section.skillStyle.display !== "none" &&
      section.items.some((item) =>
        item.bullets.some((bullet) => bullet.rating !== undefined)
      )
  );
  if (hasSymbolLevels) {
    issues.push(
      issue("formatting", "skill-symbols", {
        title: "Skill levels are drawn as symbols",
        hint: "Stars, dots and bars are read as stray characters or nothing at all. Show the skills as plain words in the template.",
        penalty: 10,
        target: "style",
      })
    );
  }
  return issues;
}

function startOf(item: { fields: Record<string, string> }): string {
  return (item.fields.startDate ?? "").trim();
}

function searchabilityIssues(
  input: AtsInput,
  sections: RenderedSection[]
): AtsIssue[] {
  const issues: AtsIssue[] = [];
  const { profile } = input;
  const missing: [string, string, number][] = [
    [profile.fullName.trim(), "name", 25],
    [profile.email?.trim() ?? "", "email", 20],
    [profile.phone?.trim() ?? "", "phone", 15],
    [profile.location?.trim() ?? "", "location", 5],
  ];
  for (const [value, label, penalty] of missing) {
    if (value === "") {
      issues.push(
        issue("searchability", `contact-${label}`, {
          title: `Your ${label} is missing`,
          hint: "Add it under Main info in the vault. A parser looks for it at the top of the page.",
          penalty,
          target: "vault",
          fixKey: "contact",
        })
      );
    }
  }
  if ((input.headline ?? "").trim() === "") {
    issues.push(
      issue("searchability", "headline", {
        title: "No job title under your name",
        hint: "A title such as the job's own wording tells a parser and a recruiter what you are.",
        penalty: 10,
        target: "details",
      })
    );
  }
  const unknownHeadings = sections.filter(
    (section) =>
      section.items.length > 0 &&
      !STANDARD_HEADINGS.has(section.title.trim().toLowerCase())
  );
  if (unknownHeadings.length > 0) {
    issues.push(
      issue("searchability", "headings", {
        title: `Unusual heading${unknownHeadings.length === 1 ? "" : "s"}: ${unknownHeadings
          .slice(0, 3)
          .map((section) => `"${section.title}"`)
          .join(", ")}`,
        hint: "Use the names parsers expect, such as Work Experience, Education and Skills.",
        penalty: Math.min(20, unknownHeadings.length * 10),
        target: "vault",
      })
    );
  }
  const dated = sections
    .filter(
      (section) => section.type === "experience" || section.type === "education"
    )
    .flatMap((section) => section.items);
  const withoutStart = dated.filter((item) => startOf(item) === "");
  if (withoutStart.length > 0) {
    issues.push(
      issue("searchability", "dates", {
        title: `${withoutStart.length} ${withoutStart.length === 1 ? "entry has" : "entries have"} no start date`,
        hint: "Parsers build your timeline from the dates. Add a start date to each job and course.",
        penalty: Math.min(30, withoutStart.length * 10),
        target: "vault",
      })
    );
  }
  const backwards = dated.filter((item) => {
    const end = (item.fields.endDate ?? "").trim();
    return end !== "" && startOf(item) !== "" && end < startOf(item);
  });
  if (backwards.length > 0) {
    issues.push(
      issue("searchability", "dates-order", {
        title: "A job ends before it starts",
        hint: "Check the dates of the entry in the vault.",
        penalty: 10,
        target: "vault",
        fixKey: "dates",
      })
    );
  }
  return issues;
}

function contentIssues(
  sections: RenderedSection[],
  cvText: string
): AtsIssue[] {
  const issues: AtsIssue[] = [];
  const lines = achievementLines(sections);
  const withoutNumber = lines.filter((line) => !/\d/.test(line));
  if (lines.length >= 3 && withoutNumber.length > 0) {
    issues.push(
      issue("content", "numbers", {
        title: `${withoutNumber.length} ${withoutNumber.length === 1 ? "line has" : "lines have"} no number or result`,
        hint: "Say how much, how many or how fast, where it is true (for example users, savings, coverage).",
        penalty: Math.min(30, withoutNumber.length * 8),
        target: "vault",
      })
    );
  }
  const weak = lines.filter((line) =>
    WEAK_OPENINGS.some((opening) => line.toLowerCase().startsWith(opening))
  );
  if (weak.length > 0) {
    issues.push(
      issue("content", "weak-openings", {
        title: `${weak.length} ${weak.length === 1 ? "line starts" : "lines start"} with a weak phrase`,
        hint: 'Start with what you did: "Led", "Built", "Reduced" rather than "Responsible for".',
        penalty: Math.min(20, weak.length * 5),
        target: "vault",
      })
    );
  }
  const words = wordCount(cvText);
  if (words < SHORT_CV_WORDS) {
    issues.push(
      issue("content", "short", {
        title: "The CV is very short",
        hint: "Add detail to your most recent roles so there is something to match against.",
        penalty: 25,
        target: "vault",
      })
    );
  } else if (words > LONG_CV_WORDS) {
    issues.push(
      issue("content", "wordy", {
        title: "The CV has a lot of text",
        hint: "Hide older or less relevant items so the best ones stand out.",
        penalty: 15,
        target: "content",
      })
    );
  }
  return issues;
}

function clean(list: string[]): string[] {
  return list.map((term) => term.trim()).filter((term) => term !== "");
}

function termsOf(requirements: Requirements): {
  mustHave: string[];
  others: string[];
} {
  const mustHave = [...new Set(clean(requirements.mustHave))];
  const seen = new Set(mustHave.map((term) => term.toLowerCase()));
  const others = [
    ...clean(requirements.keywords),
    ...clean(requirements.niceToHave),
  ].filter((term) => {
    const key = term.toLowerCase();
    if (seen.has(key)) {
      return false;
    }
    seen.add(key);
    return true;
  });
  return { mustHave, others };
}

/** Other ways to write the same term ("React.js" / "React", "CI-CD" / "CI CD") */
function variantsOf(term: string): string[] {
  return [
    term.replace(/\.?\s?js\b/i, ""),
    term.replace(/[-\s]/g, ""),
    term.replace(/-/g, " "),
  ].filter((variant) => variant !== term && variant.trim() !== "");
}

type TermState = "exact" | "variant" | "missing";

function stateOf(term: string, cvText: string): TermState {
  if (isGapCoveredByCv(term, cvText)) {
    return "exact";
  }
  return variantsOf(term).some((variant) => isGapCoveredByCv(variant, cvText))
    ? "variant"
    : "missing";
}

function hardSkillResult(
  requirements: Requirements,
  cvText: string
): CategoryResult & { covered: string[]; missing: string[] } {
  const { mustHave, others } = termsOf(requirements);
  const issues: AtsIssue[] = [];
  const covered: string[] = [];
  const missing: string[] = [];
  const weights = new Map<string, number>();
  for (const term of mustHave) {
    weights.set(term, 2);
  }
  for (const term of others) {
    weights.set(term, 1);
  }
  let total = 0;
  let got = 0;
  for (const [term, weight] of weights) {
    total += weight;
    const state = stateOf(term, cvText);
    if (state === "missing") {
      missing.push(term);
      issues.push(
        issue("hardSkills", `missing:${term.toLowerCase()}`, {
          title: `"${term}" is not on the CV`,
          hint: "Add the keywords where they are true, in the advert's words. Never add what you have not done.",
          penalty: 0,
          target: "vault",
          fixKey: "missing-keywords",
        })
      );
    } else {
      covered.push(term);
      got += state === "exact" ? weight : weight * 0.8;
      if (state === "variant") {
        issues.push(
          issue("hardSkills", `wording:${term.toLowerCase()}`, {
            title: `The advert says "${term}", the CV words it differently`,
            hint: "Where it is true, use the advert's exact wording once. Some systems match words literally.",
            penalty: 0,
            target: "vault",
            fixKey: "wording",
          })
        );
      }
    }
  }
  return {
    score: total === 0 ? null : Math.round((got / total) * 100),
    issues,
    covered,
    missing,
  };
}

function softSkillResult(
  requirements: Requirements,
  jobAd: string,
  cvText: string
): { score: number; issues: AtsIssue[] } | null {
  const adText = [
    jobAd,
    ...requirements.mustHave,
    ...requirements.niceToHave,
    ...requirements.keywords,
  ]
    .join("\n")
    .toLowerCase();
  const cv = cvText.toLowerCase();
  const asked = SOFT_SKILLS.filter((entry) => adText.includes(entry.stem));
  if (asked.length === 0) {
    return null;
  }
  const missing = asked.filter((entry) => !cv.includes(entry.stem));
  return {
    score: Math.round(((asked.length - missing.length) / asked.length) * 100),
    issues: missing.map((entry) =>
      issue("softSkills", entry.label, {
        title: `"${entry.label}" is in the advert, not in the CV`,
        hint: "Show it with an example in a bullet or the summary rather than by listing the word.",
        penalty: 0,
        target: "vault",
        fixKey: "soft-skills",
      })
    ),
  };
}

function significantWords(text: string): string[] {
  return text
    .toLowerCase()
    .split(/[^a-z0-9+#]+/)
    .filter((word) => word.length > 1 && !TITLE_FILLER.has(word));
}

/** Whole years between the earliest start date of the CV and today */
function yearsOfExperience(sections: RenderedSection[], today: Date): number {
  const starts = sections
    .filter((section) => section.type === "experience")
    .flatMap((section) => section.items)
    .map((item) => Date.parse(startOf(item)))
    .filter((time) => !Number.isNaN(time));
  if (starts.length === 0) {
    return 0;
  }
  const years = (today.getTime() - Math.min(...starts)) / (365.25 * 86_400_000);
  return Math.max(0, Math.floor(years));
}

/** The most years the advert asks for ("5+ years"), or 0 */
function yearsAsked(text: string): number {
  const matches = [...text.matchAll(/(\d{1,2})\s*\+?\s*(?:years|yrs)/gi)].map(
    (match) => Number(match[1])
  );
  return matches.length === 0 ? 0 : Math.max(...matches);
}

function titleResult(
  input: AtsInput,
  requirements: Requirements,
  sections: RenderedSection[],
  jobAd: string
): { score: number; issues: AtsIssue[] } {
  const issues: AtsIssue[] = [];
  let penalty = 0;
  const wanted = significantWords(requirements.jobTitle);
  const titles = sections
    .filter((section) => section.type === "experience")
    .flatMap((section) => section.items)
    .map((item) => item.fields.jobTitle ?? "");
  const shown = significantWords([input.headline ?? "", ...titles].join(" "));
  if (wanted.length > 0) {
    const share =
      wanted.filter((word) => shown.includes(word)).length / wanted.length;
    if (share === 0) {
      penalty += 40;
      issues.push(
        issue("titleExperience", "title", {
          title: `Nothing on the CV is called "${requirements.jobTitle}"`,
          hint: "If it is honest, pick the job title that is closest to the advert's under your name.",
          penalty: 40,
          target: "details",
        })
      );
    } else if (share < 1) {
      penalty += 15;
      issues.push(
        issue("titleExperience", "title", {
          title: `Only part of "${requirements.jobTitle}" is on the CV`,
          hint: "Use the advert's wording for your job title under your name where it is true.",
          penalty: 15,
          target: "details",
        })
      );
    }
  }
  const asked = yearsAsked(
    [jobAd, ...requirements.mustHave, requirements.seniority].join("\n")
  );
  const years = yearsOfExperience(sections, input.today);
  if (asked > 0 && years < asked) {
    penalty += 30;
    issues.push(
      issue("titleExperience", "years", {
        title: `The advert asks for ${asked}+ years, the CV shows ${years}`,
        hint: "Check that every relevant job is on the CV with its dates, including earlier ones.",
        penalty: 30,
        target: "vault",
      })
    );
  }
  const hasEducation = sections.some(
    (section) => section.type === "education" && section.items.length > 0
  );
  if (
    !hasEducation &&
    /\b(degree|bsc|msc|bachelor|master|phd)\b/i.test(jobAd)
  ) {
    penalty += 15;
    issues.push(
      issue("titleExperience", "education", {
        title: "The advert mentions a degree and no education is shown",
        hint: "Show your education, or the certificates that stand in for it.",
        penalty: 15,
        target: "content",
      })
    );
  }
  return { score: Math.max(0, 100 - penalty), issues };
}

function category(
  id: AtsCategoryId,
  group: AtsGroupId,
  issues: AtsIssue[],
  score?: number
): AtsCategory {
  const taken = issues.reduce((sum, entry) => sum + entry.penalty, 0);
  return {
    id,
    group,
    label: ATS_LABELS[id],
    score: score ?? Math.max(0, 100 - taken),
    issues,
  };
}

/** The weighted average of the categories (their weights are renormalised to the ones present) */
function groupScore(categories: AtsCategory[]): number {
  const weight = categories.reduce(
    (sum, entry) => sum + ATS_WEIGHTS[entry.id],
    0
  );
  if (weight === 0) {
    return 0;
  }
  return Math.round(
    categories.reduce(
      (sum, entry) => sum + entry.score * ATS_WEIGHTS[entry.id],
      0
    ) / weight
  );
}

function hashOf(text: string): string {
  let hash = 5381;
  for (let index = 0; index < text.length; index += 1) {
    hash = ((hash << 5) + hash + text.charCodeAt(index)) | 0;
  }
  return (hash >>> 0).toString(36);
}

/** True when the advert gave something to match against */
export function hasRequirements(requirements?: Requirements): boolean {
  return (
    requirements !== undefined &&
    termsOf(requirements).mustHave.length +
      termsOf(requirements).others.length >
      0
  );
}

/** Scores a CV. Pure: the same input always gives the same result. */
export function scoreAts(input: AtsInput): AtsResult {
  const sections = sectionsOf(input.document);
  const cvText = documentText(input.document);
  const profileText = [
    input.profile.fullName,
    input.profile.headline,
    input.headline,
  ]
    .filter(Boolean)
    .join("\n");
  const searchable = `${profileText}\n${cvText}`;
  const cv: AtsGroup = (() => {
    const categories = [
      category("formatting", "cv", formattingIssues(input, sections)),
      category("searchability", "cv", searchabilityIssues(input, sections)),
      category("content", "cv", contentIssues(sections, cvText)),
    ];
    return { score: groupScore(categories), categories };
  })();

  let match: AtsGroup | null = null;
  let covered: string[] = [];
  let missing: string[] = [];
  const requirements = hasRequirements(input.requirements)
    ? input.requirements
    : undefined;
  if (requirements) {
    const jobAd = input.jobAd ?? "";
    const hard = hardSkillResult(requirements, searchable);
    covered = hard.covered;
    missing = hard.missing;
    const soft = softSkillResult(requirements, jobAd, searchable);
    const title = titleResult(input, requirements, sections, jobAd);
    const categories = [
      ...(hard.score === null
        ? []
        : [category("hardSkills", "match", hard.issues, hard.score)]),
      ...(soft
        ? [category("softSkills", "match", soft.issues, soft.score)]
        : []),
      category("titleExperience", "match", title.issues, title.score),
    ];
    match = { score: groupScore(categories), categories };
  }
  const categories = [...cv.categories, ...(match?.categories ?? [])];
  return {
    total: match ? Math.round((cv.score + match.score) / 2) : cv.score,
    cv,
    match,
    issues: categories.flatMap((entry) => entry.issues),
    covered,
    missing,
    contentKey: hashOf(
      `${searchable}\n${JSON.stringify(requirements ?? null)}\n${input.pageCount}\n${input.document.columns.left.length}/${input.document.columns.right.length}`
    ),
  };
}

export interface FixItem {
  key: string;
  category: AtsCategoryId;
  title: string;
  hint: string;
  target: AtsFixTarget;
  count: number;
}

/**
 * The issues as a short to-do list: issues with the same `fixKey` become one line ("Add the
 * keywords A, B and C"), the ones that cost the most points first.
 */
export function fixList(issues: AtsIssue[]): FixItem[] {
  const grouped = new Map<string, AtsIssue[]>();
  for (const entry of issues) {
    const key = `${entry.category}:${entry.fixKey}`;
    grouped.set(key, [...(grouped.get(key) ?? []), entry]);
  }
  return [...grouped.entries()]
    .map(([key, entries]) => {
      const first = entries[0];
      const names = entries.map(
        (entry) => (/"([^"]+)"/.exec(entry.title) ?? [])[1]
      );
      const isKeywordLine =
        first.fixKey === "missing-keywords" ||
        first.fixKey === "soft-skills" ||
        first.fixKey === "wording";
      const list = names.filter((name): name is string => Boolean(name));
      const title =
        isKeywordLine && list.length > 0
          ? keywordLine(first.fixKey, list)
          : first.title;
      return {
        key,
        category: first.category,
        title,
        hint: first.hint,
        target: first.target,
        count: entries.length,
        cost: entries.reduce((sum, entry) => sum + entry.penalty, 0),
      };
    })
    .sort((a, b) => b.cost - a.cost || b.count - a.count)
    .map(({ cost: _cost, ...item }) => item);
}

function keywordLine(fixKey: string, words: string[]): string {
  if (fixKey === "wording") {
    return `Use the advert's wording for ${joinWords(words)}, where it is true`;
  }
  if (fixKey === "soft-skills") {
    return `Show ${joinWords(words)} with an example`;
  }
  return `Add the keywords ${joinWords(words)} where they are true`;
}

/** "A", "A and B", "A, B and C" */
function joinWords(words: string[]): string {
  if (words.length <= 1) {
    return words.join("");
  }
  return `${words.slice(0, -1).join(", ")} and ${words.at(-1)}`;
}

/** What is kept of a scan, to compare a later one with it (small, plain JSON) */
export interface AtsSnapshot {
  /** ISO time of the scan */
  at: string;
  total: number;
  cv: number;
  match: number | null;
  categories: Partial<Record<AtsCategoryId, { score: number; issues: number }>>;
  issues: AtsIssue[];
  covered: string[];
  missing: string[];
  contentKey: string;
}

export function snapshotOf(result: AtsResult, at: Date): AtsSnapshot {
  return {
    at: at.toISOString(),
    total: result.total,
    cv: result.cv.score,
    match: result.match?.score ?? null,
    categories: Object.fromEntries(
      [...result.cv.categories, ...(result.match?.categories ?? [])].map(
        (entry) => [
          entry.id,
          { score: entry.score, issues: entry.issues.length },
        ]
      )
    ),
    issues: result.issues,
    covered: result.covered,
    missing: result.missing,
    contentKey: result.contentKey,
  };
}

export interface AtsComparison {
  total: number;
  cv: number;
  match: number | null;
  categories: Partial<Record<AtsCategoryId, number>>;

  /** Issues of the first scan that are gone now */
  fixed: AtsIssue[];
}

/** Changes from the first scan to a later one (positive = better). Null while it is the same scan. */
export function compareScans(
  first: AtsSnapshot,
  now: AtsSnapshot
): AtsComparison {
  const nowIds = new Set(now.issues.map((entry) => entry.id));
  return {
    total: now.total - first.total,
    cv: now.cv - first.cv,
    match:
      now.match !== null && first.match !== null
        ? now.match - first.match
        : null,
    categories: Object.fromEntries(
      Object.entries(now.categories).map(([id, value]) => [
        id,
        value.score -
          (first.categories[id as AtsCategoryId]?.score ?? value.score),
      ])
    ),
    fixed: first.issues.filter((entry) => !nowIds.has(entry.id)),
  };
}

/** "+5", "-3" or "0" */
export function formatDelta(delta: number): string {
  if (delta === 0) {
    return "0";
  }
  return delta > 0 ? `+${delta}` : `${delta}`;
}
