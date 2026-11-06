import { useEffect, useMemo, useState } from "react";
import { Box, Chip, Radio, Typography } from "@mui/material";
import { WORKSPACE_COLORS } from "@pages/workspace/workspace-tokens";
import { createApiClient } from "@store/persistence/api-client";

interface ProviderCard {
  id: "claude" | "ollama";
  title: string;
  tag: string;
  detail: string;
}

const PROVIDERS: ProviderCard[] = [
  {
    id: "claude",
    title: "Claude",
    tag: "cloud · paid",
    detail: "Masked text goes to Anthropic. Billed per use.",
  },
  {
    id: "ollama",
    title: "Ollama",
    tag: "local · free",
    detail: "Runs on this computer. Nothing leaves it.",
  },
];

/** The AI provider in use and what is sent, masked and never sent (design B7) */
export function AiSetup(): JSX.Element {
  const api = useMemo(() => createApiClient(), []);
  const [status, setStatus] = useState<{
    isConfigured: boolean;
    provider: "claude" | "ollama";
  } | null>(null);

  useEffect(() => {
    api
      .getAiStatus()
      .then(setStatus)
      .catch(() => setStatus(null));
  }, [api]);

  return (
    <Box
      sx={{
        flex: 1,
        overflow: "auto",
        p: 3,
        bgcolor: WORKSPACE_COLORS.canvas,
      }}
    >
      <Box
        sx={{
          maxWidth: 640,
          bgcolor: WORKSPACE_COLORS.panel,
          p: 3,
          borderRadius: 1,
          display: "flex",
          flexDirection: "column",
          gap: 1.5,
        }}
      >
        <Typography sx={{ fontSize: 16, fontWeight: 700 }}>
          AI provider and privacy
        </Typography>
        {PROVIDERS.map((provider) => {
          const isCurrent = status?.provider === provider.id;
          return (
            <Box
              key={provider.id}
              sx={{
                display: "flex",
                gap: 1,
                p: 1.5,
                border: `1px solid ${isCurrent ? WORKSPACE_COLORS.accent : WORKSPACE_COLORS.border}`,
                borderRadius: 1,
              }}
            >
              <Radio
                checked={isCurrent}
                disabled
                inputProps={{ "aria-label": provider.title }}
              />
              <Box>
                <Box sx={{ display: "flex", gap: 1, alignItems: "center" }}>
                  <Typography fontWeight="bold">{provider.title}</Typography>
                  <Chip size="small" label={provider.tag} />
                  {isCurrent && !status?.isConfigured && (
                    <Chip size="small" color="warning" label="not set up" />
                  )}
                </Box>
                <Typography sx={{ fontSize: 12.5, color: "text.secondary" }}>
                  {provider.detail}
                </Typography>
              </Box>
            </Box>
          );
        })}
        <Typography sx={{ fontSize: 12.5, color: "text.secondary" }}>
          The provider is chosen in the <code>.env</code> file (
          <code>AI_PROVIDER=claude</code> or <code>ollama</code>); restart the
          server after changing it. Choosing it here, and online versus offline
          per task, is planned.
        </Typography>
        <Box
          sx={{
            p: 1.5,
            border: `1px solid ${WORKSPACE_COLORS.border}`,
            borderRadius: 1,
            lineHeight: 1.7,
            fontSize: 13,
          }}
        >
          <b>Before anything is sent</b>
          <br />
          <b>Sent:</b> the job advert, bullet text, tags, titles, employer and
          school names, dates
          <br />
          <b>Masked:</b> your name → [Candidate Name], email → [Email], phone →
          [Phone Number], address → [Address], links → [Link n]
          <br />
          <b>Never sent:</b> PDF files, your saved data files
          <br />
          On the Tailor page, “Preview the exact request” shows the real
          messages.
        </Box>
      </Box>
    </Box>
  );
}
