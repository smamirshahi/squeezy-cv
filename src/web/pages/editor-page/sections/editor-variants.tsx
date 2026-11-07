import { useState } from "react";
import {
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  FormControlLabel,
  MenuItem,
  Switch,
  TextField,
  Typography,
} from "@mui/material";
import { FitMode } from "@custom-types/variant-types";
import { activateVariant } from "@hooks/use-sync-active-variant";
import { VariantSectionItems } from "@pages/editor-page/sections/variant-section-items";
import { NewJobDialog } from "@pages/workspace/new-job-dialog";
import {
  TemplateScopeNote,
  moveJobToTemplate,
} from "@pages/workspace/template-scope";
import { useAppDispatch, useAppSelector } from "@store/store-helper";
import {
  activeVariantSelector,
  templatesSelector,
  activeJobSelector,
  activeTemplateSelector,
  deleteVariant,
  duplicateVariant,
  renameVariant,
  setAutoFit,
  setPageLimit,
  variantsSelector,
} from "@store/variants/variants-slice";
import { sectionsSelector } from "@store/vault/vault-slice";

/**
 * Creates, switches, renames and deletes jobs, and chooses per job which items
 * and bullets are shown, in which order and wording. Changes apply at once and never
 * change the vault.
 */
export function EditorVariants(): JSX.Element {
  const dispatch = useAppDispatch();
  const sections = useAppSelector(sectionsSelector);
  const variants = useAppSelector(variantsSelector);
  const variant = useAppSelector(activeVariantSelector);
  const [isDeleting, setIsDeleting] = useState<boolean>(false);
  const [isNewOpen, setIsNewOpen] = useState<boolean>(false);
  const templates = useAppSelector(templatesSelector);
  const template = useAppSelector(activeTemplateSelector);
  const job = useAppSelector(activeJobSelector);

  function handleSwitch(id: string): void {
    const next = variants.find((v) => v.id === id);
    if (next) {
      activateVariant(dispatch, next);
    }
  }

  function handleDuplicate(): void {
    // The copy shares the template, so the editor already shows its look
    dispatch(duplicateVariant({ sourceId: variant.id }));
  }

  return (
    <>
      <Typography variant="h6" sx={{ mb: 1 }}>
        Jobs
      </Typography>
      <Typography variant="body2" sx={{ mb: 2 }}>
        A job is one target for your CV, such as a company and role. Hiding or
        reordering here only changes the job, never your data. Changes apply at
        once. How the CV looks is set by the job&apos;s template.
      </Typography>

      <Box
        sx={{
          display: "flex",
          gap: 1,
          alignItems: "center",
          flexWrap: "wrap",
        }}
      >
        <TextField
          select
          label="Active job"
          value={variant.id}
          onChange={(event) => handleSwitch(event.target.value)}
          sx={{ minWidth: 220 }}
        >
          {variants.map((v) => (
            <MenuItem key={v.id} value={v.id}>
              {v.name || "(unnamed)"}
            </MenuItem>
          ))}
        </TextField>
        <TextField
          label="Job name"
          value={variant.name}
          onChange={(event) =>
            dispatch(
              renameVariant({ id: variant.id, name: event.target.value })
            )
          }
          sx={{ flexGrow: 1 }}
        />
        <Button onClick={() => setIsNewOpen(true)}>New job</Button>
        <Button onClick={handleDuplicate}>Duplicate job</Button>
        <Button
          color="error"
          disabled={variants.length <= 1}
          onClick={() => setIsDeleting(true)}
        >
          Delete job
        </Button>
      </Box>

      <Box sx={{ mt: 2, display: "flex", flexDirection: "column", gap: 1 }}>
        <TemplateScopeNote verb="The template and the two settings below: changes" />
        <TextField
          select
          label="Template of this job"
          value={template.id}
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
            </MenuItem>
          ))}
        </TextField>
        <TextField
          select
          label="Page limit"
          value={variant.pageLimit}
          onChange={(event) =>
            dispatch(
              setPageLimit({
                id: variant.id,
                pageLimit: Number(event.target.value),
              })
            )
          }
          sx={{ minWidth: 160 }}
        >
          <MenuItem value={1}>1 page</MenuItem>
          <MenuItem value={2}>2 pages</MenuItem>
        </TextField>
      </Box>

      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          gap: 2,
          mt: 1,
        }}
      >
        <FormControlLabel
          label="Auto-fit to the page limit"
          control={
            <Switch
              checked={variant.isAutoFit ?? false}
              onChange={(event) =>
                dispatch(
                  setAutoFit({
                    id: variant.id,
                    isAutoFit: event.target.checked,
                  })
                )
              }
            />
          }
        />
        <TextField
          select
          size="small"
          label="Auto-fit mode"
          disabled={!variant.isAutoFit}
          value={variant.fitMode ?? "fit"}
          onChange={(event) =>
            dispatch(
              setAutoFit({
                id: variant.id,
                isAutoFit: true,
                fitMode: event.target.value as FitMode,
              })
            )
          }
          sx={{ minWidth: 200 }}
        >
          <MenuItem value="fit">Shrink to fit</MenuItem>
          <MenuItem value="fill">Fill the page</MenuItem>
        </TextField>
      </Box>

      {sections.map((section) => (
        <VariantSectionItems key={section.id} section={section} />
      ))}

      <Dialog open={isDeleting} onClose={() => setIsDeleting(false)}>
        <DialogTitle>Delete job?</DialogTitle>
        <DialogContent>
          <DialogContentText>
            &quot;{variant.name}&quot; will be deleted. Its template and your
            data (the vault) are not affected.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setIsDeleting(false)}>Cancel</Button>
          <Button
            color="error"
            onClick={() => {
              const next = variants.find((v) => v.id !== variant.id);
              dispatch(deleteVariant({ id: variant.id }));
              if (next) {
                activateVariant(dispatch, next);
              }
              setIsDeleting(false);
            }}
          >
            Delete
          </Button>
        </DialogActions>
      </Dialog>
      <NewJobDialog isOpen={isNewOpen} onClose={() => setIsNewOpen(false)} />
    </>
  );
}
