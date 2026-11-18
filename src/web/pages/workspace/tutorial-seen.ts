/** The tutorials that open by themselves the first time their page is visited */
export type FirstVisitTutorial =
  "vault" | "template" | "apply" | "applications" | "ai";

// The vault key is the one used before there were several tutorials, so nobody sees it twice
const KEYS: Record<FirstVisitTutorial, string> = {
  vault: "squeezy-cv-vault-tutorial-seen",
  template: "squeezy-cv-template-tutorial-seen",
  apply: "squeezy-cv-apply-tutorial-seen",
  applications: "squeezy-cv-applications-tutorial-seen",
  ai: "squeezy-cv-ai-tutorial-seen",
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

const WELCOME_KEY = "squeezy-cv-welcome-seen";

/** Whether the Welcome overview was shown already; anyone who has seen a page tutorial counts as welcomed */
export function hasSeenWelcome(): boolean {
  try {
    return (
      localStorage.getItem(WELCOME_KEY) === "1" ||
      (Object.keys(KEYS) as FirstVisitTutorial[]).some(hasSeenTutorial)
    );
  } catch {
    // Blocked storage: do not nag on every visit
    return true;
  }
}

export function markWelcomeSeen(): void {
  try {
    localStorage.setItem(WELCOME_KEY, "1");
  } catch {
    // Nothing to do: the welcome then simply stays hidden
  }
}

/** Every tutorial in the dialog (the overview does not open by itself) */
export type TutorialKey = "overview" | FirstVisitTutorial;

const DONE_PREFIX = "squeezy-cv-tutorial-done-";
const NO_AUTO_START_KEY = "squeezy-cv-tutorials-no-autostart";

/** Whether the user has read this tutorial to its last step (it gets a tick in the list) */
export function isTutorialDone(id: TutorialKey): boolean {
  try {
    return localStorage.getItem(DONE_PREFIX + id) === "1";
  } catch {
    return false;
  }
}

export function markTutorialDone(id: TutorialKey): void {
  try {
    localStorage.setItem(DONE_PREFIX + id, "1");
  } catch {
    // Nothing to do: the tick is only a convenience
  }
}

/** Whether tutorials are kept from opening by themselves on a first visit ("Don't show on start") */
export function isAutoStartOff(): boolean {
  try {
    return localStorage.getItem(NO_AUTO_START_KEY) === "1";
  } catch {
    return false;
  }
}

export function setAutoStartOff(isOff: boolean): void {
  try {
    if (isOff) {
      localStorage.setItem(NO_AUTO_START_KEY, "1");
    } else {
      localStorage.removeItem(NO_AUTO_START_KEY);
    }
  } catch {
    // Nothing to do: the choice then only lasts until the page is reloaded
  }
}
