import { WORKSPACE_COLORS } from "@pages/workspace/workspace-tokens";
import {
  Alert,
  Box,
  Button,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  Link,
  MenuItem,
  Paper,
  TextField,
  Typography,
} from "@mui/material";
import { DATE_FIELD_SLOT_PROPS } from "@pages/applications-page/date-field";
import { nanoid } from "@reduxjs/toolkit";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  APPLICATION_STATUSES,
  Application,
  ApplicationStatus,
} from "@custom-types/application-types";
import {
  STATUS_LABELS,
  formatDay,
  isNoReply,
  lastUpdateDay,
  toIsoDay,
} from "@shared/application/application-utils";
import { splitVariant } from "@shared/variant/template-job";
import { duplicateVariant } from "@shared/variant/variant-utils";
import { templateIdFor } from "@store/variants/variants-slice";
import {
  applicationPdfUrl,
  createApiClient,
} from "@store/persistence/api-client";

type LoadState =
  | { status: "loading" }
  | { status: "ready"; application: Application }
  | { status: "error"; message: string };

interface Props {
  applicationId: string;

  /** Shown in the side panel of the list: no back link, no page margins */
  isEmbedded?: boolean;
}

function messageOf(error: unknown): string {
  return error instanceof Error ? error.message : "Something went wrong.";
}

/**
 * Back to the list. If we came from it, step back in history so its search and filters
 * are still there; otherwise (e.g. a link from the "Saved" message) just open the list.
 */
function goBackToList(event: React.MouseEvent): void {
  const isFromList =
    document.referrer !== "" &&
    new URL(document.referrer).origin === window.location.origin &&
    new URL(document.referrer).searchParams.has("applications");
  if (isFromList && window.history.length > 1) {
    event.preventDefault();
    window.history.back();
  }
}

