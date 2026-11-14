import { useState } from "react";
import { useViewport } from "@hooks/use-viewport";
import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  MenuItem,
  TextField,
} from "@components/ui";
import { nanoid } from "@reduxjs/toolkit";
import { activateTemplateLook } from "@hooks/use-sync-active-job";
import {
  jobCountText,
  nextTemplateName,
} from "@pages/workspace/template-scope";
import { useAppDispatch, useAppSelector } from "@store/store-helper";
import {
  activeTemplateSelector,
  addTemplate,
  createJob,
  jobsSelector,
  templatesSelector,
} from "@store/jobs/jobs-slice";
import { styleSelector } from "@store/cv-data/cv-data-slice";
import { vaultSelector } from "@store/vault/vault-slice";

const NEW_TEMPLATE = "__new__";

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

/** The form of the dialog; its state starts fresh each time the dialog opens */
function NewJobForm({ onClose }: { onClose: () => void }): JSX.Element {
  const dispatch = useAppDispatch();
  const vault = useAppSelector(vaultSelector);
  const style = useAppSelector(styleSelector);
  const templates = useAppSelector(templatesSelector);
  const jobs = useAppSelector(jobsSelector);
  const activeTemplate = useAppSelector(activeTemplateSelector);
  const [name, setName] = useState<string>("");
  const [choice, setChoice] = useState<string>(activeTemplate.id);
  const [templateName, setTemplateName] = useState<string>("");

  const isNew = choice === NEW_TEMPLATE;
  const chosen = templates.find((t) => t.id === choice);
  const sharedBy = jobs.filter((job) => job.templateId === choice).length;
  const canCreate =
    name.trim() !== "" && (!isNew || templateName.trim() !== "");

  function handleClose(): void {
    onClose();
  }

  function handleCreate(): void {
    let templateId = choice;
    if (isNew) {
      templateId = nanoid();
      dispatch(addTemplate({ id: templateId, name: templateName.trim() }));
    }
    dispatch(createJob({ vault, style, name: name.trim(), templateId }));
    // the editor shows the look of the template the new job uses
    activateTemplateLook(dispatch, chosen ?? activeTemplate);
    handleClose();
  }

  return (
    <>
      <DialogTitle id="new-job-title">New job</DialogTitle>
      <DialogContent
        sx={{ display: "flex", flexDirection: "column", gap: 2, pt: 1 }}
      >
        <DialogContentText>
          A job is one target, such as a company and role. It decides what is
          shown; its template decides how the CV looks.
        </DialogContentText>
        <TextField
          autoFocus
          label="New job name"
          placeholder="Company, role"
          value={name}
          onChange={(event) => setName(event.target.value)}
        />
        <TextField
          select
          label="Template"
          value={choice}
          onChange={(event) => {
            setChoice(event.target.value);
            if (event.target.value === NEW_TEMPLATE && !templateName) {
              setTemplateName(nextTemplateName(templates));
            }
          }}
          helperText={
            isNew
              ? `A copy of “${activeTemplate.name}” that only this job uses until you share it.`
              : `Shared with ${jobCountText(sharedBy)}: changing this template changes all of them.`
          }
        >
          {templates.map((template) => (
            <MenuItem key={template.id} value={template.id}>
              {template.name} (
              {jobCountText(
                jobs.filter((j) => j.templateId === template.id).length
              )}
              )
            </MenuItem>
          ))}
          <MenuItem value={NEW_TEMPLATE}>New template…</MenuItem>
        </TextField>
        {isNew && (
          <TextField
            label="New template name"
            value={templateName}
            onChange={(event) => setTemplateName(event.target.value)}
          />
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={handleClose}>Cancel</Button>
        <Button
          variant="contained"
          disabled={!canCreate}
          onClick={handleCreate}
        >
          Create job
        </Button>
      </DialogActions>
    </>
  );
}

/**
 * Asks for the name of a new job (company / role) and the template it uses. By default the
 * job shares the template of the job being edited, so a change of the look reaches both;
 * "New template" makes a template of its own (a copy of the current look) for it. The form
 * is mounted only while open, so it always starts from the job being edited now.
 */
export function NewJobDialog({ isOpen, onClose }: Props): JSX.Element {
  const isPhone = useViewport() === "phone";
  return (
    <Dialog
      open={isOpen}
      onClose={onClose}
      fullWidth
      fullScreen={isPhone}
      maxWidth="xs"
      aria-labelledby="new-job-title"
    >
      <NewJobForm onClose={onClose} />
    </Dialog>
  );
}
