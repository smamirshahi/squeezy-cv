import { useEffect, useMemo, useState } from "react";
import {
  Alert,
  Box,
  Chip,
  FormControlLabel,
  List,
  ListItemButton,
  ListItemText,
  Paper,
  Radio,
  RadioGroup,
  Tooltip,
  Typography,
} from "@mui/material";
import InfoOutlinedIcon from "@mui/icons-material/InfoOutlined";
import {
  AI_TASKS,
  AI_TASK_DESCRIPTIONS,
  AI_TASK_LABELS,
  AiProviderId,
  AiTask,
} from "@shared/ai/providers";
import { ResizableAside } from "@pages/workspace/resizable-aside";
import {
  MIDDLE_AREA_SX,
  WORKSPACE_COLORS,
} from "@pages/workspace/workspace-tokens";
import {
  AiStatus,
  ApiError,
  createApiClient,
} from "@store/persistence/api-client";

/** What is selected in the middle: the "All tasks" card or one task */
type CardId = "all" | AiTask;

/** The "All tasks" value when the tasks do not all use the same provider */
const MIXED = "mixed";

const SETTINGS_GROUPS = [{ id: "ai", label: "AI" }];

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

/** The card in the middle list */
function SettingCard({
  title,
  description,
  details,
  value,
  isOverride,
  isSelected,
  onSelect,
}: {
  title: string;
  description: string;
  details: string;
  value: string;
  isOverride: boolean;
  isSelected: boolean;
  onSelect: () => void;
}): JSX.Element {
  return (
    <Paper
      component="div"
      role="button"
      tabIndex={0}
      aria-pressed={isSelected}
      aria-label={title}
      data-selected={isSelected}
      onClick={onSelect}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          onSelect();
        }
      }}
      sx={{
        p: 1.5,
        cursor: "pointer",
        borderColor: isSelected ? "var(--ac)" : undefined,
        outline: isSelected ? "1px solid var(--ac)" : "none",
      }}
    >
      <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
        <Typography sx={{ fontWeight: 700, flex: 1 }}>{title}</Typography>
        {isOverride && <Chip size="small" color="warning" label="Overridden" />}
        <Chip size="small" label={value} />
        <Tooltip title={details} placement="left">
          <Box
            component="span"
            tabIndex={0}
            role="img"
            aria-label={`About ${title}`}
            sx={{ display: "inline-flex", color: "text.secondary" }}
            onClick={(event) => event.stopPropagation()}
          >
            <InfoOutlinedIcon fontSize="small" />
          </Box>
        </Tooltip>
      </Box>
      <Typography sx={{ fontSize: 12.5, color: "text.secondary", mt: 0.5 }}>
        {description}
      </Typography>
    </Paper>
  );
}

/**
 * Settings (#271). Left: the groups of settings (AI for now). Middle: what is sent, how to set
 * up, then the "All tasks" card and one card per AI task. Right: the radio buttons of the
 * selected card. Keys stay in the .env file; only the choice is stored.
 */
