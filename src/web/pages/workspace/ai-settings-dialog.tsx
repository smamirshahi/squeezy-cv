import { useEffect, useMemo, useState } from "react";
import {
  Alert,
  Box,
  Button,
  Chip,
  Dialog,
  DialogTitle,
  FormControlLabel,
  IconButton,
  Paper,
  Radio,
  RadioGroup,
  Typography,
} from "@mui/material";
import CloseOutlinedIcon from "@mui/icons-material/CloseOutlined";
import {
  AI_TASKS,
  AI_TASK_DESCRIPTIONS,
  AI_TASK_LABELS,
  AiProviderId,
  AiTask,
} from "@shared/ai/providers";
import { AiIcon } from "@components/ai-button";
import { OPEN_AI_SETTINGS_EVENT } from "@pages/workspace/ai-settings-event";
import { WORKSPACE_COLORS } from "@pages/workspace/workspace-tokens";
import {
  AiStatus,
  ApiError,
  createApiClient,
} from "@store/persistence/api-client";

/** What is selected on the left: all tasks, one task, or how to set the providers up */
type EntryId = "all" | "setup" | AiTask;

/** The "All tasks" value when the tasks do not all use the same provider */
const MIXED = "mixed";

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

function providerLabel(status: AiStatus, id: string): string {
  return status.providers?.find((p) => p.id === id)?.label ?? id;
}

const listItemSx = (isOn: boolean) =>
  ({
    display: "block",
    width: "100%",
    textAlign: "left",
    font: "inherit",
    p: 1.25,
    borderRadius: 1,
    cursor: "pointer",
    border: `1px solid ${isOn ? WORKSPACE_COLORS.accent : "transparent"}`,
    bgcolor: isOn ? WORKSPACE_COLORS.accentSoft : "transparent",
    color: isOn ? WORKSPACE_COLORS.accentText : WORKSPACE_COLORS.text,
    "&:hover": { bgcolor: isOn ? undefined : WORKSPACE_COLORS.hover },
  }) as const;

/**
 * The AI settings, as a dialog that opens wherever AI is used (no page to jump to). Left: all
 * tasks, each task and the set-up steps. Middle: what the selection does, what is sent and
 * masked. Right: the provider choice. A choice is saved at once; keys stay in the `.env` file.
 */
