import { ChangeEvent, useEffect, useMemo, useRef, useState } from "react";
import {
  Alert,
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Typography,
} from "@mui/material";
import FileDownloadOutlinedIcon from "@mui/icons-material/FileDownloadOutlined";
import FileUploadOutlinedIcon from "@mui/icons-material/FileUploadOutlined";
import { createApiClient } from "@store/persistence/api-client";
import { isBrowserMode } from "@store/persistence/browser/storage-mode";
import { RestoreSummary } from "@shared/backup/full-backup";
import { toIsoDay } from "@shared/application/application-utils";
import { useInstallPrompt } from "@hooks/use-install-prompt";
import { useViewport } from "@hooks/use-viewport";
import { notify } from "@components/notifications/notify";

/** Fired to open the "Your data" dialog (backup and restore) */
const OPEN_DATA_EVENT = "cv-builder-open-data";

export function openDataDialog(): void {
  window.dispatchEvent(new Event(OPEN_DATA_EVENT));
}

function describeRestore(summary: RestoreSummary): string {
  const parts = [
    summary.vault ? "the CV" : "",
    `${summary.templates} template(s)`,
    `${summary.jobs} job(s)`,
    `${summary.applications} application(s)`,
    `${summary.candidates} saved job(s)`,
  ].filter(Boolean);
  const skipped =
    summary.skipped.length > 0
      ? ` Skipped because they could not be read: ${summary.skipped.join(", ")}.`
      : "";
  return `Restored ${parts.join(", ")}.${skipped}`;
}

function DataDialog({
  isOpen,
  onClose,
}: {
  isOpen: boolean;
  onClose: () => void;
}): JSX.Element {
  const isPhone = useViewport() === "phone";
  const api = useMemo(() => createApiClient(), []);
  const fileInput = useRef<HTMLInputElement>(null);
  const installApp = useInstallPrompt();
  const [busy, setBusy] = useState<boolean>(false);
  const [error, setError] = useState<string>("");
  const [restored, setRestored] = useState<string>("");

  useEffect(() => {
    if (isOpen) {
      setError("");
      setRestored("");
    }
  }, [isOpen]);

  async function download(): Promise<void> {
    setBusy(true);
    setError("");
    try {
      const blob = await api.downloadBackup();
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `cv-builder-backup-${toIsoDay(new Date())}.json`;
      link.click();
      URL.revokeObjectURL(url);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "The backup failed.");
    } finally {
      setBusy(false);
    }
  }

  async function restore(event: ChangeEvent<HTMLInputElement>): Promise<void> {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) {
      return;
    }
    setBusy(true);
    setError("");
    setRestored("");
    try {
      let parsed: unknown;
      try {
        parsed = JSON.parse(await file.text());
      } catch {
        throw new Error("This file is not a CV Builder backup.");
      }
      const summary = await api.restoreBackup(parsed);
      setRestored(describeRestore(summary));
      notify({ kind: "info", text: "Backup restored. Reload to see it." });
    } catch (caught) {
      setError(
        caught instanceof Error ? caught.message : "The restore failed."
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog
      open={isOpen}
      onClose={onClose}
      fullWidth
      maxWidth="sm"
      fullScreen={isPhone}
      aria-labelledby="data-dialog-title"
    >
      <DialogTitle id="data-dialog-title">Your data</DialogTitle>
      <DialogContent>
        <Alert severity={isBrowserMode() ? "warning" : "info"} sx={{ mb: 2 }}>
          {isBrowserMode()
            ? "Your CV lives only in this browser, on this device. Clearing site data, using a private window or another browser or device means it is not there. Download a backup regularly, and to move to another device."
            : "Your data is in the data folder on this computer. A backup file is another way to keep or move it."}
        </Alert>
        {isBrowserMode() && (
          <Box sx={{ mb: 2 }}>
            {installApp.isInstalled ? (
              <Alert severity="success">
                CV Builder is installed on this device. That also makes it less
                likely that the browser clears your data.
              </Alert>
            ) : installApp.canInstall ? (
              <Alert
                severity="info"
                action={
                  <Button
                    color="inherit"
                    size="small"
                    onClick={() => void installApp.install()}
                  >
                    Install
                  </Button>
                }
              >
                Install CV Builder as an app: it opens in its own window, works
                offline, and the browser is less likely to clear your data.
              </Alert>
            ) : installApp.isIos ? (
              <Alert severity="info">
                On iPhone and iPad: tap Share, then “Add to Home Screen”. Safari
                can delete the data of a website you have not opened for about a
                week; an installed app is kept. Download a backup too.
              </Alert>
            ) : null}
          </Box>
        )}
        <Typography variant="body2" sx={{ mb: 2 }}>
          A backup is one file with your CV, templates, jobs, saved jobs and
          applications (with the PDFs that were sent). It never contains AI
          keys, so enter those again on a new device.
        </Typography>
        <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap" }}>
          <Button
            variant="contained"
            startIcon={<FileDownloadOutlinedIcon />}
            disabled={busy}
            onClick={() => void download()}
          >
            Download backup
          </Button>
          <Button
            variant="outlined"
            startIcon={<FileUploadOutlinedIcon />}
            disabled={busy}
            onClick={() => fileInput.current?.click()}
          >
            Restore from backup
          </Button>
          <input
            ref={fileInput}
            type="file"
            accept="application/json,.json"
            hidden
            aria-label="Backup file"
            onChange={(event) => void restore(event)}
          />
        </Box>
        <Typography
          variant="caption"
          sx={{ display: "block", mt: 1, color: "text.secondary" }}
        >
          Restoring replaces items that have the same id and keeps everything
          else.
        </Typography>
        {error && (
          <Alert severity="error" sx={{ mt: 2 }}>
            {error}
          </Alert>
        )}
        {restored && (
          <Alert
            severity="success"
            sx={{ mt: 2 }}
            action={
              <Button
                color="inherit"
                size="small"
                onClick={() => window.location.reload()}
              >
                Reload
              </Button>
            }
          >
            {restored}
          </Alert>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Close</Button>
      </DialogActions>
    </Dialog>
  );
}

/** Mounted once in the app: opens when `openDataDialog` is called from anywhere */
export function DataDialogHost(): JSX.Element {
  const [isOpen, setIsOpen] = useState<boolean>(false);
  useEffect(() => {
    function open(): void {
      setIsOpen(true);
    }
    window.addEventListener(OPEN_DATA_EVENT, open);
    return () => window.removeEventListener(OPEN_DATA_EVENT, open);
  }, []);
  return <DataDialog isOpen={isOpen} onClose={() => setIsOpen(false)} />;
}
