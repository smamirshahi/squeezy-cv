import { useEffect, useMemo, useState } from "react";
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  Typography,
} from "@mui/material";
import { Job } from "@custom-types/job-types";
import { WORKSPACE_COLORS } from "@pages/workspace/workspace-tokens";
import {
  AiStatus,
  ApiError,
  createApiClient,
  taskProvider,
} from "@store/persistence/api-client";
import { setJobAnalysis } from "@store/jobs/jobs-slice";
import { useAppDispatch } from "@store/store-helper";

function Keywords({
  title,
  words,
}: {
  title: string;
  words: string[];
}): JSX.Element | null {
  if (words.length === 0) {
    return null;
  }
  return (
    <Box>
      <Typography sx={{ fontSize: 12, color: WORKSPACE_COLORS.muted, mb: 0.5 }}>
        {title}
      </Typography>
      <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.5 }}>
        {words.map((word) => (
          <Chip key={word} size="small" variant="outlined" label={word} />
        ))}
      </Box>
    </Box>
  );
}

/**
 * "Analyse job description": the AI reads the advert once and the keywords and requirements
 * are kept on the job. Every section's Tailor button then scores against them. Only the advert
 * text is sent.
 */
export function AnalyseJobAd({ job }: { job: Job }): JSX.Element {
  const dispatch = useAppDispatch();
  const api = useMemo(() => createApiClient(), []);
  const [status, setStatus] = useState<AiStatus | null>(null);
  const [isRunning, setIsRunning] = useState<boolean>(false);
  const [error, setError] = useState<string>("");
  const [warnings, setWarnings] = useState<string[]>([]);
  const ai = status ? taskProvider(status, "tailor") : null;
  const advert = (job.jobAd ?? "").trim();
  const analysis = job.analysis;

  useEffect(() => {
    api
      .getAiStatus()
      .then(setStatus)
      .catch(() => setStatus(null));
  }, [api]);

  async function analyse(): Promise<void> {
    setIsRunning(true);
    setError("");
    setWarnings([]);
    try {
      const result = await api.analyseJobAd(advert);
      dispatch(
        setJobAnalysis({
          jobId: job.id,
          jobAd: advert,
          analysis: result.requirements,
        })
      );
      setWarnings(result.warnings);
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
      aria-label="Analyse job description"
      sx={{ display: "grid", gap: 1 }}
    >
      <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
        <Button
          variant="outlined"
          disabled={isRunning || advert === "" || !ai?.isConfigured}
          onClick={() => void analyse()}
        >
          {analysis ? "Analyse again" : "Analyse job description"}
        </Button>
        {isRunning && <CircularProgress size={18} />}
        <Typography sx={{ fontSize: 12, color: WORKSPACE_COLORS.muted }}>
          {ai?.isConfigured
            ? ai.info.isOnline
              ? `Sends only the advert text to ${ai.info.recipient}. Then use Tailor in each section.`
              : "The advert goes to your local model only. Then use Tailor in each section."
            : "AI is not set up. Choose a provider in Settings."}
        </Typography>
      </Box>
      {error && <Alert severity="error">{error}</Alert>}
      {warnings.map((warning) => (
        <Typography key={warning} sx={{ fontSize: 12 }}>
          {warning}
        </Typography>
      ))}
      {analysis && (
        <Box sx={{ display: "grid", gap: 1 }}>
          <Typography sx={{ fontSize: 13, fontWeight: 600 }}>
            {[analysis.jobTitle, analysis.seniority]
              .filter(Boolean)
              .join(" · ")}
          </Typography>
          <Keywords title="Must have" words={analysis.mustHave} />
          <Keywords title="Nice to have" words={analysis.niceToHave} />
          <Keywords title="Keywords" words={analysis.keywords} />
        </Box>
      )}
    </Box>
  );
}
