import { Side } from "@custom-types/styles-types";
import {
  Emphasis,
  SkillDisplay,
  Tone,
  Variant,
} from "@custom-types/variant-types";
import {
  Bullet,
  Item,
  LinkItem,
  Profile,
  SectionType,
  Vault,
} from "@custom-types/vault-types";
import { HEADER_IDS } from "@shared/vault/default-vault";
import { reconcileStructure } from "@shared/vault/page-structure";

interface RenderedBullet {
  id: string;
  /** The wording chosen by the variant */
  text: string;
  rating?: number;
}

export interface RenderedItem {
  id: string;
  fields: Record<string, string>;
  bullets: RenderedBullet[];
  emphasis: Emphasis;
}

export type RenderedPart =
  | { kind: "personalInfo"; id: string; profile: Profile }
  | { kind: "contactInfo"; id: string; profile: Profile; links: LinkItem[] }
  | {
      kind: "section";
      id: string;
      type: SectionType;
      title: string;
      items: RenderedItem[];
      /** Skills sections only: how to draw the levels and lay the list out */
      skillStyle?: { display?: SkillDisplay; columns: 1 | 2 };
    };

export type RenderedSection = Extract<RenderedPart, { kind: "section" }>;

/** What the preview and the PDF draw: parts per column, with all choices already applied */
export interface RenderedDocument {
  tone: Tone;
  pageLimit: number;
  style: Variant["style"];
  columns: Record<Side, RenderedPart[]>;
}

function pickText(bullet: Bullet, wording: string | undefined): string {
  if (wording && wording !== "text") {
    const alternative = bullet.alt?.[wording as "short" | "long" | "formal"];
    if (alternative) {
      return alternative;
    }
  }
  return bullet.text;
}

/** Entries ordered by their `order` value; ones without one keep their place after those with one */
function sortByOrder<T extends { id: string }>(
  entries: T[],
  orderOf: (id: string) => number | undefined
): T[] {
  return entries
    .map((entry, index) => ({ entry, index, order: orderOf(entry.id) }))
    .sort((a, b) => {
      const orderA = a.order ?? Infinity;
      const orderB = b.order ?? Infinity;
      return orderA === orderB ? a.index - b.index : orderA - orderB;
    })
    .map(({ entry }) => entry);
}

/** Items in the order the variant shows them (hidden ones included) */
export function sortItemsByVariant(
  items: Item[],
  selection: Variant["selection"]
): Item[] {
  return sortByOrder(items, (id) => selection[id]?.order);
}

/**
 * The bullets an item has in this job: the ones the AI made from its description when the job
 * has some, otherwise the vault's own.
 */
export function jobBullets(
  item: Item,
  selection: Variant["selection"]
): Bullet[] {
  const generated = selection[item.id]?.generated;
  if (!generated || generated.length === 0) {
    return item.bullets;
  }
  return generated.map((bullet) => ({
    id: bullet.id,
    text: bullet.text,
    alt: {},
    tags: [],
  }));
}

/** Bullets of an item in the order the variant shows them (hidden ones included) */
export function sortBulletsByVariant(
  item: Item,
  selection: Variant["selection"]
): Bullet[] {
  const choices = selection[item.id]?.bullets;
  return sortByOrder(jobBullets(item, selection), (id) => choices?.[id]?.order);
}

/** The visible items in variant order, each with its visible bullets carrying the chosen wording */
function resolveItems(items: Item[], selection: Variant["selection"]): Item[] {
  return sortItemsByVariant(items, selection)
    .filter((item) => selection[item.id]?.isVisible !== false)
    .map((item) => {
      const choices = selection[item.id]?.bullets;
      return {
        ...item,
        shouldShow: true,
        bullets: sortBulletsByVariant(item, selection)
          .filter((bullet) => choices?.[bullet.id]?.isVisible !== false)
          .map((bullet) => ({
            ...bullet,
            text: pickText(bullet, choices?.[bullet.id]?.wording),
          })),
      };
    });
}

/** The fields of an item as this job shows them: its own wording of a field, and without the parts it hides */
function jobFields(
  item: Item,
  choice: Variant["selection"][string] | undefined
): Record<string, string> {
  const fields: Record<string, string> = {
    ...item.fields,
    ...choice?.fieldText,
  };
  for (const key of choice?.hiddenFields ?? []) {
    delete fields[key];
  }
  return fields;
}

