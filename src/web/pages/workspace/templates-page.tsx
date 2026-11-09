import { MouseEvent, useEffect, useState } from "react";
import {
  Box,
  Button,
  List,
  ListItemButton,
  ListItemText,
  Collapse,
  Menu,
  MenuItem,
  Tooltip,
  ButtonBase,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  TextField,
  Typography,
} from "@mui/material";
import ExpandMoreOutlinedIcon from "@mui/icons-material/ExpandMoreOutlined";
import ArrowDownwardOutlinedIcon from "@mui/icons-material/ArrowDownwardOutlined";
import ArrowUpwardOutlinedIcon from "@mui/icons-material/ArrowUpwardOutlined";
import { Template } from "@custom-types/template-types";
import { navigate, onAppLinkClick, useRoute } from "@hooks/navigation";
import { Route, TemplatesTab, formatRoute } from "@shared/routing/routes";
import { EditorPageStructure } from "@pages/editor-page/sections/editor-page-structure/editor-page-structure";
import { EditorTypography } from "@pages/editor-page/sections/editor-style-settings/editor-style-settings";
import { StylePreviewPanel } from "@pages/editor-page/sections/editor-style-settings/style-preview";
import { StyleHoverProvider } from "@pages/editor-page/sections/editor-style-settings/style-hover";
import {
  jobCountText,
  TemplateSort,
  nextTemplateName,
  sortTemplates,
} from "@pages/workspace/template-scope";
import { ResizableAside } from "@pages/workspace/resizable-aside";
import { TemplateSample } from "@pages/workspace/template-section-styles";
import {
  MIDDLE_AREA_SX,
  WORKSPACE_COLORS,
} from "@pages/workspace/workspace-tokens";
import { useAppDispatch, useAppSelector } from "@store/store-helper";
import {
  activeJobSelector,
  addTemplate,
  deleteTemplate,
  jobsSelector,
  renameTemplate,
  templatesSelector,
} from "@store/jobs/jobs-slice";
import { nanoid } from "@reduxjs/toolkit";

/** Why a template cannot be deleted, or an empty text when it can */
export function deleteBlockReason(templateCount: number): string {
  if (templateCount <= 1) {
    return "This is the only template. There must always be one.";
  }
  return "";
}

type TemplateTab = TemplatesTab;

const SORT_LABELS: Record<TemplateSort, string> = {
  newest: "Date",
  popular: "Popularity",
  alphabetic: "Name",
};

/** What the arrow means for each sort: [normal order, reversed] */
const SORT_DIRECTION_HINTS: Record<TemplateSort, [string, string]> = {
  newest: ["newest first", "oldest first"],
  popular: ["most jobs first", "fewest jobs first"],
  alphabetic: ["A to Z", "Z to A"],
};

/** One dialog for the two name questions: rename and delete confirmation share the shell */
type Asking =
  | { kind: "rename"; template: Template }
  | { kind: "delete"; template: Template }
  | null;

const TEMPLATE_TABS: { id: TemplateTab; label: string }[] = [
  { id: "templates", label: "Templates" },
  { id: "layout", label: "Page layout" },
  { id: "style", label: "Style settings" },
];

/** The address of a Templates page; Page layout and Style settings name the template they edit */
function templatesRoute(tab: TemplateTab, templateId: string): Route {
  return tab === "templates"
    ? { kind: "templates", tab }
    : { kind: "templates", tab, templateId };
}

/** Top of Page layout and Style settings: which template is being edited, and a way to switch */
function EditedTemplateSwitcher({
  tab,
  templateId,
}: {
  tab: TemplateTab;
  templateId: string;
}): JSX.Element {
  const templates = useAppSelector(templatesSelector);
  const jobs = useAppSelector(jobsSelector);
  return (
    <Box sx={{ mb: 2 }}>
      <TextField
        select
        size="small"
        label="Editing template"
        value={templateId}
        onChange={(event) => navigate(templatesRoute(tab, event.target.value))}
        sx={{ minWidth: 280, bgcolor: "background.paper" }}
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
      </TextField>
    </Box>
  );
}

