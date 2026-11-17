import { Operation } from "@custom-types/chat-types";
import { Vault } from "@custom-types/vault-types";
import { getItemLabel, shorten } from "@shared/variant/item-label";

/** How much of a bullet is quoted when describing an operation */
const BULLET_PREVIEW_CHARS = 40;
/** How much of the new text is quoted when describing a reword */
const REWRITE_PREVIEW_CHARS = 60;
function itemLabel(vault: Vault, itemId: string): string {
  for (const section of vault.sections) {
    const item = section.items.find((entry) => entry.id === itemId);
    if (item) {
      return `“${getItemLabel(item)}”`;
    }
  }
  return "an item";
}

function bulletText(vault: Vault, itemId: string, bulletId: string): string {
  for (const section of vault.sections) {
    const bullet = section.items
      .find((entry) => entry.id === itemId)
      ?.bullets.find((entry) => entry.id === bulletId);
    if (bullet) {
      return `“${shorten(bullet.text, BULLET_PREVIEW_CHARS)}”`;
    }
  }
  return "a bullet";
}

/** A change in plain words for the list the user ticks before it is applied. Pure. */
export function describeOperation(op: Operation, vault: Vault): string {
  switch (op.op) {
    case "hideItem":
      return `${op.isHidden ? "Hide" : "Show"} ${itemLabel(vault, op.itemId)}`;
    case "emphasiseItem":
      return `${op.isEmphasised ? "Highlight" : "Stop highlighting"} ${itemLabel(vault, op.itemId)}`;
    case "moveItem":
      return `Move ${itemLabel(vault, op.itemId)} to position ${op.position}`;
    case "moveSection": {
      const title =
        vault.sections.find((s) => s.id === op.sectionId)?.title ?? "a section";
      return `Move the section “${title}” to position ${op.position}`;
    }
    case "hideBullet":
      return `${op.isHidden ? "Hide" : "Show"} the point ${bulletText(vault, op.itemId, op.bulletId)} of ${itemLabel(vault, op.itemId)}`;
    case "useWording":
      return `Use the ${op.wording === "text" ? "original" : op.wording} wording of ${bulletText(vault, op.itemId, op.bulletId)}`;
    case "rewriteBullet":
      return `Reword ${bulletText(vault, op.itemId, op.bulletId)} (${op.wording}): “${shorten(op.text, REWRITE_PREVIEW_CHARS)}”`;
    case "setTone":
      return `Set the tone to ${op.tone}`;
    case "setPageLimit":
      return `Set the page limit to ${op.pages} ${op.pages === 1 ? "page" : "pages"}`;
  }
}
