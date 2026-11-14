import { useEffect, useMemo, useState } from "react";
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  Typography,
} from "@components/ui";
import { RequirementsDialog } from "@pages/workspace/requirements-dialog";
import { groupsOfRequirements } from "@pages/workspace/requirements-table";
import { AiJobChip, AiSettingsButton } from "@pages/workspace/ai-job-context";
import { WORKSPACE_COLORS } from "@pages/workspace/workspace-tokens";
import { navigate } from "@hooks/navigation";
import {
  AiStatus,
  ApiError,
  createApiClient,
  taskProvider,
} from "@store/persistence/api-client";
import {
  activeJobSelector,
  setSectionScores,
  setTitleScores,
} from "@store/jobs/jobs-slice";
import { JOB_TITLES_SECTION } from "@shared/vault/job-titles";
import { useAppDispatch, useAppSelector } from "@store/store-helper";
import { AiButton, AiIcon } from "@components/ai-button";
import { CheckCircleOutlined as CheckCircleOutlinedIcon } from "@components/ui/icons";
import { cssVar } from "@custom-styles/theme";
import { sectionsSelector } from "@store/vault/vault-slice";

/**
 * The "Score entries" button of one section: the AI scores every entry of the section (for skills
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
  const sections = useAppSelector(sectionsSelector);
  const api = useMemo(() => createApiClient(), []);
  const [status, setStatus] = useState<AiStatus | null>(null);
  const [isRunning, setIsRunning] = useState<boolean>(false);
  const [error, setError] = useState<string>("");
  const [warnings, setWarnings] = useState<string[]>([]);
  const [done, setDone] = useState<string>("");
  const [isAdvertOpen, setIsAdvertOpen] = useState<boolean>(false);
  const ai = status ? taskProvider(status, "tailor") : null;
  const analysis = job.analysis;
  const isTitles = sectionId === JOB_TITLES_SECTION;
  // Scores are kept in the job, so this is also true after a reload
  const section = sections.find((entry) => entry.id === sectionId);
  const hasScores = isTitles
    ? Object.keys(job.titleScores ?? {}).length > 0
    : (section?.items ?? []).some(
        (item) => job.selection[item.id]?.relevance !== undefined
      );
  const action = isTitles ? "Score job titles" : "Score entries";
  const explanation = isTitles
    ? "Scores each job title against the job description, so the best one is easy to pick."
    : "Scores every entry against the job description. Nothing is hidden or moved; undo works.";

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
      if (isTitles) {
        dispatch(
          setTitleScores({
            jobId: job.id,
            scores: result.scores.map((score) => ({
              title: score.itemId,
              relevance: score.relevance,
              reason: score.reason,
            })),
          })
        );
      } else {
        dispatch(setSectionScores({ jobId: job.id, scores: result.scores }));
      }
      setWarnings(result.warnings);
      const count = result.scores.length;
      setDone(
        isTitles
          ? `Scored ${count} job ${count === 1 ? "title" : "titles"}.`
          : `Scored ${count} ${count === 1 ? "entry" : "entries"}.`
      );
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
      aria-label="Score this section's entries"
      sx={{
        display: "grid",
        gap: 0.75,
        p: 1.5,
        border: `1px solid ${WORKSPACE_COLORS.aiBorder}`,
        borderRadius: 1.5,
        bgcolor: WORKSPACE_COLORS.aiSoft,
      }}
    >
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          gap: 1.5,
          flexWrap: "wrap",
          color: WORKSPACE_COLORS.aiText,
        }}
      >
        <Box sx={{ display: "inline-flex", alignItems: "center", gap: 1 }}>
          <AiIcon />
          <Typography sx={{ fontSize: 14, fontWeight: 700 }}>
            AI works for this job
          </Typography>
        </Box>
        <AiJobChip />
        {analysis ? (
          <Chip
            size="small"
            clickable
            onClick={() => setIsAdvertOpen(true)}
            aria-haspopup="dialog"
            label={`Advert added · ${analysis.mustHave.length} must-have · ${analysis.niceToHave.length} nice-to-have · ${analysis.keywords.length} keywords`}
            sx={{
              bgcolor: cssVar("oks"),
              color: cssVar("okt"),
              fontWeight: 700,
              "&:hover": { bgcolor: cssVar("oks") },
            }}
          />
        ) : (
          <Chip
            size="small"
            color="warning"
            variant="outlined"
            label="No advert yet · results will be generic"
          />
        )}
        <Box sx={{ flex: 1 }} />
        {ai?.info && (
          <Chip
            size="small"
            variant="outlined"
            label={`${ai.info.label} · ${ai.info.isOnline ? "online" : "local"}`}
            sx={{
              bgcolor: WORKSPACE_COLORS.panel,
              borderColor: WORKSPACE_COLORS.aiBorder,
              color: WORKSPACE_COLORS.aiText,
            }}
          />
        )}
        <AiSettingsButton task="tailor" />
      </Box>
      <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
        <AiButton
          variant={hasScores ? "outlined" : "contained"}
          sx={hasScores ? { bgcolor: WORKSPACE_COLORS.panel } : undefined}
          size="small"
          disabled={isRunning || !analysis || !ai?.isConfigured}
          onClick={() => void tailor()}
        >
          {hasScores ? `${action} again` : action}
        </AiButton>
        {isRunning && <CircularProgress size={18} />}
        {done && (
          <Typography
            role="status"
            sx={{
              display: "flex",
              alignItems: "center",
              gap: 0.75,
              fontSize: 13,
              fontWeight: 700,
              color: cssVar("ok"),
            }}
          >
            <CheckCircleOutlinedIcon aria-hidden="true" sx={{ fontSize: 18 }} />
            {done}
          </Typography>
        )}
        <Typography
          sx={{ flex: 1, fontSize: 12, color: WORKSPACE_COLORS.aiText }}
        >
          {analysis ? explanation : "Analyse the job description first."}
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
        <Typography sx={{ fontSize: 11.5, color: WORKSPACE_COLORS.aiText }}>
          {ai.info.isOnline
            ? `Sends this section's saved text and the keywords to ${ai.info.recipient}; not your name or contact details. Save first so new entries are included.`
            : "This section's text and the keywords go to your local model only. Save first so new entries are included."}
        </Typography>
      )}
      {analysis && (
        <RequirementsDialog
          isOpen={isAdvertOpen}
          onClose={() => setIsAdvertOpen(false)}
          groups={groupsOfRequirements(analysis)}
        />
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
