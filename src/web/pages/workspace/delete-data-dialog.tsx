import { useEffect, useState } from "react";
import {
  Alert,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  TextField,
  Typography,
} from "@components/ui";
import { FileDownloadOutlined as FileDownloadOutlinedIcon } from "@components/ui/icons";
import { deleteAllBrowserData } from "@store/persistence/browser/delete-all-data";
import { useViewport } from "@hooks/use-viewport";

/** The word to type before the button works */
const DELETE_WORD = "DELETE";

/**
 * "Delete all my data" (browser mode): says what goes, offers a backup first, and only deletes
 * after the word DELETE is typed. Afterwards the page reloads to an empty first start.
 */
export function DeleteDataDialog({
  isOpen,
  onClose,
  onDownloadBackup,
  onDeleted = () => window.location.assign("/"),
}: {
  isOpen: boolean;
  onClose: () => void;
  onDownloadBackup: () => Promise<void>;
  /** What happens after the data is gone (default: back to the start page) */
  onDeleted?: () => void;
}): JSX.Element {
  const isPhone = useViewport() === "phone";
  const [typed, setTyped] = useState<string>("");
  const [busy, setBusy] = useState<boolean>(false);
  const [error, setError] = useState<string>("");

  useEffect(() => {
    if (isOpen) {
      setTyped("");
      setError("");
    }
  }, [isOpen]);

  async function remove(): Promise<void> {
    setBusy(true);
    setError("");
    try {
      await deleteAllBrowserData();
      onDeleted();
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : "The data could not be deleted."
      );
      setBusy(false);
    }
  }

  return (
    <Dialog
      open={isOpen}
      onClose={busy ? undefined : onClose}
      fullWidth
      maxWidth="sm"
      fullScreen={isPhone}
      aria-labelledby="delete-data-title"
    >
      <DialogTitle id="delete-data-title">Delete all my data</DialogTitle>
      <DialogContent>
        <Alert severity="error" sx={{ mb: 2 }}>
          This cannot be undone.
        </Alert>
        <Typography variant="body2" component="div" sx={{ mb: 2 }}>
          This permanently removes everything CV Builder keeps in this browser:
          <ul>
            <li>
              your CV, templates, jobs, saved jobs and applications, with the
              PDFs that were sent
            </li>
            <li>the earlier versions kept for safety</li>
            <li>your settings, AI keys and AI choices</li>
            <li>the offline copy of the app</li>
          </ul>
          Other browsers and devices are not affected.
        </Typography>
        <Button
          variant="outlined"
          startIcon={<FileDownloadOutlinedIcon />}
          disabled={busy}
          onClick={() => void onDownloadBackup()}
          sx={{ mb: 2 }}
        >
          Download backup first
        </Button>
        <TextField
          fullWidth
          size="small"
          label={`Type ${DELETE_WORD} to confirm`}
          value={typed}
          autoComplete="off"
          onChange={(event) => setTyped(event.target.value)}
        />
        {error && (
          <Alert severity="error" sx={{ mt: 2 }}>
            {error}
          </Alert>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={busy}>
          Cancel
        </Button>
        <Button
          color="error"
          variant="contained"
          disabled={busy || typed !== DELETE_WORD}
          onClick={() => void remove()}
        >
          Delete everything
        </Button>
      </DialogActions>
    </Dialog>
  );
}
