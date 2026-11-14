import { useState } from "react";
import {
  Alert,
  Box,
  Button,
  FormControlLabel,
  Paper,
  Switch,
  TextField,
  Typography,
} from "@components/ui";
import {
  BrowserAiKeys,
  readBrowserAiKeys,
  writeBrowserAiKeys,
} from "@store/persistence/browser/ai/browser-ai";

const ONLINE: {
  id: "claude" | "gemini" | "groq";
  label: string;
  where: string;
}[] = [
  {
    id: "claude",
    label: "Claude (Anthropic) key",
    where: "console.anthropic.com",
  },
  { id: "gemini", label: "Gemini (Google) key", where: "aistudio.google.com" },
  { id: "groq", label: "Groq key", where: "console.groq.com" },
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
          <TextField
            key={provider.id}
            size="small"
            type="password"
            autoComplete="off"
            label={provider.label}
            value={keys[provider.id] ?? ""}
            helperText={`Get one at ${provider.where}`}
            onChange={(event) =>
              change({ ...keys, [provider.id]: event.target.value })
            }
          />
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
