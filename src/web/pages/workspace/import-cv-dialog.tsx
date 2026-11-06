import { useEffect, useMemo, useState } from "react";
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  TextField,
  Typography,
} from "@mui/material";
import { MAX_IMPORT_LENGTH } from "@custom-types/import-types";
import { mergeIntoVault } from "@shared/vault/import-from-text";
import {
  AiStatus,
  ApiError,
  ImportedCv,
  createApiClient,
  taskProvider,
} from "@store/persistence/api-client";
import { useAppDispatch, useAppSelector } from "@store/store-helper";
import { setVault, vaultSelector } from "@store/vault/vault-slice";

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

/**
 * "Paste CV text, AI sorts it": the AI sorts the pasted text into profile, links and
 * sections; the user reviews what it found (and what looks invented), then adds it to the
 * vault. Nothing is saved until the user presses Save.
 */
export function ImportCvDialog({ isOpen, onClose }: Props): JSX.Element {
  const dispatch = useAppDispatch();
  const vault = useAppSelector(vaultSelector);
  const api = useMemo(() => createApiClient(), []);
  const [text, setText] = useState<string>("");
  const [isBusy, setIsBusy] = useState<boolean>(false);
  const [error, setError] = useState<string>("");
  const [result, setResult] = useState<ImportedCv | null>(null);
  const [status, setStatus] = useState<AiStatus | null>(null);
  const target = status ? taskProvider(status, "import") : null;

  useEffect(() => {
    if (isOpen) {
      api
        .getAiStatus()
        .then(setStatus)
        .catch(() => setStatus(null));
    }
  }, [isOpen, api]);

  async function analyse(): Promise<void> {
    setIsBusy(true);
    setError("");
    setResult(null);
    try {
      setResult(await api.importCv(text));
    } catch (caught) {
      setError(
        caught instanceof ApiError || caught instanceof Error
          ? caught.message
          : "The AI request failed."
      );
    } finally {
      setIsBusy(false);
    }
  }

  function add(): void {
    if (result) {
      dispatch(setVault(mergeIntoVault(vault, result.vault)));
      setResult(null);
      setText("");
      onClose();
    }
  }

  return (
    <Dialog open={isOpen} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>Paste CV text, AI sorts it</DialogTitle>
      <DialogContent sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
        <Alert severity={target && !target.info.isOnline ? "info" : "warning"}>
          {target && !target.info.isOnline
            ? `Using ${target.info.label} on this computer: the text stays here.`
            : `The whole text you paste, including your name and contact details, is sent to ${target?.info.recipient ?? "the AI provider"}. Choose an offline provider in AI setup if you do not want that.`}
        </Alert>
        {target && !target.isConfigured && (
          <Alert severity="info">
            AI is not set up. Put <code>ANTHROPIC_API_KEY=...</code> in{" "}
            <code>.env</code>, or use <code>AI_PROVIDER=ollama</code>, then
            restart the server.
          </Alert>
        )}
        <TextField
          label="Your CV text"
          multiline
          minRows={8}
          maxRows={14}
          value={text}
          onChange={(event) => setText(event.target.value)}
          helperText={`${text.length} / ${MAX_IMPORT_LENGTH} characters. Copy it from a document or PDF; messy is fine.`}
        />
        {error && <Alert severity="error">{error}</Alert>}
        {result && (
          <Box>
            <Typography fontWeight="bold">
              Found: {result.vault.profile.fullName || "(no name)"}
            </Typography>
            <Typography variant="body2">
              {result.vault.links.length} links
            </Typography>
            {result.vault.sections.map((section) => (
              <Typography key={section.id} variant="body2">
                {section.title}: {section.items.length}{" "}
                {section.items.length === 1 ? "item" : "items"}
              </Typography>
            ))}
            {result.warnings.map((warning) => (
              <Alert key={warning} severity="warning" sx={{ mt: 1 }}>
                {warning}
              </Alert>
            ))}
            <Typography variant="caption" display="block" sx={{ mt: 1 }}>
              Nothing is added until you press the button. It is added to your
              vault (existing details are kept); check it in the Vault, then
              Save.
            </Typography>
          </Box>
        )}
      </DialogContent>
      <DialogActions>
        {isBusy && <CircularProgress size={22} />}
        <Button onClick={onClose}>Cancel</Button>
        <Button
          variant="outlined"
          disabled={
            isBusy ||
            !target?.isConfigured ||
            text.trim().length === 0 ||
            text.length > MAX_IMPORT_LENGTH
          }
          onClick={() => void analyse()}
        >
          Sort it
        </Button>
        <Button variant="contained" disabled={!result} onClick={add}>
          Add to my vault
        </Button>
      </DialogActions>
    </Dialog>
  );
}
