import { useEffect, useMemo, useState } from "react";
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Typography,
} from "@mui/material";
import { WORKSPACE_COLORS } from "@pages/workspace/workspace-tokens";
import { navigate } from "@hooks/navigation";
import {
  AiStatus,
  ApiError,
  createApiClient,
  taskProvider,
} from "@store/persistence/api-client";
import { activeJobSelector, setSectionScores } from "@store/jobs/jobs-slice";
import { useAppDispatch, useAppSelector } from "@store/store-helper";

/**
 * The "Tailor" button of one section: the AI scores every entry of the section (for skills
 * each category and each skill) against what "Analyse job description" found. Only scores
 * are stored, as one undo step; nothing is hidden or moved. The section must be saved first,
 * because the server reads the saved CV.
 */
export function SectionTailor({
  sectionId,
}: {
  sectionId: string;
}): JSX.Element {
  const dispatch = useAppDispatch();
  const job = useAppSelector(activeJobSelector);
  const api = useMemo(() => createApiClient(), []);
  const [status, setStatus] = useState<AiStatus | null>(null);
  const [isRunning, setIsRunning] = useState<boolean>(false);
  const [error, setError] = useState<string>("");
  const [warnings, setWarnings] = useState<string[]>([]);
  const [done, setDone] = useState<string>("");
  const ai = status ? taskProvider(status, "tailor") : null;
  const analysis = job.analysis;

  useEffect(() => {
    api
      .getAiStatus()
      .then(setStatus)
      .catch(() => setStatus(null));
  }, [api]);

  // What was said about another section is not about this one
  useEffect(() => {
    setDone("");
    setError("");
    setWarnings([]);
  }, [sectionId]);

  async function tailor(): Promise<void> {
    if (!analysis) {
      return;
    }
    setIsRunning(true);
    setError("");
    setWarnings([]);
    setDone("");
    try {
      const result = await api.scoreSection(sectionId, analysis);
      dispatch(setSectionScores({ jobId: job.id, scores: result.scores }));
      setWarnings(result.warnings);
      const count = result.scores.length;
      setDone(`Scored ${count} ${count === 1 ? "entry" : "entries"}.`);
    } catch (caught) {
      setError(
        caught instanceof ApiError || caught instanceof Error
          ? caught.message
          : "The AI request failed."
      );
    } finally {
      setIsRunning(false);
    }
  }

  return (
    <Box
      component="section"
      aria-label="Tailor this section"
      sx={{
        display: "grid",
        gap: 0.75,
        p: 1.5,
        border: `1px solid ${WORKSPACE_COLORS.border}`,
        borderRadius: 1.5,
        bgcolor: WORKSPACE_COLORS.panel,
      }}
    >
      <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
        <Button
          variant="outlined"
          size="small"
          disabled={isRunning || !analysis || !ai?.isConfigured}
          onClick={() => void tailor()}
        >
          Tailor
        </Button>
        {isRunning && <CircularProgress size={18} />}
        {done && (
          <Typography role="status" sx={{ fontSize: 12.5 }}>
            {done}
          </Typography>
        )}
        <Typography
          sx={{ flex: 1, fontSize: 12, color: WORKSPACE_COLORS.muted }}
        >
          {analysis
            ? "Scores every entry against the job description. Nothing is hidden or moved; undo works."
            : "Analyse the job description first."}
        </Typography>
        {!analysis && (
          <Button
            size="small"
            onClick={() =>
              navigate({ kind: "jobs", jobId: job.id, view: "details" })
            }
          >
            Open job application
          </Button>
        )}
      </Box>
      {analysis && status && !ai?.isConfigured && (
        <Alert severity="info">
          AI is not set up. Choose a provider in Settings to tailor.
        </Alert>
      )}
      {analysis && ai?.isConfigured && (
        <Typography sx={{ fontSize: 11.5, color: WORKSPACE_COLORS.muted }}>
          {ai.info.isOnline
            ? `Sends this section's saved text and the keywords to ${ai.info.recipient}; not your name or contact details. Save first so new entries are included.`
            : "This section's text and the keywords go to your local model only. Save first so new entries are included."}
        </Typography>
      )}
      {error && <Alert severity="error">{error}</Alert>}
      {warnings.map((warning) => (
        <Typography key={warning} sx={{ fontSize: 12 }}>
          {warning}
        </Typography>
      ))}
    </Box>
  );
}
