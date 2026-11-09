import { Box, MenuItem, Select, Typography } from "@mui/material";
import {
  jobCountText,
  moveJobToTemplate,
} from "@pages/workspace/template-scope";
import { WORKSPACE_COLORS } from "@pages/workspace/workspace-tokens";
import { useAppDispatch, useAppSelector } from "@store/store-helper";
import {
  activeJobSelector,
  activeTemplateSelector,
  jobsSelector,
  templatesSelector,
} from "@store/jobs/jobs-slice";

/** The first thing of "Template & content": which template this job is drawn with */
export function TemplateBar(): JSX.Element {
  const dispatch = useAppDispatch();
  const job = useAppSelector(activeJobSelector);
  const jobs = useAppSelector(jobsSelector);
  const templates = useAppSelector(templatesSelector);
  const template = useAppSelector(activeTemplateSelector);

  return (
    <Box
      sx={{
        flex: "none",
        display: "flex",
        alignItems: "center",
        gap: 1.5,
        px: 2,
        py: 1,
        bgcolor: WORKSPACE_COLORS.panel,
        borderBottom: `1px solid ${WORKSPACE_COLORS.border}`,
      }}
    >
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
        sx={{ minWidth: 220 }}
      >
        {templates.map((t) => (
          <MenuItem key={t.id} value={t.id}>
            {t.name}
            <Box component="span" sx={{ ml: 1, opacity: 0.6, fontSize: 12 }}>
              {jobCountText(jobs.filter((j) => j.templateId === t.id).length)}
            </Box>
          </MenuItem>
        ))}
      </Select>
    </Box>
  );
}