function renderItems(
  items: Item[],
  selection: Variant["selection"],
  minLevel?: number
): RenderedItem[] {
  return resolveItems(items, selection)
    .map((item) => ({
      ...item,
      bullets: minLevel
        ? item.bullets.filter((bullet) => (bullet.rating ?? 0) >= minLevel)
        : item.bullets,
    }))
    .filter((item) => !minLevel || item.bullets.length > 0)
    .map((item) => ({
      id: item.id,
      fields: jobFields(item, selection[item.id]),
      bullets: item.bullets.map((bullet) => ({
        id: bullet.id,
        text: bullet.text,
        ...(bullet.rating === undefined ? {} : { rating: bullet.rating }),
      })),
      emphasis: selection[item.id]?.emphasis ?? "normal",
    }));
}

/** The skills of one group, highest level first (unrated last, ties keep their order) */
function sortSkillsByLevel(item: RenderedItem): RenderedItem {
  return {
    ...item,
    bullets: item.bullets
      .map((bullet, index) => ({ bullet, index }))
      .sort(
        (a, b) =>
          (b.bullet.rating ?? 0) - (a.bullet.rating ?? 0) || a.index - b.index
      )
      .map(({ bullet }) => bullet),
  };
}

/** One item with every visible skill, the highest level first (unrated last, ties keep their order) */
function flattenSkills(items: RenderedItem[]): RenderedItem[] {
  if (items.length === 0) {
    return items;
  }
  const bullets = items
    .flatMap((item) => item.bullets)
    .map((bullet, index) => ({ bullet, index }))
    .sort(
      (a, b) =>
        (b.bullet.rating ?? 0) - (a.bullet.rating ?? 0) || a.index - b.index
    )
    .map(({ bullet }) => bullet);
  return bullets.length === 0
    ? []
    : [
        {
          id: items[0].id,
          fields: {},
          bullets,
          emphasis: "normal",
        },
      ];
}

/** The links in the job's order; links the order does not list keep their vault order, after the listed ones */
export function orderLinks(
  links: LinkItem[],
  order: string[] | undefined
): LinkItem[] {
  if (!order || order.length === 0) {
    return links;
  }
  const rank = (id: string): number => {
    const index = order.indexOf(id);
    return index < 0 ? order.length : index;
  };
  return links
    .map((link, position) => ({ link, position }))
    .sort(
      (a, b) => rank(a.link.id) - rank(b.link.id) || a.position - b.position
    )
    .map(({ link }) => link);
}

/**
 * Resolves a vault and a variant into the document to draw. Pure: same input, same output.
 * The layout is reconciled with the vault: a deleted section is dropped, and a section
 * the layout does not place is not drawn (the user adds it to the template on purpose).
 * Sections without any visible item are left out.
 */
export function render(vault: Vault, variant: Variant): RenderedDocument {
  const sections = new Map(vault.sections.map((s) => [s.id, s]));
  const layout = reconcileStructure(variant.layout, [
    ...HEADER_IDS,
    ...sections.keys(),
  ]);

  function renderPart(id: string): RenderedPart[] {
    if (id === "personalInfo") {
      return [
        {
          kind: "personalInfo",
          id,
          profile: variant.headline?.trim()
            ? { ...vault.profile, headline: variant.headline }
            : vault.profile,
        },
      ];
    }
    if (id === "contactInfo") {
      return [
        {
          kind: "contactInfo",
          id,
          profile: vault.profile,
          links:
            variant.style.shouldShowLinks === false
              ? []
              : orderLinks(vault.links, variant.linkOrder).filter(
                  (link) => !variant.hiddenLinks?.includes(link.id)
                ),
        },
      ];
    }
    const section = sections.get(id);
    if (!section || variant.hiddenSections?.includes(id)) {
      return [];
    }
    const isSkills = section.type === "skills";
    const grouped = renderItems(
      section.items,
      variant.selection,
      isSkills ? variant.skillMinLevel : undefined
    );
    const items =
      isSkills && variant.skillGroupBy === "level"
        ? flattenSkills(grouped)
        : isSkills
          ? grouped.map((item) =>
              // an order the job has chosen for this group wins over the level order
              Object.values(variant.selection[item.id]?.bullets ?? {}).some(
                (choice) => choice.order !== undefined
              )
                ? item
                : sortSkillsByLevel(item)
            )
          : grouped;
    return items.length === 0
      ? []
      : [
          {
            kind: "section",
            id,
            type: section.type,
            title: section.title,
            items,
            ...(isSkills
              ? {
                  skillStyle: {
                    ...(variant.skillDisplay
                      ? { display: variant.skillDisplay }
                      : {}),
                    columns: variant.skillColumns ?? 1,
                  },
                }
              : {}),
          },
        ];
  }

  return {
    tone: variant.tone,
    pageLimit: variant.pageLimit,
    style: variant.style,
    columns: {
      fullWidth: layout.fullWidth.flatMap(renderPart),
      left: layout.left.flatMap(renderPart),
      right: layout.right.flatMap(renderPart),
    },
  };
}
