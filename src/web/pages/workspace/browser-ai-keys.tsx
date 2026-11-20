import { useState } from "react";
import { AiButton } from "@components/ai-button";
import { DEFAULT_MODELS } from "@server/ai/ai-config";
import {
  Alert,
  Autocomplete,
  Box,
  Button,
  Chip,
  Collapse,
  Link,
  FormControlLabel,
  Paper,
  Switch,
  TextField,
  Typography,
} from "@components/ui";
import {
  BrowserAiKeys,
  KeyTestResult,
  listProviderModels,
  readBrowserAiKeys,
  testBrowserAiKey,
  writeBrowserAiKeys,
} from "@store/persistence/browser/ai/browser-ai";

type OnlineId = "claude" | "gemini" | "groq";

const ONLINE: {
  id: OnlineId;
  name: string;
  label: string;
  where: string;
  url: string;
  steps: string[];
}[] = [
  {
    id: "claude",
    name: "Claude (Anthropic)",
    label: "Claude (Anthropic) key",
    where: "platform.claude.com",
    url: "https://platform.claude.com/settings/keys",
    steps: [
      "Sign in, or create an account.",
      "Claude API use is paid, so add a little credit under Billing and set a monthly spending limit.",
      "Open the API keys page, press Create Key and give it a name, for example Squeezy CV.",
      "Copy the key at once: it is shown only one time.",
    ],
  },
  {
    id: "gemini",
    name: "Gemini (Google)",
    label: "Gemini (Google) key",
    where: "aistudio.google.com",
    url: "https://aistudio.google.com/api-keys",
    steps: [
      "Sign in to Google AI Studio with your Google account.",
      "Open the API keys page and press Create API key (pick or create a project when asked).",
      "Copy the key. The free tier works, but Google may use what you send on the free tier to improve its models.",
    ],
  },
  {
    id: "groq",
    name: "Groq",
    label: "Groq key",
    where: "console.groq.com",
    url: "https://console.groq.com/keys",
    steps: [
      "Sign in (or create an account) on the Groq console.",
      "Open the API keys page and press Create API Key, then give it a name.",
      "Copy the key at once: it is shown only one time. The free tier is enough to start.",
    ],
  },
];

const MODEL_FIELD = {
  claude: "claudeModel",
  gemini: "geminiModel",
  groq: "groqModel",
} as const;

type TestState = KeyTestResult | undefined;

/** The label and colour of a card's status chip */
function statusChip(
  hasKey: boolean,
  result: TestState
): { label: string; color: "default" | "success" | "warning" | "error" } {
  if (result) {
    return result.isOk
      ? { label: "Key works", color: "success" }
      : { label: "Test failed", color: "error" };
  }
  return hasKey
    ? { label: "Not tested", color: "default" }
    : { label: "Not set up", color: "warning" };
}

/**
 * Browser mode: the user's own keys and models. They are kept in this browser only (never in a
 * backup) and go straight from this page to the provider they belong to, never through any server
 * of ours.
 */
