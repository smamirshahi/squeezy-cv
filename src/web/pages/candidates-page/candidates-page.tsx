import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Alert,
  Box,
  Button,
  Chip,
  IconButton,
  Link,
  Paper,
  Tooltip,
  Typography,
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutlined";
import { nanoid } from "@reduxjs/toolkit";
import { Candidate, NewCandidate } from "@custom-types/candidate-types";
import {
  arrangeCandidates,
  isOverdue,
} from "@shared/candidate/candidate-utils";
import { formatDay, toIsoDay } from "@shared/application/application-utils";
import { navigate } from "@hooks/navigation";
import { CandidateDialog } from "@pages/candidates-page/candidate-dialog";
import { WORKSPACE_COLORS } from "@pages/workspace/workspace-tokens";
import { createApiClient } from "@store/persistence/api-client";
import { useAppDispatch, useAppSelector } from "@store/store-helper";
import { createJob, setJobDetails } from "@store/jobs/jobs-slice";
import { styleSelector } from "@store/cv-data/cv-data-slice";
import { vaultSelector } from "@store/vault/vault-slice";

const api = createApiClient();

type LoadState =
  | { status: "loading" }
  | { status: "ready"; candidates: Candidate[] }
  | { status: "error"; message: string };

function messageOf(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

/** Jobs parked to apply for in the next days: open one to continue into a job, or drop it */
export function CandidatesPage(): JSX.Element {
  const dispatch = useAppDispatch();
  const vault = useAppSelector(vaultSelector);
  const style = useAppSelector(styleSelector);
  const [state, setState] = useState<LoadState>({ status: "loading" });
  const [error, setError] = useState<string>("");
  const [isAdding, setIsAdding] = useState<boolean>(false);
  const [showDropped, setShowDropped] = useState<boolean>(false);
  const today = toIsoDay(new Date());

  const reload = useCallback(async (): Promise<void> => {
    try {
      setState({ status: "ready", candidates: await api.listCandidates() });
    } catch (caught) {
      setState({ status: "error", message: messageOf(caught) });
    }
  }, []);

  useEffect(() => {
    void reload();
  }, [reload]);

  const candidates = useMemo(
    () => (state.status === "ready" ? arrangeCandidates(state.candidates) : []),
    [state]
  );
  const shown = candidates.filter((c) => showDropped || c.status !== "dropped");

  async function add(input: NewCandidate): Promise<void> {
    await api.createCandidate(input);
    await reload();
  }

  async function run(action: () => Promise<unknown>): Promise<void> {
    setError("");
    try {
      await action();
      await reload();
    } catch (caught) {
      setError(messageOf(caught));
    }
  }

  async function continueWith(candidate: Candidate): Promise<void> {
    if (candidate.status === "started" && candidate.jobId) {
      navigate({ kind: "jobs", jobId: candidate.jobId, view: "details" });
      return;
    }
    const id = nanoid();
    const name =
      [candidate.company, candidate.role].filter((t) => t !== "").join(", ") ||
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
    await run(() =>
      api.updateCandidate(candidate.id, { status: "started", jobId: id })
    );
    navigate({ kind: "jobs", jobId: id, view: "details" });
  }

  return (
    <Box
      sx={{
        flex: 1,
        minWidth: 0,
        overflow: "auto",
        p: { xs: 2, md: 3 },
        color: WORKSPACE_COLORS.text,
      }}
    >
      <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 2 }}>
        <Typography variant="h6" sx={{ flex: 1 }}>
          Candidates
        </Typography>
        <Button size="small" onClick={() => setShowDropped(!showDropped)}>
          {showDropped ? "Hide dropped" : "Show dropped"}
        </Button>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => setIsAdding(true)}
        >
          Save for later
        </Button>
      </Box>
      {error !== "" && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}
      {state.status === "error" && (
        <Alert severity="error">{state.message}</Alert>
      )}
      {state.status === "ready" && shown.length === 0 && (
        <Typography sx={{ color: WORKSPACE_COLORS.muted }}>
          No candidates yet. Park a job you found with “Save for later”, then
          continue it when you are ready to build a CV for it.
        </Typography>
      )}
      <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
        {shown.map((candidate) => {
          const overdue = isOverdue(candidate, today);
          return (
            <Paper
              key={candidate.id}
              variant="outlined"
              sx={{
                p: 1.5,
                display: "flex",
                gap: 1.5,
                alignItems: "center",
                flexWrap: "wrap",
                borderColor: overdue ? "error.main" : undefined,
                opacity: candidate.status === "dropped" ? 0.6 : 1,
              }}
            >
              <Box sx={{ flex: 1, minWidth: 200 }}>
                <Typography sx={{ fontWeight: 600 }}>
                  {[candidate.company, candidate.role]
                    .filter((t) => t !== "")
                    .join(" - ")}
                </Typography>
                {candidate.note && (
                  <Typography
                    sx={{ fontSize: 13, color: WORKSPACE_COLORS.muted }}
                  >
                    {candidate.note}
                  </Typography>
                )}
                {candidate.jobUrl && (
                  <Link
                    href={candidate.jobUrl}
                    target="_blank"
                    rel="noreferrer"
                    sx={{ fontSize: 13 }}
                  >
                    Advert
                  </Link>
                )}
              </Box>
              {candidate.applyBy && (
                <Chip
                  size="small"
                  color={overdue ? "error" : "default"}
                  label={`${overdue ? "Overdue · " : "Apply by "}${formatDay(candidate.applyBy)}`}
                />
              )}
              {candidate.status !== "open" && (
                <Chip
                  size="small"
                  variant="outlined"
                  label={
                    candidate.status === "started" ? "Job made" : "Dropped"
                  }
                />
              )}
              {candidate.status !== "dropped" && (
                <Button
                  size="small"
                  variant="outlined"
                  onClick={() => void continueWith(candidate)}
                >
                  {candidate.status === "started" ? "Open job" : "Continue"}
                </Button>
              )}
              {candidate.status === "open" && (
                <Button
                  size="small"
                  onClick={() =>
                    void run(() =>
                      api.updateCandidate(candidate.id, { status: "dropped" })
                    )
                  }
                >
                  Drop
                </Button>
              )}
              {candidate.status === "dropped" && (
                <Button
                  size="small"
                  onClick={() =>
                    void run(() =>
                      api.updateCandidate(candidate.id, { status: "open" })
                    )
                  }
                >
                  Restore
                </Button>
              )}
              <Tooltip title="Delete">
                <IconButton
                  size="small"
                  aria-label="Delete candidate"
                  onClick={() =>
                    void run(() => api.deleteCandidate(candidate.id))
                  }
                >
                  <DeleteOutlineIcon fontSize="small" />
                </IconButton>
              </Tooltip>
            </Paper>
          );
        })}
      </Box>
      <CandidateDialog
        isOpen={isAdding}
        onClose={() => setIsAdding(false)}
        onSave={add}
      />
    </Box>
  );
}
