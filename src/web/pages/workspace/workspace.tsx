import { useEffect, useRef, useState } from "react";
import { Box, Button } from "@mui/material";
import { AiSetup } from "@pages/workspace/ai-setup";
import { VaultPage } from "@pages/workspace/vault-page";
import { AiAssistant } from "@pages/ai-page/ai-assistant";
import { PreviewPage } from "@pages/preview-page/preview-page";
import { useUndoShortcuts } from "@pages/workspace/use-undo-shortcuts";
import { useCanvasShortcuts } from "@pages/workspace/use-canvas-shortcuts";
import { ZoomControls, ZoomFrame } from "@pages/workspace/canvas-zoom";
import { Outline } from "@pages/workspace/outline";
import { ChatPanel } from "@pages/workspace/chat-panel";
import { BlockToolbar } from "@pages/workspace/block-toolbar";
import { Inspector } from "@pages/workspace/inspector";
import { ConnectionBanner, FirstRun } from "@pages/workspace/workspace-states";
import { TemplatesPage } from "@pages/workspace/templates-page";
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
  const canvasRef = useRef<HTMLElement>(null);
  const tool = useAppSelector((s) => s.app.tool);
  const zoom = useAppSelector((s) => s.app.canvasZoom);
  useCanvasShortcuts(tool === "variants");
  useUndoShortcuts();
  const [isOutlineOpen, setIsOutlineOpen] = useState<boolean>(false);
  // "O" opens and closes the outline, unless the user is typing
  useEffect(() => {
    function onKey(event: KeyboardEvent): void {
      const target = event.target as HTMLElement;
      const isTyping =
        ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName) ||
        target.isContentEditable;
      if (
        event.key.toLowerCase() === "o" &&
        !isTyping &&
        !event.metaKey &&
        !event.ctrlKey &&
        !event.altKey
      ) {
        setIsOutlineOpen((wasOpen) => !wasOpen);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);
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
      <ConnectionBanner />
      <Box sx={{ flex: 1, minHeight: 0, display: "flex" }}>
        <ToolRail />
        {(tool === "variants" || tool === "chat") && (
          <>
            {isOutlineOpen && (
              <Outline onClose={() => setIsOutlineOpen(false)} />
            )}
            <Box
              component="main"
              aria-label="Canvas"
              ref={canvasRef}
              sx={{
                flex: 1,
                minWidth: 0,
                overflow: "auto",
                bgcolor: WORKSPACE_COLORS.canvas,
                py: 3,
                display: "flex",
                justifyContent: "center",
                position: "relative",
              }}
            >
              <FirstRun />
              <Button
                size="small"
                variant="contained"
                onClick={() => setIsOutlineOpen((wasOpen) => !wasOpen)}
                sx={{ position: "absolute", left: 12, top: 12, zIndex: 3 }}
              >
                {isOutlineOpen ? "Hide outline" : "Outline (O)"}
              </Button>
              <ZoomControls
                getCanvasWidth={() => canvasRef.current?.clientWidth ?? 0}
              />
              <ZoomFrame zoom={zoom}>
                <PreviewPage contentRef={contentRef} />
              </ZoomFrame>
              <BlockToolbar canvasRef={canvasRef} />
            </Box>
            {tool === "chat" ? <ChatPanel /> : <Inspector />}
          </>
        )}
        {tool === "templates" && <TemplatesPage />}
        {tool === "vault" && <VaultPage />}
        {tool === "tailor" && <AiAssistant />}
        {tool === "ai" && <AiSetup />}
      </Box>
    </Box>
  );
}
