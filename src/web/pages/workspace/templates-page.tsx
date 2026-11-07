import { useState } from "react";
import {
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  TextField,
  Typography,
} from "@mui/material";
import { Template } from "@custom-types/template-types";
import {
  jobCountText,
  moveJobToTemplate,
  nextTemplateName,
} from "@pages/workspace/template-scope";
import { WORKSPACE_COLORS } from "@pages/workspace/workspace-tokens";
import { useAppDispatch, useAppSelector } from "@store/store-helper";
import {
  activeJobSelector,
  addTemplate,
  deleteTemplate,
  jobsSelector,
  renameTemplate,
  templatesSelector,
} from "@store/variants/variants-slice";
import { nanoid } from "@reduxjs/toolkit";

/** Why a template cannot be deleted, or an empty text when it can */
export function deleteBlockReason(
  jobNames: string[],
  templateCount: number
): string {
  if (jobNames.length > 0) {
    return `Used by ${jobCountText(jobNames.length)} (${jobNames.join(", ")}). Move ${jobNames.length === 1 ? "it" : "them"} to another template first.`;
  }
  if (templateCount <= 1) {
    return "This is the only template. There must always be one.";
  }
  return "";
}

/** One dialog for the two name questions: rename and delete confirmation share the shell */
type Asking =
  | { kind: "rename"; template: Template }
  | { kind: "delete"; template: Template }
  | null;

/**
 * The Templates area: every template with the jobs that use it. A template is how a CV looks
 * (layout, fonts, colours, margins, page limit, skill display, auto-fit); a job only decides
 * what is shown. Create, duplicate, rename and delete here; edit the look in the inspector
 * and on the Style Settings page, which say which template they change.
 */
