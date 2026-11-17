import { OpenInNewTabButton } from "@components/open-in-new-tab-button";
import { notify } from "@components/notifications/notify";
import { AppliedElsewhereDialog } from "@pages/workspace/applied-elsewhere-dialog";
import { AnalyseJobAd } from "@pages/workspace/analyse-job-ad";
import {
  JobStatus,
  JobStatusChip,
  STATUS_HELP,
} from "@pages/workspace/job-status-select";
import { ResizableAside } from "@pages/workspace/resizable-aside";
import { SavedForLaterMenu } from "@pages/workspace/saved-for-later-menu";
import { SponsorshipCheck } from "@pages/workspace/sponsorship-check";
import { useSavedForLater } from "@pages/workspace/use-saved-for-later";
import {
  ChangeEvent,
  ReactNode,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  MenuItem,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
} from "@components/ui";
import {
  AddOutlined as AddIcon,
  BookmarkBorderOutlined as BookmarkBorderIcon,
  CheckOutlined as CheckIcon,
  ChevronRightOutlined as ChevronRightIcon,
  WorkOutlined as WorkOutlineIcon,
} from "@components/ui/icons";
import { Job } from "@custom-types/job-types";
import { JOB_OPINIONS, JobOpinion } from "@custom-types/json-types";
import { navigate } from "@hooks/navigation";
import { useSaveActions } from "@hooks/use-persistence";
import { useViewport } from "@hooks/use-viewport";
import { MAX_IMPORT_PDF_BYTES } from "@custom-types/import-types";
import {
  MIDDLE_AREA_SX,
  WORKSPACE_COLORS,
} from "@pages/workspace/workspace-tokens";
import { nanoid } from "@reduxjs/toolkit";
import { styleSelector } from "@store/cv-data/cv-data-slice";
import { vaultSelector } from "@store/vault/vault-slice";
import { ApiError, createApiClient } from "@store/persistence/api-client";
import {
  createJob,
  isPlaceholderSelector,
  jobsSelector,
  setJobDetails,
} from "@store/jobs/jobs-slice";
import { useAppDispatch, useAppSelector } from "@store/store-helper";

function numberOrUndefined(value: string): number | undefined {
  return value === "" ? undefined : Number(value);
}

type Chance = NonNullable<Job["chance"]>;

export const CHANCE_LABELS: Record<Chance, string> = {
  veryLow: "Very low",
  low: "Low",
  medium: "Medium",
  high: "High",
  veryHigh: "Very high",
};

export const FEELING_LABELS: Record<JobOpinion, string> = {
  wantIt: "I really want this job",
  goodMatch: "Good match",
  optimistic: "Optimistic",
  neutral: "Neutral",
  unsure: "Unsure",
  longShot: "Long shot",
};

type EmploymentType = NonNullable<Job["employmentType"]>;

/** A card of the form: a numbered step that shows a tick once it has something in it */
function Step({
  number,
  title,
  help,
  isDone,
  children,
}: {
  number: number;
  title: string;
  help?: string;
  isDone: boolean;
  children: ReactNode;
}): JSX.Element {
  return (
    <Card label={title}>
      <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
        <Box
          aria-hidden="true"
          sx={{
            width: 22,
            height: 22,
            borderRadius: "50%",
            flex: "none",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 12,
            fontWeight: 700,
            bgcolor: isDone ? "var(--oks)" : WORKSPACE_COLORS.panelAlt,
            color: isDone ? "var(--okt)" : WORKSPACE_COLORS.muted,
          }}
        >
          {isDone ? <CheckIcon sx={{ fontSize: 14 }} /> : number}
        </Box>
        <Typography component="h2" sx={{ fontWeight: 700, fontSize: 14 }}>
          {title}
        </Typography>
        {isDone && <span className="visually-hidden"> (done)</span>}
      </Box>
      {help && <Help>{help}</Help>}
      {children}
    </Card>
  );
}

