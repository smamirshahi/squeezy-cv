import { useState } from "react";
import { Alert, Box, Button, Typography } from "@components/ui";
import {
  isFolderStorageSupported,
  pickFolder,
} from "@store/persistence/browser/folder-kv";
import {
  connectFolder,
  disconnectFolder,
  FolderChoice,
  folderHasData,
} from "@store/persistence/browser/connect-folder";
import { storageLocation } from "@store/persistence/browser/storage-mode";
import type { FolderHandle } from "@store/persistence/browser/folder-kv";

/**
 * Browser mode: "Store my data in a folder". The folder can be one that Drive, Dropbox, iCloud
 * or OneDrive syncs; the app never talks to those, it only reads and writes files.
 */
export function FolderSection({
  onReload = () => window.location.reload(),
}: {
  /** What happens after the storage changed (default: reload the page, which reads from the new place) */
  onReload?: () => void;
}): JSX.Element {
  const [error, setError] = useState<string>("");
  const [isBusy, setBusy] = useState<boolean>(false);
  /** A picked folder that already has data: waits for the person's choice */
  const [pending, setPending] = useState<FolderHandle | undefined>();
  const location = storageLocation();

  if (!isFolderStorageSupported()) {
    return (
      <Typography variant="body2" sx={{ color: "text.secondary" }}>
        Keeping your data in a folder (for example one that Drive or Dropbox
        syncs) needs Chrome or Edge on a computer. This browser cannot do it;
        download a backup instead.
      </Typography>
    );
  }

  async function finish(
    handle: FolderHandle,
    choice: FolderChoice | undefined
  ): Promise<void> {
    setBusy(true);
    setError("");
    try {
      await connectFolder(handle, choice);
      onReload();
    } catch (caught) {
      setError(
        caught instanceof Error ? caught.message : "The folder did not work."
      );
      setBusy(false);
    }
  }

  async function choose(): Promise<void> {
    setError("");
    try {
      const handle = await pickFolder();
      if (!handle) {
        return;
      }
      if (await folderHasData(handle)) {
        setPending(handle);
      } else {
        await finish(handle, undefined);
      }
    } catch (caught) {
      setError(
        caught instanceof Error ? caught.message : "The folder did not work."
      );
    }
  }

  async function disconnect(): Promise<void> {
    setBusy(true);
    await disconnectFolder();
    onReload();
  }

  return (
    <Box>
      <Typography
        component="h3"
        sx={{ fontSize: 14, fontWeight: 700, mb: 0.5 }}
      >
        Store my data in a folder
      </Typography>
      <Typography variant="body2" sx={{ mb: 1 }}>
        {location.kind === "folder"
          ? `Your data is in the folder “${location.name}”.`
          : "Pick a folder and Squeezy CV keeps your data there as files. If that folder is synced by Drive, Dropbox, iCloud or OneDrive, you get sync and a backup. The provider then holds the files unencrypted unless your disk or folder is encrypted. AI keys are never written to the folder."}
      </Typography>
      {pending ? (
        <Alert severity="warning">
          <Typography variant="body2" sx={{ mb: 1 }}>
            The folder “{pending.name}” already has Squeezy CV data. Use what is
            in the folder, or replace it with the data from this browser? They
            are never merged.
          </Typography>
          <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap" }}>
            <Button
              variant="contained"
              size="small"
              disabled={isBusy}
              onClick={() => void finish(pending, "use-folder")}
            >
              Use the folder’s data
            </Button>
            <Button
              color="error"
              variant="outlined"
              size="small"
              disabled={isBusy}
              onClick={() => void finish(pending, "overwrite-folder")}
            >
              Replace it with this browser’s data
            </Button>
            <Button
              size="small"
              disabled={isBusy}
              onClick={() => setPending(undefined)}
            >
              Cancel
            </Button>
          </Box>
        </Alert>
      ) : (
        <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap" }}>
          <Button
            variant="outlined"
            disabled={isBusy}
            onClick={() => void choose()}
          >
            {location.kind === "folder"
              ? "Choose another folder"
              : "Choose folder"}
          </Button>
          {location.kind === "folder" && (
            <Button disabled={isBusy} onClick={() => void disconnect()}>
              Disconnect
            </Button>
          )}
        </Box>
      )}
      {error && (
        <Alert severity="error" sx={{ mt: 1 }}>
          {error}
        </Alert>
      )}
    </Box>
  );
}
