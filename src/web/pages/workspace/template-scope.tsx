import { Typography } from "@mui/material";
import { Template } from "@custom-types/template-types";
import { Job } from "@custom-types/job-types";
import { activateTemplateLook } from "@hooks/use-sync-active-job";
import { WORKSPACE_COLORS } from "@pages/workspace/workspace-tokens";
import { AppDispatch, useAppSelector } from "@store/store-helper";
import {
  activeTemplateSelector,
  jobsSelector,
  setJobTemplate,
} from "@store/jobs/jobs-slice";

/** "1 job" / "3 jobs" */
export function jobCountText(count: number): string {
  return `${count} ${count === 1 ? "job" : "jobs"}`;
}

/** The name for a new template: "Template 1", "Template 2", ... the first one not taken */
export function nextTemplateName(templates: Template[]): string {
  const names = new Set(templates.map((t) => t.name));
  let number = templates.length + 1;
  while (names.has(`Template ${number}`)) {
    number += 1;
  }
  return `Template ${number}`;
}

/** The template the active job uses and how many jobs share it */
export function useTemplateScope(): { template: Template; jobCount: number } {
  const template = useAppSelector(activeTemplateSelector);
  const jobs = useAppSelector(jobsSelector);
  return {
    template,
    jobCount: jobs.filter((job) => job.templateId === template.id).length,
  };
}

/** Moves a job to another template; when it is the job being edited, the editor shows the new look */
export function moveJobToTemplate(
  dispatch: AppDispatch,
  job: Job,
  template: Template,
  isActive: boolean
): void {
  dispatch(setJobTemplate({ jobId: job.id, templateId: template.id }));
  if (isActive) {
    activateTemplateLook(dispatch, template);
  }
}

/** Says which template the controls next to it change, and how many jobs that reaches */
export function TemplateScopeNote({
  verb = "Changes",
}: {
  verb?: string;
}): JSX.Element {
  const { template, jobCount } = useTemplateScope();
  return (
    <Typography
      role="note"
      sx={{
        fontSize: 12,
        p: 1,
        borderRadius: 1,
        bgcolor: WORKSPACE_COLORS.accentSoft,
        color: WORKSPACE_COLORS.accentText,
      }}
    >
      {verb} template “{template.name}”, used by {jobCountText(jobCount)}.
    </Typography>
  );
}
