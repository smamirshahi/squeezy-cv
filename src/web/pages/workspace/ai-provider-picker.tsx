import { Box, MenuItem, Select, Typography } from "@components/ui";
import { AiSettingsButton } from "@pages/workspace/ai-job-context";
import { AiProviderId, AiTask } from "@shared/ai/providers";
import { AiStatus, taskProvider } from "@store/persistence/api-client";
import { WORKSPACE_COLORS } from "@pages/workspace/workspace-tokens";

/**
 * Which AI a task uses, chosen where the task is. The same choice as in the AI settings dialog (the
 * server remembers it per task); a provider that is not set up is listed but cannot be picked.
 */
export function AiProviderPicker({
  status,
  task,
  label,
  onChange,
}: {
  status: AiStatus | null;
  task: AiTask;
  label: string;
  onChange: (task: AiTask, provider: AiProviderId) => void;
}): JSX.Element | null {
  const providers = status?.providers ?? [];
  if (!status || providers.length === 0) {
    return null;
  }
  const current = taskProvider(status, task).info.id;
  return (
    <Box
      sx={{ display: "flex", alignItems: "center", flexWrap: "wrap", gap: 1 }}
    >
      <Typography
        id={`ai-provider-label-${task}`}
        sx={{ fontSize: 12, color: WORKSPACE_COLORS.aiText }}
      >
        {label}
      </Typography>
      <Select
        size="small"
        value={current}
        labelId={`ai-provider-label-${task}`}
        sx={{ minWidth: 190, bgcolor: WORKSPACE_COLORS.panel, fontSize: 13 }}
        onChange={(event) => onChange(task, event.target.value)}
      >
        {providers.map((provider) => (
          <MenuItem
            key={provider.id}
            value={provider.id}
            disabled={!provider.isConfigured}
          >
            {provider.label} · {provider.isOnline ? "online" : "local"}
            {provider.isConfigured ? "" : " (not set up)"}
          </MenuItem>
        ))}
      </Select>
      <Box sx={{ flex: 1 }} />
      <AiSettingsButton task={task} />
    </Box>
  );
}
