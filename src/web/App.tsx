import { Box } from "@mui/material";
import { useRef } from "react";
import { ApplicationView } from "@pages/applications-page/application-view";
import { PrintView } from "@pages/print-page/print-view";
import { EditorPage } from "@pages/editor-page/editor-page";
import { PreviewPage } from "@pages/preview-page/preview-page";
import { useSyncStructure } from "@hooks/use-sync-structure";
import { usePersistence } from "@hooks/use-persistence";
import { useSyncActiveVariant } from "@hooks/use-sync-active-variant";

/** The editor with the preview next to it */
function EditorApp(): JSX.Element {
  const contentRef = useRef<HTMLDivElement>(null);
  useSyncStructure();
  useSyncActiveVariant();
  usePersistence();

  return (
    <Box
      sx={{
        width: "100%",
        boxSizing: "border-box",
        display: "flex",
        // Side by side on wide screens, stacked on narrow ones
        flexWrap: "wrap",
        gap: 2,
        padding: 2,
        justifyContent: "center",
        alignItems: "flex-start",
        overflowX: "auto",
        backgroundColor: "#f0f0f0",
      }}
    >
      <EditorPage contentRef={contentRef} />
      <PreviewPage contentRef={contentRef} />
    </Box>
  );
}

/**
 * Which page to show, from the address: `?print=<variantId>` is the print-only page,
 * `?application=<id>` one application, anything else the editor.
 */
export function App(): JSX.Element {
  const params = new URLSearchParams(window.location.search);
  const printVariantId = params.get("print");
  const applicationId = params.get("application");
  if (printVariantId) {
    return <PrintView variantId={printVariantId} />;
  }
  if (applicationId) {
    return <ApplicationView applicationId={applicationId} />;
  }
  return <EditorApp />;
}
