import {
  ChatRequest,
  ChatResponse,
  Operation,
  RawChatAnswer,
  RawChatAnswerSchema,
} from "@custom-types/chat-types";
import { ToneSchema } from "@custom-types/variant-types";
import { Vault } from "@custom-types/vault-types";
import { AiClient } from "@server/ai/ai-types";
import { CvRefs, buildRefs, describeCv } from "@server/ai/tailor";
import { checkRewrite, describeFlags } from "@shared/ai/guardrails";

/** More changes than this in one answer are cut (and said so) */
const MAX_OPERATIONS = 20;
const PAGE_LIMITS = [1, 2];

type RawOperation = NonNullable<RawChatAnswer["operations"]>[number];

/** "hideItem", "hide_item" and "Hide Item" are the same operation */
function normaliseName(name: string): string {
  return name.toLowerCase().replace(/[^a-z]/g, "");
}

/** The real id for what the model wrote: a short name ("i2"), or a real id it copied */
function resolve(
  map: Map<string, string>,
  known: Set<string>,
  value: string | undefined
): string | undefined {
  if (!value) {
    return undefined;
  }
  const key = value.trim();
  return map.get(key) ?? (known.has(key) ? key : undefined);
}

/**
 * Turns the model's loose operations into typed ones with real ids. Whatever cannot be
 * understood or refers to something that is not in the CV is dropped and reported; the model's own
 * claims about whether a rewording is safe are never used (flags are recomputed here).
 */
export function toOperations(
  vault: Vault,
  refs: CvRefs,
  raw: RawChatAnswer
): { operations: Operation[]; warnings: string[] } {
  const warnings: string[] = [];
  const operations: Operation[] = [];
  const sections = new Set(vault.sections.map((s) => s.id));
  const items = new Map(
    vault.sections.flatMap((s) => s.items).map((item) => [item.id, item])
  );

  function item(raw: RawOperation): string | undefined {
    const direct = resolve(refs.items, new Set(items.keys()), raw.item);
    if (direct) {
      return direct;
    }
    return raw.bullet ? refs.bullets.get(raw.bullet.trim())?.itemId : undefined;
  }
  function bullet(
    raw: RawOperation
  ): { itemId: string; bulletId: string } | undefined {
    const found = raw.bullet ? refs.bullets.get(raw.bullet.trim()) : undefined;
    return found
      ? { itemId: found.itemId, bulletId: found.bulletId }
      : undefined;
  }

  for (const entry of raw.operations ?? []) {
    if (operations.length >= MAX_OPERATIONS) {
      warnings.push(`Only the first ${MAX_OPERATIONS} changes are kept.`);
      break;
    }
    const name = normaliseName(entry.op);
    const itemId = item(entry);
    const target = bullet(entry);

    if (name === "hideitem" || name === "showitem") {
      if (!itemId) {
        warnings.push(
          `Ignored a change about an unknown item (${entry.item ?? "?"}).`
        );
      } else {
        operations.push({
          op: "hideItem",
          itemId,
          isHidden: name === "showitem" ? false : (entry.isHidden ?? true),
        });
      }
    } else if (name === "emphasiseitem" || name === "highlightitem") {
      if (!itemId) {
        warnings.push(
          `Ignored a change about an unknown item (${entry.item ?? "?"}).`
        );
      } else {
        operations.push({
          op: "emphasiseItem",
          itemId,
          isEmphasised: entry.isEmphasised ?? true,
        });
      }
    } else if (name === "moveitem") {
      if (!itemId || entry.position === undefined) {
        warnings.push(
          "Ignored a move of an item that could not be identified."
        );
      } else {
        operations.push({
          op: "moveItem",
          itemId,
          position: Math.max(1, Math.round(entry.position)),
        });
      }
    } else if (name === "movesection") {
      const sectionId = resolve(refs.sections, sections, entry.section);
      if (!sectionId || entry.position === undefined) {
        warnings.push(
          "Ignored a move of a section that could not be identified."
        );
      } else {
        operations.push({
          op: "moveSection",
          sectionId,
          position: Math.max(1, Math.round(entry.position)),
        });
      }
    } else if (name === "hidebullet" || name === "showbullet") {
      if (!target) {
        warnings.push(
          `Ignored a change about an unknown bullet (${entry.bullet ?? "?"}).`
        );
      } else {
        operations.push({
          op: "hideBullet",
          ...target,
          isHidden: name === "showbullet" ? false : (entry.isHidden ?? true),
        });
      }
    } else if (name === "usewording") {
      const wording = entry.wording?.toLowerCase();
      const original = target
        ? items
            .get(target.itemId)
            ?.bullets.find((b) => b.id === target.bulletId)
        : undefined;
      if (!target || !original) {
        warnings.push(
          `Ignored a change about an unknown bullet (${entry.bullet ?? "?"}).`
        );
      } else if (
        wording === "text" ||
        wording === "original" ||
        wording === "canonical"
      ) {
        operations.push({ op: "useWording", ...target, wording: "text" });
      } else if (
        (wording === "short" || wording === "long" || wording === "formal") &&
        original.alt?.[wording]
      ) {
        operations.push({ op: "useWording", ...target, wording });
      } else {
        warnings.push(
          `There is no ${wording ?? "such"} wording of that bullet to use; ask for a rewording instead.`
        );
      }
    } else if (name === "rewritebullet") {
      const wording = entry.wording?.toLowerCase();
      const original = target
        ? items
            .get(target.itemId)
            ?.bullets.find((b) => b.id === target.bulletId)
        : undefined;
      if (!target || !original) {
        warnings.push(
          `Ignored a rewording of an unknown bullet (${entry.bullet ?? "?"}).`
        );
      } else if (
        !entry.text?.trim() ||
        !(wording === "short" || wording === "long" || wording === "formal")
      ) {
        warnings.push("Ignored a rewording without text or a wording type.");
      } else {
        const parent = items.get(target.itemId);
        const sources = [
          original.text,
          ...Object.values(parent?.fields ?? {}),
          ...(parent?.bullets.map((b) => b.text) ?? []),
          ...(parent?.tags ?? []),
        ];
        const flags = describeFlags(checkRewrite(entry.text, sources).flags);
        if (flags.length > 0) {
          warnings.push(
            `A rewording of “${original.text.slice(0, 40)}” needs your check: ${flags.join("; ")}.`
          );
        }
        operations.push({
          op: "rewriteBullet",
          ...target,
          wording,
          text: entry.text,
          flags,
        });
      }
    } else if (name === "settone") {
      if (ToneSchema.guard(entry.tone)) {
        operations.push({ op: "setTone", tone: entry.tone });
      } else {
        warnings.push(`Ignored an unknown tone (${entry.tone ?? "?"}).`);
      }
    } else if (name === "setpagelimit") {
      if (entry.pages !== undefined && PAGE_LIMITS.includes(entry.pages)) {
        operations.push({ op: "setPageLimit", pages: entry.pages });
      } else {
        warnings.push("Ignored a page limit other than 1 or 2.");
      }
    } else {
      warnings.push(`Ignored something the chat cannot do (${entry.op}).`);
    }
  }
  return { operations, warnings };
}

