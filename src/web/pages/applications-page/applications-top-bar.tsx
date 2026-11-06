import { useEffect, useMemo, useState } from "react";
import { Box, Button, Chip, Typography } from "@mui/material";
import MemoryIcon from "@mui/icons-material/Memory";
import { AI_PROVIDER_INFO } from "@shared/ai/providers";
import {
  AiStatus,
  createApiClient,
  taskProvider,
} from "@store/persistence/api-client";
import { WORKSPACE_COLORS } from "@pages/workspace/workspace-tokens";

export const APPLICATIONS_TOP_BAR_HEIGHT = 48;

/** The AI chip text ("Ollama · local"), or "" when the server's answer is not usable */
export function describeAiChip(status: AiStatus): string {
  if (!status || !(status.provider in AI_PROVIDER_INFO)) {
    return "";
  }
  const { info } = taskProvider(status, "tailor");
  return `${info.label} · ${info.isOnline ? "online" : "local"}`;
}

/**
 * The dark bar on top of the Applications pages (design B6): the app name, where you are,
 * the AI provider in use and the way back to the editor. Same look as the workspace bar.
 */
export function ApplicationsTopBar(): JSX.Element {
  const api = useMemo(() => createApiClient(), []);
  const [aiChip, setAiChip] = useState<string>("");

  useEffect(() => {
    let isCancelled = false;
    api
      .getAiStatus()
      .then((status) => {
        if (!isCancelled) {
          setAiChip(describeAiChip(status));
        }
      })
      .catch(() => undefined); // the chip is a hint; the page works without it
    return () => {
      isCancelled = true;
    };
  }, [api]);

  return (
    <Box
      component="header"
      sx={{
        height: APPLICATIONS_TOP_BAR_HEIGHT,
        flex: "none",
        display: "flex",
        alignItems: "center",
        gap: 1.5,
        px: 1.5,
        bgcolor: WORKSPACE_COLORS.bar,
        color: WORKSPACE_COLORS.barText,
      }}
    >
      <Typography sx={{ fontWeight: 700, fontSize: 14, mr: 0.5 }}>
        CV Builder
      </Typography>
      <Chip
        size="small"
        label="Applications"
        sx={{
          bgcolor: "rgba(255,255,255,.14)",
          color: WORKSPACE_COLORS.barText,
        }}
      />
      <Box sx={{ flex: 1 }} />
      {aiChip && (
        <Chip
          size="small"
          icon={<MemoryIcon />}
          label={aiChip}
          sx={{
            bgcolor: "rgba(255,255,255,.1)",
            color: WORKSPACE_COLORS.barText,
            "& .MuiChip-icon": { color: "inherit" },
          }}
        />
      )}
      <Button
        size="small"
        href="/"
        sx={{
          color: WORKSPACE_COLORS.barText,
          border: "1px solid rgba(255,255,255,.25)",
        }}
      >
        Back to the editor
      </Button>
    </Box>
  );
}
