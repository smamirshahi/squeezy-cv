import { OpenInNewTabButton } from "@components/open-in-new-tab-button";
import { notify } from "@components/notifications/notify";
import { AppliedElsewhereDialog } from "@pages/workspace/applied-elsewhere-dialog";
import { AnalyseJobAd } from "@pages/workspace/analyse-job-ad";
import { ResizableAside } from "@pages/workspace/resizable-aside";
import { JobImport, JobImportBox } from "@pages/workspace/job-source";
import { AiBadge } from "@components/ai-button";
import { JobFields } from "@custom-types/job-fields-types";
import { SponsorshipCheck } from "@pages/workspace/sponsorship-check";
import { useSavedForLater } from "@pages/workspace/use-saved-for-later";
import { ChangeEvent, ReactNode, useMemo, useRef, useState } from "react";
import {
  Box,
  Button,
  IconButton,
  MenuItem,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
} from "@components/ui";
import {
  BookmarkBorderOutlined as BookmarkBorderIcon,
  CheckOutlined as CheckIcon,
  ClearAllOutlined as ClearAllIcon,
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

function goTo(target: string): void {
  const element = document.getElementById(target);
  element?.scrollIntoView({ block: "center", behavior: "smooth" });
  element?.focus({ preventScroll: true });
}

function ProgressList({ items }: { items: ProgressItem[] }): JSX.Element {
  return (
    <Box component="ul" sx={{ m: 0, p: 0, display: "grid" }}>
      {items.map((item, index) => (
        <Box
          component="li"
          key={item.label}
          sx={{
            listStyle: "none",
            display: "flex",
            // a thin line between the required rows and the optional ones
            ...(item.isOptional &&
              !items[index - 1]?.isOptional && {
                mt: 0.5,
                pt: 0.5,
                borderTop: `1px solid ${WORKSPACE_COLORS.border}`,
              }),
          }}
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
 * below it) sit the advert analysis (AI), what is left to do, Save and continue and "I applied
 * elsewhere". Save for later and Clear are in the header. The status is not chosen here: Save
 * and continue leaves a Draft, Save for later a Candidate, "I applied elsewhere" an Applied
 * job. Nothing here changes the CV page.
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
  // What the last "Start from the advert" filled: which fields (marked until edited) and what
  // they held before, for Undo
  const [imported, setImported] = useState<
    (JobImport & { keys: Set<string>; before: Partial<Job> }) | null
  >(null);
  const [isApplying, setIsApplying] = useState<boolean>(false);
  const parkedEntry = job
    ? parked.open.find((entry) => entry.jobId === job.id)
    : undefined;

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

  /** The AI mark next to a label while the field still holds what the advert gave */
  function mark(key: string): ReactNode {
    return imported?.keys.has(key) ? (
      <AiBadge isProminent label="Filled from the advert: check it" />
    ) : null;
  }

  /** The user changed a field: it is theirs now, so its AI mark goes */
  function unmark(key: string): void {
    if (imported?.keys.has(key)) {
      const keys = new Set(imported.keys);
      keys.delete(key);
      setImported({ ...imported, keys });
    }
  }

  function fillFrom(
    read: JobFields,
    link: string,
    from: JobImport["from"]
  ): void {
    const details = {
      company: read.company,
      role: read.role,
      location: read.location,
      workMode: read.workMode as Job["workMode"],
      employmentType: read.employmentType as Job["employmentType"],
      jobAd: read.advert,
      url: link,
    };
    const filled = Object.entries(details).filter(
      ([, text]) => (text ?? "") !== ""
    );
    const before: Partial<Job> = {
      name: job?.name,
      company: job?.company,
      role: job?.role,
      location: job?.location,
      workMode: job?.workMode,
      employmentType: job?.employmentType,
      jobAd: job?.jobAd,
      url: job?.url,
    };
    edit(Object.fromEntries(filled));
    setImported({
      count: filled.length,
      from,
      keys: new Set(filled.map(([key]) => key)),
      before,
    });
  }

  function undoFill(): void {
    if (imported) {
      dispatch(
        setJobDetails({
          id: job?.id ?? "",
          details: imported.before,
        })
      );
      setImported(null);
    }
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
      // pressed again for a parked job: keep the note and day it already has
      note: parkedEntry?.note ?? "",
      applyBy: parkedEntry?.applyBy ?? "",
    };
    try {
      // pressed again for the same job: update that entry instead of parking a second one
      const existing = parked.open.find((entry) => entry.jobId === job.id);
      if (existing) {
        await parked.change(existing.id, fields);
      } else {
        await parked.save({ ...fields, jobId: job.id });
      }
      notify({
        kind: "success",
        text: "Saved for later as a Candidate. Find it any time in Applications.",
        action: {
          label: "View list",
          href: "/applications?status=candidate",
        },
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
    dispatch(createJob({ vault, style, name: DEFAULT_JOB_NAME, id: nanoid() }));
  }

  /**
   * Empties the form for the next job. Nothing is deleted: the job stays where it was (a Draft in
   * Applications, or in Saved for later) and the notification can bring it back.
   */
  function clearForm(): void {
    if (!job) {
      return;
    }
    const clearedId = job.id;
    const where = parkedEntry
      ? "in Applications as a Candidate"
      : "in Applications as a Draft";
    createAnother();
    notify({
      kind: "info",
      text: `Form cleared. “${job.name}” is not deleted: it is still ${where}.`,
      action: {
        label: "Bring it back",
        onClick: () =>
          navigate({ kind: "jobs", jobId: clearedId, view: "details" }),
      },
    });
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
  // Required rows first, then the optional ones
  const progress: ProgressItem[] = [
    {
      label: "Company and role",
      isDone: hasCompanyAndRole,
      target: (job?.company ?? "").trim() === "" ? "job-company" : "job-role",
    },
    { label: "Advert text", isDone: hasAdvert, target: "job-ad" },
    {
      label: "Link to the advert",
      isDone: (job?.url ?? "").trim() !== "",
      isOptional: true,
      target: "job-url",
    },
    {
      label: "Advert analysed",
      isDone: job?.analysis !== undefined,
      isOptional: true,
      target: "job-analysis",
    },
  ];
  const requiredLeft = progress.filter(
    (item) => !item.isOptional && !item.isDone
  );
  const firstLeft = progress.find((item) => !item.isDone);
  // Anything typed that Clear would take off the screen
  const hasContent = [
    job?.company,
    job?.role,
    job?.url,
    job?.jobAd,
    job?.location,
  ].some((text) => (text ?? "").trim() !== "");

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
            bgcolor: requiredLeft.length === 0 ? "var(--oks)" : "var(--wrs)",
            color: requiredLeft.length === 0 ? "var(--okt)" : "var(--wrt)",
          }}
        >
          {requiredLeft.length === 0
            ? "Required done"
            : `${requiredLeft.length} required left`}
        </Box>
      </Box>
      <ProgressList items={progress} />
      <Help>
        Only company, role and advert text are needed. The optional steps help
        the CV fit the job.
      </Help>
    </Card>
  );

  const analysisCard = job ? (
    <Box id="job-analysis" tabIndex={-1} sx={{ outline: "none" }}>
      <AnalyseJobAd job={job} />
    </Box>
  ) : null;

  const continueButton = (
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
  );

  // Desktop: the whole right panel, the way forward at the bottom
  const rightPanel = (
    <Box
      component="aside"
      aria-label="Next steps"
      sx={{
        width: "100%",
        flex: "none",
        display: "flex",
        flexDirection: "column",
        gap: 1.5,
        p: 2,
        overflow: "auto",
        borderLeft: `1px solid ${WORKSPACE_COLORS.border}`,
        bgcolor: "var(--bg)",
      }}
    >
      {analysisCard}
      {progressCard}
      <Box sx={{ mt: "auto" }}>
        <Card label="Next step">
          <Box sx={{ display: "grid", gap: 1.5 }}>
            {continueButton}
            <Typography
              sx={{
                fontSize: 12,
                textAlign: "center",
                color: WORKSPACE_COLORS.muted,
                mt: -0.5,
              }}
            >
              {job
                ? "Next: pick a template, then fix each CV section. Tailor will offer the analysis there."
                : "Fill in something to start this job."}
            </Typography>
            <Box sx={{ display: "grid", justifyItems: "center", gap: 0.5 }}>
              <Help>Already applied another way?</Help>
              {appliedElsewhereButton}
            </Box>
          </Box>
        </Card>
      </Box>
    </Box>
  );

  // Below a desktop: what is left on top, the analysis last, the way forward in a bottom bar
  const stackedTop = isPhone ? (
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
            bgcolor: requiredLeft.length === 0 ? "var(--oks)" : "var(--wrs)",
            color: requiredLeft.length === 0 ? "var(--okt)" : "var(--wrt)",
          }}
        >
          {requiredLeft.length === 0
            ? "Required done"
            : `${requiredLeft.length} required left`}
        </Box>
      </Box>
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
    </Card>
  ) : (
    progressCard
  );

  const optionalSelect = <T extends string>(
    label: ReactNode,
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
        <Button
          variant="outlined"
          color="neutral"
          disabled={!job}
          startIcon={<BookmarkBorderIcon />}
          onClick={() => void saveForLater()}
          sx={{ borderColor: WORKSPACE_COLORS.borderStrong }}
        >
          {parkedEntry ? "Update Saved for later" : "Save for later"}
        </Button>
        {isPhone ? (
          <IconButton
            aria-label="Clear the form"
            disabled={!hasContent}
            onClick={clearForm}
            sx={{
              border: `1px solid ${WORKSPACE_COLORS.borderStrong}`,
              borderRadius: "4px",
            }}
          >
            <ClearAllIcon />
          </IconButton>
        ) : (
          <Button
            color="neutral"
            disabled={!hasContent}
            startIcon={<ClearAllIcon />}
            onClick={clearForm}
          >
            Clear
          </Button>
        )}
      </Box>
      {parked.error && (
        <Typography role="alert" color="error" sx={{ fontSize: 13 }}>
          {parked.error}
        </Typography>
      )}
      <JobImportBox
        imported={imported}
        onFill={fillFrom}
        onUndo={undoFill}
        onUseAnother={() => setImported(null)}
      />
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
            label={<>Company{mark("company")}</>}
            value={job?.company ?? ""}
            onChange={(event) => {
              unmark("company");
              edit({ company: event.target.value });
            }}
          />
          <TextField
            id="job-role"
            required
            label={<>Role{mark("role")}</>}
            value={job?.role ?? ""}
            onChange={(event) => {
              unmark("role");
              edit({ role: event.target.value });
            }}
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
        <Box
          sx={{
            pt: 1.5,
            borderTop: `1px solid ${WORKSPACE_COLORS.border}`,
          }}
        >
          <SponsorshipCheck company={job?.company} />
        </Box>
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
          label={<>Location{mark("location")}</>}
          placeholder="City, country"
          value={job?.location ?? ""}
          onChange={(event) => {
            unmark("location");
            edit({ location: event.target.value });
          }}
        />
        <Box
          sx={{
            display: "grid",
            gap: 2,
            gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" },
          }}
        >
          {optionalSelect<NonNullable<Job["workMode"]>>(
            <>Work mode{mark("workMode")}</>,
            job?.workMode,
            [
              ["onsite", "On site"],
              ["hybrid", "Hybrid"],
              ["remote", "Remote"],
            ],
            (next) => {
              unmark("workMode");
              edit({ workMode: next });
            }
          )}
          {optionalSelect<EmploymentType>(
            <>Employment{mark("employmentType")}</>,
            job?.employmentType,
            [
              ["fullTime", "Full time"],
              ["partTime", "Part time"],
              ["contract", "Contract"],
              ["freelance", "Freelance"],
              ["internship", "Internship"],
            ],
            (next) => {
              unmark("employmentType");
              edit({ employmentType: next });
            }
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
            label={<>Link to the advert{mark("url")}</>}
            value={job?.url ?? ""}
            onChange={(event) => {
              unmark("url");
              edit({ url: event.target.value });
            }}
          />
          <OpenInNewTabButton
            url={job?.url ?? ""}
            label="Open the job advert in a new tab"
          />
        </Box>
        <Box sx={{ display: "flex", gap: 1, alignItems: "center" }}>
          <Typography sx={{ fontWeight: 600, flex: 1 }}>
            Advert text
            <Box
              component="span"
              aria-hidden="true"
              sx={{ color: "var(--er)" }}
            >
              {" "}
              *
            </Box>
          </Typography>
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
          required
          minRows={isPhone ? 5 : 7}
          aria-label="Advert text"
          placeholder="Paste the advert here, or choose a PDF"
          value={job?.jobAd ?? ""}
          onChange={(event) => {
            unmark("jobAd");
            edit({ jobAd: event.target.value });
          }}
        />
        {imported?.keys.has("jobAd") && (
          <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
            <AiBadge isProminent label="Filled from the advert: check it" />
            <Help>Advert text filled from the advert.</Help>
          </Box>
        )}
        <Help>
          Only the advert text is used. Nothing is sent anywhere until you press
          Analyse.
        </Help>
      </Step>
      {!isDesktop && analysisCard}
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
              color="neutral"
              size="large"
              disabled={!job}
              startIcon={isPhone ? undefined : <WorkOutlineIcon />}
              onClick={() => setIsApplying(true)}
            >
              {isPhone ? "Applied elsewhere" : "I applied elsewhere"}
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
