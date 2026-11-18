import { DragEvent, useEffect, useMemo, useRef, useState } from "react";
import { useViewport } from "@hooks/use-viewport";
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
  Tooltip,
  Typography,
} from "@components/ui";
import {
  AddOutlined as AddOutlinedIcon,
  SettingsOutlined,
} from "@components/ui/icons";
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
import { AiButton, AiIcon } from "@components/ai-button";
import { openAiSettings } from "@pages/workspace/ai-settings-event";
import { WORKSPACE_COLORS } from "@pages/workspace/workspace-tokens";

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
  const isPhone = useViewport() === "phone";
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

  /** Reads the PDF's text (on the local server, or in the browser version on this device) and puts it in the (editable) text box */
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
        `Text taken from ${file.name} (${read.pages} ${read.pages === 1 ? "page" : "pages"}). Check it below, then press Analyze with AI.`
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

  /** Why "Analyze with AI" cannot be pressed (empty = it can) */
  const analyseBlockedReason = isBusy
    ? "The AI is working on it."
    : !target?.isConfigured
      ? "AI is not set up yet (see the note above)."
      : text.trim().length === 0
        ? "Paste your CV text or choose a PDF first."
        : text.length > MAX_IMPORT_LENGTH
          ? `The text is longer than ${MAX_IMPORT_LENGTH} characters; shorten it.`
          : "";
  /** Why "Add to my vault" cannot be pressed (empty = it can) */
  const addBlockedReason = result
    ? ""
    : "Press Analyze with AI first; you can then check what it found before adding it.";
  const nextStep = result
    ? "Step 3 of 3: check what was found, then add it to your vault."
    : text.trim().length === 0
      ? "Step 1 of 3: paste your CV text or choose a PDF."
      : "Step 2 of 3: press Analyze with AI.";

  return (
    <Dialog
      open={isOpen}
      onClose={onClose}
      maxWidth="md"
      fullWidth
      fullScreen={isPhone}
    >
      <DialogTitle>Paste CV text, AI sorts it</DialogTitle>
      <DialogContent sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
        <Box
          component="section"
          aria-label="AI for sorting the CV text"
          sx={{
            display: "grid",
            gap: 1,
            p: 1.5,
            border: `1px solid ${WORKSPACE_COLORS.aiBorder}`,
            borderRadius: 1.5,
            bgcolor: WORKSPACE_COLORS.aiSoft,
            color: WORKSPACE_COLORS.aiText,
          }}
        >
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              gap: 1,
              flexWrap: "wrap",
            }}
          >
            <AiIcon />
            <Typography sx={{ fontSize: 14, fontWeight: 700, flex: 1 }}>
              {target
                ? `${target.info.label} · ${target.info.isOnline ? "online" : "on this computer"}`
                : "AI"}
            </Typography>
            <Button
              size="small"
              color="secondary"
              startIcon={<SettingsOutlined fontSize="small" />}
              onClick={() => openAiSettings("import")}
            >
              Change AI
            </Button>
          </Box>
          <Typography variant="body2">
            {target && !target.info.isOnline
              ? `The text stays on this computer (${target.info.label}).`
              : `The whole text you paste or take from a PDF, including your name and contact details, is sent to ${target?.info.recipient ?? "the AI provider"}. Choose an offline provider with Change AI if you do not want that.`}
          </Typography>
          {target && !target.isConfigured && (
            <Alert severity="info">
              {target.info.label} is not set up. Choose another AI with Change
              AI, or set it up (see Settings), then try again.
            </Alert>
          )}
        </Box>
        <Box
          role="button"
          tabIndex={0}
          aria-label="Choose a PDF file, or drop one here"
          aria-disabled={isReadingPdf}
          onClick={() => {
            if (!isReadingPdf) {
              fileInput.current?.click();
            }
          }}
          onKeyDown={(event) => {
            if ((event.key === "Enter" || event.key === " ") && !isReadingPdf) {
              event.preventDefault();
              fileInput.current?.click();
            }
          }}
          onDragOver={(event) => {
            event.preventDefault();
            setIsDragging(true);
          }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={onDrop}
          sx={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            gap: 0.5,
            width: "100%",
            px: 2,
            py: 2.5,
            textAlign: "center",
            cursor: isReadingPdf ? "progress" : "pointer",
            border: "2px dashed",
            borderColor: isDragging ? "primary.main" : "divider",
            bgcolor: isDragging ? "action.hover" : "transparent",
            borderRadius: 1,
            "&:hover, &:focus-visible": {
              borderColor: "primary.main",
              bgcolor: "action.hover",
            },
          }}
        >
          {isReadingPdf ? (
            <CircularProgress size={28} />
          ) : (
            <AddOutlinedIcon color="primary" sx={{ fontSize: 32 }} />
          )}
          <Typography sx={{ fontWeight: "bold" }}>
            Click to choose a PDF, or drop it here
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Its text is read on this computer and put in the box below for you
            to check. Scanned PDFs (images) are not supported.
          </Typography>
          <input
            ref={fileInput}
            type="file"
            accept="application/pdf,.pdf"
            hidden
            aria-label="PDF file"
            onClick={(event) => event.stopPropagation()}
            onChange={(event) => {
              const file = event.target.files?.[0];
              event.target.value = "";
              if (file) {
                void readPdf(file);
              }
            }}
          />
        </Box>
        {pdfNote && <Alert severity="success">{pdfNote}</Alert>}
        <TextField
          label="Your CV text"
          multiline
          minRows={8}
          maxRows={14}
          value={text}
          onChange={(event) => setText(event.target.value)}
          helperText={`${text.length} / ${MAX_IMPORT_LENGTH} characters. Paste it here or choose a PDF above; messy is fine.`}
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
      <DialogActions sx={{ px: 3, pb: 2, gap: 1 }}>
        <Typography
          variant="body2"
          color="text.secondary"
          sx={{ flex: 1 }}
          aria-live="polite"
        >
          {nextStep}
        </Typography>
        {isBusy && <CircularProgress size={22} />}
        <Button onClick={onClose}>Cancel</Button>
        <Tooltip title={analyseBlockedReason} arrow>
          <span>
            <AiButton
              variant={result ? "outlined" : "contained"}
              disabled={analyseBlockedReason !== ""}
              onClick={() => void analyse()}
            >
              Analyze with AI
            </AiButton>
          </span>
        </Tooltip>
        <Tooltip title={addBlockedReason} arrow>
          <span>
            <Button
              variant="contained"
              disabled={addBlockedReason !== ""}
              onClick={add}
            >
              Add to my vault
            </Button>
          </span>
        </Tooltip>
      </DialogActions>
    </Dialog>
  );
}
