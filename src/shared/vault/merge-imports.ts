import { Item, SectionType, Vault } from "@custom-types/vault-types";

/** One imported document, already sorted into a vault by the import (#574) */
export interface ImportSource {
  fileName: string;
  vault: Vault;
}

export type ProposalKind =
  /** Not in the vault yet */
  | "new"
  /** Matches an item in the vault; the import adds what is missing */
  | "update"
  /** Found in several files and combined into one */
  | "merged";

/** A fact two sources give differently; the user picks one (or types another) before saving */
export interface Conflict {
  field: string;
  /** The different values, each with the files (or "Your vault") that give it */
  options: { value: string; from: string[] }[];
  /** The user's choice; unset until resolved */
  chosen?: string;
}

/** One line of a gathered description and the files (or "Your vault") it appears in */
export interface DescriptionLine {
  text: string;
  from: string[];
}

export interface Proposal {
  id: string;
  kind: ProposalKind;
  sectionType: SectionType;
  sectionTitle: string;
  /** Id of the vault item this updates (kind "update") */
  existingItemId?: string;
  /** The vault item as it is now (kind "update"), for the before/after view */
  before?: Item;
  /** The description line by line with where each line came from (items found in several places) */
  descriptionLines?: DescriptionLine[];
  /** The item as it would be saved (conflicting fields hold the vault's value, or the first file's, until resolved) */
  item: Item;
  sources: string[];
  conflicts: Conflict[];
}

interface ProfileConflict {
  field: string;
  options: { value: string; from: string[] }[];
  chosen?: string;
  /** Job title only: the values not chosen are added to "Other job titles" (default on) */
  addOthers?: boolean;
}

export interface MergePlan {
  proposals: Proposal[];
  /** Profile fields that are empty in the vault and filled by the import */
  profileFill: Record<string, string>;
  profileConflicts: ProfileConflict[];
  links: { label: string; url: string; from: string[] }[];
}

const VAULT_LABEL = "Your vault";

/** Fields that identify an entry, by section type (first non-empty ones are compared) */
const IDENTITY_FIELDS: Partial<Record<SectionType, string[]>> = {
  experience: ["company", "jobTitle"],
  education: ["institute", "degree"],
  skills: ["category"],
  projects: ["name"],
  certifications: ["name"],
  publications: ["title"],
  volunteering: ["company", "jobTitle"],
  awards: ["name"],
  references: ["name"],
};

/** Fields whose differing text is gathered together instead of being a conflict */
const TEXT_FIELDS = new Set(["description", "text", "summary"]);

/** Fields that are plain facts: differing values are a conflict */
const DATE_FIELDS = new Set(["startDate", "endDate"]);

function norm(text: string | undefined): string {
  return (text ?? "").toLowerCase().replace(/\s+/g, " ").trim();
}

function identityOf(type: SectionType, item: Item): string[] {
  const keys = IDENTITY_FIELDS[type] ?? ["title", "name", "category"];
  return keys.map((key) => norm(item.fields[key])).filter(Boolean);
}

/** Years an item covers, for "overlapping dates"; an open end is "now" */
function yearsOf(item: Item): [number, number] | null {
  const start = Number.parseInt(item.fields.startDate ?? "", 10);
  if (Number.isNaN(start)) {
    return null;
  }
  const end = Number.parseInt(item.fields.endDate ?? "", 10);
  return [start, Number.isNaN(end) ? new Date().getFullYear() : end];
}

function overlaps(a: Item, b: Item): boolean {
  const first = yearsOf(a);
  const second = yearsOf(b);
  if (!first || !second) {
    // no dates on one side: the names decide
    return true;
  }
  return first[0] <= second[1] && second[0] <= first[1];
}

/** Words that say little about a role or degree */
const FILLER_WORDS = new Set(["and", "of", "the", "in", "for", "at", "a"]);