function AiSettingsDialog({
  isOpen,
  initial,
  onClose,
}: {
  isOpen: boolean;
  initial: EntryId;
  onClose: () => void;
}): JSX.Element {
  const api = useMemo(() => createApiClient(), []);
  const [status, setStatus] = useState<AiStatus | null>(null);
  const [error, setError] = useState<string>("");
  const [selected, setSelected] = useState<EntryId>(initial);

  useEffect(() => {
    if (!isOpen) {
      return;
    }
    setSelected(initial);
    setError("");
    api
      .getAiStatus()
      .then(setStatus)
      .catch(() => setStatus(null));
  }, [api, isOpen, initial]);

  async function choose(
    tasks: AiTask[],
    provider: AiProviderId
  ): Promise<void> {
    setError("");
    try {
      const choice = await api.setAiChoice(
        Object.fromEntries(tasks.map((task) => [task, provider]))
      );
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
  function providerOf(task: AiTask): AiProviderId | undefined {
    return status ? (status.choice?.[task] ?? status.provider) : undefined;
  }
  const taskProviders = AI_TASKS.map(providerOf);
  const allValue =
    status && taskProviders.every((p) => p === taskProviders[0])
      ? (taskProviders[0] as string)
      : MIXED;
  // A task is "overridden" when it differs from the provider most tasks use
  const counts = new Map<string, number>();
  for (const provider of taskProviders) {
    counts.set(provider ?? "", (counts.get(provider ?? "") ?? 0) + 1);
  }
  const commonProvider = [...counts.entries()].sort(
    (a, b) => b[1] - a[1]
  )[0]?.[0];

  const isChoice = selected !== "setup";
  const selectedValue =
    selected === "all"
      ? allValue
      : selected === "setup"
        ? ""
        : (providerOf(selected) ?? "");
  const selectedInfo = providers.find((p) => p.id === selectedValue);
  const title =
    selected === "all"
      ? "All tasks"
      : selected === "setup"
        ? "Set up the providers"
        : AI_TASK_LABELS[selected];

  const entries: {
    id: EntryId;
    label: string;
    value?: string;
    note?: string;
  }[] = [
    {
      id: "all",
      label: "All tasks",
      value:
        status && allValue !== MIXED
          ? providerLabel(status, allValue)
          : "Mixed",
    },
    ...AI_TASKS.map((task) => {
      const current = providerOf(task);
      return {
        id: task,
        label: AI_TASK_LABELS[task],
        value: status && current ? providerLabel(status, current) : undefined,
        note:
          status && allValue === MIXED && current !== commonProvider
            ? "Overridden"
            : undefined,
      };
    }),
    { id: "setup", label: "Set up the providers" },
  ];

  return (
    <Dialog
      open={isOpen}
      onClose={onClose}
      fullWidth
      maxWidth="lg"
      aria-labelledby="ai-settings-title"
      slotProps={{ paper: { sx: { height: "min(720px, 90vh)" } } }}
    >
      <DialogTitle
        id="ai-settings-title"
        sx={{
          display: "flex",
          alignItems: "center",
          gap: 1,
          fontSize: 13,
          fontWeight: 700,
          letterSpacing: "0.06em",
          textTransform: "uppercase",
          color: WORKSPACE_COLORS.aiText,
          borderBottom: `1px solid ${WORKSPACE_COLORS.border}`,
        }}
      >
        <AiIcon fontSize="inherit" />
        AI settings
        <Box sx={{ flex: 1 }} />
        <IconButton size="small" aria-label="Close" onClick={onClose}>
          <CloseOutlinedIcon fontSize="small" />
        </IconButton>
      </DialogTitle>
      <Box sx={{ flex: 1, minHeight: 0, display: "flex" }}>
        <Box
          component="nav"
          aria-label="AI settings list"
          sx={{
            width: 250,
            flex: "none",
            p: 1,
            overflow: "auto",
            display: "grid",
            gap: 0.5,
            alignContent: "start",
            borderRight: `1px solid ${WORKSPACE_COLORS.border}`,
          }}
        >
          {entries.map((entry) => (
            <Box
              key={entry.id}
              component="button"
              type="button"
              aria-current={selected === entry.id ? "true" : undefined}
              onClick={() => setSelected(entry.id)}
              sx={listItemSx(selected === entry.id)}
            >
              <Typography sx={{ fontSize: 13.5, fontWeight: 700 }}>
                {entry.label}
              </Typography>
              {entry.value && (
                <Typography
                  sx={{ fontSize: 12, color: WORKSPACE_COLORS.muted }}
                >
                  {entry.value}
                  {entry.note ? ` · ${entry.note}` : ""}
                </Typography>
              )}
            </Box>
          ))}
        </Box>

        <Box
          component="main"
          aria-label={title}
          sx={{
            flex: 1,
            minWidth: 0,
            overflow: "auto",
            p: 2.5,
            display: "flex",
            flexDirection: "column",
            gap: 1.5,
            bgcolor: WORKSPACE_COLORS.canvas,
          }}
        >
          <Typography component="h2" sx={{ fontSize: 18, fontWeight: 700 }}>
            {title}
          </Typography>
          {!status && (
            <Alert severity="info">
              The local server did not answer, so the provider cannot be shown.
            </Alert>
          )}
          {error && <Alert severity="error">{error}</Alert>}
          {isChoice && (
            <Typography sx={{ fontSize: 13 }}>
              {selected === "all"
                ? "One model everywhere. Choose it here, then override a single task if it needs something different."
                : AI_TASK_DESCRIPTIONS[selected].what}
            </Typography>
          )}
          {isChoice && selected !== "all" && (
            <Paper sx={{ p: 2, fontSize: 13, lineHeight: 1.6 }}>
              <b>Sends:</b> {AI_TASK_DESCRIPTIONS[selected].sends}
            </Paper>
          )}
          <Paper sx={{ p: 2, fontSize: 13, lineHeight: 1.7 }}>
            <b>Before anything is sent</b>
            <br />
            <b>Sent:</b> the job advert, bullet text, titles, dates
            <br />
            <b>Masked:</b> your name → [Candidate Name], email → [Email], phone
            → [Phone Number], address → [Address], links → [Link n], employers →
            [Company n], schools and universities → [Institution n]. Employer
            and school names are always hidden this way and put back in the
            answer, so the AI cannot tell that “Google” is a strong name; a
            placeholder it changes is shown as a warning.
            <br />
            <b>Never sent:</b> PDF files, your saved data files
            <br />
            <b>No guarantee:</b> masking is done on a best-effort basis. We do
            our best to find and replace personal details, but nothing is
            guaranteed: a detail written in an unusual way, or inside a free
            text, can slip through. Dates and wording can also still identify a
            person. Do not send anything you cannot accept leaving this
            computer; use an offline provider for that. On the Tailor page,
            “Preview the exact request” shows the real messages.
          </Paper>

          {selected === "setup" && (
            <>
              <Paper sx={{ p: 2, fontSize: 13, lineHeight: 1.7 }}>
                <b>How to set it up</b>
                <ol style={{ margin: "4px 0", paddingLeft: 20 }}>
                  <li>
                    Copy <code>.env.example</code> to <code>.env</code> in the
                    project folder (it is git-ignored).
                  </li>
                  <li>
                    Add a key for each online service you want:{" "}
                    <code>ANTHROPIC_API_KEY</code> (Claude),{" "}
                    <code>GEMINI_API_KEY</code> (Gemini),{" "}
                    <code>GROQ_API_KEY</code> (Groq). For a free, offline model
                    install Ollama and start it; nothing leaves this computer.
                  </li>
                  <li>
                    Optional: <code>AI_PROVIDER</code> (claude, gemini, groq or
                    ollama) is the starting choice. What you pick on this page
                    is remembered on this computer.
                  </li>
                  <li>
                    Restart the server (<code>pnpm dev</code>). A provider
                    without a key shows “not set up” and cannot be chosen.
                  </li>
                </ol>
                Keys are only read by the server and never shown in the browser.
                Cloud AI can use what it is sent to improve its models,
                depending on the service and plan: for anything sensitive use an
                offline provider.
              </Paper>

              <Paper sx={{ p: 2, fontSize: 13, lineHeight: 1.7 }}>
                <b>Install an offline model (Ollama)</b>
                <br />
                Free, and the text never leaves this computer. It is slower than
                a cloud service (a CV can take a few minutes on a computer
                without a strong graphics card), and the answers of small models
                are weaker.
                <ol style={{ margin: "4px 0", paddingLeft: 20 }}>
                  <li>
                    Go to{" "}
                    <a
                      href="https://ollama.com/download"
                      target="_blank"
                      rel="noreferrer"
                    >
                      ollama.com/download
                    </a>
                    , choose your system (macOS, Windows or Linux) and install
                    it. On macOS and Windows, open the app once; it then runs in
                    the background. On Linux the installer starts it as a
                    service.
                  </li>
                  <li>
                    Open a terminal and download a model (about 4–5 GB):{" "}
                    <code>ollama pull llama3.1</code>. Check it with{" "}
                    <code>ollama list</code>.
                  </li>
                  <li>
                    If Ollama is not running, start it with{" "}
                    <code>ollama serve</code>. It listens on{" "}
                    <code>http://127.0.0.1:11434</code>, which is what CV
                    Builder expects (the address must be this computer).
                  </li>
                  <li>
                    Optional, in <code>.env</code>: <code>OLLAMA_MODEL</code>{" "}
                    (the model name, default <code>llama3.1</code>),{" "}
                    <code>OLLAMA_NUM_CTX</code> (default 16384; a CV needs a
                    large context) and <code>AI_PROVIDER=ollama</code> to start
                    with it.
                  </li>
                  <li>
                    Restart the server. “Ollama” is then selectable in the cards
                    here. A smaller model such as <code>llama3.2:3b</code> is
                    faster but weaker.
                  </li>
                </ol>
              </Paper>
            </>
          )}
        </Box>

        <Box
          component="aside"
          aria-label="Provider"
          sx={{
            width: 340,
            flex: "none",
            p: 2,
            overflow: "auto",
            borderLeft: `1px solid ${WORKSPACE_COLORS.border}`,
          }}
        >
          {status && isChoice && (
            <Box role="group" aria-label={title}>
              <Typography sx={{ fontWeight: 700, fontSize: 15 }}>
                Which AI
              </Typography>
              <Typography
                sx={{ fontSize: 12.5, color: "text.secondary", mb: 1 }}
              >
                {selected === "all"
                  ? "Applies to every task. A task you set on its own keeps its own choice until you pick here again."
                  : `Used for: ${AI_TASK_LABELS[selected]}.`}
              </Typography>
              <RadioGroup
                value={selectedValue}
                onChange={(event) =>
                  void choose(
                    selected === "all" ? [...AI_TASKS] : [selected],
                    event.target.value as AiProviderId
                  )
                }
              >
                {providers.map((provider) => (
                  <FormControlLabel
                    key={provider.id}
                    value={provider.id}
                    disabled={!provider.isConfigured}
                    control={<Radio size="small" />}
                    label={
                      <Box>
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
                        </Box>
                        <Typography
                          sx={{ fontSize: 12, color: "text.secondary" }}
                        >
                          {provider.detail}
                        </Typography>
                      </Box>
                    }
                    sx={{ alignItems: "flex-start", mb: 1 }}
                  />
                ))}
              </RadioGroup>
              {selected !== "all" && selectedInfo && (
                <Typography sx={{ fontSize: 12.5, color: "text.secondary" }}>
                  {destinationText(selected, status, selectedInfo.id)}
                </Typography>
              )}
              {selectedInfo?.warning && (
                <Typography
                  sx={{ fontSize: 12.5, color: "var(--wrt)", mt: 0.5 }}
                >
                  {selectedInfo.warning}
                </Typography>
              )}
              {providers.some((provider) => !provider.isConfigured) && (
                <Button
                  size="small"
                  sx={{ mt: 1 }}
                  onClick={() => setSelected("setup")}
                >
                  How to set up a provider
                </Button>
              )}
            </Box>
          )}
          {status && !isChoice && (
            <Box role="group" aria-label="Providers">
              <Typography sx={{ fontWeight: 700, fontSize: 15, mb: 1 }}>
                Providers
              </Typography>
              {providers.map((provider) => (
                <Box
                  key={provider.id}
                  sx={{ display: "flex", gap: 1, alignItems: "center", mb: 1 }}
                >
                  <span>{provider.label}</span>
                  <Chip
                    size="small"
                    label={provider.isOnline ? "online" : "offline"}
                    color={provider.isOnline ? "default" : "success"}
                  />
                  <Chip
                    size="small"
                    color={provider.isConfigured ? "success" : "warning"}
                    variant="outlined"
                    label={provider.isConfigured ? "set up" : "not set up"}
                  />
                </Box>
              ))}
            </Box>
          )}
        </Box>
      </Box>
      <Box
        sx={{
          px: 2.5,
          py: 1.25,
          borderTop: `1px solid ${WORKSPACE_COLORS.border}`,
          bgcolor: WORKSPACE_COLORS.panelAlt,
          display: "flex",
          alignItems: "center",
          gap: 1,
        }}
      >
        <Typography
          sx={{ flex: 1, fontSize: 12, color: WORKSPACE_COLORS.muted }}
        >
          Changes apply immediately. Keys stay in the .env file on this
          computer.
        </Typography>
        <Button variant="contained" onClick={onClose}>
          Close
        </Button>
      </Box>
    </Dialog>
  );
}

/** Mounted once in the app: opens the AI settings when `openAiSettings` is called from anywhere */
export function AiSettingsHost(): JSX.Element {
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const [initial, setInitial] = useState<EntryId>("all");
  useEffect(() => {
    function open(event: Event): void {
      const task = (event as CustomEvent<{ task?: AiTask }>).detail?.task;
      setInitial(task ?? "all");
      setIsOpen(true);
    }
    window.addEventListener(OPEN_AI_SETTINGS_EVENT, open);
    return () => window.removeEventListener(OPEN_AI_SETTINGS_EVENT, open);
  }, []);
  return (
    <AiSettingsDialog
      isOpen={isOpen}
      initial={initial}
      onClose={() => setIsOpen(false)}
    />
  );
}
