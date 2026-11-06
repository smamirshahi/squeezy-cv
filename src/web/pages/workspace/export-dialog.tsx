import { useEffect, useMemo, useState } from "react";
import {
  Alert,
  Box,
  Button,
  Checkbox,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControlLabel,
  TextField,
  Typography,
} from "@mui/material";
import { useStore } from "react-redux";
import { exportChecks, suggestFileName } from "@shared/export/export-checks";
import { saveActiveVariant } from "@hooks/save-active-variant";
import { useImportExportJson } from "@hooks/use-import-export-json";
import { createApiClient } from "@store/persistence/api-client";
import { RootState, useAppSelector } from "@store/store-helper";
import { activeVariantSelector } from "@store/variants/variants-slice";
import { vaultSelector } from "@store/vault/vault-slice";

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

/**
 * Export PDF: saves the variant, asks the server for the real PDF and shows it before it
 * is downloaded, with the checks that matter for sending a CV.
 */
export function ExportDialog({ isOpen, onClose }: Props): JSX.Element {
  const store = useStore<RootState>();
  const api = useMemo(() => createApiClient(), []);
  const vault = useAppSelector(vaultSelector);
  const variant = useAppSelector(activeVariantSelector);
  const fit = useAppSelector((s) => s.app.fit);
  const { handleExport } = useImportExportJson();

  const [pdf, setPdf] = useState<{ blob: Blob; url: string } | null>(null);
  const [error, setError] = useState<string>("");
  const [fileName, setFileName] = useState<string>("");
  const [isAlsoJson, setIsAlsoJson] = useState<boolean>(false);

  // Make the PDF each time the dialog opens
  useEffect(() => {
    if (!isOpen) {
      return undefined;
    }
    let isCancelled = false;
    let url = "";
    setPdf(null);
    setError("");
    setFileName(suggestFileName(vault.profile.fullName, variant.name));
    void (async () => {
      try {
        const saved = await saveActiveVariant(store, api);
        const blob = await api.createPdf(saved.id);
        url = URL.createObjectURL(blob);
        if (!isCancelled) {
          setPdf({ blob, url });
        }
      } catch (caught) {
        if (!isCancelled) {
          setError(
            caught instanceof Error ? caught.message : "The PDF failed."
          );
        }
      }
    })();
    return () => {
      isCancelled = true;
      if (url) {
        URL.revokeObjectURL(url);
      }
    };
    // Only when it opens: the numbers below keep following the page
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  const hiddenItemCount = Object.values(variant.selection).filter(
    (choice) => choice.isVisible === false
  ).length;
  const checks = exportChecks({
    profile: vault.profile,
    pageCount: fit.pageCount,
    pageLimit: variant.pageLimit,
    usedPercent: fit.usedPercent,
    linesOver: fit.linesOver,
    hiddenItemCount,
  });

  function download(): void {
    if (!pdf) {
      return;
    }
    const link = document.createElement("a");
    link.href = pdf.url;
    link.download = `${fileName || "CV"}.pdf`;
    link.click();
    if (isAlsoJson) {
      handleExport(fileName || "CV");
    }
    onClose();
  }

  return (
    <Dialog open={isOpen} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>Export PDF · {variant.name}</DialogTitle>
      <DialogContent sx={{ display: "flex", gap: 3 }}>
        <Box
          sx={{
            width: 360,
            height: 500,
            flex: "none",
            bgcolor: "#D6D9DD",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          {pdf ? (
            <iframe
              title="PDF preview"
              src={pdf.url}
              style={{ width: "100%", height: "100%", border: 0 }}
            />
          ) : (
            !error && <CircularProgress aria-label="Making the PDF" />
          )}
        </Box>
        <Box sx={{ flex: 1, display: "flex", flexDirection: "column", gap: 2 }}>
          {error && <Alert severity="error">{error}</Alert>}
          <TextField
            label="File name"
            size="small"
            value={fileName}
            onChange={(event) => setFileName(event.target.value)}
            helperText="Saved with .pdf"
          />
          <Box>
            <Typography
              sx={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase" }}
            >
              Checks
            </Typography>
            {checks.map((check) => (
              <Box
                key={check.id}
                sx={{ py: 0.75, borderTop: "1px solid #DDE0E4" }}
              >
                <Typography sx={{ fontWeight: 600, fontSize: 14 }}>
                  {check.level === "ok" ? "✓" : "⚠"} {check.title}
                </Typography>
                <Typography sx={{ fontSize: 12, color: "text.secondary" }}>
                  {check.detail}
                </Typography>
              </Box>
            ))}
          </Box>
          <FormControlLabel
            control={
              <Checkbox
                checked={isAlsoJson}
                onChange={(event) => setIsAlsoJson(event.target.checked)}
              />
            }
            label="Also save the data (.json) with the PDF"
          />
          <Typography sx={{ fontSize: 12, color: "text.secondary" }}>
            Made on this computer. To record the job, use “Mark as applied”.
          </Typography>
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button variant="contained" disabled={!pdf} onClick={download}>
          Download PDF
        </Button>
      </DialogActions>
    </Dialog>
  );
}
