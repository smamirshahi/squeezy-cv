import { useEffect, useState } from "react";
import {
  Alert,
  Box,
  Button,
  Checkbox,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControlLabel,
  IconButton,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
} from "@components/ui";
import {
  BugReportOutlined as BugReportOutlinedIcon,
  CheckCircleOutlined as CheckCircleOutlinedIcon,
  CloseOutlined as CloseOutlinedIcon,
  ContentCopyOutlined as ContentCopyOutlinedIcon,
  FeedbackOutlined as FeedbackOutlinedIcon,
  LightbulbOutlined as LightbulbOutlinedIcon,
  OpenInNewOutlined as OpenInNewOutlinedIcon,
  SentimentDissatisfiedOutlined as SentimentDissatisfiedOutlinedIcon,
  SentimentNeutralOutlined as SentimentNeutralOutlinedIcon,
  SentimentSatisfiedAltOutlined as SentimentSatisfiedAltOutlinedIcon,
} from "@components/ui/icons";
import {
  FeedbackKind,
  FeedbackMood,
  FeedbackRequest,
  MAX_FEEDBACK_NOTE_LENGTH,
  MIN_DETAILED_NOTE_LENGTH,
} from "@custom-types/feedback-types";
import {
  buildAppInfo,
  buildNewIssueUrl,
} from "@shared/feedback/feedback-issue";
import { APP_VERSION } from "@shared/version";
import { useRoute } from "@hooks/navigation";
import { useViewport } from "@hooks/use-viewport";

const KINDS: {
  kind: FeedbackKind;
  label: string;
  Icon: typeof FeedbackOutlinedIcon;
  prompt: string;
}[] = [
  {
    kind: "feedback",
    label: "Feedback",
    Icon: FeedbackOutlinedIcon,
    prompt: "Tell us what you like, what annoys you, anything.",
  },
  {
    kind: "bug",
    label: "Bug",
    Icon: BugReportOutlinedIcon,
    prompt:
      "Tell us:\n- What happened?\n- What did you expect instead?\n- What did you click or do before it happened?\n\nExample: I clicked Save for later, but no message appeared and the job is not in the list.",
  },
  {
    kind: "feature",
    label: "Feature",
    Icon: LightbulbOutlinedIcon,
    prompt:
      "Tell us:\n- What would you like to be able to do?\n- What problem does it solve for you?\n- How would you use it?\n\nExample: I would like to copy a job as a starting point for the next one, because many adverts are similar.",
  },
];

const MOODS: {
  mood: FeedbackMood;
  label: string;
  Icon: typeof FeedbackOutlinedIcon;
}[] = [
  { mood: "happy", label: "Happy", Icon: SentimentSatisfiedAltOutlinedIcon },
  { mood: "neutral", label: "No feeling", Icon: SentimentNeutralOutlinedIcon },
  { mood: "sad", label: "Sad", Icon: SentimentDissatisfiedOutlinedIcon },
];

type SendResult =
  { issue: { number: number; url: string } } | { error: string };

/** Sends the report to the local server, which creates the GitHub issue */
async function sendReport(report: FeedbackRequest): Promise<SendResult> {
  try {
    const response = await fetch("/api/feedback", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(report),
    });
    if (response.ok) {
      return {
        issue: (await response.json()) as { number: number; url: string },
      };
    }
    const body = (await response.json().catch(() => null)) as {
      message?: string;
    } | null;
    return { error: body?.message ?? `Sending failed (${response.status}).` };
  } catch {
    return { error: "The local server could not be reached." };
  }
}

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