export function TemplatesPage(): JSX.Element {
  const dispatch = useAppDispatch();
  const templates = useAppSelector(templatesSelector);
  const jobs = useAppSelector(jobsSelector);
  const activeJob = useAppSelector(activeJobSelector);
  const [newName, setNewName] = useState<string>("");
  const [asking, setAsking] = useState<Asking>(null);
  const [draftName, setDraftName] = useState<string>("");

  function create(): void {
    const name = newName.trim() || nextTemplateName(templates);
    dispatch(addTemplate({ id: nanoid(), name }));
    setNewName("");
  }

  return (
    <Box
      component="main"
      aria-label="Templates"
      sx={{
        flex: 1,
        minWidth: 0,
        overflow: "auto",
        p: 3,
        bgcolor: WORKSPACE_COLORS.canvas,
      }}
    >
      <>
        <Box sx={{ maxWidth: 760, mx: "auto" }}>
          <Typography component="h1" sx={{ fontSize: 18, fontWeight: 700 }}>
            Templates
          </Typography>
          <Typography sx={{ color: WORKSPACE_COLORS.muted, mb: 2 }}>
            A template is how a CV looks: layout, section order, fonts, colours,
            margins, page limit, skill display and auto-fit. Jobs that share a
            template always look the same, so changing a template changes all of
            its jobs. What each job shows is set per job.
          </Typography>
          <Box sx={{ display: "flex", gap: 1, mb: 2, alignItems: "center" }}>
            <TextField
              size="small"
              label="New template name"
              placeholder={nextTemplateName(templates)}
              value={newName}
              onChange={(event) => setNewName(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  create();
                }
              }}
              helperText="Starts as a copy of the look you are editing now."
              sx={{ minWidth: 260 }}
            />
            <Button variant="contained" onClick={create}>
              Create template
            </Button>
          </Box>
          <Box
            component="ul"
            aria-label="Templates"
            sx={{ listStyle: "none", m: 0, p: 0, display: "grid", gap: 1.5 }}
          >
            {templates.map((template) => {
              const users = jobs.filter((j) => j.templateId === template.id);
              const reason = deleteBlockReason(
                users.map((j) => j.name),
                templates.length
              );
              const isActive = template.id === activeJob.templateId;
              const reasonId = `delete-reason-${template.id}`;
              return (
                <Box
                  component="li"
                  key={template.id}
                  sx={{
                    border: `1px solid ${WORKSPACE_COLORS.border}`,
                    borderRadius: 1,
                    bgcolor: WORKSPACE_COLORS.panel,
                    p: 1.75,
                  }}
                >
                  <Box sx={{ display: "flex", alignItems: "baseline", gap: 1 }}>
                    <Typography sx={{ fontWeight: 700, fontSize: 15 }}>
                      {template.name}
                    </Typography>
                    <Typography
                      sx={{ fontSize: 12, color: WORKSPACE_COLORS.muted }}
                    >
                      {jobCountText(users.length)}
                      {isActive ? " · used by the job you are editing" : ""}
                    </Typography>
                  </Box>
                  <Typography
                    sx={{ fontSize: 12, color: WORKSPACE_COLORS.muted, mb: 1 }}
                  >
                    {users.length > 0
                      ? users.map((j) => j.name).join(", ")
                      : "No job uses it yet."}
                  </Typography>
                  <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap" }}>
                    <Button
                      size="small"
                      variant="outlined"
                      disabled={isActive}
                      aria-label={`Use template ${template.name} for ${activeJob.name}`}
                      onClick={() =>
                        moveJobToTemplate(dispatch, activeJob, template, true)
                      }
                    >
                      Use for “{activeJob.name}”
                    </Button>
                    <Button
                      size="small"
                      aria-label={`Rename template ${template.name}`}
                      onClick={() => {
                        setDraftName(template.name);
                        setAsking({ kind: "rename", template });
                      }}
                    >
                      Rename
                    </Button>
                    <Button
                      size="small"
                      aria-label={`Duplicate template ${template.name}`}
                      onClick={() =>
                        dispatch(
                          addTemplate({
                            id: nanoid(),
                            name: `${template.name} (copy)`,
                            sourceId: template.id,
                          })
                        )
                      }
                    >
                      Duplicate
                    </Button>
                    <Button
                      size="small"
                      color="error"
                      disabled={reason !== ""}
                      aria-label={`Delete template ${template.name}`}
                      aria-describedby={reason ? reasonId : undefined}
                      onClick={() => setAsking({ kind: "delete", template })}
                    >
                      Delete
                    </Button>
                  </Box>
                  {reason && (
                    <Typography
                      id={reasonId}
                      sx={{
                        fontSize: 12,
                        mt: 0.75,
                        color: WORKSPACE_COLORS.muted,
                      }}
                    >
                      Cannot be deleted: {reason}
                    </Typography>
                  )}
                </Box>
              );
            })}
          </Box>
        </Box>
      </>

      <Dialog
        open={asking?.kind === "rename"}
        onClose={() => setAsking(null)}
        fullWidth
        maxWidth="xs"
      >
        <DialogTitle>Rename template</DialogTitle>
        <DialogContent sx={{ pt: 1 }}>
          <TextField
            autoFocus
            fullWidth
            label="Template name"
            value={draftName}
            onChange={(event) => setDraftName(event.target.value)}
            sx={{ mt: 1 }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setAsking(null)}>Cancel</Button>
          <Button
            variant="contained"
            disabled={draftName.trim() === ""}
            onClick={() => {
              if (asking?.kind === "rename") {
                dispatch(
                  renameTemplate({
                    id: asking.template.id,
                    name: draftName.trim(),
                  })
                );
              }
              setAsking(null);
            }}
          >
            Save name
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={asking?.kind === "delete"} onClose={() => setAsking(null)}>
        <DialogTitle>Delete template?</DialogTitle>
        <DialogContent>
          <DialogContentText>
            “{asking?.template.name}” will be deleted. No job uses it, and your
            data (the vault) is not affected.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setAsking(null)}>Cancel</Button>
          <Button
            color="error"
            onClick={() => {
              if (asking?.kind === "delete") {
                dispatch(deleteTemplate({ id: asking.template.id }));
              }
              setAsking(null);
            }}
          >
            Delete template
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
