import { useEffect, useMemo, useState } from "react";
import {
  Alert,
  Box,
  Tooltip,
  Button,
  Chip,
  CircularProgress,
  Typography,
} from "@components/ui";
import { Job } from "@custom-types/job-types";
import { AiSettingsButton } from "@pages/workspace/ai-job-context";
import { RequirementsDialog } from "@pages/workspace/requirements-dialog";
import { groupsOfRequirements } from "@pages/workspace/requirements-table";
import { WORKSPACE_COLORS } from "@pages/workspace/workspace-tokens";
import {
  AiStatus,
  ApiError,
  createApiClient,
  taskProvider,
} from "@store/persistence/api-client";
import { setJobAnalysis } from "@store/jobs/jobs-slice";
import { useAppDispatch } from "@store/store-helper";
import { AiButton, AiIcon } from "@components/ai-button";

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
  const [isResultOpen, setIsResultOpen] = useState<boolean>(false);
  const ai = status ? taskProvider(status, "tailor") : null;
  const advert = (job.jobAd ?? "").trim();
  const analysis = job.analysis;
  // Why the button is disabled, shown as its tooltip ("" = enabled)
  const disabledReason = isRunning
    ? "The analysis is running."
    : !ai?.isConfigured
      ? "AI is not set up. Choose a provider in Settings."
      : advert === ""
        ? "Add the job description first, then you can analyse it."
        : "";

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
      sx={{
        display: "grid",
        gap: 1.25,
        p: 1.75,
        borderRadius: "6px",
        bgcolor: WORKSPACE_COLORS.aiSoft,
        border: `1px solid ${WORKSPACE_COLORS.aiBorder}`,
      }}
    >
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          gap: 0.75,
          fontWeight: 700,
          color: WORKSPACE_COLORS.aiText,
        }}
      >
        <AiIcon />
        Advert analysis
        {isRunning && <CircularProgress size={16} color="secondary" />}
      </Box>
      {error && (
        <Alert severity="error">
          {error}
          {analysis &&
            " The analysis below is from an earlier run (possibly another provider), not from this attempt."}
        </Alert>
      )}
      {warnings.map((warning) => (
        <Typography key={warning} sx={{ fontSize: 12 }}>
          {warning}
        </Typography>
      ))}
      {analysis && (
        <>
          <Typography sx={{ fontSize: 14, fontWeight: 600 }}>
            {[analysis.jobTitle, analysis.seniority]
              .filter(Boolean)
              .join(" · ")}
          </Typography>
          <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.75 }}>
            {[
              `${analysis.mustHave.length} must have`,
              `${analysis.niceToHave.length} nice to have`,
              `${analysis.keywords.length} keywords`,
            ].map((text) => (
              <Chip
                key={text}
                size="small"
                label={text}
                variant="outlined"
                sx={{
                  bgcolor: WORKSPACE_COLORS.panel,
                  borderColor: WORKSPACE_COLORS.aiBorder,
                  color: WORKSPACE_COLORS.aiText,
                }}
              />
            ))}
          </Box>
        </>
      )}
      <Box sx={{ display: "flex", gap: 1 }}>
        {analysis && (
          <Button
            size="small"
            variant="outlined"
            color="neutral"
            sx={{ flex: 1, borderColor: WORKSPACE_COLORS.borderStrong }}
            onClick={() => setIsResultOpen(true)}
          >
            See results
          </Button>
        )}
        <Tooltip title={disabledReason} disableHoverListener={!disabledReason}>
          {/* A disabled button gets no mouse events, so the span carries the tooltip */}
          <Box component="span" sx={{ flex: 1, display: "flex" }}>
            <AiButton
              size="small"
              variant="outlined"
              sx={{ flex: 1, bgcolor: WORKSPACE_COLORS.panel }}
              disabled={disabledReason !== ""}
              onClick={() => void analyse()}
            >
              {analysis ? "Analyse again" : "Analyse job description"}
            </AiButton>
          </Box>
        </Tooltip>
      </Box>
      <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
        <Typography
          sx={{ flex: 1, fontSize: 12, color: WORKSPACE_COLORS.muted }}
        >
          {ai?.isConfigured
            ? ai.info.isOnline
              ? `Sends only the advert text to ${ai.info.recipient}. Then use Tailor in each section.`
              : "The advert goes to your local model only. Then use Tailor in each section."
            : "AI is not set up. Choose a provider in Settings."}
        </Typography>
        <AiSettingsButton task="tailor" />
      </Box>
      {analysis && (
        <RequirementsDialog
          isOpen={isResultOpen}
          onClose={() => setIsResultOpen(false)}
          groups={groupsOfRequirements(analysis)}
        />
      )}
    </Box>
  );
}
