import { nanoid } from "@reduxjs/toolkit";
import { Candidate } from "@custom-types/candidate-types";
import { navigate } from "@hooks/navigation";
import { styleSelector } from "@store/cv-data/cv-data-slice";
import { createJob, setJobDetails } from "@store/jobs/jobs-slice";
import { useAppDispatch, useAppSelector } from "@store/store-helper";
import { vaultSelector } from "@store/vault/vault-slice";

/**
 * Makes a job from a candidate (company, role, link and advert filled in) and opens its
 * details. Returns the id of the new job; the caller marks the candidate as started.
 */
export function useContinueCandidate(): (candidate: Candidate) => string {
  const dispatch = useAppDispatch();
  const vault = useAppSelector(vaultSelector);
  const style = useAppSelector(styleSelector);

  return (candidate) => {
    const id = nanoid();
    const name =
      [candidate.role, candidate.company].filter((t) => t !== "").join(" · ") ||
      "New job";
    dispatch(createJob({ vault, style, name, id }));
    dispatch(
      setJobDetails({
        id,
        details: {
          company: candidate.company,
          role: candidate.role,
          ...(candidate.jobUrl === undefined ? {} : { url: candidate.jobUrl }),
          ...(candidate.jobAd === undefined ? {} : { jobAd: candidate.jobAd }),
        },
      })
    );
    return id;
  };
}

/** Opens the details of the job a candidate was continued into */
export function openCandidateJob(jobId: string): void {
  navigate({ kind: "jobs", jobId, view: "details" });
}
