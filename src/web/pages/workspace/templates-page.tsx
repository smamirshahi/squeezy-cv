import {
  FormEvent,
  KeyboardEvent,
  MouseEvent,
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  Box,
  Button,
  ButtonBase,
  Chip,
  Collapse,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  List,
  ListItemButton,
  ListItemText,
  Menu,
  MenuItem,
  TextField,
  Tooltip,
  Typography,
} from "@components/ui";
import {
  AddOutlined as AddOutlinedIcon,
  ArrowDownwardOutlined as ArrowDownwardOutlinedIcon,
  ArrowUpwardOutlined as ArrowUpwardOutlinedIcon,
  ExpandMoreOutlined as ExpandMoreOutlinedIcon,
  InfoOutlined as InfoOutlinedIcon,
} from "@components/ui/icons";
import { ApplicationSummary } from "@custom-types/application-types";
import { createApiClient } from "@store/persistence/api-client";
import { Template } from "@custom-types/template-types";
import { navigate, onAppLinkClick, useRoute } from "@hooks/navigation";
import { Route, TemplatesTab, formatRoute } from "@shared/routing/routes";
import { TemplateDesignPage } from "@pages/workspace/template-design-page";
import { TemplateSectionsPage } from "@pages/workspace/template-sections-page";
import {
  jobCountText,
  TemplateSort,
  describeLayout,
  nextTemplateName,
  sortTemplates,
} from "@pages/workspace/template-scope";
import { TemplateJobsTable } from "@pages/workspace/template-jobs-table";
import { usePhonePreview } from "@pages/workspace/phone-preview";
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
  isPlaceholderSelector,
  isTemplatePlaceholderSelector,
  jobsSelector,
  renameTemplate,
  templatesSelector,
} from "@store/jobs/jobs-slice";
import { sectionsSelector } from "@store/vault/vault-slice";
import { PREMADE_TEMPLATES } from "@shared/vault/premade-templates";
import { nanoid } from "@reduxjs/toolkit";

/** Why a template cannot be deleted, or an empty text when it can */
export function deleteBlockReason(templateCount: number): string {
  if (templateCount <= 1) {
    return "This is the only template. There must always be one.";
  }
  return "";
}

/** Touch-size buttons below a desktop, today's size from a desktop up */
const TOUCH_BUTTON_SX = { minHeight: { xs: 44, lg: "auto" } } as const;

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

/** The delete confirmation dialog; renaming and creating happen in place on the list (#499) */
type Asking = { kind: "delete"; template: Template } | null;

/** The one in-place form that can be open: a draft card for a new template, or a card being renamed */
type InlineForm = { kind: "new" } | { kind: "rename"; id: string } | null;

/** The in-place form for a template's name and subtitle, shared by New and Rename */
function TemplateForm({
  title,
  name,
  subtitle,
  namePlaceholder,
  subtitlePlaceholder,
  error,
  hint,
  submitLabel,
  submitDisabled,
  onName,
  onSubtitle,
  onSubmit,
  onCancel,
}: {
  title: string;
  name: string;
  subtitle: string;
  namePlaceholder?: string;
  subtitlePlaceholder?: string;
  error: string;
  hint: string;
  submitLabel: string;
  submitDisabled: boolean;
  onName: (value: string) => void;
  onSubtitle: (value: string) => void;
  onSubmit: () => void;
  onCancel: () => void;
}): JSX.Element {
  return (
    <Box
      component="form"
      aria-label={title}
      onSubmit={(event: FormEvent) => {
        event.preventDefault();
        if (!submitDisabled) {
          onSubmit();
        }
      }}
      onKeyDown={(event: KeyboardEvent) => {
        if (event.key === "Escape") {
          onCancel();
        }
      }}
      sx={{
        border: `2px solid ${WORKSPACE_COLORS.accent}`,
        borderRadius: "6px",
        bgcolor: WORKSPACE_COLORS.panel,
        p: 1.75,
        display: "flex",
        flexDirection: "column",
        gap: 1.5,
      }}
    >
      <Typography sx={{ fontSize: 12, fontWeight: 700 }}>{title}</Typography>
      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: { xs: "minmax(0, 1fr)", sm: "5fr 7fr" },
          gap: 1.5,
        }}
      >
        <TextField
          autoFocus
          size="small"
          label="Name"
          value={name}
          placeholder={namePlaceholder}
          onChange={(event) => onName(event.target.value)}
          error={error !== ""}
          slotProps={{ htmlInput: { maxLength: 40 } }}
        />
        <TextField
          size="small"
          label="Subtitle (optional)"
          value={subtitle}
          placeholder={subtitlePlaceholder ?? "What is it for?"}
          onChange={(event) => onSubtitle(event.target.value)}
          slotProps={{ htmlInput: { maxLength: 120 } }}
        />
      </Box>
      {error && (
        <Typography role="alert" sx={{ fontSize: 12, color: "error.main" }}>
          {error}
        </Typography>
      )}
      <Box
        sx={{
          display: "flex",
          flexDirection: { xs: "column", sm: "row" },
          alignItems: { xs: "stretch", sm: "center" },
          gap: 1,
        }}
      >
        <Typography
          sx={{
            flex: 1,
            fontSize: 12,
            color: WORKSPACE_COLORS.muted,
            order: { xs: 3, sm: 0 },
          }}
        >
          {hint} Enter saves. Esc cancels.
        </Typography>
        <Box
          sx={{
            display: "flex",
            gap: 1,
            "& > *": { flex: { xs: 1, sm: "none" } },
          }}
        >
          <Button
            type="button"
            color="neutral"
            sx={TOUCH_BUTTON_SX}
            onClick={onCancel}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            variant="contained"
            sx={TOUCH_BUTTON_SX}
            disabled={submitDisabled}
          >
            {submitLabel}
          </Button>
        </Box>
      </Box>
    </Box>
  );
}

