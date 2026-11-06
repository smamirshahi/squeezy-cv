import { Box, Button, Chip } from "@mui/material";
import { useHasUnsavedChanges, useSaveActions } from "@hooks/use-persistence";
import { useAppSelector } from "@store/store-helper";

/** Shows whether the CV is saved on the local server, and saves it */
export function SaveStatus(): JSX.Element {
  const { status, message, isSaving, saveError } = useAppSelector(
    (s) => s.persistence
  );
  const hasUnsavedChanges = useHasUnsavedChanges();
  const { save, retry } = useSaveActions();

  let label = "Saved";
  let color: "success" | "warning" | "error" | "default" = "success";
  if (status === "loading") {
    label = "Loading…";
    color = "default";
  } else if (status === "offline") {
    label = "Server offline - not saved";
    color = "error";
  } else if (status === "error") {
    label = "Cannot read saved data";
    color = "error";
  } else if (saveError) {
    label = "Save failed";
    color = "error";
  } else if (isSaving) {
    label = "Saving…";
    color = "default";
  } else if (hasUnsavedChanges) {
    label = "Unsaved changes";
    color = "warning";
  }

  return (
    <Box
      sx={{
        display: "flex",
        alignItems: "center",
        gap: 1,
        mr: 2,
      }}
    >
      <Chip
        size="small"
        color={color}
        label={label}
        title={saveError || message}
      />
      {(status === "offline" || status === "error") && (
        <Button color="inherit" size="small" onClick={retry}>
          Retry
        </Button>
      )}
      <Button
        color="inherit"
        size="small"
        variant="outlined"
        disabled={status !== "ready" || isSaving || !hasUnsavedChanges}
        onClick={save}
      >
        Save
      </Button>
    </Box>
  );
}
