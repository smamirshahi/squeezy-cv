import { useState } from "react";
import { Alert, Box, Button, Typography } from "@components/ui";
import {
  reconnectFolder,
  StorageLocation,
} from "@store/persistence/browser/storage-mode";
import { disconnectFolder } from "@store/persistence/browser/connect-folder";

/**
 * Shown instead of the app when the data folder is chosen but the browser wants permission
 * again (it forgets it between visits). The click is what lets the browser ask.
 */
export function FolderReconnect({
  location,
  onReload = () => window.location.reload(),
}: {
  location: Extract<StorageLocation, { kind: "folder-locked" }>;
  /** What happens once the folder is allowed or given up (default: reload the page) */
  onReload?: () => void;
}): JSX.Element {
  const [error, setError] = useState<string>("");

  async function reconnect(): Promise<void> {
    setError("");
    try {
      if (!(await reconnectFolder(location.handle, onReload))) {
        setError("Access to the folder was not allowed.");
      }
    } catch {
      setError("The folder could not be opened. Is it still there?");
    }
  }

  async function switchToBrowser(): Promise<void> {
    await disconnectFolder();
    onReload();
  }

  return (
    <Box sx={{ maxWidth: 520, mx: "auto", p: 3, mt: 8 }}>
      <Typography component="h1" sx={{ fontSize: 20, fontWeight: 700, mb: 1 }}>
        Reconnect your data folder
      </Typography>
      <Typography variant="body2" sx={{ mb: 2 }}>
        Your data is kept in the folder “{location.name}”. The browser asks for
        permission to open it again each time you come back.
      </Typography>
      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}
      <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap" }}>
        <Button variant="contained" onClick={() => void reconnect()}>
          Reconnect folder
        </Button>
        <Button variant="outlined" onClick={() => void switchToBrowser()}>
          Stop using the folder
        </Button>
      </Box>
      <Typography
        variant="caption"
        sx={{ display: "block", mt: 1, color: "text.secondary" }}
      >
        Stopping does not delete anything in the folder. The app then uses the
        copy kept in this browser.
      </Typography>
    </Box>
  );
}
