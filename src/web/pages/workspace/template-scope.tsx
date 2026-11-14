import { Typography } from "@components/ui";
import { Template } from "@custom-types/template-types";
import { Job } from "@custom-types/job-types";
import { activateTemplateLook } from "@hooks/use-sync-active-job";
import { WORKSPACE_COLORS } from "@pages/workspace/workspace-tokens";
import { AppDispatch, useAppSelector } from "@store/store-helper";
import {
  editedTemplateSelector,
  jobsSelector,
  setJobTemplate,
} from "@store/jobs/jobs-slice";

/** "1 job" / "3 jobs" */
export function jobCountText(count: number): string {
  return `${count} ${count === 1 ? "job" : "jobs"}`;
}

export type TemplateSort = "newest" | "popular" | "alphabetic";

/** The templates in the order asked for; the list given is not changed. Ties keep their order. */
export function sortTemplates(
  templates: Template[],
  jobs: { templateId: string }[],
  sort: TemplateSort,
  isReversed = false
): Template[] {
  const count = (t: Template): number =>
    jobs.filter((j) => j.templateId === t.id).length;
  const sorted = [...templates];
  if (sort === "alphabetic") {
    sorted.sort((a, b) => a.name.localeCompare(b.name));
  } else if (sort === "popular") {
    sorted.sort((a, b) => count(b) - count(a));
  } else {
    // Newest first; templates without a date count as the oldest
    sorted.sort((a, b) => (b.createdAt ?? "").localeCompare(a.createdAt ?? ""));
  }
  return isReversed ? sorted.reverse() : sorted;
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

/** The template being edited (the active job's, unless the Templates pages name another) and how many jobs share it */
function useTemplateScope(): { template: Template; jobCount: number } {
  const template = useAppSelector(editedTemplateSelector);
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