/** One application: where it stands, its timeline, and the exact CV that was sent */
export function ApplicationView({
  applicationId,
  isEmbedded = false,
}: Props): JSX.Element {
  const api = useMemo(() => createApiClient(), []);
  const [state, setState] = useState<LoadState>({ status: "loading" });
  const [message, setMessage] = useState<string>("");
  const [error, setError] = useState<string>("");
  const [nextStatus, setNextStatus] = useState<ApplicationStatus | null>(null);
  const [statusDay, setStatusDay] = useState<string>("");
  const [statusNote, setStatusNote] = useState<string>("");
  const [isDeleting, setIsDeleting] = useState<boolean>(false);
  const [notes, setNotes] = useState<string>("");

  useEffect(() => {
    let isCancelled = false;
    api
      .loadApplication(applicationId)
      .then((application) => {
        if (!isCancelled) {
          setState({ status: "ready", application });
          setNotes(application.notes ?? "");
        }
      })
      .catch((caught: unknown) => {
        if (!isCancelled) {
          setState({ status: "error", message: messageOf(caught) });
        }
      });
    return () => {
      isCancelled = true;
    };
  }, [api, applicationId]);

  const update = useCallback(
    async (
      patch: Parameters<typeof api.updateApplication>[1]
    ): Promise<boolean> => {
      setError("");
      try {
        const application = await api.updateApplication(applicationId, patch);
        setState({ status: "ready", application });
        return true;
      } catch (caught) {
        setError(messageOf(caught));
        return false;
      }
    },
    [api, applicationId]
  );

  if (state.status === "loading") {
    return <Box sx={{ p: 4 }}>Loading…</Box>;
  }
  if (state.status === "error") {
    return (
      <Box sx={{ p: 4 }}>
        <Alert severity="error">{state.message}</Alert>
        <Link href="/?applications">All applications</Link>
      </Box>
    );
  }

  const { application } = state;
  const today = toIsoDay(new Date());
  const hasNoReply = isNoReply(
    { status: application.status, updatedAt: lastUpdateDay(application) },
    today
  );

  async function confirmStatus(): Promise<void> {
    if (!nextStatus) {
      return;
    }
    const isDone = await update({
      status: nextStatus,
      statusAt: statusDay,
      statusNote,
    });
    if (isDone) {
      setNextStatus(null);
    }
  }

  async function createVariantFromThis(): Promise<void> {
    setError("");
    setMessage("");
    try {
      const copy = duplicateVariant(
        application.submitted.variant,
        nanoid(),
        `${application.company} - ${application.role} (copy)`
      );
      // a copy of what was sent becomes a job with a template of its own
      const { template, job } = splitVariant(copy, templateIdFor(copy.id));
      await api.saveTemplate(template);
      await api.saveJob(job);
      setMessage(
        "A copy was added to your variants. Open the editor to use it."
      );
    } catch (caught) {
      setError(messageOf(caught));
    }
  }

  async function remove(): Promise<void> {
    try {
      await api.deleteApplication(applicationId);
      window.location.assign("/?applications");
    } catch (caught) {
      setIsDeleting(false);
      setError(messageOf(caught));
    }
  }

  return (
    <Box
      sx={{
        maxWidth: isEmbedded ? undefined : 960,
        mx: "auto",
        p: isEmbedded ? 2 : 3,
        display: "flex",
        flexDirection: "column",
        gap: 3,
      }}
    >
      {!isEmbedded && (
        <Link href="/?applications" underline="hover" onClick={goBackToList}>
          ← All applications
        </Link>
      )}

      <Box
        sx={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          gap: 2,
          flexWrap: "wrap",
        }}
      >
        <Box>
          <Typography variant="h4" component="h1">
            {application.company}
          </Typography>
          <Typography
            variant="h6"
            sx={{
              color: "text.secondary",
            }}
          >
            {application.role}
          </Typography>
          {application.jobUrl && (
            <Link href={application.jobUrl} target="_blank" rel="noreferrer">
              Job ad
            </Link>
          )}
        </Box>
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            gap: 1,
          }}
        >
          {hasNoReply && <Chip label="No reply" color="warning" />}
          <TextField
            select
            size="small"
            label="Status"
            value={application.status}
            sx={{ minWidth: 160 }}
            onChange={(event) => {
              setNextStatus(event.target.value as ApplicationStatus);
              setStatusDay(today);
              setStatusNote("");
            }}
          >
            {APPLICATION_STATUSES.map((status) => (
              <MenuItem key={status} value={status}>
                {STATUS_LABELS[status]}
              </MenuItem>
            ))}
          </TextField>
        </Box>
      </Box>

      {error && <Alert severity="error">{error}</Alert>}
      {message && <Alert severity="success">{message}</Alert>}

      <Paper variant="outlined" sx={{ p: 2 }}>
        <Typography variant="h6" component="h2" gutterBottom>
          Timeline
        </Typography>
        <Box component="ol" sx={{ m: 0, pl: 3 }}>
          {application.history.map((change) => (
            <li key={`${change.at}-${change.status}`}>
              <strong>{formatDay(change.at)}</strong> -{" "}
              {STATUS_LABELS[change.status]}
              {change.note ? ` (${change.note})` : ""}
            </li>
          ))}
        </Box>
      </Paper>

      <Paper variant="outlined" sx={{ p: 2 }}>
        <Box
          sx={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            flexWrap: "wrap",
            gap: 1,
            mb: 1,
          }}
        >
          <Typography variant="h6" component="h2">
            The CV you sent
          </Typography>
          <Box
            sx={{
              display: "flex",
              gap: 1,
            }}
          >
            <Button
              href={applicationPdfUrl(application.id)}
              download={`${application.id}.pdf`}
            >
              Download PDF
            </Button>
            <Button onClick={() => void createVariantFromThis()}>
              Create new variant from this
            </Button>
          </Box>
        </Box>
        <Typography
          variant="body2"
          sx={{
            color: "text.secondary",
            mb: 1,
          }}
        >
          Saved on {formatDay(application.appliedAt)}. It cannot be changed.
        </Typography>
        <Box
          component="iframe"
          title="The CV you sent"
          src={applicationPdfUrl(application.id)}
          sx={{
            width: "100%",
            height: 900,
            border: `1px solid ${WORKSPACE_COLORS.border}`,
          }}
        />
      </Paper>

      {application.jobDescription && (
        <Paper variant="outlined" sx={{ p: 2 }}>
          <Typography variant="h6" component="h2" gutterBottom>
            Job description
          </Typography>
          <Typography sx={{ whiteSpace: "pre-wrap" }}>
            {application.jobDescription}
          </Typography>
        </Paper>
      )}

      <Paper variant="outlined" sx={{ p: 2 }}>
        <Typography variant="h6" component="h2" gutterBottom>
          Notes
        </Typography>
        <TextField
          multiline
          fullWidth
          minRows={3}
          value={notes}
          onChange={(event) => setNotes(event.target.value)}
        />
        <Button
          sx={{ mt: 1 }}
          variant="contained"
          disabled={notes.trim() === (application.notes ?? "")}
          onClick={() => void update({ notes })}
        >
          Save notes
        </Button>
      </Paper>

      <Box>
        <Button color="error" onClick={() => setIsDeleting(true)}>
          Delete this application
        </Button>
      </Box>

      <Dialog
        open={nextStatus !== null}
        onClose={() => setNextStatus(null)}
        fullWidth
        maxWidth="xs"
      >
        <DialogTitle>
          Change status to {nextStatus ? STATUS_LABELS[nextStatus] : ""}
        </DialogTitle>
        <DialogContent>
          <Box
            sx={{
              display: "flex",
              flexDirection: "column",
              gap: 2,
              pt: 1,
            }}
          >
            <TextField
              label="Date"
              type="date"
              value={statusDay}
              onChange={(event) => setStatusDay(event.target.value)}
              slotProps={DATE_FIELD_SLOT_PROPS}
            />
            <TextField
              label="Note (optional)"
              value={statusNote}
              onChange={(event) => setStatusNote(event.target.value)}
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setNextStatus(null)}>Cancel</Button>
          <Button
            variant="contained"
            disabled={statusDay === ""}
            onClick={() => void confirmStatus()}
          >
            Save
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={isDeleting} onClose={() => setIsDeleting(false)}>
        <DialogTitle>Delete this application?</DialogTitle>
        <DialogContent>
          <DialogContentText>
            {application.company}, {application.role}, and the CV you sent will
            be removed from the list. If your data folder is a git repository,
            the history still has it.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setIsDeleting(false)}>Cancel</Button>
          <Button color="error" onClick={() => void remove()}>
            Delete
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
