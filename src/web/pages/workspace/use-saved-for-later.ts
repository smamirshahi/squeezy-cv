import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Candidate,
  CandidatePatch,
  NewCandidate,
} from "@custom-types/candidate-types";
import { createApiClient } from "@store/persistence/api-client";
import {
  openCandidateJob,
  useContinueCandidate,
} from "@pages/candidates-page/use-continue-candidate";
import { jobsSelector } from "@store/jobs/jobs-slice";
import { useAppSelector } from "@store/store-helper";

/**
 * The jobs parked with "Save for later" (candidates that are still open), with the actions the
 * Saved for later menu needs. The list is read from the server and reloaded after every change.
 */
export function useSavedForLater(): {
  open: Candidate[];
  error: string;
  save: (input: NewCandidate) => Promise<Candidate>;
  change: (id: string, patch: CandidatePatch) => Promise<void>;
  continueWith: (candidate: Candidate) => Promise<void>;
} {
  const api = useMemo(() => createApiClient(), []);
  const jobs = useAppSelector(jobsSelector);
  const continueCandidate = useContinueCandidate();
  const [open, setOpen] = useState<Candidate[]>([]);
  const [error, setError] = useState<string>("");

  const reload = useCallback(async (): Promise<void> => {
    const parked = await api.listCandidates().catch(() => []);
    setOpen(parked.filter((entry) => entry.status === "open"));
  }, [api]);

  useEffect(() => {
    void reload();
  }, [reload]);

  async function run(action: () => Promise<unknown>): Promise<void> {
    setError("");
    try {
      await action();
      await reload();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : String(caught));
    }
  }

  async function save(input: NewCandidate): Promise<Candidate> {
    const saved = await api.createCandidate(input);
    await reload();
    return saved;
  }

  async function change(id: string, patch: CandidatePatch): Promise<void> {
    await run(() => api.updateCandidate(id, patch));
  }

  async function continueWith(candidate: Candidate): Promise<void> {
    // saved from a job that still exists: open that one instead of making a second one
    const existing = jobs.some((job) => job.id === candidate.jobId);
    const jobId =
      existing && candidate.jobId
        ? candidate.jobId
        : continueCandidate(candidate);
    await run(() =>
      api.updateCandidate(candidate.id, { status: "started", jobId })
    );
    openCandidateJob(jobId);
  }

  return { open, error, save, change, continueWith };
}
