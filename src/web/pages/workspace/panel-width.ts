export type PanelSide = "left" | "right";

const STORAGE_PREFIX = "cv-builder-panel-width:";

export function normalisePanelWidth(width: number): number {
  return Number.isFinite(width) ? Math.max(0, Math.round(width)) : 0;
}

/** The remembered width of a side, or the default when none or unusable */
export function readPanelWidth(side: PanelSide, fallback: number): number {
  try {
    const raw = localStorage.getItem(STORAGE_PREFIX + side);
    if (raw === null || raw.trim() === "") {
      return fallback;
    }
    const stored = Number(raw);
    return Number.isFinite(stored) && stored >= 0
      ? normalisePanelWidth(stored)
      : fallback;
  } catch {
    return fallback;
  }
}

export function writePanelWidth(side: PanelSide, width: number): void {
  try {
    localStorage.setItem(
      STORAGE_PREFIX + side,
      String(normalisePanelWidth(width))
    );
  } catch {
    // Storage may be blocked; the width then just is not remembered
  }
}