/** Two titles are alike when one contains the other or they share a meaningful word ("Software Developer", "Senior Developer") */
function isSimilar(x: string, y: string): boolean {
  if (x === y || x.includes(y) || y.includes(x)) {
    return true;
  }
  const words = (text: string): Set<string> =>
    new Set(
      text
        .split(/[^\p{L}\p{N}]+/u)
        .filter((word) => word.length > 1 && !FILLER_WORDS.has(word))
    );
  const mine = words(x);
  return [...words(y)].some((word) => mine.has(word));
}

/** Same start and end year (both must have a start) */
function isSamePeriod(a: Item, b: Item): boolean {
  const first = yearsOf(a);
  const second = yearsOf(b);
  return (
    first !== null &&
    second !== null &&
    first[0] === second[0] &&
    first[1] === second[1]
  );
}

/** Same entry: the first identity field matches (one contains the other) and the dates overlap */
export function isSameEntry(type: SectionType, a: Item, b: Item): boolean {
  if (type === "summary") {
    return true;
  }
  const first = identityOf(type, a);
  const second = identityOf(type, b);
  if (first.length === 0 || second.length === 0) {
    return false;
  }
  const [x, y] = [first[0], second[0]];
  const isNameMatch = x === y || x.includes(y) || y.includes(x);
  if (!isNameMatch) {
    return false;
  }
  if (!overlaps(a, b)) {
    return false;
  }
  // The same employer twice at the same time can be two different roles (a job and a side
  // project, a promotion year): when both have a second identity field (job title, degree)
  // and the two are not alike, only an identical period makes them one entry whose title changed
  // (that is then a conflict for the user to settle)
  const [third, fourth] = [first[1], second[1]];
  if (third && fourth && !isSimilar(third, fourth)) {
    return isSamePeriod(a, b);
  }
  return true;
}

/** Gathers the lines of several texts, dropping repeats (compared ignoring case and spacing) and remembering where each came from */
export function gatherLines(
  texts: { from: string; text: string }[]
): DescriptionLine[] {
  const lines = new Map<string, DescriptionLine>();
  for (const { from, text } of texts) {
    for (const line of text.split("\n")) {
      const key = norm(line);
      if (!key) {
        continue;
      }
      const known = lines.get(key);
      if (!known) {
        lines.set(key, { text: line.trim(), from: [from] });
      } else if (!known.from.includes(from)) {
        known.from.push(from);
      }
    }
  }
  return [...lines.values()];
}

interface Candidate {
  from: string;
  item: Item;
}

/** Combines the candidates for one entry into one item and its conflicts */
function combine(candidates: Candidate[]): {
  item: Item;
  conflicts: Conflict[];
  descriptionLines?: DescriptionLine[];
} {
  const [base, ...rest] = candidates;
  const fields: Record<string, string> = { ...base.item.fields };
  const conflicts: Conflict[] = [];
  let descriptionLines: DescriptionLine[] | undefined;
  const allKeys = new Set(
    candidates.flatMap((candidate) => Object.keys(candidate.item.fields))
  );
  for (const key of allKeys) {
    const given = candidates.filter(
      (candidate) => (candidate.item.fields[key] ?? "").trim() !== ""
    );
    if (given.length === 0) {
      continue;
    }
    if (TEXT_FIELDS.has(key)) {
      const lines = gatherLines(
        given.map((c) => ({ from: c.from, text: c.item.fields[key] }))
      );
      fields[key] = lines.map((line) => line.text).join("\n");
      if (key === "description" && candidates.length > 1) {
        descriptionLines = lines;
      }
      continue;
    }
    const groups = new Map<string, { value: string; from: string[] }>();
    for (const candidate of given) {
      const value = candidate.item.fields[key];
      const group = groups.get(norm(value)) ?? { value, from: [] };
      group.from.push(candidate.from);
      groups.set(norm(value), group);
    }
    fields[key] = given[0].item.fields[key];
    if (groups.size > 1 && (DATE_FIELDS.has(key) || !key.startsWith("link"))) {
      conflicts.push({ field: key, options: [...groups.values()] });
    }
  }
  const bullets = [...base.item.bullets];
  const seenBullets = new Set(bullets.map((bullet) => norm(bullet.text)));
  for (const candidate of rest) {
    for (const bullet of candidate.item.bullets) {
      if (!seenBullets.has(norm(bullet.text))) {
        seenBullets.add(norm(bullet.text));
        bullets.push(bullet);
      }
    }
  }
  const tags = [
    ...new Set(candidates.flatMap((candidate) => candidate.item.tags)),
  ];
  return {
    item: { ...base.item, fields, bullets, tags },
    conflicts,
    descriptionLines,
  };
}

