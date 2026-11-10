const KEY = "cv-builder-vault-tutorial-seen";

/** Whether the vault tutorial has already been shown in this browser */
export function hasSeenVaultTutorial(): boolean {
  try {
    return localStorage.getItem(KEY) === "1";
  } catch {
    // Blocked storage: do not nag on every visit
    return true;
  }
}

export function markVaultTutorialSeen(): void {
  try {
    localStorage.setItem(KEY, "1");
  } catch {
    // Nothing to do: the tutorial then simply stays hidden
  }
}
