import { useEffect, useMemo, useState } from "react";
import {
  Alert,
  Box,
  Chip,
  FormControlLabel,
  Radio,
  RadioGroup,
  Typography,
} from "@mui/material";
import {
  AI_TASKS,
  AI_TASK_LABELS,
  AiProviderId,
  AiTask,
} from "@shared/ai/providers";
import { WORKSPACE_COLORS } from "@pages/workspace/workspace-tokens";
import {
  AiStatus,
  ApiError,
  createApiClient,
} from "@store/persistence/api-client";

/** Where each task's text goes, for the line under the choice */
function destinationText(
  task: AiTask,
  status: AiStatus,
  provider: AiProviderId
): string {
  const info = status.providers?.find((p) => p.id === provider);
  if (!info) {
    return "";
  }
  if (!info.isOnline) {
    return "Nothing leaves this computer.";
  }
  return task === "import"
    ? `The whole text you paste, including your name and contact details, goes to ${info.recipient}.`
    : `Masked text goes to ${info.recipient} (not your name or contact details).`;
}

/**
 * AI provider and privacy (design B7): which provider each task uses, online or offline, with
 * where the text goes. Keys stay in the .env file; only the choice is stored.
 */
export function AiSetup(): JSX.Element {
  const api = useMemo(() => createApiClient(), []);
  const [status, setStatus] = useState<AiStatus | null>(null);
  const [error, setError] = useState<string>("");

  useEffect(() => {
    api
      .getAiStatus()
      .then(setStatus)
      .catch(() => setStatus(null));
  }, [api]);

  async function choose(task: AiTask, provider: AiProviderId): Promise<void> {
    setError("");
    try {
      const choice = await api.setAiChoice({ [task]: provider });
      setStatus((current) => (current ? { ...current, choice } : current));
    } catch (caught) {
      setError(
        caught instanceof ApiError || caught instanceof Error
          ? caught.message
          : "Could not change the provider."
      );
    }
  }

  const providers = status?.providers ?? [];
  return (
    <Box
      sx={{
        flex: 1,
        overflow: "auto",
        p: 3,
        bgcolor: WORKSPACE_COLORS.canvas,
      }}
    >
      <Box
        sx={{
          maxWidth: 720,
          bgcolor: WORKSPACE_COLORS.panel,
          color: WORKSPACE_COLORS.text,
          p: 3,
          borderRadius: 1,
          display: "flex",
          flexDirection: "column",
          gap: 1.5,
        }}
      >
        <Typography sx={{ fontSize: 16, fontWeight: 700 }}>
          AI provider and privacy
        </Typography>
        {!status && (
          <Alert severity="info">
            The local server did not answer, so the provider cannot be shown.
          </Alert>
        )}
        {error && <Alert severity="error">{error}</Alert>}
        {status &&
          AI_TASKS.map((task) => {
            const current = status.choice?.[task] ?? status.provider;
            return (
              <Box
                key={task}
                role="group"
                aria-label={AI_TASK_LABELS[task]}
                sx={{
                  p: 1.5,
                  border: `1px solid ${WORKSPACE_COLORS.border}`,
                  borderRadius: 1,
                }}
              >
                <Typography fontWeight="bold">
                  {AI_TASK_LABELS[task]}
                </Typography>
                <RadioGroup
                  value={current}
                  onChange={(event) =>
                    void choose(task, event.target.value as AiProviderId)
                  }
                >
                  {providers.map((provider) => (
                    <FormControlLabel
                      key={provider.id}
                      value={provider.id}
                      disabled={!provider.isConfigured}
                      control={<Radio size="small" />}
                      label={
                        <Box
                          sx={{ display: "flex", gap: 1, alignItems: "center" }}
                        >
                          <span>{provider.label}</span>
                          <Chip
                            size="small"
                            label={provider.isOnline ? "online" : "offline"}
                            color={provider.isOnline ? "default" : "success"}
                          />
                          {!provider.isConfigured && (
                            <Chip
                              size="small"
                              color="warning"
                              label="not set up"
                            />
                          )}
                          <Typography
                            sx={{ fontSize: 12, color: "text.secondary" }}
                          >
                            {provider.detail}
                          </Typography>
                        </Box>
                      }
                    />
                  ))}
                </RadioGroup>
                <Typography sx={{ fontSize: 12.5, color: "text.secondary" }}>
                  {destinationText(task, status, current)}
                </Typography>
                {providers.find((p) => p.id === current)?.warning && (
                  <Typography sx={{ fontSize: 12.5, color: "var(--wrt)" }}>
                    {providers.find((p) => p.id === current)?.warning}
                  </Typography>
                )}
              </Box>
            );
          })}
        <Typography sx={{ fontSize: 12.5, color: "text.secondary" }}>
          Keys and settings stay in the <code>.env</code> file (for example{" "}
          <code>ANTHROPIC_API_KEY</code>, <code>GEMINI_API_KEY</code>,{" "}
          <code>GROQ_API_KEY</code>); a provider without a key shows “not set
          up”. <code>AI_PROVIDER</code> there is the starting choice; what you
          pick here is remembered on this computer. Cloud AI can use what it is
          sent to improve its models, depending on the service and plan: for
          anything sensitive use an offline provider.
        </Typography>
        <Box
          sx={{
            p: 1.5,
            border: `1px solid ${WORKSPACE_COLORS.border}`,
            borderRadius: 1,
            lineHeight: 1.7,
            fontSize: 13,
          }}
        >
          <b>Before anything is sent</b>
          <br />
          <b>Sent:</b> the job advert, bullet text, tags, titles, employer and
          school names, dates
          <br />
          <b>Masked:</b> your name → [Candidate Name], email → [Email], phone →
          [Phone Number], address → [Address], links → [Link n]
          <br />
          <b>Never sent:</b> PDF files, your saved data files
          <br />
          Employer names, dates and wording can still identify a person; masking
          reduces the risk, it does not remove it. On the Tailor page, “Preview
          the exact request” shows the real messages.
        </Box>
      </Box>
    </Box>
  );
}