/**
 * Plans what importing several documents does to a vault, without changing anything: items in
 * several files are combined (differing descriptions gathered, differing facts become
 * conflicts), items that match one in the vault become updates (vault values count as a
 * source, so a different date is a conflict), everything else is new. Pure.
 */
export function planImports(
  existing: Vault,
  sources: ImportSource[],
  newId: () => string
): MergePlan {
  const proposals: Proposal[] = [];

  for (const type of new Set(
    sources.flatMap((source) => source.vault.sections.map((s) => s.type))
  )) {
    const home = existing.sections.find((section) => section.type === type);
    const groups: { from: Candidate[]; existing?: Item }[] = [];
    let title = home?.title ?? "";
    for (const source of sources) {
      for (const section of source.vault.sections) {
        if (section.type !== type) {
          continue;
        }
        title ||= section.title;
        for (const item of section.items) {
          if (
            Object.values(item.fields).every((v) => v.trim() === "") &&
            item.bullets.length === 0
          ) {
            continue;
          }
          const group = groups.find((candidate) =>
            isSameEntry(
              type,
              candidate.existing ?? candidate.from[0].item,
              item
            )
          );
          if (group) {
            group.from.push({ from: source.fileName, item });
          } else {
            groups.push({
              from: [{ from: source.fileName, item }],
              existing: home?.items.find((own) => isSameEntry(type, own, item)),
            });
          }
        }
      }
    }
    for (const group of groups) {
      const candidates: Candidate[] = group.existing
        ? [{ from: VAULT_LABEL, item: group.existing }, ...group.from]
        : group.from;
      const { item, conflicts, descriptionLines } = combine(candidates);
      const files = [...new Set(group.from.map((entry) => entry.from))];
      const isCombined = files.length > 1;
      let kind: ProposalKind = isCombined ? "merged" : "new";
      if (group.existing) {
        kind = "update";
      }
      proposals.push({
        id: newId(),
        kind,
        sectionType: type,
        sectionTitle: title,
        existingItemId: group.existing?.id,
        before: group.existing,
        descriptionLines,
        item: group.existing ? { ...item, id: group.existing.id } : item,
        sources: files,
        conflicts,
      });
    }
  }

  const profileFill: Record<string, string> = {};
  const profileConflicts: ProfileConflict[] = [];
  const profileKeys = ["fullName", "headline", "email", "phone", "location"];
  for (const key of profileKeys) {
    const own = (existing.profile as Record<string, unknown>)[key];
    const given = sources
      .map((source) => ({
        from: source.fileName,
        value: (source.vault.profile as Record<string, unknown>)[key],
      }))
      .filter(
        (entry): entry is { from: string; value: string } =>
          typeof entry.value === "string" && entry.value.trim() !== ""
      );
    const groups = new Map<string, { value: string; from: string[] }>();
    if (typeof own === "string" && own.trim()) {
      groups.set(norm(own), { value: own, from: [VAULT_LABEL] });
    }
    for (const entry of given) {
      const group = groups.get(norm(entry.value)) ?? {
        value: entry.value,
        from: [],
      };
      group.from.push(entry.from);
      groups.set(norm(entry.value), group);
    }
    if (groups.size > 1) {
      profileConflicts.push({
        field: key,
        options: [...groups.values()],
        addOthers: key === "headline" ? true : undefined,
      });
    } else if (groups.size === 1 && !(typeof own === "string" && own.trim())) {
      profileFill[key] = [...groups.values()][0].value;
    }
  }

  const links = new Map<
    string,
    { label: string; url: string; from: string[] }
  >();
  const knownUrls = new Set(existing.links.map((link) => link.url));
  for (const source of sources) {
    for (const link of source.vault.links) {
      if (knownUrls.has(link.url)) {
        continue;
      }
      const entry = links.get(link.url) ?? { ...link, from: [] };
      entry.from.push(source.fileName);
      links.set(link.url, entry);
    }
  }

  return {
    proposals,
    profileFill,
    profileConflicts,
    links: [...links.values()],
  };
}

