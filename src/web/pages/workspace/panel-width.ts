export type PanelSide = "left" | "right";

const MIN_PANEL_WIDTH = 220;
const MAX_PANEL_WIDTH = 640;

const STORAGE_PREFIX = "cv-builder-panel-width:";

export function clampPanelWidth(width: number): number {
  if (!Number.isFinite(width)) {
    return MIN_PANEL_WIDTH;
  }
  return Math.min(
    MAX_PANEL_WIDTH,
    Math.max(MIN_PANEL_WIDTH, Math.round(width))
  );
}

/** The remembered width of a side, or the default when none or unusable */
export function readPanelWidth(side: PanelSide, fallback: number): number {
  try {
    const stored = Number(localStorage.getItem(STORAGE_PREFIX + side));
    return stored > 0 ? clampPanelWidth(stored) : fallback;
  } catch {
    return fallback;
  }
}

export function writePanelWidth(side: PanelSide, width: number): void {
  try {
    localStorage.setItem(STORAGE_PREFIX + side, String(width));
  } catch {
    // Storage may be blocked; the width then just is not remembered
  }
}