/** One note about the app: a bug, feedback or a feature. It becomes a GitHub issue, or opens a prefilled one. */
export function FeedbackDialog({ isOpen, onClose }: Props): JSX.Element {
  const [kind, setKind] = useState<FeedbackKind>("feedback");
  const [mood, setMood] = useState<FeedbackMood | null>(null);
  const [note, setNote] = useState("");
  const [isAppInfoOn, setIsAppInfoOn] = useState(false);
  const [isBusy, setIsBusy] = useState(false);
  const [result, setResult] = useState<SendResult | null>(null);
  const [isCopied, setIsCopied] = useState(false);
  const page = useRoute().kind;
  const isPhone = useViewport() === "phone";
  const current = KINDS.find((entry) => entry.kind === kind) ?? KINDS[0];
  const trimmed = note.trim();
  const appInfo = buildAppInfo({
    version: APP_VERSION,
    userAgent: navigator.userAgent,
    page,
  });
  const minLength = kind === "feedback" ? 1 : MIN_DETAILED_NOTE_LENGTH;
  const isTooShort = trimmed.length < minLength;

  // Bug reports are the ones that need the app info, so it starts on for them
  useEffect(() => {
    setIsAppInfoOn(kind === "bug");
  }, [kind]);

  const report: FeedbackRequest = {
    kind,
    mood: kind === "feedback" && mood ? mood : undefined,
    note: trimmed,
    appInfo: isAppInfoOn ? appInfo : undefined,
  };

  async function handleSend(): Promise<void> {
    setIsBusy(true);
    setResult(null);
    const sent = await sendReport(report);
    setIsBusy(false);
    setResult(sent);
    if ("issue" in sent) {
      setNote("");
      setMood(null);
    }
  }

  async function handleCopy(): Promise<void> {
    try {
      await navigator.clipboard.writeText(trimmed);
      setIsCopied(true);
    } catch {
      setIsCopied(false);
    }
  }

  function handleClose(): void {
    setResult(null);
    setIsCopied(false);
    onClose();
  }

  const header = (
    <DialogTitle sx={{ display: "flex", alignItems: "center" }}>
      <Box sx={{ flex: 1 }}>
        {result && "issue" in result ? "Note sent" : "Send feedback"}
      </Box>
      <IconButton aria-label="Close" onClick={handleClose} size="small">
        <CloseOutlinedIcon fontSize="small" />
      </IconButton>
    </DialogTitle>
  );

  if (result && "issue" in result) {
    const { issue } = result;
    return (
      <Dialog
        open={isOpen}
        onClose={handleClose}
        fullWidth
        maxWidth="xs"
        fullScreen={isPhone}
      >
        {header}
        <DialogContent
          sx={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 1.5,
            textAlign: "center",
            py: 3,
          }}
        >
          <CheckCircleOutlinedIcon color="success" sx={{ fontSize: 48 }} />
          <Typography variant="h6">
            Thanks, your note is #{issue.number}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            It was added to GitHub with the label customer-created. Anyone who
            can see the repository can read it. Bookmark the link to follow it.
          </Typography>
          <Button
            href={issue.url}
            target="_blank"
            rel="noopener"
            startIcon={<OpenInNewOutlinedIcon />}
          >
            View it on GitHub
          </Button>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setResult(null)}>Send another</Button>
          <Button variant="contained" onClick={handleClose}>
            Close
          </Button>
        </DialogActions>
      </Dialog>
    );
  }

  return (
    <Dialog
      open={isOpen}
      onClose={handleClose}
      fullWidth
      maxWidth="xs"
      fullScreen={isPhone}
    >
      {header}
      <DialogContent
        sx={{ display: "flex", flexDirection: "column", gap: 2, pt: 1 }}
      >
        {result && "error" in result && (
          <Alert
            severity="error"
            action={
              <Button
                color="neutral"
                size="small"
                disabled={isBusy || isTooShort}
                onClick={() => void handleSend()}
              >
                Try again
              </Button>
            }
          >
            Could not send. {result.error} Your text is still here.
            <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap", mt: 1 }}>
              <Button
                size="small"
                color="neutral"
                startIcon={<OpenInNewOutlinedIcon />}
                href={buildNewIssueUrl(report)}
                target="_blank"
                rel="noopener"
              >
                Open on GitHub
              </Button>
              <Button
                size="small"
                color="neutral"
                startIcon={<ContentCopyOutlinedIcon />}
                onClick={() => void handleCopy()}
              >
                {isCopied ? "Copied" : "Copy the text"}
              </Button>
            </Box>
          </Alert>
        )}
        <ToggleButtonGroup
          exclusive
          fullWidth
          size="small"
          color="primary"
          value={kind}
          aria-label="What do you want to send?"
          onChange={(_event, value: FeedbackKind | null) =>
            value && setKind(value)
          }
        >
          {KINDS.map(({ kind: value, label, Icon }) => (
            <ToggleButton
              key={value}
              value={value}
              sx={{ gap: 0.75, textTransform: "none" }}
            >
              <Icon fontSize="small" />
              {label}
            </ToggleButton>
          ))}
        </ToggleButtonGroup>
        {kind === "feedback" && (
          <Box>
            <Typography variant="body2" sx={{ mb: 0.5 }}>
              How do you feel about Squeezy CV?
            </Typography>
            <ToggleButtonGroup
              exclusive
              fullWidth
              size="small"
              color="primary"
              value={mood}
              aria-label="How do you feel about Squeezy CV?"
              onChange={(_event, value: FeedbackMood | null) => setMood(value)}
            >
              {MOODS.map(({ mood: value, label, Icon }) => (
                <ToggleButton
                  key={value}
                  value={value}
                  aria-label={label}
                  sx={{ gap: 0.75, textTransform: "none" }}
                >
                  <Icon fontSize="small" />
                  {label}
                </ToggleButton>
              ))}
            </ToggleButtonGroup>
          </Box>
        )}
        <TextField
          label="Your note"
          placeholder={current.prompt}
          value={note}
          onChange={(event) => setNote(event.target.value)}
          multiline
          minRows={7}
          maxRows={10}
          slotProps={{
            htmlInput: { maxLength: MAX_FEEDBACK_NOTE_LENGTH },
            inputLabel: { shrink: true },
          }}
          helperText={
            kind !== "feedback" && trimmed.length > 0 && isTooShort
              ? `Please write a little more (at least ${MIN_DETAILED_NOTE_LENGTH} characters) so we can act on it.`
              : "Never includes your CV, notes or AI keys."
          }
        />
        <FormControlLabel
          control={
            <Checkbox
              checked={isAppInfoOn}
              onChange={(event) => setIsAppInfoOn(event.target.checked)}
            />
          }
          label={
            <Typography variant="body2">
              Include app info{" "}
              <Typography
                component="span"
                variant="caption"
                color="text.secondary"
              >
                (app version, browser and page)
              </Typography>
            </Typography>
          }
          sx={{ alignItems: "center", m: 0, ml: "-9px" }}
        />
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={handleClose}>Cancel</Button>
        <Button
          variant="contained"
          disabled={isTooShort || isBusy}
          onClick={() => void handleSend()}
        >
          Send
        </Button>
      </DialogActions>
    </Dialog>
  );
}