/** Short names for the model: the ids of the CV's items and sections in the request, as "i2", "s1" */
function toRefs(map: Map<string, string>, ids: string[]): string[] {
  const back = new Map([...map].map(([ref, id]) => [id, ref]));
  return ids.flatMap((id) => (back.has(id) ? [back.get(id) as string] : []));
}

/**
 * One chat turn: the CV (short names, no profile), how the variant is now, the recent
 * messages and what the user asked; the answer is a short reply plus typed operations that
 * the user ticks before anything is applied. Nothing is applied here.
 */
export async function chat(
  ai: AiClient,
  vault: Vault,
  request: ChatRequest
): Promise<ChatResponse> {
  const refs = buildRefs(vault);
  const raw = await ai.generate({
    promptName: "chat-edit",
    input: JSON.stringify({
      message: request.message,
      history: request.history ?? [],
      variant: {
        tone: request.context.tone,
        pageLimit: request.context.pageLimit,
        hiddenItems: toRefs(refs.items, request.context.hiddenItemIds),
        highlightedItems: toRefs(refs.items, request.context.emphasisedItemIds),
        sectionOrder: toRefs(refs.sections, request.context.sectionOrder),
      },
      cv: describeCv(vault, refs),
    }),
    schema: RawChatAnswerSchema,
    personal: { profile: vault.profile, links: vault.links },
  });
  const { operations, warnings } = toOperations(vault, refs, raw);
  const reply =
    raw.reply?.trim() ||
    (operations.length > 0
      ? "Here is what I would change."
      : "I could not turn that into a change I am allowed to make.");
  return { reply, operations, warnings };
}