export function BrowserAiKeysPanel({
  onSaved,
}: {
  onSaved: () => void;
}): JSX.Element {
  const [keys, setKeys] = useState<BrowserAiKeys>(() => readBrowserAiKeys());
  const [isSaved, setIsSaved] = useState<boolean>(false);
  const [open, setOpen] = useState<Partial<Record<OnlineId, boolean>>>({});
  const [testing, setTesting] = useState<OnlineId | undefined>();
  const [results, setResults] = useState<Partial<Record<OnlineId, TestState>>>(
    {}
  );
  const [suggestions, setSuggestions] = useState<
    Partial<Record<OnlineId, string[]>>
  >({});

  const [listFailed, setListFailed] = useState<
    Partial<Record<OnlineId, boolean>>
  >({});

  async function test(id: OnlineId): Promise<void> {
    setTesting(id);
    const key = keys[id] ?? "";
    const result = await testBrowserAiKey(id, key, keys[MODEL_FIELD[id]]);
    setResults((previous) => ({ ...previous, [id]: result }));
    setTesting(undefined);
    setListFailed((previous) => ({ ...previous, [id]: false }));
    if (result.isOk) {
      const models = await listProviderModels(id, key);
      setSuggestions((previous) => ({ ...previous, [id]: models }));
      setListFailed((previous) => ({ ...previous, [id]: models.length === 0 }));
    }
  }

  function save(): void {
    writeBrowserAiKeys(keys);
    setIsSaved(true);
    onSaved();
  }

  function changeOllama(next: BrowserAiKeys): void {
    setKeys(next);
    setIsSaved(false);
  }

  /** A change to a key or model: the earlier test no longer applies */
  function change(id: OnlineId, next: BrowserAiKeys): void {
    setKeys(next);
    setIsSaved(false);
    setResults((previous) => ({ ...previous, [id]: undefined }));
  }

  return (
    <Paper sx={{ p: 2, fontSize: 13, lineHeight: 1.7 }}>
      <b>Use your own AI key</b>
      <Alert severity="info" sx={{ my: 1 }}>
        Your keys stay in this browser. They are sent only to the service they
        belong to, never to us, and they are not part of a backup, so enter them
        again on another device. Set a spending limit with the provider (for
        example a few pounds a month) before you start.
      </Alert>
      <Box sx={{ display: "flex", flexDirection: "column", gap: 1.5, mt: 1 }}>
        {ONLINE.map((provider) => {
          const modelField = MODEL_FIELD[provider.id];
          const chip = statusChip(
            Boolean(keys[provider.id]),
            results[provider.id]
          );
          const isOpen = open[provider.id] ?? !keys[provider.id];
          const result = results[provider.id];
          return (
            <Paper
              key={provider.id}
              variant="outlined"
              component="section"
              aria-label={provider.label}
              sx={{ p: 1.5 }}
            >
              <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                <Typography
                  component="h3"
                  sx={{ fontSize: 14, fontWeight: 700 }}
                >
                  {provider.name}
                </Typography>
                <Chip size="small" label={chip.label} color={chip.color} />
                <Box sx={{ flex: 1 }} />
                <Link
                  component="button"
                  type="button"
                  onClick={() =>
                    setOpen((previous) => ({
                      ...previous,
                      [provider.id]: !isOpen,
                    }))
                  }
                >
                  {isOpen ? "Hide the steps" : "Show the steps"}
                </Link>
              </Box>
              <Collapse in={isOpen}>
                <Box
                  component="ol"
                  sx={{ m: 0, mt: 0.5, mb: 1, pl: 3, fontSize: 12.5 }}
                >
                  <li>
                    Open{" "}
                    <Link
                      href={provider.url}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      {provider.where}
                    </Link>
                    .
                  </li>
                  {provider.steps.map((step) => (
                    <li key={step}>{step}</li>
                  ))}
                  <li>Paste the key below, press Test key, then Save.</li>
                </Box>
              </Collapse>
              <Box
                sx={{
                  display: "flex",
                  gap: 1,
                  alignItems: "flex-start",
                  mt: 1,
                }}
              >
                <TextField
                  fullWidth
                  size="small"
                  type="password"
                  autoComplete="off"
                  label={provider.label}
                  value={keys[provider.id] ?? ""}
                  onChange={(event) =>
                    change(provider.id, {
                      ...keys,
                      [provider.id]: event.target.value,
                    })
                  }
                />
                <AiButton
                  variant="outlined"
                  disabled={testing !== undefined || !keys[provider.id]}
                  onClick={() => void test(provider.id)}
                  sx={{ height: 40, flex: "none" }}
                >
                  {testing === provider.id
                    ? "Testing…"
                    : result && !result.isOk
                      ? "Test again"
                      : "Test key"}
                </AiButton>
              </Box>
              {result && (
                <Typography
                  role="status"
                  sx={{
                    mt: 0.75,
                    fontSize: 12.5,
                    color: result.isOk ? "success.main" : "error.main",
                  }}
                >
                  {result.message}
                </Typography>
              )}
              <Autocomplete
                freeSolo
                fullWidth
                size="small"
                options={[
                  DEFAULT_MODELS[provider.id],
                  ...(suggestions[provider.id] ?? []).filter(
                    (model) => model !== DEFAULT_MODELS[provider.id]
                  ),
                ]}
                getOptionLabel={(model) => model}
                renderOption={(props, model) => (
                  <li {...props} key={model}>
                    {model}
                    {model === DEFAULT_MODELS[provider.id] && (
                      <Typography
                        component="span"
                        sx={{ ml: 1, fontSize: 12, color: "text.secondary" }}
                      >
                        recommended
                      </Typography>
                    )}
                  </li>
                )}
                inputValue={keys[modelField] ?? ""}
                onInputChange={(_event, value, reason) => {
                  if (reason === "reset" && value === "") {
                    return;
                  }
                  change(provider.id, { ...keys, [modelField]: value });
                }}
                renderInput={(params) => (
                  <TextField
                    {...params}
                    label="Model"
                    placeholder={`Recommended: ${DEFAULT_MODELS[provider.id]}`}
                    helperText={
                      listFailed[provider.id]
                        ? "Couldn't load the model list from the provider. Type a name or use the recommended model. Empty uses the recommended model."
                        : suggestions[provider.id]?.length
                          ? "Pick one of the models this key can use, or type a name. Empty uses the recommended model."
                          : "Pick the recommended model or type a name. Empty uses the recommended model. Test the key to list every model it can use."
                    }
                    slotProps={{
                      ...params.slotProps,
                      inputLabel: {
                        ...params.slotProps?.inputLabel,
                        shrink: true,
                      },
                    }}
                  />
                )}
                sx={{ mt: 1.5 }}
              />
            </Paper>
          );
        })}
        <FormControlLabel
          control={
            <Switch
              checked={keys.isOllamaOn === true}
              onChange={(event) =>
                changeOllama({ ...keys, isOllamaOn: event.target.checked })
              }
            />
          }
          label="Use Ollama on this computer (advanced)"
        />
        {keys.isOllamaOn && (
          <>
            <TextField
              size="small"
              label="Ollama address"
              placeholder="http://127.0.0.1:11434"
              value={keys.ollamaUrl ?? ""}
              onChange={(event) =>
                changeOllama({ ...keys, ollamaUrl: event.target.value })
              }
            />
            <TextField
              size="small"
              label="Ollama model"
              placeholder="llama3.1"
              value={keys.ollamaModel ?? ""}
              onChange={(event) =>
                changeOllama({ ...keys, ollamaModel: event.target.value })
              }
            />
            <Typography variant="caption" sx={{ color: "text.secondary" }}>
              A website may only talk to your Ollama if you allow it. Quit
              Ollama, then start it with{" "}
              <code>OLLAMA_ORIGINS={window.location.origin} ollama serve</code>.
              Nothing then leaves this computer.
            </Typography>
          </>
        )}
        <Box>
          <Button variant="contained" onClick={save}>
            Save
          </Button>
          {isSaved && (
            <Typography component="span" sx={{ ml: 1.5, fontSize: 13 }}>
              Saved in this browser.
            </Typography>
          )}
        </Box>
      </Box>
    </Paper>
  );
}
