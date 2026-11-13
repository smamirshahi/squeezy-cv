import { useEffect, useMemo, useRef, useState } from "react";
import { notify } from "@components/notifications/notify";
import {
  Alert,
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  FormControlLabel,
  FormLabel,
  MenuItem,
  Radio,
  RadioGroup,
  TextField,
  Typography,
} from "@mui/material";
import { useViewport } from "@hooks/use-viewport";
import { toIsoDay } from "@shared/application/application-utils";
import { DATE_FIELD_SLOT_PROPS } from "@pages/applications-page/date-field";
import { createApiClient } from "@store/persistence/api-client";
import { MAX_IMPORT_PDF_BYTES } from "@custom-types/import-types";

/** Where people send applications; "Other" lets them type their own */
const WAYS = [
  "LinkedIn",
  "Glassdoor",
  "Indeed",
  "Company website",
  "Email",
  "Recruiter or agency",
  "Job board",
  "Other",
] as const;

interface Props {
  isOpen: boolean;
  onClose: () => void;
  company: string;
  role: string;
  jobUrl: string;

  /** Called once the application is saved, so the page can start on the next job */
  onSaved: () => void;
}

/**
 * "I applied elsewhere": records that the job was sent outside the app, how it was sent, and
 * whether a CV goes with it. A CV is the PDF that was sent (uploaded here); a CV made in this app
 * goes through the normal workflow and Mark as applied instead.
 */
export function AppliedElsewhereDialog({
  isOpen,
  onClose,
  company,
  role,
  jobUrl,
  onSaved,
}: Props): JSX.Element {
  const isPhone = useViewport() === "phone";
  const api = useMemo(() => createApiClient(), []);
  const [way, setWay] = useState<string>(WAYS[0]);
  const [otherWay, setOtherWay] = useState<string>("");
  const [appliedAt, setAppliedAt] = useState<string>(toIsoDay(new Date()));
  const [form, setForm] = useState({ company, role, jobUrl });
  const [hasCv, setHasCv] = useState<"yes" | "no">("no");
  const [cvFile, setCvFile] = useState<File | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const [isBusy, setIsBusy] = useState<boolean>(false);
  const [error, setError] = useState<string>("");

  // A fresh form each time the dialog opens
  useEffect(() => {
    if (isOpen) {
      setWay(WAYS[0]);
      setOtherWay("");
      setAppliedAt(toIsoDay(new Date()));
      setForm({ company, role, jobUrl });
      setHasCv("no");
      setCvFile(null);
      setError("");
    }
    // only when it opens
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  const via = way === "Other" ? otherWay.trim() : way;
  const canSubmit =
    form.company.trim() !== "" &&
    form.role.trim() !== "" &&
    appliedAt !== "" &&
    via !== "" &&
    (hasCv === "no" || cvFile !== null);

  async function submit(): Promise<void> {
    setIsBusy(true);
    setError("");
    try {
      const input = {
        company: form.company,
        role: form.role,
        jobUrl: form.jobUrl,
        appliedAt,
        via,
      };
      const application = await api.createApplication({
        ...input,
        withoutCv: true,
      });
      if (hasCv === "yes" && cvFile) {
        try {
          await api.uploadApplicationPdf(application.id, cvFile);
        } catch (caught) {
          throw new Error(
            `The application was saved, but its PDF was not: ${
              caught instanceof Error ? caught.message : "unknown error"
            }`
          );
        }
      }
      onClose();
      notify({
        kind: "success",
        text: `Saved: ${application.company}, ${application.role}`,
        action: {
          label: "View",
          href: `/applications/${encodeURIComponent(application.id)}`,
        },
      });
      onSaved();
    } catch (caught) {
      setError(
        caught instanceof Error ? caught.message : "Something went wrong."
      );
    } finally {
      setIsBusy(false);
    }
  }

  return (
    <>
      <Dialog
        open={isOpen}
        onClose={isBusy ? undefined : onClose}
        fullWidth
        fullScreen={isPhone}
        maxWidth="sm"
      >
        <DialogTitle>I applied elsewhere</DialogTitle>
        <DialogContent>
          <Typography variant="body2" sx={{ color: "text.secondary", mb: 2 }}>
            Records that you already sent this job, so you can follow it in
            Applications.
          </Typography>
          <Box sx={{ display: "flex", flexDirection: "column", gap: 2, pt: 1 }}>
            <TextField
              select
              label="How did you apply?"
              value={way}
              onChange={(event) => setWay(event.target.value)}
            >
              {WAYS.map((option) => (
                <MenuItem key={option} value={option}>
                  {option}
                </MenuItem>
              ))}
            </TextField>
            {way === "Other" && (
              <TextField
                label="Where?"
                required
                autoFocus
                value={otherWay}
                onChange={(event) => setOtherWay(event.target.value)}
              />
            )}
            <TextField
              label="Date applied"
              type="date"
              required
              value={appliedAt}
              onChange={(event) => setAppliedAt(event.target.value)}
              slotProps={DATE_FIELD_SLOT_PROPS}
            />
            <TextField
              label="Company"
              required
              value={form.company}
              onChange={(event) =>
                setForm({ ...form, company: event.target.value })
              }
            />
            <TextField
              label="Role"
              required
              value={form.role}
              onChange={(event) =>
                setForm({ ...form, role: event.target.value })
              }
            />
            <TextField
              label="Link to the advert (optional)"
              value={form.jobUrl}
              onChange={(event) =>
                setForm({ ...form, jobUrl: event.target.value })
              }
            />
            <FormControl>
              <FormLabel id="applied-cv-label">Did you send a CV?</FormLabel>
              <RadioGroup
                aria-labelledby="applied-cv-label"
                value={hasCv}
                onChange={(event) =>
                  setHasCv(event.target.value === "yes" ? "yes" : "no")
                }
              >
                <FormControlLabel
                  value="no"
                  control={<Radio />}
                  label="No CV, or one that was not made here"
                />
                <FormControlLabel
                  value="yes"
                  control={<Radio />}
                  label="Yes, I have the PDF"
                />
              </RadioGroup>
            </FormControl>
            {hasCv === "yes" && (
              <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
                <Button
                  variant="outlined"
                  color="inherit"
                  onClick={() => fileRef.current?.click()}
                >
                  {cvFile ? "Choose another PDF" : "Choose the PDF"}
                </Button>
                <Typography
                  variant="body2"
                  sx={{ color: "text.secondary", minWidth: 0 }}
                  noWrap
                >
                  {cvFile?.name ?? "No file chosen"}
                </Typography>
                <input
                  ref={fileRef}
                  type="file"
                  accept="application/pdf"
                  hidden
                  aria-label="CV PDF"
                  onChange={(event) => {
                    const file = event.target.files?.[0] ?? null;
                    event.target.value = "";
                    if (file && file.size > MAX_IMPORT_PDF_BYTES) {
                      setError(
                        `The PDF is larger than ${MAX_IMPORT_PDF_BYTES / (1024 * 1024)} MB.`
                      );
                      return;
                    }
                    setError("");
                    setCvFile(file);
                  }}
                />
              </Box>
            )}
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
            {isBusy ? "Saving…" : "Save application"}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}
