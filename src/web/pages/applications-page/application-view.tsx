import { recallListSearch } from "@pages/applications-page/last-search";
import { onAppLinkClick } from "@hooks/navigation";
import { useViewport } from "@hooks/use-viewport";
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
import { copyJob } from "@shared/variant/variant-utils";
import { templateIdFor } from "@store/jobs/jobs-slice";
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

  /** When the job was created: shown as the first step of the timeline */
  draftCreatedAt?: string;
}

function messageOf(error: unknown): string {
  return error instanceof Error ? error.message : "Something went wrong.";
}

/** Back to the list, inside the app (no page load) */
function goBackToList(event: React.MouseEvent<HTMLElement>): void {
  onAppLinkClick(event, { kind: "applications", search: recallListSearch() });
}

/** One application: where it stands, its timeline, and the exact CV that was sent */
export function ApplicationView({
  applicationId,
  isEmbedded = false,
  draftCreatedAt,
}: Props): JSX.Element {
  const api = useMemo(() => createApiClient(), []);
  const isPhone = useViewport() === "phone";
  const [state, setState] = useState<LoadState>({ status: "loading" });
  const [message, setMessage] = useState<string>("");
  const [error, setError] = useState<string>("");
  const [nextStatus, setNextStatus] = useState<ApplicationStatus | null>(null);
  const [statusDay, setStatusDay] = useState<string>("");
  const [statusNote, setStatusNote] = useState<string>("");
  const [isDeleting, setIsDeleting] = useState<boolean>(false);
  const [notes, setNotes] = useState<string>("");
  const [isPdfMissing, setIsPdfMissing] = useState<boolean>(false);

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

  // the stored PDF may be gone (or never made): say so instead of an empty frame
  useEffect(() => {
    let isCancelled = false;
    setIsPdfMissing(false);
    fetch(applicationPdfUrl(applicationId), { method: "HEAD" })
      .then((response) => {
        if (!isCancelled && !response.ok) {
          setIsPdfMissing(true);
        }
      })
      .catch(() => {
        if (!isCancelled) {
          setIsPdfMissing(true);
        }
      });
    return () => {
      isCancelled = true;
    };
  }, [applicationId]);

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
        <Link href="/applications" onClick={goBackToList}>
          All applications
        </Link>
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

  async function createJobFromThis(): Promise<void> {
    setError("");
    setMessage("");
    try {
      const copy = copyJob(
        application.submitted.variant,
        nanoid(),
        `${application.company} - ${application.role} (copy)`
      );
      const { template, job } = splitVariant(copy, templateIdFor(copy.id));
      // a new job on the template it was sent with, if that still exists; otherwise the
      // look it had is kept as a template of its own
      const templates = await api.listTemplates();
      const sentTemplate = templates.find(
        (t) => t.id === application.templateId && !t.isCorrupt
      );
      if (sentTemplate) {
        await api.saveJob({
          ...job,
          templateId: sentTemplate.id,
          company: application.company,
          role: application.role,
          // the template may have changed since, so the stored fit result may not match
          tuning: undefined,
        });
      } else {
        await api.saveTemplate(template);
        await api.saveJob({
          ...job,
          company: application.company,
          role: application.role,
        });
      }
      setMessage("A copy was added to your jobs. Open the editor to use it.");
    } catch (caught) {
      setError(messageOf(caught));
    }
  }

  async function remove(): Promise<void> {
    try {
      await api.deleteApplication(applicationId);
      window.location.assign("/applications");
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
        p: isEmbedded ? 2 : { xs: 2, md: 3 },
        minWidth: 0,
        display: "flex",
        flexDirection: "column",
        gap: 3,
      }}
    >
      {!isEmbedded && (
        <Link href="/applications" underline="hover" onClick={goBackToList}>
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
        <Box sx={{ minWidth: 0, overflowWrap: "anywhere" }}>
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
          <Typography
            variant="body2"
            sx={{ color: "text.secondary" }}
            data-testid="application-sources"
          >
            Job: {application.jobName ?? application.submitted.variant.name} ·
            Template: {application.templateName ?? "unknown"}
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
            flexWrap: "wrap",
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
              flexWrap: "wrap",
              gap: 1,
            }}
          >
            <Button
              href={applicationPdfUrl(application.id)}
              download={`${application.id}.pdf`}
              disabled={isPdfMissing}
            >
              Download PDF
            </Button>
            <Button onClick={() => void createJobFromThis()}>
              Create new job from this
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
          CV as sent on {formatDay(application.appliedAt)}. The sent CV is a
          frozen copy; later edits to the template or job do not change it.
        </Typography>
        {isPdfMissing ? (
          <Alert severity="warning">
            The PDF of this application is missing, so the CV that was sent
            cannot be shown.
          </Alert>
        ) : (
          <Box
            component="iframe"
            title="The CV you sent"
            src={applicationPdfUrl(application.id)}
            sx={{
              width: "100%",
              height: { xs: "70vh", md: 900 },
              minHeight: 360,
              border: `1px solid ${WORKSPACE_COLORS.border}`,
            }}
          />
        )}
      </Paper>

      <Paper variant="outlined" sx={{ p: 2 }}>
        <Typography variant="h6" component="h2" gutterBottom>
          Timeline
        </Typography>
        <Box component="ol" sx={{ m: 0, pl: 3 }}>
          {draftCreatedAt && (
            <li>
              <strong>{formatDay(draftCreatedAt)}</strong> - Draft created
            </li>
          )}
          {application.history.map((change) => (
            <li key={`${change.at}-${change.status}`}>
              <strong>{formatDay(change.at)}</strong> -{" "}
              {STATUS_LABELS[change.status]}
              {change.note ? ` (${change.note})` : ""}
            </li>
          ))}
        </Box>
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
        fullScreen={isPhone}
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

      <Dialog
        open={isDeleting}
        onClose={() => setIsDeleting(false)}
        fullScreen={isPhone}
      >
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
