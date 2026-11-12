import {
  CURRENT_CANDIDATE_VERSION,
  Candidate,
  CandidatePatch,
  NewCandidate,
} from "@custom-types/candidate-types";
import { DATE_PATTERN } from "@custom-types/application-types";

export class CandidateInputError extends Error {}

function checkDay(day: string | undefined): void {
  if (day !== undefined && day !== "" && !DATE_PATTERN.test(day)) {
    throw new CandidateInputError(
      'The apply-by day must look like "2026-12-31".'
    );
  }
}

function trimmed(value: string | undefined): string | undefined {
  const text = value?.trim();
  return text === undefined || text === "" ? undefined : text;
}

/** Makes a candidate from what was typed. A company or a role is needed to tell it apart. */
export function createCandidate(
  input: NewCandidate,
  id: string,
  today: string
): Candidate {
  const company = input.company.trim();
  const role = input.role.trim();
  if (company === "" && role === "") {
    throw new CandidateInputError("Give a company or a role.");
  }
  checkDay(input.applyBy);
  const jobUrl = trimmed(input.jobUrl);
  const jobAd = trimmed(input.jobAd);
  const note = trimmed(input.note);
  const applyBy = trimmed(input.applyBy);
  const jobId = trimmed(input.jobId);
  return {
    id,
    version: CURRENT_CANDIDATE_VERSION,
    company,
    role,
    ...(jobUrl === undefined ? {} : { jobUrl }),
    ...(jobAd === undefined ? {} : { jobAd }),
    ...(note === undefined ? {} : { note }),
    ...(applyBy === undefined ? {} : { applyBy }),
    ...(jobId === undefined ? {} : { jobId }),
    status: "open",
    createdAt: today,
  };
}

/** Applies a patch; an empty text removes an optional field */
export function updateCandidate(
  candidate: Candidate,
  patch: CandidatePatch
): Candidate {
  checkDay(patch.applyBy);
  const next: Candidate = { ...candidate };
  if (patch.company !== undefined) {
    next.company = patch.company.trim();
  }
  if (patch.role !== undefined) {
    next.role = patch.role.trim();
  }
  if (next.company === "" && next.role === "") {
    throw new CandidateInputError("Give a company or a role.");
  }
  for (const key of ["jobUrl", "jobAd", "note", "applyBy", "jobId"] as const) {
    if (patch[key] !== undefined) {
      const value = trimmed(patch[key]);
      if (value === undefined) {
        delete next[key];
      } else {
        next[key] = value;
      }
    }
  }
  if (patch.status !== undefined) {
    next.status = patch.status;
  }
  return next;
}

/** True when the apply-by day of an open candidate is before `today` */
export function isOverdue(candidate: Candidate, today: string): boolean {
  return (
    candidate.status === "open" &&
    candidate.applyBy !== undefined &&
    candidate.applyBy < today
  );
}