/** How many conflicts still need a choice (profile ones always count, items only when checked) */
export function unresolvedCount(
  plan: MergePlan,
  checked: ReadonlySet<string>
): number {
  const profile = plan.profileConflicts.filter(
    (conflict) => conflict.chosen === undefined
  ).length;
  const items = plan.proposals
    .filter((proposal) => checked.has(proposal.id))
    .flatMap((proposal) => proposal.conflicts)
    .filter((conflict) => conflict.chosen === undefined).length;
  return profile + items;
}

/** True when every conflict (in the checked proposals and the profile) has a choice */
export function isPlanResolved(
  plan: MergePlan,
  checked: ReadonlySet<string>
): boolean {
  return unresolvedCount(plan, checked) === 0;
}

/** Replaces the description of a proposal with these lines (the user removed or edited some); everything else is kept. Pure. */
export function setDescriptionLines(
  plan: MergePlan,
  proposalId: string,
  lines: DescriptionLine[]
): MergePlan {
  return {
    ...plan,
    proposals: plan.proposals.map((proposal) =>
      proposal.id === proposalId
        ? {
            ...proposal,
            descriptionLines: lines,
            item: {
              ...proposal.item,
              fields: {
                ...proposal.item.fields,
                description: lines.map((line) => line.text).join("\n"),
              },
            },
          }
        : proposal
    ),
  };
}

/**
 * Applies the checked proposals to the vault: updates replace the matching item, new and
 * merged ones are appended to the section of their type (created when missing), chosen
 * values win over the vault's, empty profile fields are filled. Pure.
 */
export function applyPlan(
  existing: Vault,
  plan: MergePlan,
  checked: ReadonlySet<string>,
  newSectionId: () => string
): Vault {
  const sections = existing.sections.map((section) => ({
    ...section,
    items: [...section.items],
  }));
  for (const proposal of plan.proposals) {
    if (!checked.has(proposal.id)) {
      continue;
    }
    const fields = { ...proposal.item.fields };
    for (const conflict of proposal.conflicts) {
      if (conflict.chosen !== undefined) {
        fields[conflict.field] = conflict.chosen;
      }
    }
    const item = { ...proposal.item, fields };
    const home = sections.find((s) => s.type === proposal.sectionType);
    if (!home) {
      sections.push({
        id: newSectionId(),
        type: proposal.sectionType,
        title: proposal.sectionTitle,
        items: [item],
      });
    } else if (proposal.existingItemId) {
      home.items = home.items.map((own) =>
        own.id === proposal.existingItemId ? item : own
      );
    } else {
      home.items.push(item);
    }
  }
  const profile: Record<string, unknown> = {
    ...existing.profile,
    ...plan.profileFill,
  };
  for (const conflict of plan.profileConflicts) {
    if (conflict.chosen === undefined) {
      continue;
    }
    profile[conflict.field] = conflict.chosen;
    if (conflict.field === "headline" && conflict.addOthers !== false) {
      const chosen = norm(conflict.chosen);
      const others = conflict.options
        .map((option) => option.value)
        .filter((value) => norm(value) !== chosen);
      const known = (profile.headlineOptions as string[] | undefined) ?? [];
      profile.headlineOptions = [
        ...known,
        ...others.filter(
          (value) => !known.some((own) => norm(own) === norm(value))
        ),
      ];
    }
  }
  const known = new Set(existing.links.map((link) => link.url));
  const links = [
    ...existing.links,
    ...plan.links
      .filter((link) => !known.has(link.url))
      .map((link) => ({
        id: newSectionId(),
        label: link.label,
        url: link.url,
        tags: [],
      })),
  ];
  return { ...existing, profile: profile as Vault["profile"], sections, links };
}
