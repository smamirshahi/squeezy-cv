import { ResizableAside } from "@pages/workspace/resizable-aside";
import { WORKSPACE_COLORS } from "@pages/workspace/workspace-tokens";
import {
  Alert,
  Box,
  Button,
  Chip,
  IconButton,
  InputAdornment,
  Link,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TableSortLabel,
  TextField,
  Typography,
} from "@mui/material";
import DownloadIcon from "@mui/icons-material/DownloadOutlined";
import SearchIcon from "@mui/icons-material/Search";
import VisibilityIcon from "@mui/icons-material/VisibilityOutlined";
import { useEffect, useMemo, useState } from "react";
import {
  APPLICATION_STATUSES,
  ApplicationStatus,
  ApplicationSummary,
} from "@custom-types/application-types";
import {
  ListView,
  SortKey,
  arrangeApplications,
  countByStatus,
  countNoReply,
  queryToView,
  summariseApplications,
  viewToQuery,
} from "@shared/application/application-list";
import {
  STATUS_LABELS,
  formatDay,
  isNoReply,
  toIsoDay,
} from "@shared/application/application-utils";
import { onAppLinkClick } from "@hooks/navigation";
import { ApplicationView } from "@pages/applications-page/application-view";
import {
  JobSummary,
  applicationPdfUrl,
  createApiClient,
} from "@store/persistence/api-client";

type LoadState =
  | { status: "loading" }
  | { status: "ready"; applications: ApplicationSummary[] }
  | { status: "error"; message: string };

const STATUS_COLORS: Record<
  ApplicationStatus,
  "default" | "info" | "success" | "error" | "warning"
> = {
  applied: "default",
  interview: "info",
  offer: "success",
  accepted: "success",
  rejected: "error",
  withdrawn: "default",
};

/** What the user sees for a status: its name, plus "No reply" once nothing has happened for a while */
function StatusLabel({
  application,
  today,
}: {
  application: ApplicationSummary;
  today: string;
}): JSX.Element {
  return (
    <Box
      sx={{
        display: "flex",
        gap: 0.5,
        flexWrap: "wrap",
      }}
    >
      <Chip
        size="small"
        label={STATUS_LABELS[application.status]}
        color={STATUS_COLORS[application.status]}
        variant={application.status === "withdrawn" ? "outlined" : "filled"}
      />
      {isNoReply(application, today) && (
        <Chip
          size="small"
          label="No reply"
          color="warning"
          variant="outlined"
        />
      )}
    </Box>
  );
}

