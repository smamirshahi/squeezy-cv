import { useViewport } from "@hooks/use-viewport";
import { notify } from "@components/notifications/notify";
import { ResizableAside } from "@pages/workspace/resizable-aside";
import { WORKSPACE_COLORS } from "@pages/workspace/workspace-tokens";
import {
  Alert,
  Box,
  Button,
  Drawer,
  IconButton,
  InputAdornment,
  Link,
  MenuItem,
  Paper,
  Select,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from "@components/ui";
import {
  CheckOutlined as CheckIcon,
  CloseOutlined as CloseIcon,
  ExpandMoreOutlined as ExpandMoreIcon,
  OpenInNewOutlined as OpenInNewIcon,
  SearchOutlined as SearchIcon,
} from "@components/ui/icons";
import { MouseEvent, ReactNode, useEffect, useMemo, useState } from "react";
import {
  APPLICATION_STATUSES,
  ApplicationStatus,
  ApplicationSummary,
} from "@custom-types/application-types";
import {
  ListView,
  arrangeApplications,
  countByStatus,
  countNoReply,
  queryToView,
  viewToQuery,
} from "@shared/application/application-list";
import {
  STATUS_LABELS,
  formatDay,
  isNoReply,
  toIsoDay,
} from "@shared/application/application-utils";
import { rememberListSearch } from "@pages/applications-page/last-search";
import { onAppLinkClick } from "@hooks/navigation";
import { ExportAllButton } from "@pages/applications-page/export-all-button";
import { ApplicationView } from "@pages/applications-page/application-view";
import { Job } from "@custom-types/job-types";
import { Candidate } from "@custom-types/candidate-types";
import { isOverdue } from "@shared/candidate/candidate-utils";
import {
  openCandidateJob,
  useContinueCandidate,
} from "@pages/candidates-page/use-continue-candidate";
import {
  CHANCE_LABELS,
  FEELING_LABELS,
} from "@pages/workspace/job-details-page";
import {
  JobSummary,
  applicationPdfUrl,
  createApiClient,
} from "@store/persistence/api-client";

type LoadState =
  | { status: "loading" }
  | { status: "ready"; applications: ApplicationSummary[] }
  | { status: "error"; message: string };

type Stage = "draft" | "ready";

/** The colour of the dot in front of a status or stage */
const DOT_COLORS: Record<
  ApplicationStatus | Stage | "candidate" | "dropped",
  string
> = {
  candidate: "#7B5EA7",
  dropped: "#9AA0A6",
  draft: "#9AA0A6",
  ready: "#C2410C",
  applied: "#1976D2",
  interview: "#E0A800",
  offer: "#2E7D32",
  accepted: "#2E7D32",
  rejected: "#C62828",
  withdrawn: "#9AA0A6",
};

const STAGE_LABELS: Record<Stage, string> = {
  draft: "Draft",
  ready: "Ready to apply",
};

interface Option<T extends string> {
  value: T;
  label: string;
}

const STAGE_OPTIONS: Option<Stage>[] = [
  { value: "draft", label: STAGE_LABELS.draft },
  { value: "ready", label: STAGE_LABELS.ready },
];

const STATUS_OPTIONS: Option<ApplicationStatus>[] = APPLICATION_STATUSES.map(
  (status) => ({ value: status, label: STATUS_LABELS[status] })
);

const JOB_PREFIX = "job:";

type SortChoice = "newest" | "oldest" | "company";

const SORT_LABELS: Record<SortChoice, string> = {
  newest: "Newest",
  oldest: "Oldest",
  company: "Company A-Z",
};

function sortChoiceOf(view: ListView): SortChoice {
  if (view.sortKey === "company") {
    return "company";
  }
  return view.sortDirection === "asc" ? "oldest" : "newest";
}

/** The same words as the Job application form uses */
const WORD_LABELS: Record<string, string> = {
  onsite: "Onsite",
  hybrid: "Hybrid",
  remote: "Remote",
  fullTime: "Full time",
  partTime: "Part time",
  contract: "Contract",
  freelance: "Freelance",
  internship: "Internship",
};

function money(value: number | undefined): string {
  return value === undefined ? "" : value.toLocaleString("en-GB");
}

/** The details of a job that the list does not have room for: only the ones that are filled in */
function extraRows(job: Job | undefined): [string, string][] {
  if (!job) {
    return [];
  }
  const salary =
    job.salaryMax !== undefined && job.salaryIsRange !== false
      ? `${money(job.salaryMin)} - ${money(job.salaryMax)}`
      : money(job.salaryMin);
  const label = (word: string | undefined): string =>
    word === undefined ? "" : (WORD_LABELS[word] ?? word);
  const rows: [string, string][] = [
    ["URL", job.url ?? ""],
    ["Location", job.location ?? ""],
    ["Work mode", label(job.workMode)],
    ["Employment", label(job.employmentType)],
    ["Salary", salary],
    ["Expected salary", money(job.expectedSalary)],
    ["Feeling", job.feeling ? FEELING_LABELS[job.feeling] : ""],
    ["My chance", job.chance ? CHANCE_LABELS[job.chance] : ""],
  ];
  return rows.filter(([, value]) => value !== "");
}

function Dot({ color }: { color: string }): JSX.Element {
  return (
    <Box
      component="span"
      aria-hidden
      sx={{
        width: 8,
        height: 8,
        borderRadius: "50%",
        bgcolor: color,
        flex: "none",
      }}
    />
  );
}

/** A pill with a coloured dot; as a dropdown it opens the same pills */
function ChipSelect<T extends Stage | ApplicationStatus>({
  value,
  options,
  label,
  onChange,
  isLarge = false,
}: {
  value: T;
  options: Option<T>[];
  label: string;
  onChange: (value: T) => void;
  isLarge?: boolean;
}): JSX.Element {
  const pill = (option: Option<T>, hasArrow: boolean): JSX.Element => (
    <Box
      component="span"
      sx={{
        display: "inline-flex",
        alignItems: "center",
        gap: 0.75,
        px: isLarge ? 1.5 : 1.1,
        py: isLarge ? 0.6 : 0.3,
        fontSize: isLarge ? 14 : 13,
        fontWeight: 600,
        borderRadius: 99,
        border: `1px solid ${DOT_COLORS[option.value]}`,
        bgcolor: `${DOT_COLORS[option.value]}1A`,
        color: WORKSPACE_COLORS.text,
        whiteSpace: "nowrap",
      }}
    >
      <Dot color={DOT_COLORS[option.value]} />
      {option.label}
      {hasArrow && <ExpandMoreIcon sx={{ fontSize: 16 }} />}
    </Box>
  );
  const current = options.find((o) => o.value === value) ?? options[0];
  return (
    <Select
      size="small"
      variant="standard"
      disableUnderline
      value={current.value}
      IconComponent={() => null}
      SelectDisplayProps={{ "aria-label": label }}
      sx={{ "& .MuiSelect-select": { p: "0 !important" } }}
      onClick={(event) => event.stopPropagation()}
      onChange={(event) => onChange(event.target.value as T)}
      renderValue={() => pill(current, true)}
    >
      {options.map((option) => (
        <MenuItem key={option.value} value={option.value}>
          {pill(option, false)}
        </MenuItem>
      ))}
    </Select>
  );
}

/** All jobs and applications: filter by stage, search, click one to see it */
export function ApplicationsPage(): JSX.Element {
  const api = useMemo(() => createApiClient(), []);
  const [state, setState] = useState<LoadState>({ status: "loading" });
  const [view, setView] = useState<ListView>(() =>
    queryToView(window.location.search)
  );
  const [selectedId, setSelectedId] = useState<string>("");
  const [jobs, setJobs] = useState<JobSummary[]>([]);
  // Every job and template by id, to name the template of a row and to open its job
  const [allJobs, setAllJobs] = useState<JobSummary[]>([]);
  // Jobs parked to apply for later, not yet continued into a job
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  // Jobs dropped from Saved for later: kept here so they can be restored or deleted for good
  const [dropped, setDropped] = useState<Candidate[]>([]);
  const [actionError, setActionError] = useState<string>("");
  const continueCandidate = useContinueCandidate();
  const [templateNames, setTemplateNames] = useState<Record<string, string>>(
    {}
  );
  const today = toIsoDay(new Date());

  useEffect(() => {
    let isCancelled = false;
    api
      .listApplications()
      .then(async (applications) => {
        // Jobs that were never sent are drafts; failing to list them must not hide the rest
        const unsentJobs = await api.listJobs().catch(() => []);
        const templates = await api.listTemplates().catch(() => []);
        const parked = await api.listCandidates().catch(() => []);
        if (!isCancelled) {
          setCandidates(parked.filter((c) => c.status === "open"));
          setDropped(parked.filter((c) => c.status === "dropped"));
          setAllJobs(unsentJobs.filter((j) => !j.isCorrupt));
          setTemplateNames(
            Object.fromEntries(
              templates.filter((t) => !t.isCorrupt).map((t) => [t.id, t.name])
            )
          );
          const sent = new Set(applications.map((a) => a.jobId));
          setJobs(unsentJobs.filter((j) => !j.isCorrupt && !sent.has(j.id)));
          setState({ status: "ready", applications });
        }
      })
      .catch((caught: unknown) => {
        if (!isCancelled) {
          setState({
            status: "error",
            message:
              caught instanceof Error
                ? caught.message
                : "Something went wrong.",
          });
        }
      });
    return () => {
      isCancelled = true;
    };
  }, [api]);

  // The address keeps the search and filters, so "back" from an application finds them again
  useEffect(() => {
    window.history.replaceState(null, "", `/applications${viewToQuery(view)}`);
    rememberListSearch(viewToQuery(view));
  }, [view]);

  const readable = state.status === "ready" ? state.applications : [];

  async function reloadCandidates(): Promise<void> {
    const parked = await api.listCandidates();
    setCandidates(parked.filter((c) => c.status === "open"));
    setDropped(parked.filter((c) => c.status === "dropped"));
  }

  async function runCandidateAction(
    action: () => Promise<unknown>
  ): Promise<boolean> {
    setActionError("");
    try {
      await action();
      await reloadCandidates();
      return true;
    } catch (caught) {
      setActionError(caught instanceof Error ? caught.message : String(caught));
      return false;
    }
  }

  async function moveCandidate(
    candidate: Candidate,
    status: "open" | "dropped"
  ): Promise<void> {
    const isOk = await runCandidateAction(() =>
      api.updateCandidate(candidate.id, { status })
    );
    if (isOk) {
      const name = [candidate.role, candidate.company]
        .filter((part) => part !== "")
        .join(" · ");
      const isOpen = status === "open";
      notify({
        kind: "info",
        text: `${name || "The job"} ${
          isOpen ? "is back in Candidates." : "was dropped."
        }`,
        action: {
          label: isOpen ? "View candidates" : "View dropped",
          onClick: () =>
            setView((current) => ({
              ...current,
              status: isOpen ? "candidate" : "dropped",
            })),
        },
      });
    }
  }

  async function continueWith(candidate: Candidate): Promise<void> {
    // saved from a job that still exists: open it instead of making a second one
    const isExisting = allJobs.some((j) => j.id === candidate.jobId);
    const jobId =
      isExisting && candidate.jobId
        ? candidate.jobId
        : continueCandidate(candidate);
    await runCandidateAction(() =>
      api.updateCandidate(candidate.id, { status: "started", jobId })
    );
    openCandidateJob(jobId);
  }

  async function setStage(jobId: string, stage: Stage): Promise<void> {
    const job = await api.loadJob(jobId);
    await api.saveJob({ ...job, stage });
    setJobs((current) =>
      current.map((entry) => (entry.id === jobId ? { ...entry, stage } : entry))
    );
  }

  async function setApplicationStatus(
    id: string,
    status: ApplicationStatus
  ): Promise<void> {
    const updated = await api.updateApplication(id, {
      status,
      statusAt: today,
      statusNote: "",
    });
    setState((current) =>
      current.status === "ready"
        ? {
            ...current,
            applications: current.applications.map((a) =>
              a.id === id ? { ...a, status: updated.status } : a
            ),
          }
        : current
    );
  }

  const selectedJob = selectedId.startsWith(JOB_PREFIX)
    ? jobs.find((j) => `${JOB_PREFIX}${j.id}` === selectedId)
    : undefined;
  const selectedApplication = readable.find((a) => a.id === selectedId);
  const jobOfSelected = allJobs.find(
    (j) => j.id === selectedApplication?.jobId
  );
  const jobIdOfSelected = selectedJob?.id ?? selectedApplication?.jobId ?? "";
  const [fullJob, setFullJob] = useState<Job | undefined>(undefined);
  useEffect(() => {
    let isCancelled = false;
    setFullJob(undefined);
    if (jobIdOfSelected !== "") {
      api
        .loadJob(jobIdOfSelected)
        .then((job) => {
          if (!isCancelled) {
            setFullJob(job);
          }
        })
        .catch(() => undefined);
    }
    return () => {
      isCancelled = true;
    };
  }, [api, jobIdOfSelected]);
  const isSideBySide = useViewport() === "desktop";
  const interviews = readable.filter((a) => a.status === "interview").length;
  const subtitle = [
    `${jobs.length + readable.length} ${jobs.length + readable.length === 1 ? "job" : "jobs"}`,
    `${readable.length} sent`,
    ...(interviews > 0 ? [`${interviews} interview`] : []),
  ].join(" · ");

  const detail = (
    <Box
      component="aside"
      aria-label="Application detail"
      sx={{
        width: "100%",
        flex: "none",
        height: "100%",
        overflow: "auto",
        borderLeft: `1px solid ${WORKSPACE_COLORS.border}`,
        boxShadow: "-6px 0 20px rgba(0,0,0,.10)",
        bgcolor: WORKSPACE_COLORS.panel,
        color: WORKSPACE_COLORS.text,
      }}
    >
      {selectedJob ? (
        <JobPanel
          key={selectedJob.id}
          job={selectedJob}
          templateName={templateNames[selectedJob.templateId]}
          extra={extraRows(fullJob)}
          onStage={(stage) => void setStage(selectedJob.id, stage)}
          onClose={() => setSelectedId("")}
        />
      ) : (
        <>
          <Box
            sx={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "start",
              p: 2.5,
              pb: 0,
            }}
          >
            <Box>
              <Typography variant="h6">{selectedApplication?.role}</Typography>
              <Typography sx={{ color: WORKSPACE_COLORS.muted }}>
                {selectedApplication?.company}
              </Typography>
            </Box>
            <IconButton aria-label="Close" onClick={() => setSelectedId("")}>
              <CloseIcon />
            </IconButton>
          </Box>
          {selectedApplication && (
            <Box sx={{ px: 2.5, pt: 2 }}>
              <JobData
                rows={[
                  ["Job", selectedApplication.jobName || "-"],
                  ["Company", selectedApplication.company],
                  ["Role", selectedApplication.role],
                  [
                    "Template",
                    selectedApplication.templateName ||
                      templateNames[jobOfSelected?.templateId ?? ""] ||
                      "-",
                  ],
                  ...extraRows(fullJob),
                ]}
              />
            </Box>
          )}
          <ApplicationView
            key={selectedId}
            applicationId={selectedId}
            draftCreatedAt={jobOfSelected?.createdAt}
            isEmbedded
          />
        </>
      )}
    </Box>
  );

  return (
    <Box sx={{ flex: 1, minWidth: 0, minHeight: 0, display: "flex" }}>
      <Box
        sx={{
          flex: 1,
          minHeight: 0,
          minWidth: 0,
          display: "flex",
          flexDirection: { xs: "column", md: "row" },
        }}
      >
        <CategoriesSidebar
          applications={readable}
          jobs={jobs}
          candidateCount={candidates.length}
          droppedCount={dropped.length}
          status={view.status}
          today={today}
          onChange={(status) => setView({ ...view, status })}
        />
        <Box
          sx={{
            flex: 1,
            minWidth: 0,
            minHeight: 0,
            overflow: "auto",
            p: { xs: 2, md: 3 },
            display: "flex",
            flexDirection: "column",
            gap: 2,
            bgcolor: "var(--bg)",
          }}
        >
          <Box sx={{ display: "flex", alignItems: "flex-start", gap: 1 }}>
            <Box sx={{ flex: 1 }}>
              <Typography variant="h4" component="h1">
                Applications
              </Typography>
              {state.status === "ready" && (
                <Typography sx={{ color: "text.secondary" }}>
                  {subtitle}
                </Typography>
              )}
            </Box>
          </Box>
          {actionError !== "" && <Alert severity="error">{actionError}</Alert>}

          {state.status === "loading" && <Typography>Loading…</Typography>}
          {state.status === "error" && (
            <Alert severity="error">{state.message}</Alert>
          )}

          {state.status === "ready" && (
            <ApplicationsTable
              applications={state.applications}
              jobs={jobs}
              candidates={candidates}
              dropped={dropped}
              onRestore={(candidate) => void moveCandidate(candidate, "open")}
              onContinue={(candidate) => void continueWith(candidate)}
              onDrop={(candidate) => void moveCandidate(candidate, "dropped")}
              onDelete={(candidate) =>
                void runCandidateAction(() => api.deleteCandidate(candidate.id))
              }
              view={view}
              onViewChange={setView}
              today={today}
              selectedId={selectedId}
              onSelect={setSelectedId}
              allJobs={allJobs}
              templateNames={templateNames}
              onStage={(jobId, stage) => void setStage(jobId, stage)}
              onStatus={(id, status) => void setApplicationStatus(id, status)}
            />
          )}
        </Box>
        {selectedId && !isSideBySide && (
          <Drawer
            anchor="right"
            open
            onClose={() => setSelectedId("")}
            slotProps={{
              paper: {
                sx: { width: { xs: "100%", sm: 520 }, maxWidth: "100%" },
              },
            }}
          >
            {detail}
          </Drawer>
        )}
        {selectedId && isSideBySide && (
          <ResizableAside
            side="right"
            label="the application panel"
            defaultWidth={560}
          >
            {detail}
          </ResizableAside>
        )}
      </Box>
    </Box>
  );
}

