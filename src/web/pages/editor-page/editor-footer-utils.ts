/** Pages of the editor that change nothing in the CV data, so they have no Apply/Discard */
const PAGES_WITHOUT_APPLY = ["styleSettings", "sections", "variants", "ai"];

/** Whether the editor footer (Apply, Discard) is shown for the selected editor page */
export function shouldShowApplyButton(selectedPageId: string): boolean {
  return !PAGES_WITHOUT_APPLY.includes(selectedPageId);
}
