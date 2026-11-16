import { useState } from "react";
import {
  Box,
  Button,
  CircularProgress,
  Tooltip,
  Typography,
} from "@components/ui";
import { FileDownloadOutlined as FileDownloadOutlinedIcon } from "@components/ui/icons";

interface Props {
  /** How many applications exist (all of them, whatever the search or filter shows) */
  count: number;
}

const PRIVACY_NOTE =
  "Exports every application, not only the rows shown: one ZIP with the data and the PDF that was sent, plus a summary. It contains personal data and your CVs. Nothing is sent to any AI or other service.";

/** "Export all": downloads one ZIP of every application, with a busy state and visible errors */
export function ExportAllButton({ count }: Props): JSX.Element {
  const [isBusy, setIsBusy] = useState<boolean>(false);
  const [message, setMessage] = useState<string>("");

  async function exportAll(): Promise<void> {
    setIsBusy(true);
    setMessage("");
    try {
      const response = await fetch("/api/applications/export");
      if (!response.ok) {
        const body = (await response.json().catch(() => null)) as {
          message?: string;
        } | null;
        throw new Error(body?.message ?? `Export failed (${response.status}).`);
      }
      const blob = await response.blob();
      const name =
        /filename="([^"]+)"/.exec(
          response.headers.get("Content-Disposition") ?? ""
        )?.[1] ?? "squeezy-cv-applications.zip";
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = name;
      link.click();
      URL.revokeObjectURL(url);
      const problems = Number(response.headers.get("X-Export-Problems") ?? 0);
      if (problems > 0) {
        setMessage(
          `${problems} application${problems === 1 ? "" : "s"} could not be exported whole. See index.json in the ZIP.`
        );
      }
    } catch (error: unknown) {
      setMessage(error instanceof Error ? error.message : "Export failed.");
    } finally {
      setIsBusy(false);
    }
  }

  const isDisabled = count === 0 || isBusy;
  return (
    <Box
      sx={{ display: "flex", flexDirection: "column", alignItems: "flex-end" }}
    >
      <Tooltip
        title={
          count === 0 ? "There are no applications to export." : PRIVACY_NOTE
        }
      >
        <span>
          <Button
            variant="outlined"
            size="medium"
            sx={{ height: 40 }}
            disabled={isDisabled}
            onClick={() => void exportAll()}
            startIcon={
              isBusy ? (
                <CircularProgress size={14} />
              ) : (
                <FileDownloadOutlinedIcon fontSize="small" />
              )
            }
          >
            {isBusy ? "Exporting…" : "Export all"}
          </Button>
        </span>
      </Tooltip>
      {message && (
        <Typography role="alert" sx={{ fontSize: 12, color: "error.main" }}>
          {message}
        </Typography>
      )}
    </Box>
  );
}
