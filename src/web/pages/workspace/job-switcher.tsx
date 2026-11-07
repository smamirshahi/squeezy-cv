import { useState } from "react";
import { Box, Button, MenuItem, Select, Typography } from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import { activateVariant } from "@hooks/use-sync-active-job";
import { NewJobDialog } from "@pages/workspace/new-job-dialog";
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
  variantsSelector,
} from "@store/jobs/jobs-slice";

const SELECT_SX = {
  color: WORKSPACE_COLORS.barText,
  height: 32,
  fontSize: 13,
  "& fieldset": { borderColor: "rgba(255,255,255,.25)" },
  "& svg": { color: WORKSPACE_COLORS.barText },
} as const;

const CAPTION_SX = {
  fontSize: 11,
  color: WORKSPACE_COLORS.barText,
  opacity: 0.7,
} as const;

/**
 * The top bar's switcher: choose the job being edited, see which template it uses and
 * change that, or start a new job.
 */
export function JobSwitcher(): JSX.Element {
  const dispatch = useAppDispatch();
  const variants = useAppSelector(variantsSelector);
  const job = useAppSelector(activeJobSelector);
  const jobs = useAppSelector(jobsSelector);
  const templates = useAppSelector(templatesSelector);
  const template = useAppSelector(activeTemplateSelector);
  const [isNewOpen, setIsNewOpen] = useState<boolean>(false);

  return (
    <>
      <Typography component="span" sx={CAPTION_SX}>
        Job
      </Typography>
      <Select
        size="small"
        value={job.id}
        aria-label="Switch job"
        onChange={(event) => {
          const next = variants.find((v) => v.id === event.target.value);
          if (next) {
            activateVariant(dispatch, next);
          }
        }}
        sx={{ ...SELECT_SX, minWidth: 150 }}
      >
        {jobs.map((j) => (
          <MenuItem key={j.id} value={j.id}>
            {j.name}
          </MenuItem>
        ))}
      </Select>
      <Typography component="span" sx={CAPTION_SX}>
        Template
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
        sx={{ ...SELECT_SX, minWidth: 110 }}
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
      <Button
        size="small"
        startIcon={<AddIcon />}
        onClick={() => setIsNewOpen(true)}
        sx={{ borderColor: "rgba(255,255,255,.3)" }}
        variant="outlined"
      >
        New job
      </Button>
      <NewJobDialog isOpen={isNewOpen} onClose={() => setIsNewOpen(false)} />
    </>
  );
}