const TEMPLATE_TABS: { id: TemplateTab; label: string }[] = [
  { id: "templates", label: "Template list" },
  { id: "sections", label: "Sections" },
  { id: "design", label: "Design" },
];

/** The address of a Templates page; Design names the template it edits */
function templatesRoute(tab: TemplateTab, templateId: string): Route {
  return tab === "templates"
    ? { kind: "templates", tab }
    : { kind: "templates", tab, templateId };
}

/** Which template is being edited, and a way to switch; the hint is in the (i) tooltip */
function EditedTemplateSwitcher({
  tab,
  templateId,
}: {
  tab: TemplateTab;
  templateId: string;
}): JSX.Element {
  const templates = useAppSelector(templatesSelector);
  const jobs = useAppSelector(jobsSelector);
  const hint = `This template is used by ${jobCountText(jobs.filter((j) => j.templateId === templateId).length)}.`;
  return (
    <Box sx={{ display: "flex", alignItems: "center", gap: 0.75 }}>
      <Typography
        sx={{
          fontSize: 12,
          color: WORKSPACE_COLORS.muted,
          whiteSpace: "nowrap",
          display: { xs: "none", sm: "block" },
        }}
      >
        Editing
      </Typography>
      <TextField
        select
        size="small"
        value={templateId}
        onChange={(event) => navigate(templatesRoute(tab, event.target.value))}
        slotProps={{
          select: { SelectDisplayProps: { "aria-label": "Editing template" } },
        }}
        sx={{ minWidth: { xs: 180, sm: 220 }, bgcolor: "background.paper" }}
      >
        {templates.map((template) => (
          <MenuItem key={template.id} value={template.id}>
            {template.name}
          </MenuItem>
        ))}
      </TextField>
      <Tooltip title={hint}>
        <Box
          component="span"
          tabIndex={0}
          role="img"
          aria-label={hint}
          sx={{
            display: "inline-flex",
            color: WORKSPACE_COLORS.muted,
            cursor: "help",
          }}
        >
          <InfoOutlinedIcon sx={{ fontSize: 18 }} />
        </Box>
      </Tooltip>
    </Box>
  );
}

