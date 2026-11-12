import { useMemo, useState } from "react";
import {
  Box,
  Chip,
  IconButton,
  Link,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TableSortLabel,
  Tooltip,
  Typography,
} from "@mui/material";
import OpenInNewOutlinedIcon from "@mui/icons-material/OpenInNewOutlined";
import PictureAsPdfOutlinedIcon from "@mui/icons-material/PictureAsPdfOutlined";
import { Job } from "@custom-types/job-types";
import { ApplicationSummary } from "@custom-types/application-types";
import { formatRoute } from "@shared/routing/routes";
import { WORKSPACE_COLORS } from "@pages/workspace/workspace-tokens";
import {
  applicationPdfUrl,
  createApiClient,
} from "@store/persistence/api-client";

type SortKey = "name" | "createdAt" | "status";

interface Props {
  jobs: Job[];
  /** All applications; the newest one of a job gives the row's status */
  applications: ApplicationSummary[];
}

/** The sent application of each job (the most recently updated when there are several) */
function latestApplicationByJob(
  applications: ApplicationSummary[]
): Map<string, ApplicationSummary> {
  const byJob = new Map<string, ApplicationSummary>();
  for (const application of applications) {
    if (application.isCorrupt || !application.jobId) {
      continue;
    }
    const known = byJob.get(application.jobId);
    if (!known || known.updatedAt < application.updatedAt) {
      byJob.set(application.jobId, application);
    }
  }
  return byJob;
}

/**
 * The jobs made with one template as a table: each name links to the job (new tab), with the
 * day it was made, the status of the application sent with it and a PDF to open (the one that
 * was sent, or one made from the job as it is now).
 */
export function TemplateJobsTable({ jobs, applications }: Props): JSX.Element {
  const api = useMemo(() => createApiClient(), []);
  const [sortKey, setSortKey] = useState<SortKey>("createdAt");
  const [isDescending, setIsDescending] = useState<boolean>(true);
  const [busyId, setBusyId] = useState<string>("");
  const [error, setError] = useState<string>("");
  const byJob = useMemo(
    () => latestApplicationByJob(applications),
    [applications]
  );

  if (jobs.length === 0) {
    return (
      <Typography sx={{ fontSize: 12, color: WORKSPACE_COLORS.muted }}>
        No jobs prepared with this template yet.
      </Typography>
    );
  }

  const statusOf = (job: Job): string => byJob.get(job.id)?.status ?? "";
  const sorted = [...jobs].sort((a, b) => {
    const left =
      sortKey === "name"
        ? a.name.toLowerCase()
        : sortKey === "status"
          ? statusOf(a)
          : a.createdAt;
    const right =
      sortKey === "name"
        ? b.name.toLowerCase()
        : sortKey === "status"
          ? statusOf(b)
          : b.createdAt;
    const order = left < right ? -1 : left > right ? 1 : 0;
    return isDescending ? -order : order;
  });

  function sortBy(key: SortKey): void {
    if (key === sortKey) {
      setIsDescending((value) => !value);
    } else {
      setSortKey(key);
      setIsDescending(key === "createdAt");
    }
  }

  async function openJobPdf(job: Job): Promise<void> {
    setBusyId(job.id);
    setError("");
    try {
      const blob = await api.createPdf(job.id);
      window.open(URL.createObjectURL(blob), "_blank");
    } catch (failure: unknown) {
      setError(failure instanceof Error ? failure.message : "The PDF failed.");
    } finally {
      setBusyId("");
    }
  }

  const head = (key: SortKey, label: string): JSX.Element => (
    <TableCell
      sortDirection={sortKey === key ? (isDescending ? "desc" : "asc") : false}
    >
      <TableSortLabel
        active={sortKey === key}
        direction={isDescending ? "desc" : "asc"}
        onClick={() => sortBy(key)}
      >
        {label}
      </TableSortLabel>
    </TableCell>
  );

  return (
    <Box>
      <Table size="small" aria-label="Jobs prepared with this template">
        <TableHead>
          <TableRow>
            {head("name", "Job")}
            <TableCell>Company · role</TableCell>
            {head("createdAt", "Created")}
            {head("status", "Application")}
            <TableCell align="right">PDF</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {sorted.map((job) => {
            const application = byJob.get(job.id);
            return (
              <TableRow key={job.id}>
                <TableCell>
                  <Link
                    href={formatRoute({
                      kind: "jobs",
                      jobId: job.id,
                      view: "page",
                    })}
                    target="_blank"
                    rel="noopener"
                    underline="hover"
                    sx={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 0.5,
                    }}
                    onClick={(event) => event.stopPropagation()}
                  >
                    {job.name}
                    <OpenInNewOutlinedIcon sx={{ fontSize: 14 }} />
                  </Link>
                </TableCell>
                <TableCell>
                  {[job.company, job.role].filter(Boolean).join(" · ") || "—"}
                </TableCell>
                <TableCell>{job.createdAt}</TableCell>
                <TableCell>
                  {application ? (
                    <Chip size="small" label={application.status} />
                  ) : (
                    <Typography
                      component="span"
                      sx={{ fontSize: 12, color: WORKSPACE_COLORS.muted }}
                    >
                      Not sent
                    </Typography>
                  )}
                </TableCell>
                <TableCell align="right">
                  {application && (
                    <Tooltip title="Open the PDF that was sent">
                      <IconButton
                        size="small"
                        component="a"
                        href={applicationPdfUrl(application.id)}
                        target="_blank"
                        rel="noopener"
                        aria-label={`Open the sent PDF of ${job.name}`}
                        onClick={(event) => event.stopPropagation()}
                      >
                        <PictureAsPdfOutlinedIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  )}
                  <Tooltip title="Make a PDF from the saved job">
                    <span>
                      <IconButton
                        size="small"
                        disabled={busyId === job.id}
                        aria-label={`Make a PDF of ${job.name}`}
                        onClick={(event) => {
                          event.stopPropagation();
                          void openJobPdf(job);
                        }}
                      >
                        <PictureAsPdfOutlinedIcon
                          fontSize="small"
                          sx={{ color: WORKSPACE_COLORS.muted }}
                        />
                      </IconButton>
                    </span>
                  </Tooltip>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
      {error && (
        <Typography role="alert" sx={{ fontSize: 12, color: "error.main" }}>
          {error}
        </Typography>
      )}
    </Box>
  );
}
