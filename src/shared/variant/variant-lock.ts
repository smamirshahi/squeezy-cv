import { ApplicationSummary } from "@custom-types/application-types";

/** One application that keeps a variant locked */
export interface LockReason {
  applicationId: string;
  company: string;

  /** "YYYY-MM-DD" */
  appliedAt: string;
}

export interface VariantLocks {
  /** Variant id -> the applications (status "applied") that lock it */
  byVariant: Record<string, LockReason[]>;

  /**
   * An application file is damaged, so it is not known which variant it sent. Then every
   * variant counts as locked: the lock is never silently dropped.
   */
  hasUnreadable: boolean;
}

export const NO_LOCKS: VariantLocks = { byVariant: {}, hasUnreadable: false };

/**
 * A variant is locked while at least one of its applications has status "applied".
 * Derived from the applications, never stored, so it cannot drift. Pure.
 */
export function computeVariantLocks(
  applications: ApplicationSummary[]
): VariantLocks {
  const locks: VariantLocks = { byVariant: {}, hasUnreadable: false };
  for (const application of applications) {
    if (application.isCorrupt) {
      locks.hasUnreadable = true;
    } else if (application.status === "applied") {
      (locks.byVariant[application.variantId] ??= []).push({
        applicationId: application.id,
        company: application.company,
        appliedAt: application.appliedAt,
      });
    }
  }
  return locks;
}

export function isVariantLocked(
  variantId: string,
  applications: ApplicationSummary[]
): boolean {
  const locks = computeVariantLocks(applications);
  return locks.hasUnreadable || (locks.byVariant[variantId]?.length ?? 0) > 0;
}

/** "Sent to Acme on 2026-05-01. Locked." (several: "Sent to Acme (2026-05-01) and Beta (2026-06-02). Locked.") */
export function describeLock(locks: VariantLocks, variantId: string): string {
  const reasons = locks.byVariant[variantId] ?? [];
  if (reasons.length === 0) {
    return locks.hasUnreadable
      ? "An application file is damaged, so it is not known whether this job was sent. Locked."
      : "";
  }
  if (reasons.length === 1) {
    return `Sent to ${reasons[0].company} on ${reasons[0].appliedAt}. Locked.`;
  }
  return `Sent to ${reasons
    .map((r) => `${r.company} (${r.appliedAt})`)
    .join(" and ")}. Locked.`;
}