export function SettingsPage(): JSX.Element {
  const api = useMemo(() => createApiClient(), []);
  const [status, setStatus] = useState<AiStatus | null>(null);
  const [error, setError] = useState<string>("");
  const [selected, setSelected] = useState<CardId>("all");

  useEffect(() => {
    api
      .getAiStatus()
      .then(setStatus)
      .catch(() => setStatus(null));
  }, [api]);

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

  const selectedValue =
    selected === "all" ? allValue : (providerOf(selected) ?? "");
  const selectedInfo = providers.find((p) => p.id === selectedValue);
  const selectedTitle =
    selected === "all" ? "All tasks" : AI_TASK_LABELS[selected];

  return (
    <>
      <ResizableAside side="left" label="the settings list" defaultWidth={220}>
        <Box
          component="aside"
          aria-label="Settings list"
          sx={{
            width: "100%",
            flex: "none",
            bgcolor: WORKSPACE_COLORS.panel,
            borderRight: `1px solid ${WORKSPACE_COLORS.border}`,
            p: 1,
            overflow: "auto",
          }}
        >
          <List dense disablePadding>
            {SETTINGS_GROUPS.map((group) => (
              <ListItemButton key={group.id} selected>
                <ListItemText
                  primary={group.label}
                  slotProps={{ primary: { sx: { fontWeight: 600 } } }}
                />
              </ListItemButton>
            ))}
          </List>
        </Box>
      </ResizableAside>

      <Box
        component="main"
        aria-label="AI settings"
        sx={{
          ...MIDDLE_AREA_SX,
          flex: 1,
          minWidth: 0,
          overflow: "auto",
          p: 3,
          color: WORKSPACE_COLORS.text,
        }}
      >
        <Box
          sx={{
            maxWidth: 760,
            display: "flex",
            flexDirection: "column",
            gap: 1.5,
          }}
        >
          <Typography component="h1" sx={{ fontSize: 18, fontWeight: 700 }}>
            Settings · AI
          </Typography>
          {!status && (
            <Alert severity="info">
              The local server did not answer, so the provider cannot be shown.
            </Alert>
          )}
          {error && <Alert severity="error">{error}</Alert>}

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
                <code>GEMINI_API_KEY</code> (Gemini), <code>GROQ_API_KEY</code>{" "}
                (Groq). For a free, offline model install Ollama and start it;
                nothing leaves this computer.
              </li>
              <li>
                Optional: <code>AI_PROVIDER</code> (claude, gemini, groq or
                ollama) is the starting choice. What you pick on this page is
                remembered on this computer.
              </li>
              <li>
                Restart the server (<code>pnpm dev</code>). A provider without a
                key shows “not set up” and cannot be chosen.
              </li>
            </ol>
            Keys are only read by the server and never shown in the browser.
            Cloud AI can use what it is sent to improve its models, depending on
            the service and plan: for anything sensitive use an offline
            provider.
          </Paper>

          <Paper sx={{ p: 2, fontSize: 13, lineHeight: 1.7 }}>
            <b>Install an offline model (Ollama)</b>
            <br />
            Free, and the text never leaves this computer. It is slower than a
            cloud service (a CV can take a few minutes on a computer without a
            strong graphics card), and the answers of small models are weaker.
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
                , choose your system (macOS, Windows or Linux) and install it.
                On macOS and Windows, open the app once; it then runs in the
                background. On Linux the installer starts it as a service.
              </li>
              <li>
                Open a terminal and download a model (about 4–5 GB):{" "}
                <code>ollama pull llama3.1</code>. Check it with{" "}
                <code>ollama list</code>.
              </li>
              <li>
                If Ollama is not running, start it with{" "}
                <code>ollama serve</code>. It listens on{" "}
                <code>http://127.0.0.1:11434</code>, which is what CV Builder
                expects (the address must be this computer).
              </li>
              <li>
                Optional, in <code>.env</code>: <code>OLLAMA_MODEL</code> (the
                model name, default <code>llama3.1</code>),{" "}
                <code>OLLAMA_NUM_CTX</code> (default 16384; a CV needs a large
                context) and <code>AI_PROVIDER=ollama</code> to start with it.
              </li>
              <li>
                Restart the server. “Ollama” is then selectable in the cards
                here. A smaller model such as <code>llama3.2:3b</code> is faster
                but weaker.
              </li>
            </ol>
          </Paper>

          {status && (
            <>
              <SettingCard
                title="All tasks"
                description="One model everywhere. Choose it here, then override a single task below if it needs something different."
                details="Sets the provider of every task below at once."
                value={
                  allValue === MIXED ? "Mixed" : providerLabel(status, allValue)
                }
                isOverride={false}
                isSelected={selected === "all"}
                onSelect={() => setSelected("all")}
              />
              {AI_TASKS.map((task) => {
                const current = providerOf(task) ?? status.provider;
                const description = AI_TASK_DESCRIPTIONS[task];
                return (
                  <SettingCard
                    key={task}
                    title={AI_TASK_LABELS[task]}
                    description={description.what}
                    details={`${description.what} Sends: ${description.sends}`}
                    value={providerLabel(status, current)}
                    isOverride={
                      allValue === MIXED && current !== commonProvider
                    }
                    isSelected={selected === task}
                    onSelect={() => setSelected(task)}
                  />
                );
              })}
            </>
          )}
        </Box>
      </Box>

      <ResizableAside
        side="right"
        label="the settings panel"
        defaultWidth={340}
      >
        <Box
          component="aside"
          aria-label="Settings panel"
          sx={{
            width: "100%",
            flex: "none",
            bgcolor: WORKSPACE_COLORS.panel,
            borderLeft: `1px solid ${WORKSPACE_COLORS.border}`,
            p: 2,
            overflow: "auto",
          }}
        >
          {status && (
            <Box role="group" aria-label={selectedTitle}>
              <Typography sx={{ fontWeight: 700, fontSize: 15 }}>
                {selectedTitle}
              </Typography>
              <Typography
                sx={{ fontSize: 12.5, color: "text.secondary", mb: 1 }}
              >
                {selected === "all"
                  ? "Applies to every task. A task you set on its own card keeps its own choice until you pick here again."
                  : `${AI_TASK_DESCRIPTIONS[selected].what} Sends: ${AI_TASK_DESCRIPTIONS[selected].sends}`}
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
            </Box>
          )}
        </Box>
      </ResizableAside>
    </>
  );
}
