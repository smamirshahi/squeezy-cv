import { ReactNode, useEffect, useMemo, useRef, useState } from "react";
import { Alert, Box, Button, LinearProgress, Typography } from "@components/ui";
import { CheckCircleOutlined as CheckCircleOutlinedIcon } from "@components/ui/icons";
import { cssVar } from "@custom-styles/theme";
import { navigate } from "@hooks/navigation";
import { WORKSPACE_COLORS } from "@pages/workspace/workspace-tokens";
import {
  AiStatus,
  ApiError,
  createApiClient,
  taskProvider,
} from "@store/persistence/api-client";
import { withOneApproval } from "@store/persistence/send-gate";
import {
  activeJobSelector,
  activeVariantSelector,
  setSectionScores,
  setTitleScores,
} from "@store/jobs/jobs-slice";
import { useAppDispatch, useAppSelector } from "@store/store-helper";
import {
  JOB_TITLES_SECTION,
  MIN_TITLES_TO_CHOOSE,
  jobTitlesOf,
} from "@shared/vault/job-titles";
import { sectionsSelector, vaultSelector } from "@store/vault/vault-slice";
import { AiButton } from "@components/ai-button";

/**
 * "Score all sections": the same scoring as each section's Score entries button, run for every
 * section the job includes, one after the other. The scores of a section appear as soon as it
 * is done, so the results still show per section; the bar shows how many sections are done.
 * It can be stopped between sections. Only scores are stored; nothing is hidden or moved.
 */
export function TailorAll({
  isEmbedded = false,
  status: givenStatus,
  picker,
}: {
  /** Inside the purple AI card: no card of its own */
  isEmbedded?: boolean;

  /** The AI status when the parent already holds it (so a provider change shows here at once) */
  status?: AiStatus | null;

  /** Shown under the title: where the provider of this task is chosen */
  picker?: ReactNode;
}): JSX.Element {
  const dispatch = useAppDispatch();
  const job = useAppSelector(activeJobSelector);
  const removed = useAppSelector(activeVariantSelector).hiddenSections ?? [];
  const sections = useAppSelector(sectionsSelector);
  const api = useMemo(() => createApiClient(), []);
  const [ownStatus, setOwnStatus] = useState<AiStatus | null>(null);
  const status = givenStatus === undefined ? ownStatus : givenStatus;
  const [current, setCurrent] = useState<{
    done: number;
    title: string;
  } | null>(null);
  const [error, setError] = useState<string>("");
  const [warnings, setWarnings] = useState<string[]>([]);
  const [summary, setSummary] = useState<string>("");
  const [isSummaryDone, setIsSummaryDone] = useState<boolean>(false);
  const isStopping = useRef<boolean>(false);
  const ai = status ? taskProvider(status, "tailor") : null;
  const analysis = job.analysis;
  const vault = useAppSelector(vaultSelector);
  // The job titles are scored first, as one more "section", when there is a choice to make
  const titleTarget =
    jobTitlesOf(vault.profile).length >= MIN_TITLES_TO_CHOOSE
      ? [{ id: JOB_TITLES_SECTION, title: "Job titles" }]
      : [];
  const targets = [
    ...titleTarget,
    ...sections
      .filter(
        (section) => !removed.includes(section.id) && section.items.length > 0
      )
      .map((section) => ({ id: section.id, title: section.title })),
  ];
  const isRunning = current !== null;
  // Scores are kept in the job, so this is also true after a reload
  const hasScores = Object.values(job.selection).some(
    (choice) => choice.relevance !== undefined
  );

  useEffect(() => {
    if (givenStatus !== undefined) {
      return;
    }
    api
      .getAiStatus()
      .then(setOwnStatus)
      .catch(() => setOwnStatus(null));
  }, [api, givenStatus]);

  async function run(): Promise<void> {
    if (!analysis) {
      return;
    }
    isStopping.current = false;
    setError("");
    setWarnings([]);
    setSummary("");
    setIsSummaryDone(false);
    let scored = 0;
    let done = 0;
    try {
      // One approval in the "Send to AI" dialog covers every section
      await withOneApproval(
        targets.map((section) => ({
          url: "/api/ai/score-section",
          body: { sectionId: section.id, requirements: analysis },
        })),
        async () => {
          for (const section of targets) {
            if (isStopping.current) {
              break;
            }
            setCurrent({ done, title: section.title });
            const result = await api.scoreSection(section.id, analysis);
            if (section.id === JOB_TITLES_SECTION) {
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
              dispatch(
                setSectionScores({ jobId: job.id, scores: result.scores })
              );
            }
            setWarnings((before) => [...before, ...result.warnings]);
            scored += result.scores.length;
            done += 1;
          }
        }
      );
      setIsSummaryDone(!isStopping.current);
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
      aria-label="Score all sections"
      sx={{
        display: "grid",
        gap: 0.75,
        ...(isEmbedded
          ? {}
          : {
              p: 1.5,
              border: `1px solid ${WORKSPACE_COLORS.border}`,
              borderRadius: 1.5,
              bgcolor: WORKSPACE_COLORS.panel,
            }),
      }}
    >
      {isEmbedded && (
        <Typography sx={{ fontWeight: 600 }}>Score sections</Typography>
      )}
      {picker}
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          gap: 1.5,
          flexWrap: isEmbedded ? "wrap" : "nowrap",
        }}
      >
        <AiButton
          variant={hasScores ? "outlined" : "contained"}
          size="small"
          disabled={isRunning || !analysis || !ai?.isConfigured}
          onClick={() => void run()}
        >
          {hasScores ? "Score all sections again" : "Score all sections"}
        </AiButton>
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
        <Typography
          role="status"
          sx={{
            display: "flex",
            alignItems: "center",
            gap: 0.75,
            fontSize: 13,
            fontWeight: 700,
            color: isSummaryDone ? cssVar("ok") : WORKSPACE_COLORS.text,
          }}
        >
          {isSummaryDone && (
            <CheckCircleOutlinedIcon aria-hidden="true" sx={{ fontSize: 18 }} />
          )}
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
