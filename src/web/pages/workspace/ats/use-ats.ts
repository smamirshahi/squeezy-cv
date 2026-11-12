import { useCallback, useMemo, useSyncExternalStore } from "react";
import {
  AtsComparison,
  AtsFixTarget,
  AtsResult,
  AtsSnapshot,
  compareScans,
  hasRequirements,
  scoreAts,
  snapshotOf,
} from "@shared/ats/ats-score";
import { Route } from "@shared/routing/routes";
import { render } from "@shared/variant/render";
import { styleSelector } from "@store/cv-data/cv-data-slice";
import {
  activeJobSelector,
  activeTemplateSelector,
  activeVariantSelector,
  isPlaceholderSelector,
} from "@store/jobs/jobs-slice";
import { useAppSelector } from "@store/store-helper";
import { vaultSelector } from "@store/vault/vault-slice";

const STORAGE_PREFIX = "cvb.ats.";

/** What is kept in this browser for one job: the first scan and the latest one */
interface StoredScans {
  first: AtsSnapshot;
  last: AtsSnapshot;
}

function isSnapshot(value: unknown): value is AtsSnapshot {
  const entry = value as Partial<AtsSnapshot> | null;
  return (
    typeof entry === "object" &&
    entry !== null &&
    typeof entry.at === "string" &&
    typeof entry.total === "number" &&
    typeof entry.contentKey === "string" &&
    Array.isArray(entry.issues) &&
    Array.isArray(entry.covered) &&
    Array.isArray(entry.missing) &&
    Array.isArray(entry.reworded) &&
    typeof entry.categories === "object"
  );
}

function parseScans(text: string | null): StoredScans | null {
  try {
    const parsed = text ? (JSON.parse(text) as Partial<StoredScans>) : null;
    return parsed && isSnapshot(parsed.first) && isSnapshot(parsed.last)
      ? { first: parsed.first, last: parsed.last }
      : null;
  } catch {
    return null;
  }
}

/**
 * The scans live in this browser's local storage. `useSyncExternalStore` needs the same object
 * until something changes, so the parsed scans are kept per job together with the stored text
 * they came from: the text is read again each time, and a change made elsewhere (another tab,
 * cleared site data) is seen at once. Where storage is blocked the scans only last in memory.
 */
const cache = new Map<
  string,
  { text: string | null; scans: StoredScans | null }
>();
const listeners = new Set<() => void>();

function storedText(jobId: string): string | null {
  try {
    return window.localStorage.getItem(`${STORAGE_PREFIX}${jobId}`);
  } catch {
    return cache.get(jobId)?.text ?? null;
  }
}

function getScans(jobId: string): StoredScans | null {
  const text = storedText(jobId);
  const known = cache.get(jobId);
  if (known && known.text === text) {
    return known.scans;
  }
  const scans = parseScans(text);
  cache.set(jobId, { text, scans });
  return scans;
}

function setScans(jobId: string, scans: StoredScans): void {
  const text = JSON.stringify(scans);
  cache.set(jobId, { text, scans });
  try {
    window.localStorage.setItem(`${STORAGE_PREFIX}${jobId}`, text);
  } catch {
    // Private mode or a full store: the scan still shows for this visit
  }
  for (const listener of listeners) {
    listener();
  }
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export interface AtsState {
  /** False while the job is only a stand-in: nothing to score yet */
  hasJob: boolean;

  /** The job has requirements, so "Match to this job" can be scored */
  canMatch: boolean;

  /** The CV as it is right now (the Export dialog shows this one) */
  live: AtsResult;

  /** The scan on screen (null before the first analysis) */
  now: AtsSnapshot | null;
  first: AtsSnapshot | null;
  comparison: AtsComparison | null;

  /** The CV changed after the scan on screen */
  isStale: boolean;
  jobName: string;
  templateId: string;
  jobId: string;
  analyse: () => void;

  /** Makes the scan on screen the one later scans are compared with */
  resetBaseline: () => void;
}

/**
 * The ATS score of the active job (#258): scores the CV as it is now, keeps the first and the
 * latest scan in this browser (never in the vault or the job) and compares them.
 */
export function useAts(): AtsState {
  const vault = useAppSelector(vaultSelector);
  const job = useAppSelector(activeJobSelector);
  const variant = useAppSelector(activeVariantSelector);
  const template = useAppSelector(activeTemplateSelector);
  const style = useAppSelector(styleSelector);
  const fit = useAppSelector((state) => state.app.fit);
  const isPlaceholder = useAppSelector(isPlaceholderSelector);

  const scans = useSyncExternalStore(subscribe, () => getScans(job.id));

  const requirements = job.analysis ?? variant.tailor?.requirements;
  const live: AtsResult = useMemo(
    () =>
      scoreAts({
        document: render(vault, variant),
        profile: vault.profile,
        headline: variant.headline ?? vault.profile.headline,
        pageCount: fit.pageCount,
        pageLimit: variant.pageLimit,
        linesOver: fit.linesOver,
        isPhotoShown: style.shouldShowPhoto !== false,
        requirements,
        jobAd: job.jobAd,
        today: new Date(),
      }),
    [vault, variant, fit, style, requirements, job.jobAd]
  );

  const analyse = useCallback((): void => {
    const snapshot = snapshotOf(live, new Date());
    setScans(job.id, { first: scans?.first ?? snapshot, last: snapshot });
  }, [live, scans, job.id]);

  const resetBaseline = useCallback((): void => {
    if (!scans) {
      return;
    }
    setScans(job.id, { first: scans.last, last: scans.last });
  }, [scans, job.id]);

  const now = scans?.last ?? null;
  const first = scans?.first ?? null;
  const comparison =
    now && first && first.at !== now.at ? compareScans(first, now) : null;
  return {
    hasJob: !isPlaceholder,
    canMatch: hasRequirements(requirements),
    live,
    now,
    first,
    comparison,
    isStale: now !== null && now.contentKey !== live.contentKey,
    jobName: job.name,
    templateId: template.id,
    jobId: job.id,
    analyse,
    resetBaseline,
  };
}

/** Where a fix is made, as a route (the vault, the job's content, its details or the template's design) */
export function routeForFix(
  target: AtsFixTarget,
  jobId: string,
  templateId: string
): Route {
  switch (target) {
    case "vault":
      return { kind: "vault" };
    case "content":
      return { kind: "jobs", jobId, view: "page" };
    case "details":
      return { kind: "jobs", jobId, view: "details" };
    case "layout":
    case "style":
      return { kind: "templates", tab: "design", templateId };
  }
}