function SmallHeading({ children }: { children: ReactNode }): JSX.Element {
  return (
    <Typography
      sx={{
        fontSize: 12,
        fontWeight: 700,
        letterSpacing: "0.08em",
        textTransform: "uppercase",
        color: WORKSPACE_COLORS.muted,
        mb: 1,
        mt: 2,
      }}
    >
      {children}
    </Typography>
  );
}

interface ProgressStep {
  label: string;
  note: string;
  state: "done" | "current" | "todo";
}

/** Draft, Ready to apply, Applied: where this job is */
function Progress({ steps }: { steps: ProgressStep[] }): JSX.Element {
  return (
    <Box>
      <SmallHeading>Progress</SmallHeading>
      <Box sx={{ display: "grid", gap: 1.5 }}>
        {steps.map((step) => (
          <Box key={step.label} sx={{ display: "flex", gap: 1.5 }}>
            <Box
              sx={{
                width: 24,
                height: 24,
                borderRadius: "50%",
                flex: "none",
                display: "grid",
                placeItems: "center",
                color: "#fff",
                bgcolor:
                  step.state === "done"
                    ? "#2E7D32"
                    : step.state === "current"
                      ? "transparent"
                      : "transparent",
                border:
                  step.state === "current"
                    ? `6px solid ${DOT_COLORS.ready}`
                    : step.state === "todo"
                      ? `2px solid ${WORKSPACE_COLORS.borderStrong}`
                      : 0,
              }}
            >
              {step.state === "done" && <CheckIcon sx={{ fontSize: 16 }} />}
            </Box>
            <Box>
              <Typography sx={{ fontWeight: 600, lineHeight: 1.2 }}>
                {step.label}
              </Typography>
              <Typography sx={{ color: WORKSPACE_COLORS.muted, fontSize: 13 }}>
                {step.note}
              </Typography>
            </Box>
          </Box>
        ))}
      </Box>
    </Box>
  );
}

