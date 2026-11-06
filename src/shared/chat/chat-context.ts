import { ChatContext } from "@custom-types/chat-types";
import { Variant, VariantLayout } from "@custom-types/variant-types";
import { Vault } from "@custom-types/vault-types";

/** What the chat needs to know about the variant that is open (real ids; the server shortens them) */
export function buildChatContext(
  vault: Vault,
  variant: Variant,
  structure: VariantLayout
): ChatContext {
  const sectionIds = new Set(vault.sections.map((s) => s.id));
  const selection = Object.entries(variant.selection);
  return {
    tone: variant.tone,
    pageLimit: variant.pageLimit,
    hiddenItemIds: selection
      .filter(([, choice]) => choice.isVisible === false)
      .map(([id]) => id),
    emphasisedItemIds: selection
      .filter(([, choice]) => choice.emphasis === "high")
      .map(([id]) => id),
    sectionOrder: [
      ...structure.fullWidth,
      ...structure.left,
      ...structure.right,
    ].filter((id) => sectionIds.has(id)),
  };
}
