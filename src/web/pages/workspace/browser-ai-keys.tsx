import { useState } from "react";
import { AiButton } from "@components/ai-button";
import {
  Alert,
  Box,
  Button,
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
  readBrowserAiKeys,
  testBrowserAiKey,
  writeBrowserAiKeys,
} from "@store/persistence/browser/ai/browser-ai";

type OnlineId = "claude" | "gemini" | "groq";

const ONLINE: {
  id: OnlineId;
  label: string;
  where: string;
  url: string;
  steps: string[];
}[] = [
  {
    id: "claude",
    label: "Claude (Anthropic) key",
    where: "platform.claude.com",
    url: "https://platform.claude.com/settings/keys",
    steps: [
      "Sign in (or create an account) on the Claude Console.",
      "Claude API use is paid, so add a little credit under Billing and set a monthly spending limit.",
      "Open the API keys page, press Create Key and give it a name, for example Squeezy CV.",
      "Copy the key at once: it is shown only one time.",
    ],
  },
  {
    id: "gemini",
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

/**
 * Browser mode: the user's own keys. They are kept in this browser only (never in a backup) and
 * go straight from this page to the provider they belong to, never through any server of ours.
 */
export function BrowserAiKeysPanel({
  onSaved,
}: {
  onSaved: () => void;
}): JSX.Element {
  const [keys, setKeys] = useState<BrowserAiKeys>(() => readBrowserAiKeys());
  const [isSaved, setIsSaved] = useState<boolean>(false);
  const [open, setOpen] = useState<OnlineId | undefined>();
  const [testing, setTesting] = useState<OnlineId | undefined>();
  const [results, setResults] = useState<
    Partial<Record<OnlineId, KeyTestResult>>
  >({});

  async function test(id: OnlineId): Promise<void> {
    setTesting(id);
    const result = await testBrowserAiKey(id, keys[id] ?? "");
    setResults((previous) => ({ ...previous, [id]: result }));
    setTesting(undefined);
  }

  function save(): void {
    writeBrowserAiKeys(keys);
    setIsSaved(true);
    onSaved();
  }

  function change(next: BrowserAiKeys): void {
    setKeys(next);
    setIsSaved(false);
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
        {ONLINE.map((provider) => (
          <Box key={provider.id}>
            <TextField
              fullWidth
              size="small"
              type="password"
              autoComplete="off"
              label={provider.label}
              value={keys[provider.id] ?? ""}
              helperText={
                <>
                  Get one at{" "}
                  <Link
                    href={provider.url}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    {provider.where}
                  </Link>{" "}
                  ·{" "}
                  <Link
                    component="button"
                    type="button"
                    onClick={() =>
                      setOpen(open === provider.id ? undefined : provider.id)
                    }
                  >
                    {open === provider.id ? "Hide the steps" : "Show the steps"}
                  </Link>
                </>
              }
              onChange={(event) => {
                change({ ...keys, [provider.id]: event.target.value });
                setResults((previous) => ({
                  ...previous,
                  [provider.id]: undefined,
                }));
              }}
            />
            <Collapse in={open === provider.id}>
              <Box component="ol" sx={{ m: 0, mt: 0.5, pl: 3, fontSize: 12.5 }}>
                {provider.steps.map((step) => (
                  <li key={step}>{step}</li>
                ))}
                <li>
                  Paste the key above, press Test key to check it, then Save.
                </li>
              </Box>
            </Collapse>
            <Box
              sx={{ mt: 0.5, display: "flex", alignItems: "center", gap: 1 }}
            >
              <AiButton
                size="small"
                variant="outlined"
                disabled={testing !== undefined || !keys[provider.id]}
                onClick={() => void test(provider.id)}
              >
                {testing === provider.id ? "Testing…" : "Test key"}
              </AiButton>
              {results[provider.id] && (
                <Typography
                  component="span"
                  sx={{
                    fontSize: 12.5,
                    color: results[provider.id]?.isOk
                      ? "success.main"
                      : "error.main",
                  }}
                >
                  {results[provider.id]?.message}
                </Typography>
              )}
            </Box>
          </Box>
        ))}
        <FormControlLabel
          control={
            <Switch
              checked={keys.isOllamaOn === true}
              onChange={(event) =>
                change({ ...keys, isOllamaOn: event.target.checked })
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
                change({ ...keys, ollamaUrl: event.target.value })
              }
            />
            <TextField
              size="small"
              label="Ollama model"
              placeholder="llama3.1"
              value={keys.ollamaModel ?? ""}
              onChange={(event) =>
                change({ ...keys, ollamaModel: event.target.value })
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