/** Left: the three parts of the Templates area, like the sections list in the vault */
function TemplatesNav({
  tab,
  templateId,
}: {
  tab: TemplateTab;
  /** The template the Page layout and Style settings links open */
  templateId: string;
}): JSX.Element {
  return (
    <ResizableAside side="left" label="the template menu" defaultWidth={220}>
      <Box
        component="nav"
        aria-label="Template sections"
        sx={{
          width: "100%",
          flex: "none",
          bgcolor: WORKSPACE_COLORS.panel,
          borderRight: `1px solid ${WORKSPACE_COLORS.border}`,
          p: 1,
          overflow: "auto",
        }}
      >
        <List dense disablePadding>
          {TEMPLATE_TABS.map((entry) => (
            <ListItemButton
              key={entry.id}
              component="a"
              href={formatRoute(templatesRoute(entry.id, templateId))}
              selected={tab === entry.id}
              onClick={(event: MouseEvent<HTMLElement>) =>
                onAppLinkClick(event, templatesRoute(entry.id, templateId))
              }
            >
              <ListItemText primary={entry.label} />
            </ListItemButton>
          ))}
        </List>
      </Box>
    </ResizableAside>
  );
}

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
  const [sort, setSort] = useState<TemplateSort>("newest");
  const [expandedIds, setExpandedIds] = useState<string[]>([]);
  const [isReversed, setIsReversed] = useState<boolean>(false);
  const [sortAnchor, setSortAnchor] = useState<HTMLElement | null>(null);
  const [moveToId, setMoveToId] = useState<string>("");
  const deletingJobs =
    asking?.kind === "delete"
      ? jobs.filter((j) => j.templateId === asking.template.id)
      : [];
  const route = useRoute();
  const tab: TemplateTab = route.kind === "templates" ? route.tab : "templates";
  const routeTemplateId =
    route.kind === "templates" ? route.templateId : undefined;

  // The template the sample shows; missing or deleted = the active job's template
  const [pickedId, setPickedId] = useState<string | null>(null);
  // The address names the template when Page layout or Style settings is open: it becomes the pick
  useEffect(() => {
    if (routeTemplateId !== undefined) {
      setPickedId(routeTemplateId);
    }
  }, [routeTemplateId]);
  const shownTemplate =
    templates.find((t) => t.id === (routeTemplateId ?? pickedId)) ??
    templates.find((t) => t.id === activeJob.templateId);
  const shownId = shownTemplate?.id ?? activeJob.templateId;

  function create(): void {
    const name = newName.trim() || nextTemplateName(templates);
    const id = nanoid();
    dispatch(addTemplate({ id, name }));
    setPickedId(id);
    setNewName("");
  }

  return (
    <StyleHoverProvider>
      <TemplatesNav tab={tab} templateId={shownId} />
      <Box
        component="main"
        aria-label="Templates"
        sx={{
          flex: 1,
          minWidth: 0,
          overflow: "auto",
          p: 3,
          mx: 1,
          ...MIDDLE_AREA_SX,
        }}
      >
        {tab === "layout" && (
          <Box sx={{ maxWidth: 1000, mx: "auto" }}>
            <EditedTemplateSwitcher tab={tab} templateId={shownId} />
            <EditorPageStructure />
          </Box>
        )}
        {tab === "style" && (
          <Box sx={{ maxWidth: 1000, mx: "auto" }}>
            <EditedTemplateSwitcher tab={tab} templateId={shownId} />
            <EditorTypography />
          </Box>
        )}
        {tab === "templates" && (
          <>
            <Box sx={{ maxWidth: 1000, mx: "auto" }}>
              <Typography component="h1" sx={{ fontSize: 18, fontWeight: 700 }}>
                Templates
              </Typography>
              <Typography sx={{ color: WORKSPACE_COLORS.muted, mb: 2 }}>
                A template is how a CV looks: layout, section order, fonts,
                colours, margins, page limit, skill display and auto-fit. Jobs
                that share a template always look the same, so changing a
                template changes all of its jobs. What each job shows is set per
                job.
              </Typography>
              <Box
                sx={{
                  display: "flex",
                  gap: 1,
                  mb: 2,
                  alignItems: "flex-start",
                }}
              >
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
                  sx={{ flex: 1 }}
                />
                <Button
                  variant="contained"
                  onClick={create}
                  sx={{ height: 40 }}
                >
                  Create template
                </Button>
              </Box>
              <Box
                sx={{
                  display: "flex",
                  justifyContent: "flex-end",
                  alignItems: "center",
                  mb: 1,
                }}
              >
                <Button
                  size="small"
                  aria-haspopup="menu"
                  onClick={(event) => setSortAnchor(event.currentTarget)}
                >
                  Sort by: {SORT_LABELS[sort]}
                </Button>
                <Tooltip title={SORT_DIRECTION_HINTS[sort][isReversed ? 1 : 0]}>
                  <Button
                    size="small"
                    aria-label={`Reverse the order (now ${SORT_DIRECTION_HINTS[sort][isReversed ? 1 : 0]})`}
                    onClick={() => setIsReversed((value) => !value)}
                    sx={{ minWidth: 0, px: 0.75 }}
                  >
                    {isReversed ? (
                      <ArrowUpwardOutlinedIcon fontSize="small" />
                    ) : (
                      <ArrowDownwardOutlinedIcon fontSize="small" />
                    )}
                  </Button>
                </Tooltip>
                <Menu
                  anchorEl={sortAnchor}
                  open={sortAnchor !== null}
                  onClose={() => setSortAnchor(null)}
                >
                  {(Object.keys(SORT_LABELS) as TemplateSort[]).map((key) => (
                    <MenuItem
                      key={key}
                      selected={key === sort}
                      onClick={() => {
                        setSort(key);
                        setIsReversed(false);
                        setSortAnchor(null);
                      }}
                    >
                      {SORT_LABELS[key]}
                    </MenuItem>
                  ))}
                </Menu>
              </Box>
              <Box
                component="ul"
                aria-label="Templates"
                sx={{
                  listStyle: "none",
                  m: 0,
                  p: 0,
                  display: "grid",
                  gap: 2,
                }}
              >
                {sortTemplates(templates, jobs, sort, isReversed).map(
                  (template) => {
                    const users = jobs.filter(
                      (j) => j.templateId === template.id
                    );
                    const reason = deleteBlockReason(templates.length);
                    const isShown = template.id === shownId;
                    const isExpanded = expandedIds.includes(template.id);
                    const reasonId = `delete-reason-${template.id}`;
                    return (
                      <Box
                        component="li"
                        key={template.id}
                        data-selected={isShown}
                        onClick={() => setPickedId(template.id)}
                        sx={{
                          border: `1px solid ${
                            isShown
                              ? WORKSPACE_COLORS.accent
                              : WORKSPACE_COLORS.border
                          }`,
                          boxShadow: isShown
                            ? `0 0 0 1px ${WORKSPACE_COLORS.accent}`
                            : "none",
                          borderRadius: "6px",
                          bgcolor: isShown
                            ? WORKSPACE_COLORS.accentSoft
                            : WORKSPACE_COLORS.panel,
                          cursor: "pointer",
                          p: 1.75,
                        }}
                      >
                        <Box
                          sx={{
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "space-between",
                            flexWrap: "wrap",
                            gap: 1,
                          }}
                        >
                          <ButtonBase
                            aria-pressed={isShown}
                            aria-label={`Show a sample of ${template.name}`}
                            onClick={() => setPickedId(template.id)}
                            sx={{ textAlign: "left", borderRadius: 0.5 }}
                          >
                            <Typography sx={{ fontWeight: 700, fontSize: 15 }}>
                              {template.name}
                            </Typography>
                          </ButtonBase>
                          <Box
                            sx={{
                              display: "flex",
                              gap: 1,
                              flexWrap: "wrap",
                              justifyContent: "flex-end",
                            }}
                          >
                            <Button
                              size="small"
                              variant="contained"
                              component="a"
                              href={formatRoute(
                                templatesRoute("layout", template.id)
                              )}
                              aria-label={`Edit template ${template.name}`}
                              onClick={(event: MouseEvent<HTMLElement>) => {
                                event.stopPropagation();
                                onAppLinkClick(
                                  event,
                                  templatesRoute("layout", template.id)
                                );
                              }}
                            >
                              Edit
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
                              onClick={() => {
                                const id = nanoid();
                                dispatch(
                                  addTemplate({
                                    id,
                                    name: `${template.name} (copy)`,
                                    sourceId: template.id,
                                  })
                                );
                                setPickedId(id);
                              }}
                            >
                              Duplicate
                            </Button>
                            <Button
                              size="small"
                              color="error"
                              disabled={reason !== ""}
                              aria-label={`Delete template ${template.name}`}
                              aria-describedby={reason ? reasonId : undefined}
                              onClick={() => {
                                setMoveToId(
                                  templates.find((t) => t.id !== template.id)
                                    ?.id ?? ""
                                );
                                setAsking({ kind: "delete", template });
                              }}
                            >
                              Delete
                            </Button>
                          </Box>
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
                        <Box sx={{ mt: 1 }}>
                          {users.length === 0 ? (
                            <Typography
                              sx={{
                                fontSize: 12,
                                color: WORKSPACE_COLORS.muted,
                              }}
                            >
                              No jobs prepared with this template
                            </Typography>
                          ) : (
                            <>
                              <ButtonBase
                                aria-expanded={isExpanded}
                                aria-controls={`template-jobs-${template.id}`}
                                onClick={(event) => {
                                  event.stopPropagation();
                                  setExpandedIds((ids) =>
                                    isExpanded
                                      ? ids.filter((id) => id !== template.id)
                                      : [...ids, template.id]
                                  );
                                }}
                                sx={{
                                  gap: 0.5,
                                  borderRadius: 0.5,
                                  fontSize: 12,
                                  color: WORKSPACE_COLORS.muted,
                                }}
                              >
                                <ExpandMoreOutlinedIcon
                                  fontSize="small"
                                  sx={{
                                    transform: isExpanded
                                      ? "rotate(180deg)"
                                      : "none",
                                  }}
                                />
                                {jobCountText(users.length)} prepared with this
                                template
                              </ButtonBase>
                              <Collapse
                                in={isExpanded}
                                id={`template-jobs-${template.id}`}
                              >
                                <Box
                                  component="ul"
                                  sx={{ m: 0, pl: 4, fontSize: 13, pt: 0.5 }}
                                >
                                  {users.map((job) => (
                                    <li key={job.id}>{job.name}</li>
                                  ))}
                                </Box>
                              </Collapse>
                            </>
                          )}
                        </Box>
                      </Box>
                    );
                  }
                )}
              </Box>
            </Box>
          </>
        )}

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

        <Dialog
          open={asking?.kind === "delete"}
          onClose={() => setAsking(null)}
        >
          <DialogTitle>Delete template?</DialogTitle>
          <DialogContent>
            <DialogContentText>
              “{asking?.template.name}” will be deleted. Your data (the vault)
              and applications you already sent are not affected: an application
              keeps its own frozen copy of the CV.
            </DialogContentText>
            {deletingJobs.length > 0 && (
              <>
                <DialogContentText sx={{ mt: 1.5, mb: 1.5 }}>
                  {jobCountText(deletingJobs.length)} use it (
                  {deletingJobs.map((j) => j.name).join(", ")}). Their look will
                  change to the template you choose:
                </DialogContentText>
                <TextField
                  select
                  size="small"
                  fullWidth
                  label="Move these jobs to"
                  value={moveToId}
                  onChange={(event) => setMoveToId(event.target.value)}
                >
                  {templates
                    .filter((t) => t.id !== asking?.template.id)
                    .map((t) => (
                      <MenuItem key={t.id} value={t.id}>
                        {t.name}
                      </MenuItem>
                    ))}
                </TextField>
              </>
            )}
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setAsking(null)}>Cancel</Button>
            <Button
              color="error"
              onClick={() => {
                if (asking?.kind === "delete") {
                  dispatch(
                    deleteTemplate({
                      id: asking.template.id,
                      moveJobsTo: moveToId,
                    })
                  );
                }
                setAsking(null);
              }}
            >
              Delete template
            </Button>
          </DialogActions>
        </Dialog>
      </Box>
      {tab === "style" ? (
        <StylePreviewPanel />
      ) : (
        <ResizableAside side="right" label="the sample CV" defaultWidth={380}>
          <Box
            component="aside"
            aria-label="Sample CV panel"
            sx={{
              width: "100%",
              flex: "none",
              bgcolor: WORKSPACE_COLORS.panel,
              borderLeft: `1px solid ${WORKSPACE_COLORS.border}`,
              p: 2,
              overflow: "auto",
            }}
          >
            <Typography sx={{ fontWeight: 700, mb: 0.5 }}>
              Sample
              {tab === "templates" && shownTemplate
                ? `: ${shownTemplate.name}`
                : ""}
            </Typography>
            <Typography
              sx={{ fontSize: 12, color: WORKSPACE_COLORS.muted, mb: 1.5 }}
            >
              Your vault with everything shown, in this template.
              {tab === "templates"
                ? " Click a template to preview it."
                : ""}{" "}
              Drag the edge to make it larger.
            </Typography>
            <TemplateSample
              templateId={tab === "templates" ? shownId : undefined}
            />
          </Box>
        </ResizableAside>
      )}
    </StyleHoverProvider>
  );
}