/** Left: the three parts of the Templates area, like the sections list in the vault */
function TemplatesNav({
  tab,
  templateId,
  hasTemplates,
  showSwitcher,
}: {
  tab: TemplateTab;

  /** Design and Sections show which template they edit, next to the tabs */
  showSwitcher: boolean;
  /** False until a template exists: there is nothing to design yet */
  hasTemplates: boolean;
  /** The template the Design link opens */
  templateId: string;
}): JSX.Element {
  return (
    <Box
      component="nav"
      aria-label="Template sections"
      sx={{
        width: "100%",
        flex: "none",
        bgcolor: WORKSPACE_COLORS.panel,
        borderBottom: `1px solid ${WORKSPACE_COLORS.border}`,
        px: 1,
        overflowX: "auto",
        display: "flex",
        alignItems: "center",
        gap: 2,
      }}
    >
      {/* the three parts are tabs across the top, so the page below gets the whole width */}
      <List disablePadding sx={{ display: "flex", gap: 0.5 }}>
        {TEMPLATE_TABS.map((entry) => (
          <ListItemButton
            key={entry.id}
            component="a"
            href={formatRoute(templatesRoute(entry.id, templateId))}
            selected={tab === entry.id}
            disabled={entry.id !== "templates" && !hasTemplates}
            sx={{
              minHeight: 44,
              width: "auto",
              flex: "none",
              whiteSpace: "nowrap",
              px: 2,
              borderBottom: "3px solid transparent",
              "&.Mui-selected": {
                borderBottomColor: WORKSPACE_COLORS.accent,
                bgcolor: "transparent",
              },
            }}
            onClick={(event: MouseEvent<HTMLElement>) =>
              onAppLinkClick(event, templatesRoute(entry.id, templateId))
            }
          >
            <ListItemText
              primary={entry.label}
              secondary={
                entry.id !== "templates" && !hasTemplates
                  ? "Create a template first"
                  : undefined
              }
              slotProps={{
                primary: { sx: { fontWeight: tab === entry.id ? 700 : 500 } },
              }}
            />
          </ListItemButton>
        ))}
      </List>
      {showSwitcher && (
        <Box sx={{ flex: "none", py: 0.5 }}>
          <EditedTemplateSwitcher tab={tab} templateId={templateId} />
        </Box>
      )}
    </Box>
  );
}

/**
 * The Templates area: every template with the jobs that use it. A template is how a CV looks
 * (layout, fonts, colours, margins, page limit, skill display, auto-fit); a job only decides
 * what is shown. Create, duplicate, rename and delete here; edit the look in the inspector
 * and on the Style Settings page, which say which template they change.
 */
