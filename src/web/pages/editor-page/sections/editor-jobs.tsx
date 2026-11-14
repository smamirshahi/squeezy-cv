import { useState } from "react";
import {
  Box,
  Button,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  Divider,
  FormControlLabel,
  MenuItem,
  Switch,
  TextField,
  Typography,
} from "@components/ui";
import { ArrowForwardOutlined as ArrowForwardIcon } from "@components/ui/icons";
import { FitMode } from "@custom-types/variant-types";
import { activateVariant } from "@hooks/use-sync-active-job";
import { JobContent } from "@pages/editor-page/sections/job-content";
import { WORKSPACE_COLORS } from "@pages/workspace/workspace-tokens";
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
  deleteJob,
  copyJob,
  renameJob,
  setAutoFit,
  variantsSelector,
} from "@store/jobs/jobs-slice";

const INTRO_KEY = "cv-builder-jobs-intro";

const LABEL_SX = {
  fontSize: 11,
  fontWeight: 600,
  letterSpacing: "0.06em",
  textTransform: "uppercase",
  color: WORKSPACE_COLORS.muted,
} as const;

/** A remembered choice of this browser; the page works without it */
function readStored<T extends string>(key: string, fallback: T): T {
  try {
    return (window.localStorage.getItem(key) as T | null) ?? fallback;
  } catch {
    return fallback;
  }
}

function writeStored(key: string, value: string): void {
  try {
    window.localStorage.setItem(key, value);
  } catch {
    // private window or blocked storage: the choice is just not remembered
  }
}

/** Whether the CV fits the page limit, from what the preview measured */
function FitStatus(): JSX.Element {
  const variant = useAppSelector(activeVariantSelector);
  const { pageCount, linesOver } = useAppSelector((s) => s.app.fit);
  const isFitting = pageCount <= variant.pageLimit && linesOver === 0;
  const limit = `${variant.pageLimit} ${variant.pageLimit === 1 ? "page" : "pages"}`;
  return (
    <Chip
      role="status"
      color={isFitting ? "success" : variant.isAutoFit ? "error" : "warning"}
      label={
        isFitting
          ? `Uses ${pageCount} of ${limit}`
          : `Over the limit by about ${linesOver} ${linesOver === 1 ? "line" : "lines"}`
      }
    />
  );
}

function IntroStep({
  label,
  title,
  text,
  isHere,
}: {
  label: string;
  title: string;
  text: string;
  isHere?: boolean;
}): JSX.Element {
  return (
    <Box
      sx={{
        flex: { xs: "none", md: 1 },
        minWidth: 0,
        p: isHere ? "11px 13px" : "12px 14px",
        borderRadius: 1.5,
        bgcolor: WORKSPACE_COLORS.panel,
        border: isHere
          ? `2px solid ${WORKSPACE_COLORS.accent}`
          : `1px solid ${WORKSPACE_COLORS.border}`,
      }}
    >
      <Typography
        sx={{
          ...LABEL_SX,
          color: isHere ? WORKSPACE_COLORS.accentText : WORKSPACE_COLORS.muted,
        }}
      >
        {label}
      </Typography>
      <Typography sx={{ fontWeight: 600, my: 0.25 }}>{title}</Typography>
      <Typography sx={{ fontSize: 12.5 }}>{text}</Typography>
    </Box>
  );
}

/** The short explanation of vault, job and CV, which can be closed */
function JobsIntro({ onClose }: { onClose: () => void }): JSX.Element {
  const arrow = (
    <Box
      aria-hidden="true"
      sx={{
        display: "grid",
        placeItems: "center",
        color: WORKSPACE_COLORS.accentText,
        transform: { xs: "rotate(90deg)", md: "none" },
      }}
    >
      <ArrowForwardIcon fontSize="small" />
    </Box>
  );
  return (
    <Box
      component="section"
      aria-label="How jobs work"
      sx={{
        p: 2.25,
        borderRadius: 1.5,
        border: `1px solid ${WORKSPACE_COLORS.border}`,
        bgcolor: WORKSPACE_COLORS.accentSoft,
      }}
    >
      <Box sx={{ display: "flex", alignItems: "center", mb: 1.5 }}>
        <Typography sx={{ fontWeight: 600, fontSize: 15, flex: 1 }}>
          How jobs work
        </Typography>
        <Button size="small" onClick={onClose}>
          Got it
        </Button>
      </Box>
      <Box
        sx={{
          display: "flex",
          flexDirection: { xs: "column", md: "row" },
          alignItems: "stretch",
          gap: 1.25,
        }}
      >
        <IntroStep
          label="1 · Vault"
          title="All your facts, written once"
          text="Jobs, skills, education. Edit them any time and every job picks up the change."
        />
        {arrow}
        <IntroStep
          isHere
          label="2 · Job (you are here)"
          title="One target, with its own choices"
          text="Decides which entries show, their order and wording. Its template decides sections, order and layout, and can be shared by many jobs."
        />
        {arrow}
        <IntroStep
          label="3 · Your CV"
          title="What the employer reads"
          text="The PDF matches the live preview."
        />
      </Box>
      <Typography sx={{ mt: 1.5, fontSize: 12.5 }}>
        Fonts, colours and layout come from the <b>Templates</b> tool. Need a
        different structure? Make a new template, or move this job to another
        one.
      </Typography>
    </Box>
  );
}

