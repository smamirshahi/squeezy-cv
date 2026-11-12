import { useEffect, useMemo, useState } from "react";
import { Box, Button, MenuItem, Select, Typography } from "@mui/material";
import { moveJobToTemplate } from "@pages/workspace/template-scope";
import { WORKSPACE_COLORS } from "@pages/workspace/workspace-tokens";
import { createApiClient } from "@store/persistence/api-client";
import { useAppDispatch, useAppSelector } from "@store/store-helper";
import {
  activeJobSelector,
  activeTemplateSelector,
  templatesSelector,
} from "@store/jobs/jobs-slice";

/** The first thing of "Template & content": which template this job is drawn with */
export function TemplateBar({
  isOutlineOpen,
  onToggleOutline,
}: {
  isOutlineOpen: boolean;
  onToggleOutline: () => void;
}): JSX.Element {
  const dispatch = useAppDispatch();
  const job = useAppSelector(activeJobSelector);
  const templates = useAppSelector(templatesSelector);
  const template = useAppSelector(activeTemplateSelector);
  const api = useMemo(() => createApiClient(), []);
  // Applications are kept on the server, so how many used this template is asked for once
  const [applied, setApplied] = useState<{ templateId?: string }[] | null>(
    null
  );

  useEffect(() => {
    api
      .listApplications()
      .then(setApplied)
      .catch(() => setApplied(null));
  }, [api]);

  const appliedCount = (applied ?? []).filter(
    (entry) => entry.templateId === template.id
  ).length;

  return (
    <Box
      sx={{
        flex: "none",
        display: "flex",
        alignItems: "center",
        flexWrap: "wrap",
        gap: { xs: 1, lg: 1.5 },
        px: 2,
        py: 1,
        bgcolor: WORKSPACE_COLORS.panel,
        borderBottom: `1px solid ${WORKSPACE_COLORS.border}`,
      }}
    >
      <Button
        size="small"
        variant="contained"
        onClick={onToggleOutline}
        sx={{ minHeight: { xs: 44, md: "auto" } }}
      >
        {isOutlineOpen ? "Hide outline" : "Outline (O)"}
      </Button>
      <Typography sx={{ fontSize: 13, fontWeight: 600 }}>
        Select template
      </Typography>
      <Select
        size="small"
        value={template.id}
        aria-label="Template of this job"
        onChange={(event) => {
          const next = templates.find((t) => t.id === event.target.value);
          if (next) {
            moveJobToTemplate(dispatch, job, next, true);
          }
        }}
        renderValue={() => template.name}
        sx={{
          minWidth: { xs: 0, sm: 220 },
          flex: { xs: "1 1 160px", sm: "none" },
          "& .MuiSelect-select": { minHeight: { xs: 28, md: "auto" } },
        }}
      >
        {templates.map((t) => (
          <MenuItem key={t.id} value={t.id}>
            {t.name}
          </MenuItem>
        ))}
      </Select>
      {applied && (
        <Typography sx={{ fontSize: 12, color: WORKSPACE_COLORS.muted }}>
          {appliedCount} {appliedCount === 1 ? "job" : "jobs"} already applied
          with this template
        </Typography>
      )}
    </Box>
  );
}
