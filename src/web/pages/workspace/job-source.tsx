import { useEffect, useMemo, useState } from "react";
import { AiButton, AiIcon } from "@components/ai-button";
import {
  Alert,
  Box,
  Button,
  IconButton,
  TextField,
  Tooltip,
  Typography,
} from "@components/ui";
import {
  CloseOutlined as CloseIcon,
  LockOutlined as LockIcon,
  OpenInNewOutlined as OpenInNewIcon,
  UndoOutlined as UndoIcon,
} from "@components/ui/icons";
import { JobFields, MAX_JOB_PAGE_LENGTH } from "@custom-types/job-fields-types";
import { AiSettingsButton } from "@pages/workspace/ai-job-context";
import { onAiSettingsChanged } from "@pages/workspace/ai-settings-event";
import { WORKSPACE_COLORS } from "@pages/workspace/workspace-tokens";
import {
  AiStatus,
  ApiError,
  createApiClient,
  taskProvider,
} from "@store/persistence/api-client";

/** What the last fill did, so the form can mark those fields and offer Undo */
export interface JobImport {
  /** How many fields were filled */
  count: number;
  /** Where the details came from */
  from: "link" | "text";
}

const LINK_PATTERN = /^https?:\/\/\S+$/;

/** True when the whole input is one web address (not job text that contains one) */
function isLink(input: string): boolean {
  return LINK_PATTERN.test(input.trim());
}

function sourceName(link: string): string {
  try {
    const host = new URL(link).hostname.replace(/^www\./, "");
    return host.endsWith("linkedin.com") ? "LinkedIn" : host;
  } catch {
    return "the link";
  }
}

const BOX_SX = {
  display: "grid",
  gap: 1.5,
  p: 2,
  borderRadius: "6px",
  bgcolor: WORKSPACE_COLORS.aiSoft,
  border: `1px solid ${WORKSPACE_COLORS.aiBorder}`,
} as const;

/**
 * "Start from the advert" at the top of the job form: one box for a job link or the text of the
 * job page. The AI fills the form below and the user checks it. A link is read by Gemini when a
 * Gemini key is set (only the link is sent); when it cannot be read, or there is no key, the box
 * asks for the page text instead and keeps the link. Pasted text is sent to the provider chosen
 * for tailoring, after the Send to AI preview.
 */