/** Label and value rows with a line between them */
function JobData({ rows }: { rows: [string, string][] }): JSX.Element {
  return (
    <Box>
      <SmallHeading>Job data</SmallHeading>
      <Box sx={{ borderTop: `1px solid ${WORKSPACE_COLORS.border}` }}>
        {rows.map(([label, value]) => (
          <Box
            key={label}
            sx={{
              display: "grid",
              gridTemplateColumns: "130px 1fr",
              py: 1.1,
              borderBottom: `1px solid ${WORKSPACE_COLORS.border}`,
            }}
          >
            <Typography sx={{ color: WORKSPACE_COLORS.muted, fontSize: 14 }}>
              {label}
            </Typography>
            <Typography>{value}</Typography>
          </Box>
        ))}
      </Box>
    </Box>
  );
}

/** The right panel for a job that was not sent yet */
function JobPanel({
  job,
  templateName,
  extra,
  onStage,
  onClose,
}: {
  job: JobSummary;
  templateName?: string;
  extra: [string, string][];
  onStage: (stage: Stage) => void;
  onClose: () => void;
}): JSX.Element {
  const stage = job.stage ?? "draft";
  return (
    <Box sx={{ p: 2.5, display: "grid", gap: 1.5, alignContent: "start" }}>
      <Box sx={{ display: "flex", justifyContent: "space-between", gap: 1 }}>
        <Box>
          <Typography variant="h6">{job.role || job.name}</Typography>
          <Typography sx={{ color: WORKSPACE_COLORS.muted }}>
            {job.company || "-"}
          </Typography>
        </Box>
        <IconButton aria-label="Close" onClick={onClose}>
          <CloseIcon />
        </IconButton>
      </Box>
      <Box sx={{ justifySelf: "start" }}>
        <ChipSelect
          isLarge
          label={`Stage of ${job.name}`}
          value={stage}
          options={STAGE_OPTIONS}
          onChange={onStage}
        />
      </Box>
      <Box
        sx={{
          p: 2,
          borderRadius: 1,
          border: `1px solid ${DOT_COLORS.ready}`,
          bgcolor: WORKSPACE_COLORS.accentSoft,
          display: "grid",
          gap: 1,
        }}
      >
        <Typography
          sx={{ fontWeight: 700, color: WORKSPACE_COLORS.accentText }}
        >
          Next step
        </Typography>
        <Typography>
          Open the job, export the PDF, send it, then choose{" "}
          <strong>Mark as applied</strong>. The CV you sent is saved as a frozen
          copy.
        </Typography>
        <Box sx={{ display: "flex", gap: 1 }}>
          <Button
            variant="contained"
            href={`/jobs/${encodeURIComponent(job.id)}?view=details`}
            onClick={(event) =>
              onAppLinkClick(event, {
                kind: "jobs",
                jobId: job.id,
                view: "details",
              })
            }
          >
            Open job
          </Button>
          <Button
            variant="outlined"
            onClick={() => onStage(stage === "ready" ? "draft" : "ready")}
          >
            {stage === "ready" ? "Back to draft" : "Mark as ready"}
          </Button>
        </Box>
      </Box>
      <Progress
        steps={[
          {
            label: "Draft",
            note: `Created ${formatDay(job.createdAt)}`,
            state: "done",
          },
          {
            label: "Ready to apply",
            note: stage === "ready" ? "Current step" : "Not yet",
            state: stage === "ready" ? "current" : "todo",
          },
          { label: "Applied", note: "Not sent yet", state: "todo" },
        ]}
      />
      <JobData
        rows={[
          ["Job", job.name],
          ["Company", job.company || "-"],
          ["Role", job.role || "-"],
          ["Template", templateName || "-"],
          ...extra,
          ["Created", formatDay(job.createdAt)],
        ]}
      />
    </Box>
  );
}