export function TemplatesPage(): JSX.Element {
  const phone = usePhonePreview();
  const dispatch = useAppDispatch();
  const isTemplatePlaceholder = useAppSelector(isTemplatePlaceholderSelector);
  const isJobPlaceholder = useAppSelector(isPlaceholderSelector);
  const allTemplates = useAppSelector(templatesSelector);
  const allJobs = useAppSelector(jobsSelector);
  // stand-ins are not shown: with no template made yet the page lists nothing
  const templates = isTemplatePlaceholder ? [] : allTemplates;
  const jobs = isJobPlaceholder ? [] : allJobs;
  const activeJob = useAppSelector(activeJobSelector);
  const vaultSections = useAppSelector(sectionsSelector);
  const [form, setForm] = useState<InlineForm>(null);
  const [draftName, setDraftName] = useState<string>("");
  const [draftSubtitle, setDraftSubtitle] = useState<string>("");
  const [asking, setAsking] = useState<Asking>(null);
  const [sort, setSort] = useState<TemplateSort>("newest");
  const api = useMemo(() => createApiClient(), []);
  const [applications, setApplications] = useState<ApplicationSummary[]>([]);
  useEffect(() => {
    api
      .listApplications()
      .then(setApplications)
      .catch(() => setApplications([]));
  }, [api]);
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
  // The address names the template when Design is open: it becomes the pick
  useEffect(() => {
    if (routeTemplateId !== undefined) {
      setPickedId(routeTemplateId);
    }
  }, [routeTemplateId]);
  const shownTemplate =
    templates.find((t) => t.id === (routeTemplateId ?? pickedId)) ??
    templates.find((t) => t.id === activeJob.templateId);
  const shownId = shownTemplate?.id ?? activeJob.templateId;

  // With no template there is nothing to design: an address for it goes back to the list
  useEffect(() => {
    if (isTemplatePlaceholder && tab === "design") {
      navigate({ kind: "templates", tab: "templates" }, { replace: true });
    }
  }, [isTemplatePlaceholder, tab]);

  // A new template starts as a copy of the active job's template, so its layout gives the default
  const sourceTemplate =
    templates.find((t) => t.id === activeJob.templateId) ?? templates[0];
  const defaultSubtitle = sourceTemplate
    ? describeLayout(sourceTemplate.layout, vaultSections)
    : "";

  /** A name another template already has (any case), or an empty text; the template being renamed is not counted */
  function nameClash(): string {
    const wanted = draftName.trim().toLowerCase();
    const ownId = form?.kind === "rename" ? form.id : null;
    const isClash =
      wanted !== "" &&
      templates.some(
        (t) => t.id !== ownId && t.name.trim().toLowerCase() === wanted
      );
    return isClash
      ? `A template called “${draftName.trim()}” already exists. Pick another name.`
      : "";
  }

  function openNew(): void {
    setDraftName("");
    setDraftSubtitle("");
    setForm({ kind: "new" });
  }

  function openRename(template: Template): void {
    setDraftName(template.name);
    setDraftSubtitle(template.subtitle ?? "");
    setPickedId(template.id);
    setForm({ kind: "rename", id: template.id });
  }

  /** Create (a draft card) or rename (a card in place), whichever form is open */
  function commit(): void {
    if (form === null || nameClash() !== "") {
      return;
    }
    if (form.kind === "new") {
      const id = nanoid();
      dispatch(
        addTemplate({
          id,
          name: draftName.trim() || nextTemplateName(templates),
          subtitle: draftSubtitle.trim() || defaultSubtitle,
        })
      );
      setPickedId(id);
      setForm(null);
      // a new template opens straight in its Sections tab, ready to be shaped
      navigate(templatesRoute("sections", id));
      return;
    } else if (draftName.trim() !== "") {
      dispatch(
        renameTemplate({
          id: form.id,
          name: draftName.trim(),
          subtitle: draftSubtitle,
        })
      );
    }
    setForm(null);
  }

  /** Makes a real template from a premade one (#488), laid out with the vault's own sections */
  function addPremade(premade: (typeof PREMADE_TEMPLATES)[number]): void {
    const id = nanoid();
    dispatch(
      addTemplate({
        id,
        name: premade.name,
        subtitle: premade.description,
        layout: premade.buildLayout(vaultSections),
      })
    );
    setPickedId(id);
  }

  return (
    // From a desktop up the wrappers vanish (display: contents) and the three parts sit in the
    // workspace row as before; below that the nav is a strip, and the sample goes under the page
    <Box
      sx={{
        flex: 1,
        minWidth: 0,
        minHeight: 0,
        display: "flex",
        flexDirection: "column",
      }}
    >
      <TemplatesNav
        tab={tab}
        templateId={shownId}
        hasTemplates={!isTemplatePlaceholder}
        showSwitcher={tab !== "templates" && !isTemplatePlaceholder}
      />
      {tab === "sections" && <TemplateSectionsPage />}
      {tab === "design" && <TemplateDesignPage templateId={shownId} />}
      {tab === "templates" && (
        <Box
          sx={{
            flex: 1,
            minWidth: 0,
            minHeight: 0,
            display: "flex",
            flexDirection: { xs: "column", md: "row" },
          }}
        >
          <Box
            component="main"
            aria-label="Templates"
            sx={{
              flex: 1,
              minWidth: 0,
              overflow: "auto",
              p: { xs: 2, md: 3 },
              mx: { xs: 0, lg: 1 },
              ...MIDDLE_AREA_SX,
            }}
          >
            {tab === "templates" && (
              <Box sx={{ maxWidth: 1000, mx: "auto" }}>
                <Typography
                  component="h1"
                  sx={{ fontSize: 18, fontWeight: 700 }}
                >
                  Templates
                </Typography>
                <Box
                  sx={{
                    display: "flex",
                    flexDirection: { xs: "column", sm: "row" },
                    gap: 2,
                    mb: 2,
                    alignItems: { xs: "stretch", sm: "flex-start" },
                  }}
                >
                  <Typography sx={{ color: WORKSPACE_COLORS.muted, flex: 1 }}>
                    A template decides which sections a CV has, their order and
                    their styles. The items inside each section are decided by
                    the job, through its variant. Changing a template does not
                    change jobs you have already applied with, only the ones
                    still in draft.
                  </Typography>
                  <Button
                    variant="contained"
                    startIcon={<AddOutlinedIcon />}
                    disabled={form !== null}
                    onClick={openNew}
                    sx={{ flex: "none", height: { xs: 44, sm: 40 } }}
                  >
                    New template
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
                  <Tooltip
                    title={SORT_DIRECTION_HINTS[sort][isReversed ? 1 : 0]}
                  >
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
                    gridTemplateColumns: "minmax(0, 1fr)",
                    gap: 2,
                  }}
                >
                  {form?.kind === "new" && (
                    <Box component="li">
                      <TemplateForm
                        title="New template"
                        name={draftName}
                        subtitle={draftSubtitle}
                        namePlaceholder={nextTemplateName(templates)}
                        subtitlePlaceholder={defaultSubtitle}
                        error={nameClash()}
                        hint="Starts as a copy of the look you are editing now. Your vault and jobs are not changed."
                        submitLabel="Create template"
                        submitDisabled={nameClash() !== ""}
                        onName={setDraftName}
                        onSubtitle={setDraftSubtitle}
                        onSubmit={commit}
                        onCancel={() => setForm(null)}
                      />
                    </Box>
                  )}
                  {sortTemplates(templates, jobs, sort, isReversed).map(
                    (template) => {
                      if (form?.kind === "rename" && form.id === template.id) {
                        return (
                          <Box component="li" key={template.id}>
                            <TemplateForm
                              title="Rename template"
                              name={draftName}
                              subtitle={draftSubtitle}
                              error={nameClash()}
                              hint={`${
                                jobs.some((j) => j.templateId === template.id)
                                  ? `Used by ${jobCountText(
                                      jobs.filter(
                                        (j) => j.templateId === template.id
                                      ).length
                                    )}. Renaming does not change any CV.`
                                  : "No job uses this template yet."
                              }`}
                              submitLabel="Rename"
                              submitDisabled={
                                draftName.trim() === "" || nameClash() !== ""
                              }
                              onName={setDraftName}
                              onSubtitle={setDraftSubtitle}
                              onSubmit={commit}
                              onCancel={() => setForm(null)}
                            />
                          </Box>
                        );
                      }
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
                              alignItems: "flex-start",
                              justifyContent: "space-between",
                              flexWrap: "wrap",
                              gap: 1,
                            }}
                          >
                            <Box sx={{ flex: "1 1 240px", minWidth: 0 }}>
                              <Box
                                sx={{ display: "flex", alignItems: "center" }}
                              >
                                <ButtonBase
                                  aria-pressed={isShown}
                                  aria-label={`Show a sample of ${template.name}`}
                                  onClick={() => setPickedId(template.id)}
                                  sx={{ textAlign: "left", borderRadius: 0.5 }}
                                >
                                  <Typography
                                    sx={{ fontWeight: 700, fontSize: 15 }}
                                  >
                                    {template.name}
                                  </Typography>
                                </ButtonBase>
                              </Box>
                              {template.subtitle ? (
                                <Typography
                                  sx={{
                                    fontSize: 12,
                                    color: WORKSPACE_COLORS.muted,
                                  }}
                                >
                                  {template.subtitle}
                                </Typography>
                              ) : (
                                <Button
                                  size="small"
                                  disabled={form !== null}
                                  startIcon={<AddOutlinedIcon />}
                                  onClick={(event: MouseEvent<HTMLElement>) => {
                                    event.stopPropagation();
                                    openRename(template);
                                  }}
                                  sx={{ fontSize: 12, alignSelf: "flex-start" }}
                                >
                                  Add a subtitle
                                </Button>
                              )}
                            </Box>
                            <Box
                              sx={{
                                display: "flex",
                                gap: 1,
                                flexWrap: "wrap",
                                justifyContent: "flex-end",
                                flex: "none",
                              }}
                            >
                              <Button
                                size="small"
                                sx={TOUCH_BUTTON_SX}
                                variant="contained"
                                component="a"
                                href={formatRoute(
                                  templatesRoute("sections", template.id)
                                )}
                                aria-label={`Edit template ${template.name}`}
                                onClick={(event: MouseEvent<HTMLElement>) => {
                                  event.stopPropagation();
                                  onAppLinkClick(
                                    event,
                                    templatesRoute("sections", template.id)
                                  );
                                }}
                              >
                                Edit
                              </Button>
                              <Box
                                component="span"
                                aria-hidden="true"
                                sx={{
                                  width: "1px",
                                  alignSelf: "stretch",
                                  mx: 0.5,
                                  bgcolor: WORKSPACE_COLORS.border,
                                }}
                              />
                              <Button
                                variant="outlined"
                                color="neutral"
                                size="small"
                                sx={TOUCH_BUTTON_SX}
                                disabled={form !== null}
                                aria-label={`Rename template ${template.name}`}
                                onClick={(event: MouseEvent<HTMLElement>) => {
                                  event.stopPropagation();
                                  openRename(template);
                                }}
                              >
                                Rename
                              </Button>
                              <Button
                                variant="outlined"
                                color="neutral"
                                size="small"
                                sx={TOUCH_BUTTON_SX}
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
                              <Box
                                component="span"
                                aria-hidden="true"
                                sx={{
                                  width: "1px",
                                  alignSelf: "stretch",
                                  mx: 0.5,
                                  bgcolor: WORKSPACE_COLORS.border,
                                }}
                              />
                              <Button
                                variant="outlined"
                                size="small"
                                sx={TOUCH_BUTTON_SX}
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
                                  {jobCountText(users.length)} prepared with
                                  this template
                                </ButtonBase>
                                <Collapse
                                  in={isExpanded}
                                  id={`template-jobs-${template.id}`}
                                >
                                  <TemplateJobsTable
                                    jobs={users}
                                    applications={applications}
                                  />
                                </Collapse>
                              </>
                            )}
                          </Box>
                        </Box>
                      );
                    }
                  )}
                </Box>
                <Typography
                  component="h2"
                  sx={{ fontSize: 15, fontWeight: 700, mt: 3, mb: 1 }}
                >
                  Premade templates
                </Typography>
                <Box
                  component="ul"
                  aria-label="Premade"
                  sx={{
                    listStyle: "none",
                    m: 0,
                    p: 0,
                    display: "grid",
                    gridTemplateColumns: "minmax(0, 1fr)",
                    gap: 2,
                  }}
                >
                  {PREMADE_TEMPLATES.map((premade) => (
                    <Box
                      component="li"
                      key={premade.key}
                      sx={{
                        border: `1px solid ${WORKSPACE_COLORS.border}`,
                        borderRadius: "6px",
                        bgcolor: WORKSPACE_COLORS.panel,
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
                        <Box
                          sx={{
                            display: "flex",
                            alignItems: "center",
                            gap: 1,
                          }}
                        >
                          <Typography sx={{ fontWeight: 700, fontSize: 15 }}>
                            {premade.name}
                          </Typography>
                          <Chip size="small" label="Premade" />
                        </Box>
                        <Button
                          size="small"
                          sx={TOUCH_BUTTON_SX}
                          variant="outlined"
                          aria-label={`Add ${premade.name} template to my templates`}
                          onClick={() => addPremade(premade)}
                        >
                          Add to my templates
                        </Button>
                      </Box>
                      <Typography
                        sx={{
                          fontSize: 12,
                          mt: 0.75,
                          color: WORKSPACE_COLORS.muted,
                        }}
                      >
                        {premade.description}
                      </Typography>
                    </Box>
                  ))}
                </Box>
              </Box>
            )}

            <Dialog
              open={asking?.kind === "delete"}
              onClose={() => setAsking(null)}
            >
              <DialogTitle>Delete template?</DialogTitle>
              <DialogContent>
                <DialogContentText>
                  “{asking?.template.name}” will be deleted. Your data (the
                  vault) and applications you already sent are not affected: an
                  application keeps its own frozen copy of the CV.
                </DialogContentText>
                {deletingJobs.length > 0 && (
                  <>
                    <DialogContentText sx={{ mt: 1.5, mb: 1.5 }}>
                      {jobCountText(deletingJobs.length)} use it (
                      {deletingJobs.map((j) => j.name).join(", ")}). Their look
                      will change to the template you choose:
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
          {isTemplatePlaceholder ? null : (
            <ResizableAside
              side="right"
              label="the sample CV"
              defaultWidth={380}
              stackBelow="md"
              stackedHeight={phone.stackedHeight}
            >
              <Box
                component="aside"
                aria-label="Sample CV panel"
                sx={{
                  width: "100%",
                  flex: "none",
                  bgcolor: WORKSPACE_COLORS.panel,
                  borderLeft: { md: `1px solid ${WORKSPACE_COLORS.border}` },
                  borderTop: {
                    xs: `1px solid ${WORKSPACE_COLORS.border}`,
                    md: 0,
                  },
                  p: 2,
                  py: phone.isPhone ? 0 : 2,
                  overflow: "auto",
                }}
              >
                {phone.toggle}
                {!phone.isCollapsed && (
                  <>
                    <Typography sx={{ fontWeight: 700, mb: 0.5 }}>
                      Sample
                      {tab === "templates" && shownTemplate
                        ? `: ${shownTemplate.name}`
                        : ""}
                    </Typography>
                    <Typography
                      sx={{
                        fontSize: 12,
                        color: WORKSPACE_COLORS.muted,
                        mb: 1.5,
                      }}
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
                  </>
                )}
              </Box>
            </ResizableAside>
          )}
        </Box>
      )}
    </Box>
  );
}
