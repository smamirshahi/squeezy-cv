import { Alert, Box, Button, Typography } from "@mui/material";
import { styled } from "@mui/material/styles";
import { isVaultEmpty } from "@shared/vault/is-vault-empty";
import { useImportExportJson } from "@hooks/use-import-export-json";
import { useHasUnsavedChanges, useSaveActions } from "@hooks/use-persistence";
import { WORKSPACE_COLORS } from "@pages/workspace/workspace-tokens";
import { setSelectedSectionInEditorPage, setTool } from "@store/app/app-slice";
import { useAppDispatch, useAppSelector } from "@store/store-helper";
import { vaultSelector } from "@store/vault/vault-slice";

const HiddenInput = styled("input")({ display: "none" });

/** Under the top bar when the local server cannot be reached or its data cannot be read */
export function ConnectionBanner(): JSX.Element | null {
  const { status, message } = useAppSelector((s) => s.persistence);
  const hasUnsavedChanges = useHasUnsavedChanges();
  const { retry } = useSaveActions();
  const { handleExport } = useImportExportJson();

  if (status !== "offline" && status !== "error") {
    return null;
  }
  const isOffline = status === "offline";
  return (
    <Alert
      severity="error"
      sx={{ borderRadius: 0 }}
      action={
        <Box sx={{ display: "flex", gap: 1 }}>
          <Button color="inherit" size="small" onClick={retry}>
            Retry
          </Button>
          {hasUnsavedChanges && (
            <Button
              color="inherit"
              size="small"
              onClick={() => handleExport("cv-unsaved")}
            >
              Download as JSON
            </Button>
          )}
        </Box>
      }
    >
      <b>
        {isOffline
          ? "Can’t reach the local server."
          : "The saved data cannot be read."}
      </b>{" "}
      Saving is blocked so nothing saved is overwritten.
      {hasUnsavedChanges && " Your changes stay in this tab."}
      {message ? ` (${message})` : ""}
    </Alert>
  );
}

/** Shown on the canvas when there is nothing in the vault yet */
export function FirstRun(): JSX.Element | null {
  const dispatch = useAppDispatch();
  const vault = useAppSelector(vaultSelector);
  const { handleImport } = useImportExportJson();

  if (!isVaultEmpty(vault)) {
    return null;
  }
  return (
    <Box
      sx={{
        position: "absolute",
        inset: 0,
        zIndex: 2,
        bgcolor: WORKSPACE_COLORS.canvas,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <Box
        sx={{
          maxWidth: 420,
          bgcolor: WORKSPACE_COLORS.panel,
          p: 4,
          borderRadius: 2,
          display: "flex",
          flexDirection: "column",
          gap: 1.5,
          alignItems: "flex-start",
        }}
      >
        <Typography sx={{ fontSize: 18, fontWeight: 700 }}>
          Your vault is empty
        </Typography>
        <Typography sx={{ color: WORKSPACE_COLORS.muted }}>
          Add your facts once. Every CV is a view of them.
        </Typography>
        <Button component="label" variant="contained">
          Import JSON
          <HiddenInput type="file" accept=".json" onChange={handleImport} />
        </Button>
        <Button
          variant="outlined"
          onClick={() => {
            dispatch(setSelectedSectionInEditorPage("mainInfo"));
            dispatch(setTool("vault"));
          }}
        >
          Add your details by hand
        </Button>
      </Box>
    </Box>
  );
}
