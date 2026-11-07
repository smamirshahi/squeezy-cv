import { useEffect, useMemo, useState } from "react";
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  TextField,
  Typography,
} from "@mui/material";
import { WORKSPACE_COLORS } from "@pages/workspace/workspace-tokens";
import {
  AiStatus,
  ApiError,
  createApiClient,
  taskProvider,
} from "@store/persistence/api-client";
import { activeJobSelector, setItemScores } from "@store/jobs/jobs-slice";
import { useAppDispatch, useAppSelector } from "@store/store-helper";

/**
 * "Score items" on the Jobs page: the AI reads the advert and puts a relevance score and a
 * reason on every item. Only scores are stored (one undo step); nothing is hidden or moved.
 * The advert is kept on the job so it need not be pasted again.
 */
export function ScoreItems(): JSX.Element {
  const dispatch = useAppDispatch();
  const job = useAppSelector(activeJobSelector);
  const api = useMemo(() => createApiClient(), []);
  const [status, setStatus] = useState<AiStatus | null>(null);
  const [jobAd, setJobAd] = useState<string>(job.jobAd ?? "");
  const [isScoring, setIsScoring] = useState<boolean>(false);
  const [error, setError] = useState<string>("");
  const [warnings, setWarnings] = useState<string[]>([]);
  const [done, setDone] = useState<string>("");
  const ai = status ? taskProvider(status, "tailor") : null;

  useEffect(() => {
    api
      .getAiStatus()
      .then(setStatus)
      .catch(() => setStatus(null));
  }, [api]);

  async function score(): Promise<void> {
    setIsScoring(true);
    setError("");
    setWarnings([]);
    setDone("");
    try {
      const result = await api.scoreItems(jobAd);
      dispatch(
        setItemScores({
          jobId: job.id,
          jobAd: jobAd.trim(),
          scores: result.scores,
        })
      );
      setWarnings(result.warnings);
      setDone(
        `Scored ${result.scores.length} ${result.scores.length === 1 ? "item" : "items"}.`
      );
    } catch (caught) {
      setError(
        caught instanceof ApiError || caught instanceof Error
          ? caught.message
          : "The AI request failed."
      );
    } finally {
      setIsScoring(false);
    }
  }

  return (
    <Box
      component="section"
      aria-label="Score items"
      sx={{
        p: 2.5,
        display: "flex",
        flexDirection: "column",
        gap: 1,
        border: `1px solid ${WORKSPACE_COLORS.border}`,
        borderRadius: 1.5,
        bgcolor: WORKSPACE_COLORS.panel,
      }}
    >
      <Typography sx={{ fontWeight: 600, fontSize: 15 }}>
        Score items against the job advert
      </Typography>
      <Typography sx={{ fontSize: 12.5, color: WORKSPACE_COLORS.muted }}>
        The AI puts a relevance score (0-100) and a reason next to every entry
        of your saved CV. Nothing is hidden or moved; you can undo it.
      </Typography>
      <TextField
        multiline
        minRows={3}
        maxRows={10}
        label="Job advert"
        value={jobAd}
        onChange={(event) => setJobAd(event.target.value)}
      />
      {status && !ai?.isConfigured && (
        <Alert severity="info">
          AI is not set up. Choose a provider in AI setup to score items.
        </Alert>
      )}
      <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
        <Button
          variant="outlined"
          disabled={isScoring || jobAd.trim() === "" || !ai?.isConfigured}
          onClick={() => void score()}
        >
          Score items
        </Button>
        {isScoring && <CircularProgress size={18} />}
        {done && (
          <Typography role="status" sx={{ fontSize: 12.5 }}>
            {done}
          </Typography>
        )}
      </Box>
      {ai?.isConfigured && (
        <Typography sx={{ fontSize: 11.5, color: WORKSPACE_COLORS.muted }}>
          {ai.info.isOnline
            ? `Sends the advert and the text and tags of your saved entries to ${ai.info.recipient}; not your name or contact details. Save first so new entries are included.`
            : "The advert and entry text go to your local model only. Save first so new entries are included."}
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
