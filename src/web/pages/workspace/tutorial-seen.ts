/** The tutorials that open by themselves the first time their page is visited */
export type FirstVisitTutorial = "vault" | "template" | "apply";

// The vault key is the one used before there were several tutorials, so nobody sees it twice
const KEYS: Record<FirstVisitTutorial, string> = {
  vault: "cv-builder-vault-tutorial-seen",
  template: "cv-builder-template-tutorial-seen",
  apply: "cv-builder-apply-tutorial-seen",
};

/** Whether this tutorial has already been shown in this browser */
export function hasSeenTutorial(id: FirstVisitTutorial): boolean {
  try {
    return localStorage.getItem(KEYS[id]) === "1";
  } catch {
    // Blocked storage: do not nag on every visit
    return true;
  }
}

export function markTutorialSeen(id: FirstVisitTutorial): void {
  try {
    localStorage.setItem(KEYS[id], "1");
  } catch {
    // Nothing to do: the tutorial then simply stays hidden
  }
}
