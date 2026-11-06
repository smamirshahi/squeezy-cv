import { WORKSPACE_COLORS } from "@pages/workspace/workspace-tokens";
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
import { ApplicationView } from "@pages/applications-page/application-view";
import {
  APPLICATIONS_TOP_BAR_HEIGHT,
  ApplicationsTopBar,
} from "@pages/applications-page/applications-top-bar";
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

/** All job applications: search, filter by status, click one to open it */
export function ApplicationsPage(): JSX.Element {
  const api = useMemo(() => createApiClient(), []);
  const [state, setState] = useState<LoadState>({ status: "loading" });
  const [view, setView] = useState<ListView>(() =>
    queryToView(window.location.search)
  );
  const [selectedId, setSelectedId] = useState<string>("");
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
    <Box>
      <ApplicationsTopBar />
      <Box sx={{ display: "flex", alignItems: "flex-start" }}>
        <Box
          sx={{
            flex: 1,
            minWidth: 0,
            maxWidth: selectedId ? undefined : 1000,
            mx: selectedId ? 0 : "auto",
            p: 3,
            display: "flex",
            flexDirection: "column",
            gap: 2,
          }}
        >
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
              selectedId={selectedId}
              onSelect={setSelectedId}
            />
          )}
        </Box>
        {selectedId && (
          <Box
            component="aside"
            aria-label="Application detail"
            sx={{
              width: 560,
              flex: "none",
              minHeight: `calc(100vh - ${APPLICATIONS_TOP_BAR_HEIGHT}px)`,
              borderLeft: `1px solid ${WORKSPACE_COLORS.border}`,
              boxShadow: "-6px 0 20px rgba(0,0,0,.10)",
              bgcolor: WORKSPACE_COLORS.panel,
              color: WORKSPACE_COLORS.text,
            }}
          >
            <ApplicationView
              key={selectedId}
              applicationId={selectedId}
              isEmbedded
            />
          </Box>
        )}
      </Box>
    </Box>
  );
}

interface TilesProps {
  applications: ApplicationSummary[];
  status: ListView["status"];
  today: string;
  onChange: (status: ListView["status"]) => void;
}

/** One tile per status with its count; a tile is also the filter. "No reply" is derived, never stored. */
function StatusTiles({
  applications,
  status,
  today,
  onChange,
}: TilesProps): JSX.Element {
  const counts = countByStatus(applications);
  const readable = applications.filter((a) => !a.isCorrupt).length;
  const tiles: { key: ListView["status"]; label: string; count: number }[] = [
    { key: "all", label: "All", count: readable },
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
    <Box
      role="group"
      aria-label="Filter by status"
      sx={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(104px, 1fr))",
        gap: 1,
      }}
    >
      {tiles.map((tile) => {
        const isOn = status === tile.key;
        const isWarning = tile.key === "noReply" && tile.count > 0;
        return (
          <Box
            key={tile.key}
            component="button"
            type="button"
            aria-pressed={isOn}
            onClick={() => onChange(tile.key)}
            sx={{
              textAlign: "left",
              p: "8px 10px",
              cursor: "pointer",
              font: "inherit",
              color: WORKSPACE_COLORS.text,
              bgcolor: isOn
                ? WORKSPACE_COLORS.accentSoft
                : WORKSPACE_COLORS.panel,
              border: `1px solid ${
                isOn
                  ? WORKSPACE_COLORS.accent
                  : isWarning
                    ? "var(--wrb)"
                    : WORKSPACE_COLORS.border
              }`,
              borderRadius: 1.5,
            }}
          >
            <Typography
              component="span"
              display="block"
              sx={{ fontSize: 12, color: WORKSPACE_COLORS.muted }}
            >
              {tile.label}
            </Typography>
            <Typography
              component="span"
              display="block"
              sx={{ fontSize: 22, fontWeight: 700, lineHeight: 1.2 }}
            >
              {tile.count}
            </Typography>
          </Box>
        );
      })}
    </Box>
  );
}

interface TableProps {
  applications: ApplicationSummary[];
  view: ListView;
  onViewChange: (view: ListView) => void;
  onSort: (key: SortKey) => void;
  today: string;
  selectedId: string;
  onSelect: (id: string) => void;
}

function ApplicationsTable({
  applications,
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

      <StatusTiles
        applications={applications}
        status={view.status}
        today={today}
        onChange={(status) => onViewChange({ ...view, status })}
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
                  selected={application.id === selectedId}
                  onClick={() => onSelect(application.id)}
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