/** All job applications: search, filter by status, click one to open it */
export function ApplicationsPage(): JSX.Element {
  const api = useMemo(() => createApiClient(), []);
  const [state, setState] = useState<LoadState>({ status: "loading" });
  const [view, setView] = useState<ListView>(() =>
    queryToView(window.location.search)
  );
  const [selectedId, setSelectedId] = useState<string>("");
  const [jobs, setJobs] = useState<JobSummary[]>([]);
  const today = toIsoDay(new Date());

  useEffect(() => {
    let isCancelled = false;
    api
      .listApplications()
      .then(async (applications) => {
        // Jobs that were never sent are drafts; failing to list them must not hide the rest
        const unsentJobs = await api.listJobs().catch(() => []);
        if (!isCancelled) {
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
  }, [view]);

  function sortBy(key: SortKey): void {
    setView((current) => {
      // Clicking the sorted column flips it; a new column starts A-Z or newest first
      const isSame = current.sortKey === key;
      const first = key === "company" ? "asc" : "desc";
      const flipped = current.sortDirection === "asc" ? "desc" : "asc";
      return {
        ...current,
        sortKey: key,
        sortDirection: isSame ? flipped : first,
      };
    });
  }

  const jobRows = arrangeJobs(jobs, view);
  const readable = state.status === "ready" ? state.applications : [];

  async function setStage(
    jobId: string,
    stage: "draft" | "ready"
  ): Promise<void> {
    const job = await api.loadJob(jobId);
    await api.saveJob({ ...job, stage });
    setJobs((current) =>
      current.map((entry) => (entry.id === jobId ? { ...entry, stage } : entry))
    );
  }

  const selectedJob = selectedId.startsWith(JOB_PREFIX)
    ? jobs.find((j) => `${JOB_PREFIX}${j.id}` === selectedId)
    : undefined;

  return (
    <Box sx={{ flex: 1, minWidth: 0, minHeight: 0, display: "flex" }}>
      <Box sx={{ flex: 1, minHeight: 0, display: "flex" }}>
        <CategoriesSidebar
          applications={readable}
          jobs={jobs}
          status={view.status}
          today={today}
          onChange={(status) => setView({ ...view, status })}
        />
        <Box
          sx={{
            flex: 1,
            minWidth: 0,
            overflow: "auto",
            p: 3,
            display: "flex",
            flexDirection: "column",
            gap: 2,
          }}
        >
          <Typography variant="h4" component="h1">
            {CATEGORY_TITLES[view.status] ??
              STATUS_LABELS[view.status as ApplicationStatus]}
          </Typography>

          {state.status === "loading" && <Typography>Loading…</Typography>}
          {state.status === "error" && (
            <Alert severity="error">{state.message}</Alert>
          )}

          {state.status === "ready" && (
            <ApplicationsTable
              applications={state.applications}
              jobRows={jobRows}
              view={view}
              onViewChange={setView}
              onSort={sortBy}
              today={today}
              selectedId={selectedId}
              onSelect={setSelectedId}
            />
          )}
        </Box>
        {selectedId && (
          <ResizableAside
            side="right"
            label="the application panel"
            defaultWidth={560}
          >
            <Box
              component="aside"
              aria-label="Application detail"
              sx={{
                width: "100%",
                flex: "none",
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
                  onStage={(stage) => void setStage(selectedJob.id, stage)}
                />
              ) : (
                <ApplicationView
                  key={selectedId}
                  applicationId={selectedId}
                  isEmbedded
                />
              )}
            </Box>
          </ResizableAside>
        )}
      </Box>
    </Box>
  );
}

const JOB_PREFIX = "job:";

const CATEGORY_TITLES: Partial<Record<ListView["status"], string>> = {
  all: "All applications",
  draft: "Draft",
  ready: "Ready to apply",
  noReply: "No reply",
};

/** Jobs that were never sent, filtered like the table (search and category) */
function arrangeJobs(jobs: JobSummary[], view: ListView): JobSummary[] {
  if (
    view.status !== "all" &&
    view.status !== "draft" &&
    view.status !== "ready"
  ) {
    return [];
  }
  const query = view.query.trim().toLowerCase();
  return jobs
    .filter((job) => {
      const stage = job.stage ?? "draft";
      return (
        (view.status === "all" || view.status === stage) &&
        (query === "" ||
          [job.name, job.company ?? "", job.role ?? ""].some((text) =>
            text.toLowerCase().includes(query)
          ))
      );
    })
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

/** The right panel for a job that was not sent yet */
function JobPanel({
  job,
  onStage,
}: {
  job: JobSummary;
  onStage: (stage: "draft" | "ready") => void;
}): JSX.Element {
  const stage = job.stage ?? "draft";
  return (
    <Box sx={{ p: 2.5, display: "grid", gap: 1.5 }}>
      <Typography variant="h6">{job.name}</Typography>
      <Chip
        size="small"
        label={stage === "ready" ? "Ready to apply" : "Draft"}
        sx={{ justifySelf: "start" }}
      />
      <Typography>Company: {job.company || "-"}</Typography>
      <Typography>Role: {job.role || "-"}</Typography>
      <Typography sx={{ color: WORKSPACE_COLORS.muted, fontSize: 13 }}>
        Created {formatDay(job.createdAt)}
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
      <Typography sx={{ color: WORKSPACE_COLORS.muted, fontSize: 13 }}>
        Open the job, then use Mark as applied when you have sent it.
      </Typography>
    </Box>
  );
}

interface SidebarProps {
  applications: ApplicationSummary[];
  jobs: JobSummary[];
  status: ListView["status"];
  today: string;
  onChange: (status: ListView["status"]) => void;
}

/** The categories (a filter of the table): All, Draft, Ready to apply, then each status. "No reply" is derived. */
function CategoriesSidebar({
  applications,
  jobs,
  status,
  today,
  onChange,
}: SidebarProps): JSX.Element {
  const counts = countByStatus(applications);
  const readable = applications.filter((a) => !a.isCorrupt).length;
  const draftCount = jobs.filter(
    (j) => (j.stage ?? "draft") === "draft"
  ).length;
  const readyCount = jobs.filter((j) => j.stage === "ready").length;
  const tiles: { key: ListView["status"]; label: string; count: number }[] = [
    { key: "all", label: "All", count: readable + jobs.length },
    { key: "draft", label: "Draft", count: draftCount },
    { key: "ready", label: "Ready to apply", count: readyCount },
    ...APPLICATION_STATUSES.map((s) => ({
      key: s,
      label: STATUS_LABELS[s],
      count: counts[s],
    })),
    {
      key: "noReply",
      label: "No reply",
      count: countNoReply(applications, today),
    },
  ];
  return (
    <ResizableAside side="left" label="the status list" defaultWidth={210}>
      <Box
        component="nav"
        aria-label="Filter by status"
        sx={{
          width: "100%",
          flex: "none",
          overflow: "auto",
          bgcolor: WORKSPACE_COLORS.panel,
          borderRight: `1px solid ${WORKSPACE_COLORS.border}`,
          p: 1,
          display: "flex",
          flexDirection: "column",
          gap: 0.25,
        }}
      >
        {tiles.map((tile) => {
          const isOn = status === tile.key;
          return (
            <Box
              key={tile.key}
              component="button"
              type="button"
              aria-pressed={isOn}
              onClick={() => onChange(tile.key)}
              sx={{
                display: "flex",
                justifyContent: "space-between",
                textAlign: "left",
                px: 1.25,
                py: 0.9,
                cursor: "pointer",
                font: "inherit",
                fontSize: 14,
                color: isOn
                  ? WORKSPACE_COLORS.accentText
                  : WORKSPACE_COLORS.text,
                bgcolor: isOn ? WORKSPACE_COLORS.accentSoft : "transparent",
                border: 0,
                borderRadius: 1,
                "&:hover": {
                  bgcolor: isOn ? undefined : WORKSPACE_COLORS.hover,
                },
                borderTop:
                  tile.key === "draft" || tile.key === "applied"
                    ? `1px solid ${WORKSPACE_COLORS.border}`
                    : 0,
              }}
            >
              <span>{tile.label}</span>
              <span>{tile.count}</span>
            </Box>
          );
        })}
      </Box>
    </ResizableAside>
  );
}

interface TableProps {
  applications: ApplicationSummary[];
  jobRows: JobSummary[];
  view: ListView;
  onViewChange: (view: ListView) => void;
  onSort: (key: SortKey) => void;
  today: string;
  selectedId: string;
  onSelect: (id: string) => void;
}

function ApplicationsTable({
  applications,
  jobRows,
  view,
  onViewChange,
  onSort,
  today,
  selectedId,
  onSelect,
}: TableProps): JSX.Element {
  const shown = arrangeApplications([...applications], view, today);
  return (
    <>
      <Typography
        sx={{
          color: "text.secondary",
        }}
      >
        {summariseApplications(applications, today)}
      </Typography>

      <TextField
        size="small"
        placeholder="Search company or role"
        value={view.query}
        onChange={(event) =>
          onViewChange({ ...view, query: event.target.value })
        }
        slotProps={{
          htmlInput: { "aria-label": "Search company or role" },
          input: {
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon fontSize="small" />
              </InputAdornment>
            ),
          },
        }}
      />

      <Paper variant="outlined">
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell
                sortDirection={
                  view.sortKey === "company" ? view.sortDirection : false
                }
              >
                <TableSortLabel
                  active={view.sortKey === "company"}
                  direction={
                    view.sortKey === "company" ? view.sortDirection : "asc"
                  }
                  onClick={() => onSort("company")}
                >
                  Company
                </TableSortLabel>
              </TableCell>
              <TableCell>Role</TableCell>
              <TableCell>Job</TableCell>
              <TableCell>Template</TableCell>
              <TableCell>Status</TableCell>
              <TableCell align="right">Sent CV</TableCell>
              <TableCell
                sortDirection={
                  view.sortKey === "appliedAt" ? view.sortDirection : false
                }
              >
                <TableSortLabel
                  active={view.sortKey === "appliedAt"}
                  direction={
                    view.sortKey === "appliedAt" ? view.sortDirection : "desc"
                  }
                  onClick={() => onSort("appliedAt")}
                >
                  Applied
                </TableSortLabel>
              </TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {jobRows.map((job) => (
              <TableRow
                key={job.id}
                hover
                sx={{ cursor: "pointer" }}
                selected={`${JOB_PREFIX}${job.id}` === selectedId}
                onClick={() => onSelect(`${JOB_PREFIX}${job.id}`)}
              >
                <TableCell>{job.company || "-"}</TableCell>
                <TableCell>{job.role || "-"}</TableCell>
                <TableCell>{job.name}</TableCell>
                <TableCell>-</TableCell>
                <TableCell>
                  <Chip
                    size="small"
                    variant="outlined"
                    label={job.stage === "ready" ? "Ready to apply" : "Draft"}
                    color={job.stage === "ready" ? "info" : "default"}
                  />
                </TableCell>
                <TableCell align="right">-</TableCell>
                <TableCell>-</TableCell>
              </TableRow>
            ))}
            {shown.map((application) =>
              application.isCorrupt ? (
                <TableRow key={application.id}>
                  <TableCell colSpan={7}>
                    <Alert severity="warning" sx={{ py: 0 }}>
                      Cannot read the application “{application.id}”. Its files
                      were left untouched.
                    </Alert>
                  </TableCell>
                </TableRow>
              ) : (
                <TableRow
                  key={application.id}
                  hover
                  sx={{ cursor: "pointer" }}
                  selected={application.id === selectedId}
                  onClick={() => onSelect(application.id)}
                >
                  <TableCell>
                    <Link
                      href={`/applications/${encodeURIComponent(application.id)}`}
                      underline="hover"
                      onClick={(event) => {
                        event.stopPropagation();
                        onAppLinkClick(event, {
                          kind: "application",
                          id: application.id,
                        });
                      }}
                    >
                      {application.company}
                    </Link>
                  </TableCell>
                  <TableCell>{application.role}</TableCell>
                  <TableCell>{application.jobName || "-"}</TableCell>
                  <TableCell>{application.templateName || "-"}</TableCell>
                  <TableCell>
                    <StatusLabel application={application} today={today} />
                  </TableCell>
                  <TableCell align="right" sx={{ whiteSpace: "nowrap" }}>
                    <IconButton
                      size="small"
                      component="a"
                      href={applicationPdfUrl(application.id)}
                      target="_blank"
                      rel="noreferrer"
                      aria-label={`View CV sent to ${application.company}`}
                      title={`View CV as sent on ${formatDay(application.appliedAt)}`}
                      onClick={(event) => event.stopPropagation()}
                    >
                      <VisibilityIcon fontSize="small" />
                    </IconButton>
                    <IconButton
                      size="small"
                      component="a"
                      href={applicationPdfUrl(application.id)}
                      download={`${application.id}.pdf`}
                      aria-label={`Download CV sent to ${application.company}`}
                      title="Download the sent PDF"
                      onClick={(event) => event.stopPropagation()}
                    >
                      <DownloadIcon fontSize="small" />
                    </IconButton>
                  </TableCell>
                  <TableCell>{formatDay(application.appliedAt)}</TableCell>
                </TableRow>
              )
            )}
            {shown.length === 0 && jobRows.length === 0 && (
              <TableRow>
                <TableCell colSpan={7}>Nothing here yet.</TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </Paper>
    </>
  );
}
