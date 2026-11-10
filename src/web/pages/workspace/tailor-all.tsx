import { useEffect, useMemo, useRef, useState } from "react";
import { Alert, Box, Button, LinearProgress, Typography } from "@mui/material";
import { navigate } from "@hooks/navigation";
import { WORKSPACE_COLORS } from "@pages/workspace/workspace-tokens";
import {
  AiStatus,
  ApiError,
  createApiClient,
  taskProvider,
} from "@store/persistence/api-client";
import {
  activeJobSelector,
  activeVariantSelector,
  setSectionScores,
} from "@store/jobs/jobs-slice";
import { useAppDispatch, useAppSelector } from "@store/store-helper";
import { sectionsSelector } from "@store/vault/vault-slice";

/**
 * "Tailor all sections": the same scoring as each section's Tailor button, run for every
 * section the job includes, one after the other. The scores of a section appear as soon as it
 * is done, so the results still show per section; the bar shows how many sections are done.
 * It can be stopped between sections. Only scores are stored; nothing is hidden or moved.
 */
export function TailorAll(): JSX.Element {
  const dispatch = useAppDispatch();
  const job = useAppSelector(activeJobSelector);
  const removed = useAppSelector(activeVariantSelector).hiddenSections ?? [];
  const sections = useAppSelector(sectionsSelector);
  const api = useMemo(() => createApiClient(), []);
  const [status, setStatus] = useState<AiStatus | null>(null);
  const [current, setCurrent] = useState<{
    done: number;
    title: string;
  } | null>(null);
  const [error, setError] = useState<string>("");
  const [warnings, setWarnings] = useState<string[]>([]);
  const [summary, setSummary] = useState<string>("");
  const isStopping = useRef<boolean>(false);
  const ai = status ? taskProvider(status, "tailor") : null;
  const analysis = job.analysis;
  const targets = sections.filter(
    (section) => !removed.includes(section.id) && section.items.length > 0
  );
  const isRunning = current !== null;

  useEffect(() => {
    api
      .getAiStatus()
      .then(setStatus)
      .catch(() => setStatus(null));
  }, [api]);

  async function run(): Promise<void> {
    if (!analysis) {
      return;
    }
    isStopping.current = false;
    setError("");
    setWarnings([]);
    setSummary("");
    let scored = 0;
    let done = 0;
    try {
      for (const section of targets) {
        if (isStopping.current) {
          break;
        }
        setCurrent({ done, title: section.title });
        const result = await api.scoreSection(section.id, analysis);
        dispatch(setSectionScores({ jobId: job.id, scores: result.scores }));
        setWarnings((before) => [...before, ...result.warnings]);
        scored += result.scores.length;
        done += 1;
      }
      setSummary(
        isStopping.current
          ? `Stopped after ${done} of ${targets.length} sections.`
          : `Scored ${scored} ${scored === 1 ? "entry" : "entries"} in ${done} ${done === 1 ? "section" : "sections"}.`
      );
    } catch (caught) {
      setError(
        `${caught instanceof ApiError || caught instanceof Error ? caught.message : "The AI request failed."} (${done} of ${targets.length} sections were scored before this.)`
      );
    } finally {
      setCurrent(null);
    }
  }

  return (
    <Box
      component="section"
      aria-label="Tailor all sections"
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
          variant="contained"
          size="small"
          disabled={isRunning || !analysis || !ai?.isConfigured}
          onClick={() => void run()}
        >
          Tailor all sections
        </Button>
        {isRunning && (
          <Button
            size="small"
            onClick={() => {
              isStopping.current = true;
            }}
          >
            Stop after this section
          </Button>
        )}
        <Typography
          sx={{ flex: 1, fontSize: 12, color: WORKSPACE_COLORS.muted }}
        >
          {analysis
            ? "Scores every section against the job description. You still see the scores per section."
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
      {current && (
        <Box role="status" sx={{ display: "grid", gap: 0.5 }}>
          <Typography sx={{ fontSize: 12.5 }}>
            Scoring “{current.title}” ({current.done + 1} of {targets.length})…
          </Typography>
          <LinearProgress
            variant="determinate"
            value={(current.done / Math.max(1, targets.length)) * 100}
          />
        </Box>
      )}
      {summary && (
        <Typography role="status" sx={{ fontSize: 12.5 }}>
          {summary}
        </Typography>
      )}
      {analysis && status && !ai?.isConfigured && (
        <Alert severity="info">
          AI is not set up. Choose a provider in Settings to tailor.
        </Alert>
      )}
      {analysis && ai?.isConfigured && (
        <Typography sx={{ fontSize: 11.5, color: WORKSPACE_COLORS.muted }}>
          {ai.info.isOnline
            ? `Sends each section's saved text and the keywords to ${ai.info.recipient}, one section at a time; not your name or contact details. Save first so new entries are included.`
            : "Each section's text and the keywords go to your local model only. Save first so new entries are included."}
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
