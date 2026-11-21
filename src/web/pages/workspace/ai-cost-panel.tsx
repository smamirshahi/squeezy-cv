import { useEffect, useState } from "react";
import { Box, Button, Chip, Paper, Typography } from "@components/ui";
import {
  formatPriceDate,
  formatTokens,
  formatUsd,
  priceOf,
} from "@shared/ai/pricing";
import {
  AI_TASKS,
  AI_TASK_LABELS,
  CLAUDE_TASK_MODELS,
} from "@shared/ai/providers";
import { WORKSPACE_COLORS } from "@pages/workspace/workspace-tokens";
import { AiStatus } from "@store/persistence/api-client";
import {
  AiUsageEntry,
  clearAiUsage,
  monthTotal,
  readAiUsage,
  subscribeAiUsage,
} from "@store/persistence/ai-usage-log";

const SHOWN_ENTRIES = 15;

function timeOf(iso: string): string {
  return new Date(iso).toLocaleString(undefined, {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function modelLabel(model: string | undefined): string {
  return model ?? "unknown model";
}

/**
 * "Cost and usage" in the AI settings (#551): which model each task uses and what it costs per
 * million tokens, this month's total and the latest requests. The numbers come from the token
 * counts the provider reports; they are kept in this browser only.
 */
export function AiCostPanel({
  status,
}: {
  status: AiStatus | null;
}): JSX.Element {
  const [entries, setEntries] = useState<AiUsageEntry[]>(() => readAiUsage());
  useEffect(() => subscribeAiUsage(() => setEntries(readAiUsage())), []);
  const month = monthTotal(entries);

  return (
    <>
      <Typography sx={{ fontSize: 13 }}>
        Every AI request has a price. The Send to AI window shows an estimate
        before you send; after the answer arrives, the real cost is shown and
        added here. Prices are the providers' list prices as of{" "}
        {formatPriceDate()}; the log stays in this browser.
      </Typography>

      <Paper
        sx={{
          p: 2,
          bgcolor: WORKSPACE_COLORS.aiSoft,
          border: `1px solid ${WORKSPACE_COLORS.aiBorder}`,
        }}
      >
        <Typography sx={{ fontSize: 12, color: WORKSPACE_COLORS.muted }}>
          This month
        </Typography>
        <Typography sx={{ fontSize: 26, fontWeight: 700 }}>
          {formatUsd(month.usd)}
        </Typography>
        <Typography sx={{ fontSize: 12, color: WORKSPACE_COLORS.muted }}>
          {entries.length === 0
            ? "No AI requests recorded yet."
            : `${entries.length} recorded ${entries.length === 1 ? "request" : "requests"}`}
          {month.unpriced > 0
            ? ` · ${month.unpriced} without a known price are not counted`
            : ""}
        </Typography>
      </Paper>

      <Box role="group" aria-label="Model per task">
        <Typography sx={{ fontWeight: 700, fontSize: 15, mb: 1 }}>
          Model per task
        </Typography>
        <Box sx={{ display: "grid", gap: 0.75 }}>
          {AI_TASKS.map((task) => {
            const model =
              status?.usedModels?.[task] ?? CLAUDE_TASK_MODELS[task];
            const price = priceOf(model);
            return (
              <Box
                key={task}
                sx={{
                  display: "flex",
                  gap: 1,
                  alignItems: "baseline",
                  flexWrap: "wrap",
                }}
              >
                <Typography sx={{ fontSize: 13, minWidth: 170 }}>
                  {AI_TASK_LABELS[task]}
                </Typography>
                <Chip
                  size="small"
                  variant="outlined"
                  label={modelLabel(model)}
                />
                <Typography
                  sx={{ fontSize: 12, color: WORKSPACE_COLORS.muted }}
                >
                  {price
                    ? `$${price.input} in / $${price.output} out per million tokens${
                        price.hasFreeTier ? " · free tier available" : ""
                      }`
                    : "no known price"}
                </Typography>
              </Box>
            );
          })}
        </Box>
        <Typography sx={{ mt: 1, fontSize: 12, color: WORKSPACE_COLORS.muted }}>
          Small tasks use the cheapest model at low effort (little thinking);
          the rest use a mid-size one at medium effort. Thinking is billed like
          the answer, so this keeps requests cheap. Change a model on the task's
          own page.
        </Typography>
      </Box>

      <Box role="group" aria-label="Latest requests">
        <Box sx={{ display: "flex", alignItems: "center", mb: 1 }}>
          <Typography sx={{ fontWeight: 700, fontSize: 15, flex: 1 }}>
            Latest requests
          </Typography>
          {entries.length > 0 && (
            <Button size="small" onClick={clearAiUsage}>
              Clear the log
            </Button>
          )}
        </Box>
        {entries.slice(0, SHOWN_ENTRIES).map((entry) => (
          <Box
            key={`${entry.at}-${entry.what}`}
            sx={{
              display: "flex",
              gap: 1,
              py: 0.5,
              fontSize: 12.5,
              borderTop: `1px solid ${WORKSPACE_COLORS.border}`,
            }}
          >
            <Box sx={{ flex: 1, minWidth: 0 }}>
              <b>{entry.what}</b>
              <Box component="span" sx={{ color: WORKSPACE_COLORS.muted }}>
                {" "}
                · {modelLabel(entry.model)} · {timeOf(entry.at)}
              </Box>
            </Box>
            <Box sx={{ color: WORKSPACE_COLORS.muted, whiteSpace: "nowrap" }}>
              {formatTokens(entry.inputTokens)} in /{" "}
              {formatTokens(entry.outputTokens)} out
            </Box>
            <Box sx={{ minWidth: 56, textAlign: "right", fontWeight: 600 }}>
              {entry.costUsd === undefined ? "n/a" : formatUsd(entry.costUsd)}
            </Box>
          </Box>
        ))}
      </Box>
    </>
  );
}
