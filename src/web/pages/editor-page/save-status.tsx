import { Box, Button, Chip } from "@components/ui";
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
        gap: { xs: 0.5, md: 1 },
        minWidth: 0,
      }}
    >
      <Chip
        size="small"
        color={color}
        label={label}
        sx={{ maxWidth: { xs: 132, md: "none" } }}
        title={saveError || message}
      />
      {(status === "offline" || status === "error") && (
        <Button color="neutral" size="small" onClick={retry}>
          Retry
        </Button>
      )}
      {/* Only there when there is something to save, so the saved state takes no room */}
      {status === "ready" && (hasUnsavedChanges || isSaving) && (
        <Button
          color="neutral"
          size="small"
          variant="outlined"
          disabled={isSaving}
          onClick={save}
        >
          Save
        </Button>
      )}
    </Box>
  );
}