function Card({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}): JSX.Element {
  return (
    <Box
      component="section"
      aria-label={label}
      sx={{
        display: "grid",
        gap: 1.5,
        p: { xs: 2, lg: 2 },
        bgcolor: WORKSPACE_COLORS.panel,
        border: `1px solid ${WORKSPACE_COLORS.border}`,
        borderRadius: "6px",
        alignContent: "start",
      }}
    >
      {children}
    </Box>
  );
}

function Help({ children }: { children: ReactNode }): JSX.Element {
  return (
    <Typography
      sx={{ fontSize: 12, lineHeight: "16px", color: WORKSPACE_COLORS.muted }}
    >
      {children}
    </Typography>
  );
}

interface ProgressItem {
  label: string;
  isDone: boolean;
  isOptional?: boolean;

  /** The id of the field (or card) to take the user to */
  target: string;
}

function ProgressBar({
  done,
  total,
}: {
  done: number;
  total: number;
}): JSX.Element {
  return (
    <Box
      role="img"
      aria-label={`${done} of ${total} done`}
      sx={{
        height: 6,
        borderRadius: "3px",
        bgcolor: WORKSPACE_COLORS.panelAlt,
        overflow: "hidden",
      }}
    >
      <Box
        sx={{
          height: "100%",
          width: `${total === 0 ? 0 : (done / total) * 100}%`,
          bgcolor: "var(--ok)",
        }}
      />
    </Box>
  );
}

function goTo(target: string): void {
  const element = document.getElementById(target);
  element?.scrollIntoView({ block: "center", behavior: "smooth" });
  element?.focus({ preventScroll: true });
}

function ProgressList({ items }: { items: ProgressItem[] }): JSX.Element {
  return (
    <Box component="ul" sx={{ m: 0, p: 0, display: "grid" }}>
      {items.map((item) => (
        <Box
          component="li"
          key={item.label}
          sx={{ listStyle: "none", display: "flex" }}
        >
          <Button
            color="neutral"
            onClick={() => goTo(item.target)}
            sx={{
              flex: 1,
              justifyContent: "flex-start",
              gap: 1,
              px: 0,
              py: 0.5,
              minHeight: { xs: 40, lg: 0 },
              textAlign: "left",
              fontWeight: 400,
            }}
          >
            <Box
              aria-hidden="true"
              sx={{
                width: 18,
                height: 18,
                borderRadius: "50%",
                flex: "none",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "#fff",
                border: "2px solid var(--ib)",
                ...(item.isDone && {
                  bgcolor: "var(--ok)",
                  borderColor: "var(--ok)",
                }),
              }}
            >
              {item.isDone && <CheckIcon sx={{ fontSize: 12 }} />}
            </Box>
            <Box component="span" sx={{ flex: 1 }}>
              {item.label}
              <span className="visually-hidden">
                {item.isDone ? " (done)" : " (not done)"}
              </span>
            </Box>
            {item.isOptional && (
              <Box
                component="span"
                sx={{ fontSize: 12, color: WORKSPACE_COLORS.muted }}
              >
                optional
              </Box>
            )}
          </Button>
        </Box>
      ))}
    </Box>
  );
}

/** The note and apply-by day kept with a job in Saved for later; sent by the Save for later button */
function ReminderFields({
  value,
  onChange,
}: {
  value: { note: string; applyBy: string };
  onChange: (next: { note: string; applyBy: string }) => void;
}): JSX.Element {
  return (
    <>
      <TextField
        size="small"
        type="date"
        label="Apply by (optional)"
        value={value.applyBy}
        onChange={(event) =>
          onChange({ ...value, applyBy: event.target.value })
        }
        slotProps={{ inputLabel: { shrink: true } }}
      />
      <TextField
        size="small"
        label="Note (optional)"
        multiline
        minRows={2}
        value={value.note}
        onChange={(event) => onChange({ ...value, note: event.target.value })}
      />
    </>
  );
}

/** What a job is called until it has a role or a company (the model needs some name) */
const DEFAULT_JOB_NAME = "New job";