interface SidebarProps {
  applications: ApplicationSummary[];
  jobs: JobSummary[];
  candidateCount: number;
  droppedCount: number;
  status: ListView["status"];
  today: string;
  onChange: (status: ListView["status"]) => void;
}

interface Tile {
  key: ListView["status"];
  label: string;
  count: number;
}

/** The filters of the list: All jobs, then before sending, sent and needs a nudge. */
function CategoriesSidebar({
  applications,
  jobs,
  candidateCount,
  droppedCount,
  status,
  today,
  onChange,
}: SidebarProps): JSX.Element {
  const counts = countByStatus(applications);
  const readable = applications.filter((a) => !a.isCorrupt).length;
  const noReply = countNoReply(applications, today);
  const groups: { title: string; tiles: Tile[] }[] = [
    {
      title: "Before sending",
      tiles: [
        { key: "candidate", label: "Candidates", count: candidateCount },
        {
          key: "draft",
          label: "Draft",
          count: jobs.filter((j) => (j.stage ?? "draft") === "draft").length,
        },
        {
          key: "ready",
          label: "Ready to apply",
          count: jobs.filter((j) => j.stage === "ready").length,
        },
      ],
    },
    {
      title: "Sent",
      tiles: APPLICATION_STATUSES.map((s) => ({
        key: s,
        label: STATUS_LABELS[s],
        count: counts[s],
      })),
    },
    // Only when something was dropped
    ...(droppedCount > 0
      ? [
          {
            title: "Dropped",
            tiles: [
              {
                key: "dropped" as const,
                label: "Dropped",
                count: droppedCount,
              },
            ],
          },
        ]
      : []),
    // Nothing needs a nudge: the group stays out of the way
    ...(noReply > 0
      ? [
          {
            title: "Needs a nudge",
            tiles: [
              { key: "noReply" as const, label: "No reply", count: noReply },
            ],
          },
        ]
      : []),
  ];

  function renderTile(tile: Tile): JSX.Element {
    const isOn = status === tile.key;
    const dot =
      tile.key === "all"
        ? undefined
        : tile.key === "noReply"
          ? "#E0A800"
          : DOT_COLORS[tile.key];
    return (
      <Box
        key={tile.key}
        component="button"
        type="button"
        aria-pressed={isOn}
        onClick={() => onChange(tile.key)}
        sx={{
          display: "flex",
          alignItems: "center",
          gap: 1.25,
          textAlign: "left",
          flex: "none",
          whiteSpace: "nowrap",
          px: 1.5,
          py: { xs: 1.1, md: 0.9 },
          minHeight: { xs: 44, md: 0 },
          cursor: "pointer",
          font: "inherit",
          fontSize: 14,
          fontWeight: isOn ? 700 : 400,
          color: isOn ? WORKSPACE_COLORS.accentText : WORKSPACE_COLORS.text,
          bgcolor: isOn ? WORKSPACE_COLORS.accentSoft : "transparent",
          border: {
            xs: `1px solid ${isOn ? DOT_COLORS.ready : WORKSPACE_COLORS.border}`,
            md: 0,
          },
          borderLeft: {
            md: `3px solid ${isOn ? DOT_COLORS.ready : "transparent"}`,
          },
          borderRadius: { xs: 5, md: 1 },
          "&:hover": { bgcolor: isOn ? undefined : WORKSPACE_COLORS.hover },
        }}
      >
        {dot && <Dot color={dot} />}
        <Box component="span" sx={{ flex: 1 }}>
          {tile.label}
        </Box>
        <Box
          component="span"
          sx={{ opacity: tile.count === 0 && !isOn ? 0.45 : 1 }}
        >
          {tile.count}
        </Box>
      </Box>
    );
  }

  return (
    <ResizableAside
      side="left"
      label="the status list"
      defaultWidth={230}
      stackBelow="md"
      stackedHeight={64}
    >
      <Box
        component="nav"
        aria-label="Filter by status"
        sx={{
          width: "100%",
          flex: "none",
          overflow: "auto",
          bgcolor: WORKSPACE_COLORS.panel,
          p: 1.5,
          display: "flex",
          // Below a small laptop the list of filters is one row of chips that scrolls inside itself
          flexDirection: { xs: "row", md: "column" },
          alignItems: { xs: "center", md: "stretch" },
          gap: { xs: 1, md: 0.25 },
          borderRight: { xs: 0, md: `1px solid ${WORKSPACE_COLORS.border}` },
          borderBottom: { xs: `1px solid ${WORKSPACE_COLORS.border}`, md: 0 },
        }}
      >
        {renderTile({
          key: "all",
          label: "All jobs",
          count: readable + jobs.length + candidateCount,
        })}
        {groups.map((group) => (
          <Box
            key={group.title}
            sx={{
              display: { xs: "contents", md: "grid" },
              gap: 0.25,
            }}
          >
            <Box sx={{ display: { xs: "none", md: "block" } }}>
              <SmallHeading>{group.title}</SmallHeading>
            </Box>
            {group.tiles.map(renderTile)}
          </Box>
        ))}
      </Box>
    </ResizableAside>
  );
}

