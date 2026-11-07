import {
  Alert,
  Box,
  Button,
  Collapse,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Link,
  Snackbar,
  TextField,
  Typography,
} from "@mui/material";
import WorkOutlineIcon from "@mui/icons-material/WorkOutlined";
import { useEffect, useMemo, useState } from "react";
import { DATE_FIELD_SLOT_PROPS } from "@pages/applications-page/date-field";
import { useStore } from "react-redux";
import { Application } from "@custom-types/application-types";
import { toIsoDay } from "@shared/application/application-utils";
import { saveActiveJob } from "@hooks/save-active-job";
import { createApiClient } from "@store/persistence/api-client";
import { RootState, useAppSelector } from "@store/store-helper";
import {
  activeJobSelector,
  activeTemplateSelector,
} from "@store/jobs/jobs-slice";

interface Form {
  company: string;
  role: string;
  appliedAt: string;
  jobUrl: string;
  jobDescription: string;
  notes: string;
}

function emptyForm(): Form {
  return {
    company: "",
    role: "",
    appliedAt: toIsoDay(new Date()),
    jobUrl: "",
    jobDescription: "",
    notes: "",
  };
}

/**
 * "Mark as applied": asks for the few facts about the job, then freezes the CV as it is now
 * (data and PDF) and records the application as Applied.
 */
export function MarkAsApplied(): JSX.Element {
  const [isOpen, setIsOpen] = useState<boolean>(false);
  return (
    <>
      <Button
        sx={{ height: "40px", minWidth: "auto", px: 1 }}
        color="inherit"
        onClick={() => setIsOpen(true)}
        startIcon={<WorkOutlineIcon />}
      >
        Mark as applied
      </Button>
      <MarkAsAppliedDialog isOpen={isOpen} onClose={() => setIsOpen(false)} />
    </>
  );
}

interface DialogProps {
  isOpen: boolean;
  onClose: () => void;

  /** Role to start with (e.g. the job title the variant was tailored to) */
  initialRole?: string;
}

/** The form and the saving behind "Mark as applied"; also used by the export dialog */
export function MarkAsAppliedDialog({
  isOpen,
  onClose,
  initialRole = "",
}: DialogProps): JSX.Element {
  const store = useStore<RootState>();
  const api = useMemo(() => createApiClient(), []);
  const job = useAppSelector(activeJobSelector);
  const template = useAppSelector(activeTemplateSelector);
  const [form, setForm] = useState<Form>(emptyForm);
  const [isBusy, setIsBusy] = useState<boolean>(false);
  const [error, setError] = useState<string>("");
  const [created, setCreated] = useState<Application | null>(null);
  const [areMoreOpen, setAreMoreOpen] = useState<boolean>(false);

  function change(
    key: keyof Form
  ): (event: { target: { value: string } }) => void {
    return (event) =>
      setForm((previous) => ({ ...previous, [key]: event.target.value }));
  }

  // A fresh form each time the dialog opens
  useEffect(() => {
    if (isOpen) {
      setForm({
        ...emptyForm(),
        company: job.company ?? "",
        role: initialRole || (job.role ?? ""),
      });
      setError("");
      setAreMoreOpen(false);
    }
    // only when it opens
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  async function submit(): Promise<void> {
    setIsBusy(true);
    setError("");
    try {
      const variant = await saveActiveJob(store, api);
      const application = await api.createApplication({
        jobId: variant.id,
        company: form.company,
        role: form.role,
        appliedAt: form.appliedAt,
        jobUrl: form.jobUrl,
        jobDescription: form.jobDescription,
        notes: form.notes,
      });
      onClose();
      setCreated(application);
    } catch (caught) {
      setError(
        caught instanceof Error ? caught.message : "Something went wrong."
      );
    } finally {
      setIsBusy(false);
    }
  }

  const canSubmit =
    form.company.trim() !== "" &&
    form.role.trim() !== "" &&
    form.appliedAt !== "";

  return (
    <>
      <Dialog
        open={isOpen}
        onClose={isBusy ? undefined : onClose}
        fullWidth
        maxWidth="sm"
      >
        <DialogTitle>Mark as applied</DialogTitle>
        <DialogContent>
          <Typography
            variant="body2"
            sx={{
              color: "text.secondary",
              mb: 2,
            }}
          >
            Saves the CV exactly as it is now (with its PDF), so you can always
            see what you sent. Later edits to the template or job do not change
            it.
          </Typography>
          <Typography variant="body2" sx={{ mb: 2 }}>
            Job: <strong>{job.name}</strong> · Template:{" "}
            <strong>{template.name}</strong>
          </Typography>
          <Box
            sx={{
              display: "flex",
              flexDirection: "column",
              gap: 2,
              pt: 1,
            }}
          >
            <TextField
              label="Company"
              required
              autoFocus
              value={form.company}
              onChange={change("company")}
            />
            <TextField
              label="Role"
              required
              value={form.role}
              onChange={change("role")}
            />
            <TextField
              label="Date applied"
              type="date"
              required
              value={form.appliedAt}
              onChange={change("appliedAt")}
              slotProps={DATE_FIELD_SLOT_PROPS}
            />
            <TextField
              label="Link to the job ad (optional)"
              value={form.jobUrl}
              onChange={change("jobUrl")}
            />
            <Link
              component="button"
              type="button"
              underline="hover"
              sx={{ alignSelf: "flex-start" }}
              onClick={() => setAreMoreOpen((wasOpen) => !wasOpen)}
            >
              {areMoreOpen
                ? "Hide job description and notes"
                : "Add job description and notes"}
            </Link>
            <Collapse in={areMoreOpen}>
              <Box
                sx={{
                  display: "flex",
                  flexDirection: "column",
                  gap: 2,
                }}
              >
                <TextField
                  label="Job description"
                  multiline
                  minRows={4}
                  maxRows={10}
                  value={form.jobDescription}
                  onChange={change("jobDescription")}
                />
                <TextField
                  label="Notes"
                  multiline
                  minRows={2}
                  maxRows={6}
                  value={form.notes}
                  onChange={change("notes")}
                />
              </Box>
            </Collapse>
            {error && <Alert severity="error">{error}</Alert>}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={onClose} disabled={isBusy}>
            Cancel
          </Button>
          <Button
            variant="contained"
            onClick={() => void submit()}
            disabled={!canSubmit || isBusy}
          >
            {isBusy ? "Saving (making the PDF)…" : "Save application"}
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar
        open={created !== null}
        autoHideDuration={10_000}
        onClose={() => setCreated(null)}
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
      >
        <Alert
          severity="success"
          onClose={() => setCreated(null)}
          action={
            created && (
              <Button
                color="inherit"
                size="small"
                href={`/applications/${encodeURIComponent(created.id)}`}
              >
                View
              </Button>
            )
          }
        >
          Saved: {created?.company}, {created?.role}
        </Alert>
      </Snackbar>
    </>
  );
}
