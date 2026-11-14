import { useState } from "react";
import {
  Alert,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  TextField,
} from "@components/ui";
import { useViewport } from "@hooks/use-viewport";
import { Candidate, NewCandidate } from "@custom-types/candidate-types";

interface Props {
  isOpen: boolean;
  onClose: () => void;

  /** Saves the candidate; rejects with the reason to show */
  onSave: (input: NewCandidate) => Promise<void>;

  /** Fills the form (e.g. from the advert already pasted into a job) */
  initial?: Partial<Candidate>;
  title?: string;
}

function CandidateForm({
  onClose,
  onSave,
  initial,
  title,
}: Omit<Props, "isOpen">): JSX.Element {
  const [company, setCompany] = useState<string>(initial?.company ?? "");
  const [role, setRole] = useState<string>(initial?.role ?? "");
  const [jobUrl, setJobUrl] = useState<string>(initial?.jobUrl ?? "");
  const [applyBy, setApplyBy] = useState<string>(initial?.applyBy ?? "");
  const [note, setNote] = useState<string>(initial?.note ?? "");
  const [jobAd, setJobAd] = useState<string>(initial?.jobAd ?? "");
  const [error, setError] = useState<string>("");
  const [isBusy, setIsBusy] = useState<boolean>(false);

  async function save(): Promise<void> {
    setIsBusy(true);
    setError("");
    try {
      await onSave({ company, role, jobUrl, applyBy, note, jobAd });
      onClose();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : String(caught));
      setIsBusy(false);
    }
  }

  return (
    <>
      <DialogTitle id="candidate-title">
        {title ?? "Save for later"}
      </DialogTitle>
      <DialogContent
        sx={{
          display: "grid",
          gridTemplateColumns: {
            xs: "minmax(0, 1fr)",
            sm: "repeat(2, minmax(0, 1fr))",
          },
          gap: 2,
          // `&&`: MUI removes the top padding after a title with a more specific rule, and the
          // first label sticks out above its field, so without this it is clipped
          "&&": { pt: 1.5 },
          alignContent: "start",
        }}
      >
        {error !== "" && (
          <Alert severity="error" sx={{ gridColumn: "1 / -1" }}>
            {error}
          </Alert>
        )}
        <TextField
          autoFocus
          label="Company"
          value={company}
          onChange={(event) => setCompany(event.target.value)}
        />
        <TextField
          label="Role"
          value={role}
          onChange={(event) => setRole(event.target.value)}
        />
        <TextField
          label="Link to the advert"
          value={jobUrl}
          onChange={(event) => setJobUrl(event.target.value)}
        />
        <TextField
          label="Apply by"
          type="date"
          value={applyBy}
          onChange={(event) => setApplyBy(event.target.value)}
          slotProps={{ inputLabel: { shrink: true } }}
        />
        <TextField
          label="Note"
          multiline
          minRows={2}
          sx={{ gridColumn: "1 / -1" }}
          value={note}
          onChange={(event) => setNote(event.target.value)}
        />
        <TextField
          label="Advert text (optional)"
          multiline
          minRows={5}
          maxRows={12}
          sx={{ gridColumn: "1 / -1" }}
          value={jobAd}
          onChange={(event) => setJobAd(event.target.value)}
        />
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button
          variant="contained"
          disabled={isBusy || (company.trim() === "" && role.trim() === "")}
          onClick={() => void save()}
        >
          Save
        </Button>
      </DialogActions>
    </>
  );
}

/** The "Save for later" form: park a job as a candidate without building a CV */
export function CandidateDialog({ isOpen, ...rest }: Props): JSX.Element {
  const isPhone = useViewport() === "phone";
  return (
    <Dialog
      open={isOpen}
      onClose={rest.onClose}
      fullWidth
      fullScreen={isPhone}
      maxWidth="md"
      aria-labelledby="candidate-title"
      slotProps={{
        paper: {
          // The visible window, not the layout one, and a smaller margin than MUI's 32 px
          sx: { m: 2, maxHeight: "calc(100dvh - 32px)" },
        },
      }}
    >
      {/* mounted only while open, so the form starts fresh each time */}
      {isOpen && <CandidateForm {...rest} />}
    </Dialog>
  );
}
