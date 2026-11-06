import {
  Alert,
  Box,
  Button,
  Chip,
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
import SearchIcon from "@mui/icons-material/Search";
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
import { createApiClient } from "@store/persistence/api-client";

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
    <Box display="flex" gap={0.5} flexWrap="wrap">
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

function openApplication(id: string): void {
  window.location.assign(`/?application=${encodeURIComponent(id)}`);
}

/** All job applications: search, filter by status, click one to open it */
export function ApplicationsPage(): JSX.Element {
  const api = useMemo(() => createApiClient(), []);
  const [state, setState] = useState<LoadState>({ status: "loading" });
  const [view, setView] = useState<ListView>(() =>
    queryToView(window.location.search)
  );
  const today = toIsoDay(new Date());

  useEffect(() => {
    let isCancelled = false;
    api
      .listApplications()
      .then((applications) => {
        if (!isCancelled) {
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
    window.history.replaceState(null, "", viewToQuery(view));
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

  return (
    <Box
      sx={{
        maxWidth: 1000,
        mx: "auto",
        p: 3,
        display: "flex",
        flexDirection: "column",
        gap: 2,
      }}
    >
      <Link href="/" underline="hover">
        ← Back to the editor
      </Link>
      <Typography variant="h4" component="h1">
        Applications
      </Typography>

      {state.status === "loading" && <Typography>Loading…</Typography>}
      {state.status === "error" && (
        <Alert severity="error">{state.message}</Alert>
      )}

      {state.status === "ready" && state.applications.length === 0 && (
        <Paper variant="outlined" sx={{ p: 3 }}>
          <Typography gutterBottom>No applications yet.</Typography>
          <Typography color="text.secondary" gutterBottom>
            Tailor a CV in the editor, then press{" "}
            <strong>Mark as applied</strong>.
          </Typography>
          <Button href="/" variant="contained">
            Go to the editor
          </Button>
        </Paper>
      )}

      {state.status === "ready" && state.applications.length > 0 && (
        <ApplicationsTable
          applications={state.applications}
          view={view}
          onViewChange={setView}
          onSort={sortBy}
          today={today}
        />
      )}
    </Box>
  );
}

interface TableProps {
  applications: ApplicationSummary[];
  view: ListView;
  onViewChange: (view: ListView) => void;
  onSort: (key: SortKey) => void;
  today: string;
}

function ApplicationsTable({
  applications,
  view,
  onViewChange,
  onSort,
  today,
}: TableProps): JSX.Element {
  const shown = arrangeApplications([...applications], view);
  return (
    <>
      <Typography color="text.secondary">
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

      <Box
        display="flex"
        gap={1}
        flexWrap="wrap"
        role="group"
        aria-label="Filter by status"
      >
        {(["all", ...APPLICATION_STATUSES] as const).map((status) => (
          <Chip
            key={status}
            label={status === "all" ? "All" : STATUS_LABELS[status]}
            color={view.status === status ? "primary" : "default"}
            variant={view.status === status ? "filled" : "outlined"}
            aria-pressed={view.status === status}
            onClick={() => onViewChange({ ...view, status })}
          />
        ))}
      </Box>

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
              <TableCell>Status</TableCell>
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
            {shown.map((application) =>
              application.isCorrupt ? (
                <TableRow key={application.id}>
                  <TableCell colSpan={4}>
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
                  onClick={() => openApplication(application.id)}
                >
                  <TableCell>
                    <Link
                      href={`/?application=${encodeURIComponent(application.id)}`}
                      underline="hover"
                      onClick={(event) => event.stopPropagation()}
                    >
                      {application.company}
                    </Link>
                  </TableCell>
                  <TableCell>{application.role}</TableCell>
                  <TableCell>
                    <StatusLabel application={application} today={today} />
                  </TableCell>
                  <TableCell>{formatDay(application.appliedAt)}</TableCell>
                </TableRow>
              )
            )}
            {shown.length === 0 && (
              <TableRow>
                <TableCell colSpan={4}>
                  No application matches this search.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </Paper>
    </>
  );
}