export function JobImportBox({
  imported,
  onFill,
  onUndo,
  onUseAnother,
}: {
  imported: JobImport | null;
  /** Called with what was read and the link that was given (empty when only text was pasted) */
  onFill: (fields: JobFields, link: string, from: JobImport["from"]) => void;
  onUndo: () => void;
  onUseAnother: () => void;
}): JSX.Element {
  const api = useMemo(() => createApiClient(), []);
  const [status, setStatus] = useState<AiStatus | null>(null);
  const [input, setInput] = useState<string>("");
  const [link, setLink] = useState<string>("");
  const [needsText, setNeedsText] = useState<string>("");
  const [error, setError] = useState<string>("");
  const [isReading, setIsReading] = useState<boolean>(false);
  const ai = status ? taskProvider(status, "tailor") : null;
  const isGeminiSet =
    status?.providers?.find((entry) => entry.id === "gemini")?.isConfigured ===
    true;
  const isAskingForText = needsText !== "";
  const value = input;
  const isLinkInput = !isAskingForText && isLink(value);
  const isTooLong = value.length > MAX_JOB_PAGE_LENGTH;

  useEffect(() => {
    const load = (): void => {
      api
        .getAiStatus()
        .then(setStatus)
        .catch(() => setStatus(null));
    };
    load();
    return onAiSettingsChanged(load);
  }, [api]);

  const disabledReason = isReading
    ? "Reading the page."
    : value.trim() === ""
      ? "Paste a job link or the job text first."
      : isTooLong
        ? `The text is longer than ${MAX_JOB_PAGE_LENGTH} characters.`
        : !isLinkInput && !ai?.isConfigured
          ? "AI is not set up. Choose a provider in Settings."
          : "";

  function reset(): void {
    setInput("");
    setLink("");
    setNeedsText("");
    setError("");
  }

  async function fill(): Promise<void> {
    setError("");
    if (isLinkInput && !isGeminiSet) {
      // no way to read a link without a Gemini key: keep it and ask for the text
      setLink(value.trim());
      setInput("");
      setNeedsText(
        "Reading a link needs a Gemini key (add one in AI settings). Open the job, select all (Ctrl/Cmd+A), copy, and paste it below. The link is kept as the advert link."
      );
      return;
    }
    setIsReading(true);
    try {
      const fields = isLinkInput
        ? await api.extractJobFromLink(value.trim())
        : await api.extractJobFields(value.trim());
      const isEmpty =
        fields.company === "" && fields.role === "" && fields.advert === "";
      if (isEmpty && isLinkInput) {
        setLink(value.trim());
        setInput("");
        setNeedsText(
          `${sourceName(value.trim())} did not let us read this page. Open the job, select all (Ctrl/Cmd+A), copy, and paste it below. The link is kept as the advert link.`
        );
        return;
      }
      if (isEmpty) {
        setError(
          "Nothing that looks like a job was found in that text. Copy the whole job page and try again."
        );
        return;
      }
      onFill(
        fields,
        isLinkInput ? value.trim() : link,
        isLinkInput ? "link" : "text"
      );
      reset();
    } catch (caught) {
      setError(
        caught instanceof ApiError || caught instanceof Error
          ? caught.message
          : "The AI request failed."
      );
    } finally {
      setIsReading(false);
    }
  }

  if (imported) {
    return (
      <Box
        component="section"
        aria-label="Filled from the advert"
        sx={{ ...BOX_SX, gridAutoFlow: "column", alignItems: "center" }}
      >
        <Box>
          <Typography sx={{ fontWeight: 700, fontSize: 14 }}>
            Filled from {imported.from === "link" ? "the link" : "the advert"}
          </Typography>
          <Typography sx={{ fontSize: 13, color: WORKSPACE_COLORS.muted }}>
            {imported.count} {imported.count === 1 ? "field" : "fields"} filled.
            The ones marked with the AI mark came from the advert: check them
            before you continue.
          </Typography>
        </Box>
        <Box sx={{ display: "flex", gap: 1, justifyContent: "flex-end" }}>
          <Button
            size="small"
            color="neutral"
            startIcon={<UndoIcon />}
            onClick={onUndo}
          >
            Undo
          </Button>
          <Button
            size="small"
            variant="outlined"
            color="neutral"
            onClick={onUseAnother}
          >
            Use another job
          </Button>
        </Box>
      </Box>
    );
  }

  return (
    <Box component="section" aria-label="Start from the advert" sx={BOX_SX}>
      <Box sx={{ display: "flex", alignItems: "center", gap: 0.75 }}>
        <AiIcon />
        <Typography
          component="h2"
          sx={{ fontWeight: 700, fontSize: 14, color: WORKSPACE_COLORS.aiText }}
        >
          Start from the advert
        </Typography>
        <Box sx={{ flex: 1 }} />
        <AiSettingsButton task="tailor" />
      </Box>
      {isAskingForText ? (
        <>
          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
            <TextField
              fullWidth
              size="small"
              label="Job link"
              value={link}
              onChange={(event) => setLink(event.target.value)}
            />
            <IconButton
              aria-label="Clear the link"
              onClick={() => {
                setLink("");
                setNeedsText("");
              }}
            >
              <CloseIcon />
            </IconButton>
          </Box>
          <Box
            role="status"
            sx={{
              display: "flex",
              alignItems: "flex-start",
              gap: 1,
              p: 1.25,
              borderRadius: "4px",
              bgcolor: WORKSPACE_COLORS.panel,
              border: `1px solid ${WORKSPACE_COLORS.borderStrong}`,
              fontSize: 13,
            }}
          >
            <LockIcon fontSize="small" aria-hidden="true" />
            <Box sx={{ flex: 1 }}>{needsText}</Box>
            {link !== "" && (
              <Button
                size="small"
                variant="outlined"
                color="neutral"
                startIcon={<OpenInNewIcon />}
                component="a"
                href={link}
                target="_blank"
                rel="noreferrer"
              >
                Open the job
              </Button>
            )}
          </Box>
        </>
      ) : (
        <Typography sx={{ fontSize: 13, color: WORKSPACE_COLORS.muted }}>
          Paste a job link or the whole job text. We fill in the form below, and
          you check it.
        </Typography>
      )}
      <TextField
        id="job-import-input"
        fullWidth
        multiline
        minRows={isAskingForText ? 5 : 2}
        maxRows={14}
        label={isAskingForText ? "Job page text" : "Job link or job text"}
        placeholder={
          isAskingForText
            ? "Paste the job page text here"
            : "https://www.linkedin.com/jobs/view/… or paste the job text"
        }
        value={value}
        error={isTooLong}
        onChange={(event) => setInput(event.target.value)}
        helperText={
          isTooLong
            ? `Too long: ${value.length} of ${MAX_JOB_PAGE_LENGTH} characters.`
            : undefined
        }
      />
      {error && <Alert severity="error">{error}</Alert>}
      <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
        <Typography
          sx={{ flex: 1, fontSize: 12, color: WORKSPACE_COLORS.muted }}
        >
          {isLinkInput
            ? isGeminiSet
              ? "Only the link is sent, to Gemini, which opens the page. LinkedIn can refuse; then you paste the text instead."
              : "Reading a link needs a Gemini key. Without one, you will be asked to paste the page text."
            : `Only this text is sent${ai?.isConfigured ? ` to ${ai.info.label}` : " to the AI"}, after a preview. Or skip this and fill the form yourself.`}
        </Typography>
        <Tooltip title={disabledReason} disableHoverListener={!disabledReason}>
          <Box component="span">
            <AiButton
              disabled={disabledReason !== ""}
              onClick={() => void fill()}
            >
              {isReading
                ? "Reading…"
                : isAskingForText || !isLinkInput
                  ? "Fill from text"
                  : "Fill"}
            </AiButton>
          </Box>
        </Tooltip>
      </Box>
    </Box>
  );
}
