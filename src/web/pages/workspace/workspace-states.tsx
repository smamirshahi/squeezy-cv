import { Alert, Box, Button, Typography } from "@mui/material";
import { styled } from "@mui/material/styles";
import { useState } from "react";
import { AiButton } from "@components/ai-button";
import { ImportCvDialog } from "@pages/workspace/import-cv-dialog";
import { isVaultEmpty } from "@shared/vault/is-vault-empty";
import { useImportExportJson } from "@hooks/use-import-export-json";
import { useHasUnsavedChanges, useSaveActions } from "@hooks/use-persistence";
import { WORKSPACE_COLORS } from "@pages/workspace/workspace-tokens";
import { navigate } from "@hooks/navigation";
import { startDemo } from "@store/persistence/persistence-actions";
import { useAppDispatch, useAppSelector } from "@store/store-helper";
import { vaultSelector } from "@store/vault/vault-slice";

/** On a phone the message and its buttons stack instead of squeezing each other */
const BANNER_WRAP_SX = {
  flexWrap: { xs: "wrap", sm: "nowrap" },
  "& .MuiAlert-message": { minWidth: 0, overflowWrap: "anywhere" },
  "& .MuiAlert-action": {
    ml: { xs: 4.5, sm: "auto" },
    pt: { xs: 0, sm: 0.5 },
    flexWrap: "wrap",
  },
} as const;

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
      sx={{ borderRadius: 0, ...BANNER_WRAP_SX }}
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

/** Under the top bar while the built-in demo CV is shown: fake data, nothing is saved */
export function DemoBanner(): JSX.Element | null {
  const status = useAppSelector((s) => s.persistence.status);
  const dispatch = useAppDispatch();
  const { retry } = useSaveActions();

  if (status !== "demo") {
    return null;
  }
  return (
    <Alert
      severity="info"
      sx={{ borderRadius: 0, ...BANNER_WRAP_SX }}
      action={
        <Box sx={{ display: "flex", gap: 1 }}>
          <Button
            color="inherit"
            size="small"
            onClick={() => startDemo(dispatch)}
          >
            Reset demo
          </Button>
          <Button color="inherit" size="small" onClick={retry}>
            Leave demo
          </Button>
        </Box>
      }
    >
      <b>Demo.</b> This is made-up data kept in this tab only. Nothing is saved,
      your own data is not touched, and PDF export and AI actions are not
      available. Leave the demo to go back to your own data.
    </Alert>
  );
}

/** Shown on the canvas when there is nothing in the vault yet */
export function FirstRun(): JSX.Element | null {
  const vault = useAppSelector(vaultSelector);
  const { handleImport } = useImportExportJson();
  const dispatch = useAppDispatch();
  const [isImportOpen, setIsImportOpen] = useState<boolean>(false);

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
        alignItems: { xs: "flex-start", sm: "center" },
        justifyContent: "center",
        overflow: "auto",
        p: { xs: 2, sm: 0 },
      }}
    >
      <Box
        sx={{
          maxWidth: 420,
          width: { xs: "100%", sm: "auto" },
          boxSizing: "border-box",
          bgcolor: WORKSPACE_COLORS.panel,
          p: { xs: 3, sm: 4 },
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
        <AiButton variant="contained" onClick={() => setIsImportOpen(true)}>
          Paste CV text, AI sorts it
        </AiButton>
        <ImportCvDialog
          isOpen={isImportOpen}
          onClose={() => setIsImportOpen(false)}
        />
        <Button component="label" variant="outlined">
          Import JSON
          <HiddenInput type="file" accept=".json" onChange={handleImport} />
        </Button>
        <Button variant="outlined" onClick={() => startDemo(dispatch)}>
          Try with demo data
        </Button>
        <Button
          variant="outlined"
          onClick={() => {
            navigate({ kind: "vault", sectionId: "mainInfo" });
          }}
        >
          Add your details by hand
        </Button>
      </Box>
    </Box>
  );
}
