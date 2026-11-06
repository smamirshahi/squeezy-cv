import { Side } from "@custom-types/styles-types";
import { Emphasis, Tone, Variant } from "@custom-types/variant-types";
import {
  Bullet,
  LinkItem,
  Profile,
  SectionType,
  Vault,
} from "@custom-types/vault-types";
import { HEADER_IDS } from "@shared/vault/default-vault";
import { reconcileStructure } from "@shared/vault/page-structure";

export interface RenderedBullet {
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
    };

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

function renderBullets(
  bullets: Bullet[],
  choices: Record<string, { isVisible: boolean; wording?: string }> | undefined
): RenderedBullet[] {
  const result: RenderedBullet[] = [];
  for (const bullet of bullets) {
    const choice = choices?.[bullet.id];
    if (choice && !choice.isVisible) {
      continue;
    }
    result.push({
      id: bullet.id,
      text: pickText(bullet, choice?.wording),
      ...(bullet.rating === undefined ? {} : { rating: bullet.rating }),
    });
  }
  return result;
}

function renderItems(
  items: Vault["sections"][number]["items"],
  selection: Variant["selection"]
): RenderedItem[] {
  return items
    .map((item, index) => ({ item, index, choice: selection[item.id] }))
    .filter(({ choice }) => choice?.isVisible !== false)
    .sort((a, b) => {
      const orderA = a.choice?.order ?? Infinity;
      const orderB = b.choice?.order ?? Infinity;
      return orderA === orderB ? a.index - b.index : orderA - orderB;
    })
    .map(({ item, choice }) => ({
      id: item.id,
      fields: item.fields,
      bullets: renderBullets(item.bullets, choice?.bullets),
      emphasis: choice?.emphasis ?? "normal",
    }));
}

/**
 * Resolves a vault and a variant into the document to draw. Pure: same input, same output.
 * The layout is reconciled with the vault, so a section added later still appears and a
 * deleted one is dropped. Sections without any visible item are left out.
 */
export function render(vault: Vault, variant: Variant): RenderedDocument {
  const sections = new Map(vault.sections.map((s) => [s.id, s]));
  const layout = reconcileStructure(
    variant.layout,
    [...HEADER_IDS, ...sections.keys()],
    "left"
  );

  function renderPart(id: string): RenderedPart[] {
    if (id === "personalInfo") {
      return [{ kind: "personalInfo", id, profile: vault.profile }];
    }
    if (id === "contactInfo") {
      return [
        { kind: "contactInfo", id, profile: vault.profile, links: vault.links },
      ];
    }
    const section = sections.get(id);
    if (!section) {
      return [];
    }
    const items = renderItems(section.items, variant.selection);
    return items.length === 0
      ? []
      : [
          {
            kind: "section",
            id,
            type: section.type,
            title: section.title,
            items,
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
