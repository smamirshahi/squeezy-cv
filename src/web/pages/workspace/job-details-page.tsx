import { OpenInNewTabButton } from "@components/open-in-new-tab-button";
import { AnalyseJobAd } from "@pages/workspace/analyse-job-ad";
import { ChangeEvent, useMemo, useRef, useState } from "react";
import {
  Box,
  Button,
  Checkbox,
  FormControlLabel,
  MenuItem,
  TextField,
  Typography,
} from "@mui/material";
import { Job } from "@custom-types/job-types";
import { JOB_OPINIONS, JobOpinion } from "@custom-types/json-types";
import { navigate } from "@hooks/navigation";
import { useSaveActions } from "@hooks/use-persistence";
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

/**
 * The "Job details" view of the Apply tool: what the job is for: name, company, role, link and the advert (typed, pasted or
 * read from a PDF). Nothing here changes the CV page.
 */
export function JobDetailsPage(): JSX.Element {
  const dispatch = useAppDispatch();
  const jobs = useAppSelector(jobsSelector);
  const activeJobId = useAppSelector((s) => s.jobs.activeJobId);
  const vault = useAppSelector(vaultSelector);
  const style = useAppSelector(styleSelector);
  // The stand-in job (nothing added yet) is not a job: the first edit creates the real one
  const isPlaceholder = useAppSelector(isPlaceholderSelector);
  const job = isPlaceholder
    ? undefined
    : jobs.find((entry) => entry.id === activeJobId);
  const isRange = job?.salaryIsRange !== false;
  const { save } = useSaveActions();
  const api = useMemo(() => createApiClient(), []);
  const fileRef = useRef<HTMLInputElement>(null);
  const [note, setNote] = useState<string>("");
  const [error, setError] = useState<string>("");
  const [isReading, setIsReading] = useState<boolean>(false);

  function edit(details: Parameters<typeof setJobDetails>[0]["details"]): void {
    if (job) {
      dispatch(setJobDetails({ id: job.id, details }));
      return;
    }
    // No job yet: the first thing typed creates it (no dialog), on the current template
    const id = nanoid();
    const typed = details.name ?? details.company ?? details.role;
    dispatch(createJob({ vault, style, name: typed?.trim() || "New job", id }));
    dispatch(setJobDetails({ id, details }));
  }

  function startAnother(): void {
    dispatch(createJob({ vault, style, name: "New job", id: nanoid() }));
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

  return (
    <>
      <Box
        component="main"
        aria-label="Job details"
        sx={{
          flex: 1,
          minWidth: 0,
          overflow: "auto",
          p: { xs: 2, lg: 3 },
          // 44 px touch targets on a phone and a tablet
          "& .MuiInputBase-root, & .MuiButton-root": {
            minHeight: { xs: 44, md: "auto" },
          },
          ...MIDDLE_AREA_SX,
        }}
      >
        {
          <Box sx={{ maxWidth: 800, mx: "auto", display: "grid", gap: 2 }}>
            <Box
              sx={{
                display: "flex",
                alignItems: "center",
                flexWrap: "wrap",
                gap: 1,
              }}
            >
              <Typography variant="h6" sx={{ flex: 1, minWidth: 160 }}>
                {job ? "Job application" : "Apply for a job"}
              </Typography>
              {job && (
                <Button size="small" onClick={startAnother}>
                  Start another job
                </Button>
              )}
              {job && (
                <Button
                  size="small"
                  variant={job.stage === "ready" ? "outlined" : "contained"}
                  onClick={() =>
                    edit({ stage: job.stage === "ready" ? "draft" : "ready" })
                  }
                >
                  {job.stage === "ready" ? "Back to draft" : "Mark as ready"}
                </Button>
              )}
            </Box>
            <TextField
              label="Job name"
              value={job?.name ?? ""}
              onChange={(event) => edit({ name: event.target.value })}
            />
            <Box
              sx={{
                display: "grid",
                gap: 2,
                gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" },
              }}
            >
              <TextField
                label="Company"
                value={job?.company ?? ""}
                onChange={(event) => edit({ company: event.target.value })}
              />
              <TextField
                label="Role"
                value={job?.role ?? ""}
                onChange={(event) => edit({ role: event.target.value })}
              />
            </Box>
            <Box
              sx={{
                display: "grid",
                gap: 2,
                gridTemplateColumns: { xs: "1fr", md: "2fr 1fr 1fr" },
              }}
            >
              <TextField
                label="Location"
                value={job?.location ?? ""}
                onChange={(event) => edit({ location: event.target.value })}
              />
              <TextField
                select
                label="Work mode"
                value={job?.workMode ?? ""}
                onChange={(event) =>
                  edit({
                    workMode:
                      event.target.value === ""
                        ? undefined
                        : (event.target.value as
                            "onsite" | "hybrid" | "remote"),
                  })
                }
              >
                <MenuItem value="">Not set</MenuItem>
                <MenuItem value="onsite">Onsite</MenuItem>
                <MenuItem value="hybrid">Hybrid</MenuItem>
                <MenuItem value="remote">Remote</MenuItem>
              </TextField>
              <TextField
                select
                label="Employment"
                value={job?.employmentType ?? ""}
                onChange={(event) =>
                  edit({
                    employmentType:
                      event.target.value === ""
                        ? undefined
                        : (event.target.value as EmploymentType),
                  })
                }
              >
                <MenuItem value="">Not set</MenuItem>
                <MenuItem value="fullTime">Full time</MenuItem>
                <MenuItem value="partTime">Part time</MenuItem>
                <MenuItem value="contract">Contract</MenuItem>
                <MenuItem value="freelance">Freelance</MenuItem>
                <MenuItem value="internship">Internship</MenuItem>
              </TextField>
            </Box>
            <Box
              sx={{
                display: "flex",
                flexWrap: "wrap",
                gap: 2,
                alignItems: "center",
              }}
            >
              <FormControlLabel
                control={
                  <Checkbox
                    checked={isRange}
                    onChange={(event) =>
                      edit({ salaryIsRange: event.target.checked })
                    }
                  />
                }
                label="Salary is a range"
              />
              <TextField
                label={isRange ? "Salary from (per year)" : "Salary (per year)"}
                type="number"
                value={job?.salaryMin ?? ""}
                onChange={(event) =>
                  edit({ salaryMin: numberOrUndefined(event.target.value) })
                }
                sx={{ flex: "1 1 150px" }}
              />
              {isRange && (
                <TextField
                  label="Salary to (per year)"
                  type="number"
                  value={job?.salaryMax ?? ""}
                  onChange={(event) =>
                    edit({ salaryMax: numberOrUndefined(event.target.value) })
                  }
                  sx={{ flex: "1 1 150px" }}
                />
              )}
              <TextField
                label="Expected salary (per year)"
                type="number"
                value={job?.expectedSalary ?? ""}
                onChange={(event) =>
                  edit({
                    expectedSalary: numberOrUndefined(event.target.value),
                  })
                }
                sx={{ flex: "1 1 170px" }}
              />
            </Box>
            <Box
              sx={{
                display: "grid",
                gap: 2,
                gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" },
              }}
            >
              <TextField
                select
                label="How I feel about it"
                value={job?.feeling ?? ""}
                onChange={(event) =>
                  edit({
                    feeling:
                      event.target.value === ""
                        ? undefined
                        : (event.target.value as JobOpinion),
                  })
                }
              >
                <MenuItem value="">Not set</MenuItem>
                {JOB_OPINIONS.map((opinion) => (
                  <MenuItem key={opinion} value={opinion}>
                    {FEELING_LABELS[opinion]}
                  </MenuItem>
                ))}
              </TextField>
              <TextField
                select
                label="My chance"
                value={job?.chance ?? ""}
                onChange={(event) =>
                  edit({
                    chance:
                      event.target.value === ""
                        ? undefined
                        : (event.target.value as Chance),
                  })
                }
              >
                <MenuItem value="">Not set</MenuItem>
                {(Object.keys(CHANCE_LABELS) as Chance[]).map((chance) => (
                  <MenuItem key={chance} value={chance}>
                    {CHANCE_LABELS[chance]}
                  </MenuItem>
                ))}
              </TextField>
            </Box>
            <Box sx={{ display: "flex", gap: 1, alignItems: "center" }}>
              <TextField
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
              <Typography sx={{ fontWeight: 600 }}>Advert</Typography>
              <Button
                size="small"
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
            {note && (
              <Typography sx={{ fontSize: 13, color: WORKSPACE_COLORS.muted }}>
                {note}
              </Typography>
            )}
            {error && (
              <Typography role="alert" color="error" sx={{ fontSize: 13 }}>
                {error}
              </Typography>
            )}
            <TextField
              multiline
              minRows={12}
              label="Advert text"
              placeholder="Paste the advert here, or choose a PDF"
              value={job?.jobAd ?? ""}
              onChange={(event) => edit({ jobAd: event.target.value })}
            />
            {job && <AnalyseJobAd job={job} />}
            <Box
              sx={{
                display: "flex",
                alignItems: "center",
                flexWrap: "wrap",
                gap: 1.5,
                pt: 1,
                borderTop: `1px solid ${WORKSPACE_COLORS.border}`,
              }}
            >
              <Typography
                sx={{
                  flex: 1,
                  minWidth: 200,
                  fontSize: 13,
                  color: WORKSPACE_COLORS.muted,
                }}
              >
                {job
                  ? "Next: pick a template and choose what the CV shows."
                  : "Fill in something above to start this job."}
              </Typography>
              <Button
                variant="contained"
                disabled={!job}
                onClick={() => {
                  save();
                  navigate({ kind: "jobs", jobId: job?.id, view: "page" });
                }}
              >
                Save and continue
              </Button>
            </Box>
          </Box>
        }
      </Box>
    </>
  );
}
