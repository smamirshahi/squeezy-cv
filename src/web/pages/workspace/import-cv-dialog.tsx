import { DragEvent, useEffect, useMemo, useRef, useState } from "react";
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
import {
  MAX_IMPORT_LENGTH,
  MAX_IMPORT_PDF_BYTES,
} from "@custom-types/import-types";
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
  const [isReadingPdf, setIsReadingPdf] = useState<boolean>(false);
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [pdfNote, setPdfNote] = useState<string>("");
  const fileInput = useRef<HTMLInputElement>(null);
  const target = status ? taskProvider(status, "import") : null;

  useEffect(() => {
    if (isOpen) {
      api
        .getAiStatus()
        .then(setStatus)
        .catch(() => setStatus(null));
    }
  }, [isOpen, api]);

  /** Reads the PDF's text on the local server and puts it in the (editable) text box */
  async function readPdf(file: File): Promise<void> {
    setError("");
    setPdfNote("");
    setResult(null);
    if (file.size > MAX_IMPORT_PDF_BYTES) {
      setError(
        `The PDF is larger than ${MAX_IMPORT_PDF_BYTES / (1024 * 1024)} MB.`
      );
      return;
    }
    setIsReadingPdf(true);
    try {
      const read = await api.extractPdfText(file);
      setText(read.text);
      setPdfNote(
        `Text taken from ${file.name} (${read.pages} ${read.pages === 1 ? "page" : "pages"}). Check it below before sorting.`
      );
    } catch (caught) {
      setError(
        caught instanceof ApiError || caught instanceof Error
          ? caught.message
          : "The PDF could not be read."
      );
    } finally {
      setIsReadingPdf(false);
    }
  }

  function onDrop(event: DragEvent): void {
    event.preventDefault();
    setIsDragging(false);
    const file = event.dataTransfer.files[0];
    if (file) {
      void readPdf(file);
    }
  }

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
            : `The whole text you paste or take from a PDF, including your name and contact details, is sent to ${target?.info.recipient ?? "the AI provider"}. Choose an offline provider in Settings if you do not want that.`}
        </Alert>
        {target && !target.isConfigured && (
          <Alert severity="info">
            AI is not set up. Put <code>ANTHROPIC_API_KEY=...</code> in{" "}
            <code>.env</code>, or use <code>AI_PROVIDER=ollama</code>, then
            restart the server.
          </Alert>
        )}
        <Box
          onDragOver={(event) => {
            event.preventDefault();
            setIsDragging(true);
          }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={onDrop}
          sx={{
            display: "flex",
            alignItems: "center",
            gap: 2,
            p: 1.5,
            border: "1px dashed",
            borderColor: isDragging ? "primary.main" : "divider",
            borderRadius: 1,
          }}
        >
          <Button
            variant="outlined"
            disabled={isReadingPdf}
            onClick={() => fileInput.current?.click()}
          >
            Choose PDF
          </Button>
          <input
            ref={fileInput}
            type="file"
            accept="application/pdf,.pdf"
            hidden
            aria-label="PDF file"
            onChange={(event) => {
              const file = event.target.files?.[0];
              event.target.value = "";
              if (file) {
                void readPdf(file);
              }
            }}
          />
          <Typography variant="body2">
            or drop a PDF here. Its text is read on this computer and put in the
            box below for you to check; scanned PDFs (images) are not supported.
          </Typography>
          {isReadingPdf && <CircularProgress size={20} />}
        </Box>
        {pdfNote && <Alert severity="success">{pdfNote}</Alert>}
        <TextField
          label="Your CV text"
          multiline
          minRows={8}
          maxRows={14}
          value={text}
          onChange={(event) => setText(event.target.value)}
          helperText={`${text.length} / ${MAX_IMPORT_LENGTH} characters. Paste it or choose a PDF; messy is fine.`}
        />
        {error && <Alert severity="error">{error}</Alert>}
        {result && (
          <Box>
            <Typography
              sx={{
                fontWeight: "bold",
              }}
            >
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
            <Typography
              variant="caption"
              sx={{
                display: "block",
                mt: 1,
              }}
            >
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