/**
 * Creates, switches, renames and deletes jobs, and chooses per job which items
 * and bullets are shown, in which order and wording. Changes apply at once and never
 * change the vault.
 */
export function EditorJobs(): JSX.Element {
  const dispatch = useAppDispatch();
  const variants = useAppSelector(variantsSelector);
  const variant = useAppSelector(activeVariantSelector);
  const [isDeleting, setIsDeleting] = useState<boolean>(false);
  const [isNewOpen, setIsNewOpen] = useState<boolean>(false);
  const templates = useAppSelector(templatesSelector);
  const template = useAppSelector(activeTemplateSelector);
  const job = useAppSelector(activeJobSelector);
  const [isIntroShown, setIsIntroShown] = useState<boolean>(
    readStored(INTRO_KEY, "shown") === "shown"
  );

  function changeIntro(isShown: boolean): void {
    setIsIntroShown(isShown);
    writeStored(INTRO_KEY, isShown ? "shown" : "hidden");
  }

  function handleSwitch(id: string): void {
    const next = variants.find((v) => v.id === id);
    if (next) {
      activateVariant(dispatch, next);
    }
  }

  function handleDuplicate(): void {
    // The copy shares the template, so the editor already shows its look
    dispatch(copyJob({ sourceId: variant.id }));
  }

  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
      <Box sx={{ display: "flex", alignItems: "flex-end", gap: 2 }}>
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Typography variant="h6">Jobs</Typography>
          <Typography variant="body2" sx={{ color: WORKSPACE_COLORS.muted }}>
            A job is one target for your CV, such as a company and role. It
            decides which entries show; its template decides how the CV looks.
            Changes apply at once and never change your vault.
          </Typography>
        </Box>
        {!isIntroShown && (
          <Button onClick={() => changeIntro(true)}>What is a job?</Button>
        )}
      </Box>

      {isIntroShown && <JobsIntro onClose={() => changeIntro(false)} />}

      <Box
        component="section"
        sx={{
          p: 2.5,
          display: "flex",
          flexDirection: "column",
          gap: 2,
          border: `1px solid ${WORKSPACE_COLORS.border}`,
          borderRadius: 1.5,
          bgcolor: WORKSPACE_COLORS.panel,
        }}
      >
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
              dispatch(renameJob({ id: variant.id, name: event.target.value }))
            }
            sx={{ flexGrow: 1, minWidth: 180 }}
          />
          <Button variant="outlined" onClick={() => setIsNewOpen(true)}>
            New job
          </Button>
          <Button onClick={handleDuplicate}>Duplicate job</Button>
          <Button
            color="error"
            disabled={variants.length <= 1}
            onClick={() => setIsDeleting(true)}
          >
            Delete job
          </Button>
        </Box>

        <Divider />

        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            gap: 2.5,
            flexWrap: "wrap",
          }}
        >
          <TextField
            select
            size="small"
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
          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
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
              sx={{ minWidth: 170 }}
            >
              <MenuItem value="fit">Shrink to fit</MenuItem>
              <MenuItem value="fill">Fill the page</MenuItem>
            </TextField>
          </Box>
          <Box sx={{ flex: 1 }} />
          <FitStatus />
        </Box>
        <TemplateScopeNote verb="Template, page limit and auto-fit: changes" />
      </Box>

      <JobContent />

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
              dispatch(deleteJob({ id: variant.id }));
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
    </Box>
  );
}