/**
 * On a phone the table is a list of cards, drawn by the same cells: each row becomes a grid
 * (company and status, role and template, date and the open button), the header goes away.
 */
const PHONE_TABLE_SX = {
  display: { xs: "block", sm: "table" },
  "& tbody": { display: { xs: "block", sm: "table-row-group" } },
  "& tbody tr": {
    display: { xs: "grid", sm: "table-row" },
    gridTemplateColumns: "1fr auto",
    columnGap: 1,
    alignItems: "center",
    padding: { xs: "10px 14px", sm: 0 },
    borderBottom: { xs: `1px solid ${WORKSPACE_COLORS.border}`, sm: 0 },
  },
  "& tbody tr > td": {
    display: { xs: "block", sm: "table-cell" },
    border: { xs: 0, sm: undefined },
    minWidth: 0,
  },
  // Grid placement only matters when the row is a grid; a table cell ignores it
  "& tbody tr > td:nth-of-type(1)": { gridColumn: 1, gridRow: 1 },
  "& tbody tr > td:nth-of-type(2)": { gridColumn: "1 / -1", gridRow: 2 },
  "& tbody tr > td:nth-of-type(3)": { gridColumn: 2, gridRow: 1 },
  "& tbody tr > td:nth-of-type(4)": { gridColumn: 1, gridRow: 3 },
  "& tbody tr > td:nth-of-type(5)": { gridColumn: 2, gridRow: 3 },
  "& tbody tr > td[colspan]": { gridColumn: "1 / -1", gridRow: "auto" },
} as const;