/** "Role · Company", or whichever of the two there is */
function nameFrom(company?: string, role?: string): string {
  return [role, company]
    .map((part) => (part ?? "").trim())
    .filter((part) => part !== "")
    .join(" · ");
}

/**
 * The "Job application" view of the Apply tool (design "Job application v2"): what the job is for,
 * in five short steps: the job, where and how, pay, your private view and the advert (typed,
 * pasted or read from a PDF). Beside the form (a panel on a desktop, cards and a bottom bar
 * below it) sit the status, Save and continue, Save for later, what is left to do, the advert
 * analysis (AI) and quick checks. Nothing here changes the CV page.
 */
export function JobDetailsPage(): JSX.Element {
  const dispatch = useAppDispatch();
  const jobs = useAppSelector(jobsSelector);
  const activeJobId = useAppSelector((s) => s.jobs.activeJobId);
  const vault = useAppSelector(vaultSelector);
  const style = useAppSelector(styleSelector);
  const viewport = useViewport();
  const isDesktop = viewport === "desktop";
  const isPhone = viewport === "phone";
  // The stand-in job (nothing added yet) is not a job: the first edit creates the real one
  const isPlaceholder = useAppSelector(isPlaceholderSelector);
  const job = isPlaceholder
    ? undefined
    : jobs.find((entry) => entry.id === activeJobId);
  const isRange = job?.salaryIsRange !== false;
  const { save } = useSaveActions();
  const api = useMemo(() => createApiClient(), []);
  const parked = useSavedForLater();
  const fileRef = useRef<HTMLInputElement>(null);
  const [note, setNote] = useState<string>("");
  const [error, setError] = useState<string>("");
  const [isReading, setIsReading] = useState<boolean>(false);
  const [isMenuOpen, setIsMenuOpen] = useState<boolean>(false);
  const [justSavedId, setJustSavedId] = useState<string>("");
  const [isApplying, setIsApplying] = useState<boolean>(false);
  const [isLeaving, setIsLeaving] = useState<boolean>(false);
  const parkedEntry = job
    ? parked.open.find((entry) => entry.jobId === job.id)
    : undefined;
  const [reminder, setReminder] = useState({ note: "", applyBy: "" });
  // Start from what is saved when another job (or its saved entry) comes up
  useEffect(() => {
    setReminder({
      note: parkedEntry?.note ?? "",
      applyBy: parkedEntry?.applyBy ?? "",
    });
  }, [job?.id, parkedEntry?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  function edit(details: Parameters<typeof setJobDetails>[0]["details"]): void {
    if (job) {
      // The name follows role and company until it is typed in by hand
      const isFollowing =
        job.name === DEFAULT_JOB_NAME ||
        job.name === nameFrom(job.company, job.role);
      const isChangingWho =
        details.company !== undefined || details.role !== undefined;
      const next =
        details.name === undefined && isFollowing && isChangingWho
          ? {
              ...details,
              name:
                nameFrom(
                  details.company ?? job.company,
                  details.role ?? job.role
                ) || DEFAULT_JOB_NAME,
            }
          : details;
      dispatch(setJobDetails({ id: job.id, details: next }));
      return;
    }
    // No job yet: the first thing typed creates it (no dialog), on the current template
    const id = nanoid();
    const typed = details.name ?? nameFrom(details.company, details.role);
    dispatch(
      createJob({ vault, style, name: typed.trim() || DEFAULT_JOB_NAME, id })
    );
    dispatch(setJobDetails({ id, details }));
  }

  /** Parks the job in Saved for later at once and says where it went (no form) */
  async function saveForLater(): Promise<void> {
    if (!job) {
      return;
    }
    const fields = {
      company: job.company ?? "",
      role: job.role ?? "",
      jobUrl: job.url ?? "",
      jobAd: job.jobAd ?? "",
      note: reminder.note,
      applyBy: reminder.applyBy,
    };
    try {
      // pressed again for the same job: update that entry instead of parking a second one
      const existing = parked.open.find((entry) => entry.jobId === job.id);
      if (existing) {
        await parked.change(existing.id, fields);
        setJustSavedId(existing.id);
      } else {
        const saved = await parked.save({ ...fields, jobId: job.id });
        setJustSavedId(saved.id);
      }
      notify({
        kind: "success",
        text: "Saved for later. Find it any time in Saved for later at the top of this page, or in Applications.",
        action: { label: "View list", onClick: () => setIsMenuOpen(true) },
      });
      // the form is ready for the next job
      createAnother();
    } catch (caught) {
      notify({
        kind: "error",
        text:
          caught instanceof Error
            ? caught.message
            : "The job could not be saved for later.",
      });
    }
  }

  function createAnother(): void {
    setIsLeaving(false);
    dispatch(createJob({ vault, style, name: DEFAULT_JOB_NAME, id: nanoid() }));
  }

  /** Asks first when the job has something typed in and is not parked in Saved for later */
  function startAnother(): void {
    const hasContent = [job?.company, job?.role, job?.url, job?.jobAd].some(
      (text) => (text ?? "").trim() !== ""
    );
    const isParked = parked.open.some((entry) => entry.jobId === job?.id);
    if (hasContent && !isParked) {
      setIsLeaving(true);
      return;
    }
    createAnother();
  }

  function saveAndContinue(): void {
    save();
    navigate({ kind: "jobs", jobId: job?.id, view: "page" });
  }

  async function readPdf(event: ChangeEvent<HTMLInputElement>): Promise<void> {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) {
      return;
    }
    setError("");
    setNote("");
    if (file.size > MAX_IMPORT_PDF_BYTES) {
      setError(
        `The PDF is larger than ${MAX_IMPORT_PDF_BYTES / (1024 * 1024)} MB.`
      );
      return;
    }
    setIsReading(true);
    try {
      const read = await api.extractPdfText(file);
      edit({ jobAd: read.text });
      setNote(`Text taken from ${file.name} (${read.pages} pages).`);
    } catch (caught) {
      setError(
        caught instanceof ApiError || caught instanceof Error
          ? caught.message
          : "The PDF could not be read."
      );
    } finally {
      setIsReading(false);
    }
  }

  const hasCompanyAndRole =
    (job?.company ?? "").trim() !== "" && (job?.role ?? "").trim() !== "";
  const hasAdvert = (job?.jobAd ?? "").trim() !== "";
  const progress: ProgressItem[] = [
    {
      label: "Company and role",
      isDone: hasCompanyAndRole,
      target: (job?.company ?? "").trim() === "" ? "job-company" : "job-role",
    },
    { label: "Advert text", isDone: hasAdvert, target: "job-ad" },
    {
      label: "Advert analysed",
      isDone: job?.analysis !== undefined,
      target: "job-analysis",
    },
    {
      label: "Link to the advert",
      isDone: (job?.url ?? "").trim() !== "",
      isOptional: true,
      target: "job-url",
    },
  ];
  const doneCount = progress.filter((item) => item.isDone).length;
  const firstLeft = progress.find((item) => !item.isDone);
  const status: JobStatus = job?.stage === "ready" ? "ready" : "draft";

  const statusControl = <JobStatusChip value={status} />;

  const appliedElsewhereButton = (
    <Button
      variant="outlined"
      color="neutral"
      fullWidth
      startIcon={<WorkOutlineIcon />}
      disabled={!job}
      onClick={() => setIsApplying(true)}
    >
      I applied elsewhere
    </Button>
  );

  const progressCard = (
    <Card label="Ready to continue">
      <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
        <Typography
          component="h2"
          sx={{ flex: 1, fontWeight: 700, fontSize: 14 }}
        >
          Ready to continue
        </Typography>
        <Box
          component="span"
          sx={{
            px: 1,
            borderRadius: 999,
            fontSize: 12,
            fontWeight: 600,
            bgcolor: "var(--oks)",
            color: "var(--okt)",
          }}
        >
          {doneCount} of {progress.length}
        </Box>
      </Box>
      <ProgressBar done={doneCount} total={progress.length} />
      <ProgressList items={progress} />
    </Card>
  );

  const analysisCard = job ? (
    <Box id="job-analysis" tabIndex={-1} sx={{ outline: "none" }}>
      <AnalyseJobAd job={job} />
    </Box>
  ) : null;

  const quickChecks = (
    <Card label="Quick checks">
      <Typography component="h2" sx={{ fontWeight: 700, fontSize: 14 }}>
        Quick checks
      </Typography>
      <SponsorshipCheck company={job?.company} />
    </Card>
  );

  const reminderFields = job ? (
    <ReminderFields value={reminder} onChange={setReminder} />
  ) : null;

  // Desktop: the whole right panel
  const rightPanel = (
    <Box
      component="aside"
      aria-label="Status and next steps"
      sx={{
        width: "100%",
        flex: "none",
        display: "grid",
        gap: 1.5,
        alignContent: "start",
        p: 2,
        overflow: "auto",
        borderLeft: `1px solid ${WORKSPACE_COLORS.border}`,
        bgcolor: "var(--bg)",
      }}
    >
      <Card label="Status">
        <Typography component="h2" sx={{ fontWeight: 700, fontSize: 14 }}>
          Status
        </Typography>
        {statusControl}
        <Help>{STATUS_HELP[status]}</Help>
        <Button
          variant="contained"
          size="large"
          fullWidth
          disabled={!job}
          endIcon={<ChevronRightIcon />}
          onClick={saveAndContinue}
        >
          Save and continue
        </Button>
        <Typography
          sx={{
            fontSize: 12,
            textAlign: "center",
            color: WORKSPACE_COLORS.muted,
            mt: -0.5,
          }}
        >
          {job
            ? "Next: pick a template and choose what the CV shows."
            : "Fill in something to start this job."}
        </Typography>
        {reminderFields}
        <Button
          variant="outlined"
          color="primary"
          fullWidth
          disabled={!job}
          startIcon={<BookmarkBorderIcon />}
          sx={{ borderColor: WORKSPACE_COLORS.borderStrong }}
        >
          {parkedEntry ? "Update Saved for later" : "Save for later"}
        </Button>
        <Help>
          Parks the company, role, link, advert, note and date in{" "}
          <b>Saved for later</b>, without building a CV. Find it again in the
          menu at the top of this page. Jobs past their date are marked in
          Applications.
        </Help>
        {appliedElsewhereButton}
      </Card>
      {progressCard}
      {analysisCard}
      {quickChecks}
    </Box>
  );

  // Below a desktop: status and progress on top, the analysis last, the buttons in a bottom bar
  const stackedTop = isPhone ? (
    <Card label="Status">
      <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
        <Typography
          component="h2"
          sx={{ flex: 1, fontWeight: 700, fontSize: 14 }}
        >
          Status
        </Typography>
        <Box
          component="span"
          sx={{
            px: 1,
            borderRadius: 999,
            fontSize: 12,
            fontWeight: 600,
            bgcolor: "var(--oks)",
            color: "var(--okt)",
          }}
        >
          {doneCount} of {progress.length} ready
        </Box>
      </Box>
      {statusControl}
      <ProgressBar done={doneCount} total={progress.length} />
      {firstLeft && (
        <Button
          color="primary"
          onClick={() => goTo(firstLeft.target)}
          sx={{ justifyContent: "flex-start", px: 0, fontWeight: 600 }}
        >
          What is left? {firstLeft.label}
          {firstLeft.isOptional ? " (optional)" : ""}
        </Button>
      )}
      {reminderFields}
      {appliedElsewhereButton}
    </Card>
  ) : (
    <Box
      sx={{
        display: "grid",
        gap: 1.5,
        gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
        alignItems: "start",
      }}
    >
      <Card label="Status">
        <Typography component="h2" sx={{ fontWeight: 700, fontSize: 14 }}>
          Status
        </Typography>
        {statusControl}
        <Help>{STATUS_HELP[status]}</Help>
        {reminderFields}
        {appliedElsewhereButton}
      </Card>
      {progressCard}
    </Box>
  );

  const optionalSelect = <T extends string>(
    label: string,
    value: T | undefined,
    options: [T, string][],
    change: (next: T | undefined) => void
  ): JSX.Element => (
    <TextField
      select
      label={label}
      value={value ?? ""}
      onChange={(event) =>
        change(
          event.target.value === "" ? undefined : (event.target.value as T)
        )
      }
    >
      <MenuItem value="">Not set</MenuItem>
      {options.map(([optionValue, text]) => (
        <MenuItem key={optionValue} value={optionValue}>
          {text}
        </MenuItem>
      ))}
    </TextField>
  );

  const form = (
    <Box
      component="main"
      aria-label="Job details"
      sx={{
        display: "grid",
        gap: 1.75,
        alignContent: "start",
        maxWidth: 820,
        width: "100%",
        mx: "auto",
        p: { xs: 1.5, sm: 3 },
      }}
    >
      <Box
        sx={{
          display: "flex",
          alignItems: "flex-start",
          flexWrap: "wrap",
          gap: 1,
        }}
      >
        <Box sx={{ flex: 1, minWidth: 180 }}>
          <Typography variant="h6" component="h1">
            {job ? "Job application" : "Apply for a job"}
          </Typography>
          {!isPhone && (
            <Help>
              Fill in what you know. You can come back to it any time.
            </Help>
          )}
        </Box>
        <SavedForLaterMenu
          candidates={parked.open}
          justSavedId={justSavedId}
          isOpen={isMenuOpen}
          onOpenChange={setIsMenuOpen}
          onContinue={(candidate) => void parked.continueWith(candidate)}
        />
        {isPhone ? (
          <Button
            variant="outlined"
            color="neutral"
            aria-label="Start another job"
            onClick={startAnother}
            sx={{
              minWidth: 44,
              px: 1,
              borderColor: WORKSPACE_COLORS.borderStrong,
            }}
          >
            <AddIcon />
          </Button>
        ) : (
          <Button
            color="neutral"
            startIcon={<AddIcon />}
            onClick={startAnother}
          >
            Start another job
          </Button>
        )}
      </Box>
      {parked.error && (
        <Typography role="alert" color="error" sx={{ fontSize: 13 }}>
          {parked.error}
        </Typography>
      )}
      {!isDesktop && stackedTop}
      <Step
        number={1}
        title="The job"
        help="Company and role are the two things every list shows."
        isDone={hasCompanyAndRole}
      >
        <Box
          sx={{
            display: "grid",
            gap: 2,
            gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" },
          }}
        >
          <TextField
            id="job-company"
            required
            label="Company"
            value={job?.company ?? ""}
            onChange={(event) => edit({ company: event.target.value })}
          />
          <TextField
            id="job-role"
            required
            label="Role"
            value={job?.role ?? ""}
            onChange={(event) => edit({ role: event.target.value })}
          />
        </Box>
        <TextField
          label="Job name"
          value={job?.name === DEFAULT_JOB_NAME ? "" : (job?.name ?? "")}
          placeholder="Filled in from the role and company"
          onChange={(event) =>
            edit({
              name:
                event.target.value.trim() === ""
                  ? DEFAULT_JOB_NAME
                  : event.target.value,
            })
          }
          slotProps={{ inputLabel: { shrink: true } }}
          helperText="Shown in your lists. Follows the role and company until you type your own."
        />
      </Step>
      <Step
        number={2}
        title="Where and how"
        isDone={
          (job?.location ?? "").trim() !== "" ||
          job?.workMode !== undefined ||
          job?.employmentType !== undefined
        }
      >
        <TextField
          label="Location"
          placeholder="City, country"
          value={job?.location ?? ""}
          onChange={(event) => edit({ location: event.target.value })}
        />
        <Box
          sx={{
            display: "grid",
            gap: 2,
            gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" },
          }}
        >
          {optionalSelect<NonNullable<Job["workMode"]>>(
            "Work mode",
            job?.workMode,
            [
              ["onsite", "On site"],
              ["hybrid", "Hybrid"],
              ["remote", "Remote"],
            ],
            (next) => edit({ workMode: next })
          )}
          {optionalSelect<EmploymentType>(
            "Employment",
            job?.employmentType,
            [
              ["fullTime", "Full time"],
              ["partTime", "Part time"],
              ["contract", "Contract"],
              ["freelance", "Freelance"],
              ["internship", "Internship"],
            ],
            (next) => edit({ employmentType: next })
          )}
        </Box>
      </Step>
      <Step
        number={3}
        title="Pay (optional)"
        help="Per year, before tax. Only you see this."
        isDone={
          job?.salaryMin !== undefined ||
          job?.salaryMax !== undefined ||
          job?.expectedSalary !== undefined
        }
      >
        <ToggleButtonGroup
          exclusive
          size="small"
          value={isRange ? "range" : "one"}
          aria-label="Salary shown as"
          onChange={(_event, next: "range" | "one" | null) => {
            if (next !== null) {
              edit({ salaryIsRange: next === "range" });
            }
          }}
          sx={{ maxWidth: 260 }}
        >
          <ToggleButton value="range" sx={{ flex: 1 }}>
            A range
          </ToggleButton>
          <ToggleButton value="one" sx={{ flex: 1 }}>
            One figure
          </ToggleButton>
        </ToggleButtonGroup>
        <Box
          sx={{
            display: "grid",
            gap: 2,
            gridTemplateColumns: {
              xs: "1fr 1fr",
              sm: `repeat(${isRange ? 3 : 2}, minmax(0, 1fr))`,
            },
          }}
        >
          <TextField
            label={isRange ? "Salary from" : "Salary"}
            type="number"
            value={job?.salaryMin ?? ""}
            onChange={(event) =>
              edit({ salaryMin: numberOrUndefined(event.target.value) })
            }
          />
          {isRange && (
            <TextField
              label="Salary to"
              type="number"
              value={job?.salaryMax ?? ""}
              onChange={(event) =>
                edit({ salaryMax: numberOrUndefined(event.target.value) })
              }
            />
          )}
          <TextField
            label="Expected salary"
            type="number"
            value={job?.expectedSalary ?? ""}
            onChange={(event) =>
              edit({ expectedSalary: numberOrUndefined(event.target.value) })
            }
          />
        </Box>
      </Step>
      <Step
        number={4}
        title="Your view (private)"
        help="Only you see this. It is never on the CV."
        isDone={job?.feeling !== undefined || job?.chance !== undefined}
      >
        <Box
          sx={{
            display: "grid",
            gap: 2,
            gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" },
          }}
        >
          {optionalSelect<JobOpinion>(
            "How I feel about it",
            job?.feeling,
            JOB_OPINIONS.map((opinion) => [opinion, FEELING_LABELS[opinion]]),
            (next) => edit({ feeling: next })
          )}
          {optionalSelect<Chance>(
            "My chance",
            job?.chance,
            (Object.keys(CHANCE_LABELS) as Chance[]).map((chance) => [
              chance,
              CHANCE_LABELS[chance],
            ]),
            (next) => edit({ chance: next })
          )}
        </Box>
      </Step>
      <Step
        number={5}
        title="The advert"
        help="Paste it or pick a PDF. It feeds the analysis, the tailoring and the ATS score."
        isDone={hasAdvert}
      >
        <Box sx={{ display: "flex", gap: 1, alignItems: "center" }}>
          <TextField
            id="job-url"
            fullWidth
            label="Link to the advert"
            value={job?.url ?? ""}
            onChange={(event) => edit({ url: event.target.value })}
          />
          <OpenInNewTabButton
            url={job?.url ?? ""}
            label="Open the job advert in a new tab"
          />
        </Box>
        <Box sx={{ display: "flex", gap: 1, alignItems: "center" }}>
          <Typography sx={{ fontWeight: 600, flex: 1 }}>Advert text</Typography>
          <Button
            size="small"
            variant="outlined"
            color="primary"
            disabled={isReading}
            onClick={() => fileRef.current?.click()}
          >
            {isReading ? "Reading…" : "Choose PDF"}
          </Button>
          <input
            ref={fileRef}
            type="file"
            accept="application/pdf"
            hidden
            aria-label="Advert PDF"
            onChange={(event) => void readPdf(event)}
          />
        </Box>
        {note && <Help>{note}</Help>}
        {error && (
          <Typography role="alert" color="error" sx={{ fontSize: 13 }}>
            {error}
          </Typography>
        )}
        <TextField
          id="job-ad"
          multiline
          minRows={isPhone ? 5 : 7}
          aria-label="Advert text"
          placeholder="Paste the advert here, or choose a PDF"
          value={job?.jobAd ?? ""}
          onChange={(event) => edit({ jobAd: event.target.value })}
        />
        <Help>
          Only the advert text is used. Nothing is sent anywhere until you press
          Analyse.
        </Help>
      </Step>
      {!isDesktop && analysisCard}
      {!isDesktop && quickChecks}
    </Box>
  );

  return (
    <>
      <Box
        sx={{
          flex: 1,
          minWidth: 0,
          minHeight: 0,
          display: "flex",
          flexDirection: "column",
          // 44 px touch targets on a phone and a tablet
          "& .MuiInputBase-root, & .MuiButton-root": {
            minHeight: { xs: 44, lg: "auto" },
          },
          "& .visually-hidden": {
            position: "absolute",
            left: -9999,
          },
          ...MIDDLE_AREA_SX,
        }}
      >
        <Box sx={{ flex: 1, minHeight: 0, display: "flex" }}>
          <Box sx={{ flex: 1, minWidth: 0, overflow: "auto" }}>{form}</Box>
          {isDesktop && (
            <ResizableAside
              side="right"
              label="the status panel"
              defaultWidth={360}
            >
              {rightPanel}
            </ResizableAside>
          )}
        </Box>
        {!isDesktop && (
          <Box
            sx={{
              flex: "none",
              display: "flex",
              gap: 1,
              p: 1.25,
              bgcolor: WORKSPACE_COLORS.panel,
              borderTop: `1px solid ${WORKSPACE_COLORS.borderStrong}`,
              "& .MuiButton-root": { flex: 1 },
            }}
          >
            <Button
              variant="outlined"
              color="primary"
              size="large"
              disabled={!job}
              startIcon={<BookmarkBorderIcon />}
              onClick={() => void saveForLater()}
            >
              Save for later
            </Button>
            <Button
              variant="contained"
              size="large"
              disabled={!job}
              endIcon={<ChevronRightIcon />}
              onClick={saveAndContinue}
            >
              {isPhone ? "Continue" : "Save and continue"}
            </Button>
          </Box>
        )}
      </Box>
      <Dialog
        open={isLeaving}
        onClose={() => setIsLeaving(false)}
        aria-labelledby="leave-job-title"
      >
        <DialogTitle id="leave-job-title">Start another job?</DialogTitle>
        <DialogContent>
          <DialogContentText>
            This job is not in Saved for later. If you start another one now,
            you will not find this one on this page again. Save it for later
            first to keep it.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button color="neutral" onClick={() => setIsLeaving(false)}>
            Cancel
          </Button>
          <Button
            color="neutral"
            onClick={() => {
              void saveForLater();
            }}
          >
            Save for later, then start
          </Button>
          <Button color="error" onClick={createAnother}>
            Start without saving
          </Button>
        </DialogActions>
      </Dialog>
      <AppliedElsewhereDialog
        isOpen={isApplying}
        onClose={() => setIsApplying(false)}
        company={job?.company ?? ""}
        role={job?.role ?? ""}
        jobUrl={job?.url ?? ""}
        onSaved={() => {
          createAnother();
        }}
      />
    </>
  );
}
