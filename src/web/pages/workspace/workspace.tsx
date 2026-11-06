import { useRef } from "react";
import { Box } from "@mui/material";
import { VaultPage } from "@pages/workspace/vault-page";
import { AiAssistant } from "@pages/ai-page/ai-assistant";
import { PreviewPage } from "@pages/preview-page/preview-page";
import { Inspector } from "@pages/workspace/inspector";
import { ToolRail } from "@pages/workspace/tool-rail";
import { TopBar } from "@pages/workspace/top-bar";
import { WORKSPACE_COLORS } from "@pages/workspace/workspace-tokens";
import { useSyncStructure } from "@hooks/use-sync-structure";
import { usePersistence } from "@hooks/use-persistence";
import { useSyncActiveVariant } from "@hooks/use-sync-active-variant";
import { useAppSelector } from "@store/store-helper";

/**
 * The editor (design B): top bar, tool rail, the CV on a canvas and an inspector that
 * follows what is clicked. Vault and Tailor open the existing pages in the same frame.
 */
export function Workspace(): JSX.Element {
  const contentRef = useRef<HTMLDivElement>(null);
  const tool = useAppSelector((s) => s.app.tool);
  useSyncStructure();
  useSyncActiveVariant();
  usePersistence();

  return (
    <Box
      sx={{
        width: "100vw",
        height: "100vh",
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
      }}
    >
      <TopBar />
      <Box sx={{ flex: 1, minHeight: 0, display: "flex" }}>
        <ToolRail />
        {tool === "variants" && (
          <>
            <Box
              component="main"
              aria-label="Canvas"
              sx={{
                flex: 1,
                minWidth: 0,
                overflow: "auto",
                bgcolor: WORKSPACE_COLORS.canvas,
                py: 3,
                display: "flex",
                justifyContent: "center",
              }}
            >
              <PreviewPage contentRef={contentRef} />
            </Box>
            <Inspector />
          </>
        )}
        {tool === "vault" && <VaultPage />}
        {tool === "tailor" && <AiAssistant />}
      </Box>
    </Box>
  );
}