type Row =
  | { kind: "job"; id: string; job: JobSummary }
  | { kind: "application"; id: string; application: ApplicationSummary }
  | {
      kind: "candidate";
      id: string;
      candidate: Candidate;
      isDropped: boolean;
    };

interface TableProps {
  applications: ApplicationSummary[];
  jobs: JobSummary[];
  candidates: Candidate[];
  dropped: Candidate[];
  onRestore: (candidate: Candidate) => void;
  onContinue: (candidate: Candidate) => void;
  onDrop: (candidate: Candidate) => void;
  onDelete: (candidate: Candidate) => void;
  view: ListView;
  onViewChange: (view: ListView) => void;
  today: string;
  selectedId: string;
  onSelect: (id: string) => void;
  allJobs: JobSummary[];
  templateNames: Record<string, string>;
  onStage: (jobId: string, stage: Stage) => void;
  onStatus: (id: string, status: ApplicationStatus) => void;
}

function ApplicationsTable({
  applications,
  jobs,
  candidates,
  dropped,
  onRestore,
  onContinue,
  onDrop,
  onDelete,
  view,
  onViewChange,
  today,
  selectedId,
  onSelect,
  allJobs,
  templateNames,
  onStage,
  onStatus,
}: TableProps): JSX.Element {
  const jobsById = new Map(allJobs.map((j) => [j.id, j]));
  /** The template a row used: the name saved with the application, else the job's template today */
  function templateOf(templateId: string, jobId: string, saved = ""): string {
    return (
      saved ||
      templateNames[templateId] ||
      templateNames[jobsById.get(jobId)?.templateId ?? ""] ||
      "-"
    );
  }

  // Jobs and applications in one list, newest first (or as chosen)
  const query = view.query.trim().toLowerCase();
  const unsent = jobs.filter((job) => {
    const stage = job.stage ?? "draft";
    return (
      (view.status === "all" || view.status === stage) &&
      (query === "" ||
        [
          job.name,
          job.company ?? "",
          job.role ?? "",
          templateNames[job.templateId] ?? "",
        ].some((text) => text.toLowerCase().includes(query)))
    );
  });
  const sent = arrangeApplications([...applications], view, today);
  const parked = candidates.filter(
    (candidate) =>
      (view.status === "all" || view.status === "candidate") &&
      (query === "" ||
        [candidate.company, candidate.role, candidate.note ?? ""].some((text) =>
          text.toLowerCase().includes(query)
        ))
  );
  const droppedShown = dropped.filter(
    (candidate) =>
      view.status === "dropped" &&
      (query === "" ||
        [candidate.company, candidate.role, candidate.note ?? ""].some((text) =>
          text.toLowerCase().includes(query)
        ))
  );
  const rows: Row[] = [
    ...parked.map((candidate) => ({
      kind: "candidate" as const,
      id: `candidate:${candidate.id}`,
      candidate,
      isDropped: false,
    })),
    ...droppedShown.map((candidate) => ({
      kind: "candidate" as const,
      id: `candidate:${candidate.id}`,
      candidate,
      isDropped: true,
    })),
    ...unsent.map((job) => ({
      kind: "job" as const,
      id: `${JOB_PREFIX}${job.id}`,
      job,
    })),
    ...sent.map((application) => ({
      kind: "application" as const,
      id: application.id,
      application,
    })),
  ];
  const sign = view.sortDirection === "asc" ? 1 : -1;
  const dateOf = (row: Row): string =>
    row.kind === "job"
      ? row.job.createdAt
      : row.kind === "candidate"
        ? row.candidate.createdAt
        : row.application.appliedAt;
  const companyOf = (row: Row): string =>
    row.kind === "job"
      ? row.job.company || row.job.name
      : row.kind === "candidate"
        ? row.candidate.company
        : row.application.company;
  rows.sort((a, b) =>
    view.sortKey === "company"
      ? companyOf(a).localeCompare(companyOf(b), "en", { sensitivity: "base" })
      : sign * dateOf(a).localeCompare(dateOf(b))
  );

  return (
    <>
      <Box
        sx={{
          display: "flex",
          gap: 1.5,
          flexWrap: { xs: "wrap", lg: "nowrap" },
          alignItems: "flex-start",
        }}
      >
        <TextField
          size="small"
          placeholder="Search company, role or template"
          value={view.query}
          onChange={(event) =>
            onViewChange({ ...view, query: event.target.value })
          }
          sx={{ flex: { xs: "1 1 100%", sm: "1 1 220px", lg: 1 }, minWidth: 0 }}
          slotProps={{
            htmlInput: { "aria-label": "Search company, role or template" },
            input: {
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon fontSize="small" />
                </InputAdornment>
              ),
            },
          }}
        />
        <Select
          size="small"
          value={sortChoiceOf(view)}
          inputProps={{ "aria-label": "Sort" }}
          renderValue={(choice) => `Sort: ${SORT_LABELS[choice]}`}
          onChange={(event) => {
            const choice = event.target.value;
            onViewChange({
              ...view,
              sortKey: choice === "company" ? "company" : "appliedAt",
              sortDirection:
                choice === "company" || choice === "oldest" ? "asc" : "desc",
            });
          }}
          sx={{ minWidth: 170, flex: { xs: 1, sm: "none" } }}
        >
          {(Object.keys(SORT_LABELS) as SortChoice[]).map((choice) => (
            <MenuItem key={choice} value={choice}>
              {SORT_LABELS[choice]}
            </MenuItem>
          ))}
        </Select>
        <ExportAllButton count={applications.length} />
      </Box>

      <Paper
        variant="outlined"
        sx={{ overflow: { xs: "visible", sm: "auto" } }}
      >
        <Table sx={PHONE_TABLE_SX}>
          <TableHead sx={{ display: { xs: "none", sm: "table-header-group" } }}>
            <TableRow>
              {["Company", "Role · Template", "Status", "Applied"].map(
                (title) => (
                  <TableCell
                    key={title}
                    sx={{
                      fontSize: 12,
                      fontWeight: 700,
                      letterSpacing: "0.08em",
                      textTransform: "uppercase",
                      color: WORKSPACE_COLORS.muted,
                    }}
                  >
                    {title}
                  </TableCell>
                )
              )}
              <TableCell />
            </TableRow>
          </TableHead>
          <TableBody>
            {rows.map((row) => {
              if (row.kind === "candidate") {
                const { candidate, isDropped } = row;
                const isLate = !isDropped && isOverdue(candidate, today);
                return (
                  <TableRow
                    key={row.id}
                    sx={{
                      "& td": {
                        py: { xs: 0.5, sm: 1.5 },
                        px: { xs: 0, sm: 1, lg: 2 },
                        verticalAlign: "middle",
                      },
                      "& td:first-of-type": {
                        borderLeft: `3px solid ${DOT_COLORS.candidate}`,
                      },
                    }}
                  >
                    <TableCell sx={{ fontWeight: 700 }}>
                      {candidate.company || "-"}
                    </TableCell>
                    <TableCell>
                      <Typography>{candidate.role || "-"}</Typography>
                      <Typography
                        sx={{ color: WORKSPACE_COLORS.muted, fontSize: 13 }}
                      >
                        {candidate.note ?? ""}
                        {candidate.jobUrl && (
                          <>
                            {candidate.note ? " · " : ""}
                            <Link
                              href={candidate.jobUrl}
                              target="_blank"
                              rel="noreferrer"
                            >
                              Advert
                            </Link>
                          </>
                        )}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Box
                        sx={{
                          display: "flex",
                          alignItems: "center",
                          gap: 0.75,
                        }}
                      >
                        <Dot
                          color={
                            isDropped
                              ? DOT_COLORS.dropped
                              : DOT_COLORS.candidate
                          }
                        />
                        <Typography>
                          {isDropped ? "Dropped" : "Candidate"}
                        </Typography>
                      </Box>
                    </TableCell>
                    <TableCell>
                      {candidate.applyBy ? (
                        <Typography
                          sx={{ color: isLate ? "error.main" : undefined }}
                        >
                          {isLate ? "Overdue · " : "Apply by "}
                          {formatDay(candidate.applyBy)}
                        </Typography>
                      ) : (
                        <Typography sx={{ color: WORKSPACE_COLORS.muted }}>
                          No apply-by day
                        </Typography>
                      )}
                    </TableCell>
                    <TableCell align="right" sx={{ whiteSpace: "nowrap" }}>
                      {isDropped ? (
                        <Button
                          size="small"
                          onClick={() => onRestore(candidate)}
                        >
                          Restore
                        </Button>
                      ) : (
                        <>
                          <Button
                            size="small"
                            onClick={() => onContinue(candidate)}
                          >
                            Continue
                          </Button>
                          <Button
                            size="small"
                            onClick={() => onDrop(candidate)}
                          >
                            Drop
                          </Button>
                        </>
                      )}
                      <Button
                        size="small"
                        color="error"
                        onClick={() => onDelete(candidate)}
                      >
                        Delete
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              }
              if (row.kind === "application" && row.application.isCorrupt) {
                return (
                  <TableRow key={row.id}>
                    <TableCell colSpan={5}>
                      <Alert severity="warning" sx={{ py: 0 }}>
                        Cannot read the application “{row.id}”. Its files were
                        left untouched.
                      </Alert>
                    </TableCell>
                  </TableRow>
                );
              }
              const isOn = row.id === selectedId;
              const job = row.kind === "job" ? row.job : undefined;
              const application =
                row.kind === "application" ? row.application : undefined;
              const jobId = job?.id ?? application?.jobId ?? "";
              // A job without a company yet is known by its name
              const company =
                job?.company || job?.name || application?.company || "-";
              const role = job?.role || application?.role || "-";
              const template = job
                ? templateOf(job.templateId, job.id)
                : templateOf(
                    application?.templateId ?? "",
                    jobId,
                    application?.templateName
                  );
              return (
                <TableRow
                  key={row.id}
                  hover
                  sx={{
                    cursor: "pointer",
                    "& td": {
                      py: { xs: 0.5, sm: 1.5 },
                      px: { xs: 0, sm: 1, lg: 2 },
                      verticalAlign: "middle",
                    },
                    "& td:first-of-type": {
                      borderLeft: `3px solid ${
                        isOn ? DOT_COLORS.ready : "transparent"
                      }`,
                    },
                  }}
                  selected={isOn}
                  onClick={() => onSelect(row.id)}
                >
                  <TableCell sx={{ fontWeight: 700 }}>
                    {application ? (
                      <Link
                        href={`/applications/${encodeURIComponent(application.id)}`}
                        underline="hover"
                        color="inherit"
                        onClick={(event) => {
                          event.stopPropagation();
                          onAppLinkClick(event, {
                            kind: "application",
                            id: application.id,
                          });
                        }}
                      >
                        {company}
                      </Link>
                    ) : (
                      company
                    )}
                  </TableCell>
                  <TableCell>
                    <Typography>{role}</Typography>
                    <Typography
                      sx={{ color: WORKSPACE_COLORS.muted, fontSize: 13 }}
                    >
                      {template}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    {job && (
                      <ChipSelect
                        label={`Stage of ${job.name}`}
                        value={job.stage ?? "draft"}
                        options={STAGE_OPTIONS}
                        onChange={(stage) => onStage(job.id, stage)}
                      />
                    )}
                    {application && (
                      <Box
                        sx={{
                          display: "flex",
                          alignItems: "center",
                          flexWrap: "wrap",
                          gap: 0.75,
                        }}
                      >
                        <ChipSelect
                          label={`Status of ${application.company}`}
                          value={application.status}
                          options={STATUS_OPTIONS}
                          onChange={(status) =>
                            onStatus(application.id, status)
                          }
                        />
                        {isNoReply(application, today) && (
                          <Typography
                            sx={{ fontSize: 12, color: "warning.main" }}
                          >
                            No reply
                          </Typography>
                        )}
                      </Box>
                    )}
                  </TableCell>
                  <TableCell>
                    {application ? (
                      <>
                        <Typography>
                          {formatDay(application.appliedAt)}
                        </Typography>
                        <Typography
                          sx={{ color: WORKSPACE_COLORS.muted, fontSize: 13 }}
                        >
                          CV sent ·{" "}
                          <Link
                            href={applicationPdfUrl(application.id)}
                            target="_blank"
                            rel="noreferrer"
                            onClick={(event) => event.stopPropagation()}
                          >
                            View
                          </Link>
                        </Typography>
                      </>
                    ) : (
                      <Typography sx={{ color: WORKSPACE_COLORS.muted }}>
                        Not sent yet
                      </Typography>
                    )}
                  </TableCell>
                  <TableCell align="right">
                    {jobsById.has(jobId) ? (
                      <OpenJobButton
                        jobId={jobId}
                        label={job?.name || application?.jobName || company}
                      />
                    ) : null}
                  </TableCell>
                </TableRow>
              );
            })}
            {rows.length === 0 && (
              <TableRow>
                <TableCell colSpan={5}>
                  {query !== ""
                    ? "No job or application matches this search."
                    : view.status === "all"
                      ? "No jobs yet. Create one, then mark it as applied once you have sent it."
                      : "Nothing here yet."}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </Paper>
    </>
  );
}

function OpenJobButton({
  jobId,
  label,
}: {
  jobId: string;
  label: string;
}): JSX.Element {
  return (
    <IconButton
      size="small"
      component="a"
      href={`/jobs/${encodeURIComponent(jobId)}?view=details`}
      target="_blank"
      rel="noreferrer"
      aria-label={`Open job ${label}`}
      title="Open the job in a new tab"
      onClick={(event: MouseEvent<HTMLElement>) => event.stopPropagation()}
    >
      <OpenInNewIcon fontSize="small" />
    </IconButton>
  );
}
