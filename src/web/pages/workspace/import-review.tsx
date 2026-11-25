import { useMemo, useState } from "react";
import {
  Alert,
  Box,
  Button,
  Checkbox,
  Chip,
  FormControlLabel,
  Radio,
  RadioGroup,
  TextField,
  Typography,
} from "@components/ui";
import { fieldSpecsFor } from "@shared/vault/item-fields";
import {
  Conflict,
  DescriptionLine,
  MergePlan,
  Proposal,
  ProposalKind,
} from "@shared/vault/merge-imports";

interface Props {
  plan: MergePlan;
  checked: ReadonlySet<string>;
  onToggle: (id: string) => void;
  /** target is "profile" or a proposal id */
  onChoose: (target: string, field: string, value: string) => void;
  onAddOthers: (value: boolean) => void;
  onLines: (proposalId: string, lines: DescriptionLine[]) => void;
}

type Filter = "all" | "decide" | "update" | "new";

/** One line in the list on the left: an item or a profile detail */
interface Row {
  key: string;
  group: string;
  title: string;
  help: string;
  /** Proposal id, for items that can be ticked */
  proposalId?: string;
  kind?: ProposalKind;
  isConflict: boolean;
  isDecided: boolean;
  sources: string[];
}

const KIND_LABEL: Record<ProposalKind, string> = {
  new: "New",
  update: "Updates your vault",
  merged: "Combined from several files",
};

const PROFILE_LABEL: Record<string, string> = {
  fullName: "Name",
  headline: "Job title",
  email: "Email",
  phone: "Phone number",
  location: "Location",
};

const MONTHS = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

/** "2019-03-01" as "Mar 2019"; any other text as it is */
function show(key: string, value: string | undefined): string {
  if (!value) {
    return "Empty";
  }
  const match = /^(\d{4})-(\d{2})-\d{2}$/.exec(value);
  if (match && (key === "startDate" || key === "endDate")) {
    return `${MONTHS[Number(match[2]) - 1]} ${match[1]}`;
  }
  return value;
}

function titleOf(proposal: Proposal): string {
  const fields = proposal.item.fields;
  const main = [fields.jobTitle, fields.degree, fields.name, fields.title]
    .filter(Boolean)
    .join(" · ");
  const place = fields.company || fields.institute || fields.category || "";
  return [main, place].filter(Boolean).join(" · ") || "(untitled)";
}

function buildRows(plan: MergePlan): Row[] {
  const rows: Row[] = [];
  for (const conflict of plan.profileConflicts) {
    rows.push({
      key: `profile:${conflict.field}`,
      group: "Profile",
      title: PROFILE_LABEL[conflict.field] ?? conflict.field,
      help: conflict.options.map((option) => option.value).join(" or "),
      isConflict: true,
      isDecided: conflict.chosen !== undefined,
      sources: [...new Set(conflict.options.flatMap((o) => o.from))],
    });
  }
  for (const [field, value] of Object.entries(plan.profileFill)) {
    rows.push({
      key: `fill:${field}`,
      group: "Profile",
      title: PROFILE_LABEL[field] ?? field,
      help: value,
      kind: "new",
      isConflict: false,
      isDecided: true,
      sources: [],
    });
  }
  for (const proposal of plan.proposals) {
    rows.push({
      key: proposal.id,
      group: proposal.sectionTitle,
      title: titleOf(proposal),
      help: [
        show("startDate", proposal.item.fields.startDate),
        proposal.item.fields.startDate || proposal.item.fields.endDate
          ? `– ${proposal.item.fields.endDate ? show("endDate", proposal.item.fields.endDate) : "now"}`
          : "",
      ]
        .filter(Boolean)
        .join(" "),
      proposalId: proposal.id,
      kind: proposal.kind,
      isConflict: proposal.conflicts.length > 0,
      isDecided: proposal.conflicts.every((c) => c.chosen !== undefined),
      sources: proposal.sources,
    });
  }
  return rows;
}

function ConflictPicker({
  conflict,
  label,
  onChoose,
}: {
  conflict: Conflict;
  label: string;
  onChoose: (value: string) => void;
}): JSX.Element {
  const isOther =
    conflict.chosen !== undefined &&
    !conflict.options.some((option) => option.value === conflict.chosen);
  return (
    <Box
      sx={{
        display: "grid",
        gap: 1,
        p: 1.5,
        border: "1px solid",
        borderColor: conflict.chosen === undefined ? "warning.main" : "divider",
        borderRadius: 1,
      }}
    >
      <Typography sx={{ fontWeight: "bold" }}>
        {label}: which one is right?
      </Typography>
      <RadioGroup
        value={isOther ? "" : (conflict.chosen ?? "")}
        onChange={(event) => onChoose(event.target.value)}
      >
        {conflict.options.map((option) => (
          <FormControlLabel
            key={option.value}
            value={option.value}
            control={<Radio size="small" />}
            label={
              <span>
                {show(conflict.field, option.value)}{" "}
                <Typography
                  component="span"
                  variant="caption"
                  color="text.secondary"
                >
                  {option.from.join(", ")}
                </Typography>
              </span>
            }
          />
        ))}
      </RadioGroup>
      <TextField
        size="small"
        label="Or type your own"
        value={isOther ? conflict.chosen : ""}
        onChange={(event) => onChoose(event.target.value)}
      />
    </Box>
  );
}

function Chips({ row }: { row: Row }): JSX.Element {
  return (
    <Box sx={{ display: "flex", gap: 0.5, flexWrap: "wrap" }}>
      {row.isConflict && (
        <Chip
          size="small"
          color="warning"
          label={row.isDecided ? "Decided" : "Needs your decision"}
        />
      )}
      {row.kind && <Chip size="small" label={KIND_LABEL[row.kind]} />}
    </Box>
  );
}

function Overview({
  rows,
  open,
}: {
  rows: Row[];
  open: (key: string) => void;
}): JSX.Element {
  const toDecide = rows.filter((row) => row.isConflict && !row.isDecided);
  return (
    <Box sx={{ display: "grid", gap: 1.5 }}>
      <Typography variant="h6">Here is what we found</Typography>
      <Typography variant="body2">
        {rows.length} items from your files. Pick one on the left to see the
        details.
      </Typography>
      <Typography variant="body2">
        <b>New</b>: not in your vault yet; added as they are.
      </Typography>
      <Typography variant="body2">
        <b>Updates your vault</b>: already there; new details are added and you
        see before and after.
      </Typography>
      <Typography variant="body2">
        <b>Combined from several files</b>: shown once; different descriptions
        are gathered into one and repeated lines removed.
      </Typography>
      <Typography variant="body2">
        <b>Needs your decision</b>: your files disagree on a date, a job title
        or a phone number. You pick which one is right.
      </Typography>
      {toDecide.length > 0 && (
        <Alert
          severity="warning"
          action={
            <Button size="small" onClick={() => open(toDecide[0].key)}>
              Go to the first
            </Button>
          }
        >
          Start with the {toDecide.length} conflict
          {toDecide.length === 1 ? "" : "s"}. Add to my vault stays off until
          each one is decided or unticked.
        </Alert>
      )}
      <Typography variant="caption" color="text.secondary">
        Safe to try: after adding, one Undo puts your vault back exactly as it
        was before this import.
      </Typography>
    </Box>
  );
}

function labelFor(proposal: Proposal, key: string): string {
  return (
    fieldSpecsFor(proposal.sectionType).find((spec) => spec.key === key)
      ?.label ?? key
  );
}

function ItemDetail({
  proposal,
  isChecked,
  onToggle,
  onChoose,
  onLines,
}: {
  proposal: Proposal;
  isChecked: boolean;
  onToggle: () => void;
  onChoose: (field: string, value: string) => void;
  onLines: (lines: DescriptionLine[]) => void;
}): JSX.Element {
  const [isWhole, setIsWhole] = useState<boolean>(false);
  // The table shows what will be saved: the value chosen for a conflict replaces the placeholder
  const after: Record<string, string> = { ...proposal.item.fields };
  for (const conflict of proposal.conflicts) {
    if (conflict.chosen !== undefined) {
      after[conflict.field] = conflict.chosen;
    }
  }
  const before = proposal.before?.fields;
  const keys = [
    ...new Set([...Object.keys(before ?? {}), ...Object.keys(after)]),
  ]
    .filter((key) => key !== "description" || !proposal.descriptionLines)
    .filter((key) => after[key] || before?.[key]);
  const changed = (key: string): boolean =>
    (before?.[key] ?? "") !== (after[key] ?? "");
  const shown =
    proposal.kind === "update" && !isWhole ? keys.filter(changed) : keys;
  return (
    <Box sx={{ display: "grid", gap: 1.5 }}>
      <Typography variant="h6">{titleOf(proposal)}</Typography>
      <Chips
        row={{
          key: proposal.id,
          group: "",
          title: "",
          help: "",
          kind: proposal.kind,
          isConflict: proposal.conflicts.length > 0,
          isDecided: proposal.conflicts.every((c) => c.chosen !== undefined),
          sources: proposal.sources,
        }}
      />
      <FormControlLabel
        control={<Checkbox checked={isChecked} onChange={onToggle} />}
        label={
          proposal.kind === "update"
            ? "Update this item in my vault (untick to keep it exactly as it is now)"
            : "Add this item to my vault"
        }
      />
      <Typography variant="caption" color="text.secondary">
        From {proposal.sources.join(", ")}
      </Typography>
      {isChecked &&
        proposal.conflicts.map((conflict) => (
          <ConflictPicker
            key={conflict.field}
            conflict={conflict}
            label={labelFor(proposal, conflict.field)}
            onChoose={(value) => onChoose(conflict.field, value)}
          />
        ))}
      {proposal.kind === "update" && (
        <Box sx={{ display: "flex", gap: 1, alignItems: "center" }}>
          <Typography variant="caption" color="text.secondary">
            Show:
          </Typography>
          <Button
            size="small"
            variant={isWhole ? "outlined" : "contained"}
            onClick={() => setIsWhole(false)}
          >
            Only what changes
          </Button>
          <Button
            size="small"
            variant={isWhole ? "contained" : "outlined"}
            onClick={() => setIsWhole(true)}
          >
            All fields
          </Button>
        </Box>
      )}
      <Box
        sx={{
          display: "grid",
          gridTemplateColumns:
            proposal.kind === "update" ? "1fr 1fr 1fr" : "1fr 2fr",
          gap: 0.75,
          fontSize: 14,
        }}
      >
        {proposal.kind === "update" && (
          <>
            <b>Field</b>
            <b>In your vault now</b>
            <b>After the update</b>
          </>
        )}
        {shown.length === 0 && (
          <Typography
            variant="body2"
            color="text.secondary"
            sx={{ gridColumn: "1 / -1" }}
          >
            No field changes. Choose a value above, or switch to “All fields”.
          </Typography>
        )}
        {shown.map((key) => (
          <Box key={key} sx={{ display: "contents" }}>
            <Typography variant="body2" color="text.secondary">
              {labelFor(proposal, key)}
            </Typography>
            {proposal.kind === "update" && (
              <Typography
                variant="body2"
                sx={{ whiteSpace: "pre-line" }}
                color={changed(key) ? "text.secondary" : "text.primary"}
              >
                {show(key, before?.[key])}
              </Typography>
            )}
            <Typography
              variant="body2"
              sx={{
                whiteSpace: "pre-line",
                fontWeight: changed(key) ? "bold" : undefined,
              }}
            >
              {show(key, after[key])}
              {proposal.kind === "update" && !changed(key)
                ? " (no change)"
                : ""}
            </Typography>
          </Box>
        ))}
      </Box>
      {proposal.descriptionLines && (
        <GatheredLines lines={proposal.descriptionLines} onChange={onLines} />
      )}
    </Box>
  );
}

/** The gathered description, line by line with where each line came from; a line can be removed */
function GatheredLines({
  lines,
  onChange,
}: {
  lines: DescriptionLine[];
  onChange: (lines: DescriptionLine[]) => void;
}): JSX.Element {
  return (
    <Box sx={{ display: "grid", gap: 0.5 }}>
      <Typography sx={{ fontWeight: "bold" }}>
        Description · {lines.length} {lines.length === 1 ? "line" : "lines"}
      </Typography>
      <Typography variant="caption" color="text.secondary">
        All the lines from your sources are gathered here, repeated lines
        removed. Remove any you do not want.
      </Typography>
      {lines.map((line, index) => (
        <Box
          key={line.text}
          sx={{ display: "flex", gap: 1, alignItems: "flex-start" }}
        >
          <Box sx={{ flex: 1 }}>
            <Typography variant="body2">{line.text}</Typography>
            <Typography variant="caption" color="text.secondary">
              {line.from.join(", ")}
            </Typography>
          </Box>
          <Button
            size="small"
            aria-label={`Remove line ${index + 1}`}
            onClick={() => onChange(lines.filter((_, i) => i !== index))}
          >
            Remove
          </Button>
        </Box>
      ))}
    </Box>
  );
}

function ProfileDetail({
  plan,
  field,
  onChoose,
  onAddOthers,
}: {
  plan: MergePlan;
  field: string;
  onChoose: (value: string) => void;
  onAddOthers: (value: boolean) => void;
}): JSX.Element {
  const conflict = plan.profileConflicts.find((c) => c.field === field);
  if (!conflict) {
    return <Typography>{PROFILE_LABEL[field] ?? field}</Typography>;
  }
  return (
    <Box sx={{ display: "grid", gap: 1.5 }}>
      <Typography variant="h6">{PROFILE_LABEL[field] ?? field}</Typography>
      <ConflictPicker
        conflict={conflict}
        label={PROFILE_LABEL[field] ?? field}
        onChoose={onChoose}
      />
      {field === "headline" && (
        <FormControlLabel
          control={
            <Checkbox
              checked={conflict.addOthers !== false}
              onChange={(event) => onAddOthers(event.target.checked)}
            />
          }
          label="Add the other job titles to “Other job titles”"
        />
      )}
    </Box>
  );
}

/**
 * The review step of an import (#574), in two columns: the found items on the left (grouped,
 * filterable, with a tick for each), the details of the picked one on the right (conflicts to
 * settle, before/after for updates, the gathered description line by line).
 */
export function ImportReview({
  plan,
  checked,
  onToggle,
  onChoose,
  onAddOthers,
  onLines,
}: Props): JSX.Element {
  const [filter, setFilter] = useState<Filter>("all");
  const [selected, setSelected] = useState<string>("");
  const rows = useMemo(() => buildRows(plan), [plan]);
  const counts = {
    all: rows.length,
    decide: rows.filter((row) => row.isConflict && !row.isDecided).length,
    update: rows.filter((row) => row.kind === "update").length,
    new: rows.filter((row) => row.kind === "new").length,
  };
  const visible = rows.filter(
    (row) =>
      filter === "all" ||
      (filter === "decide" && row.isConflict && !row.isDecided) ||
      (filter === "update" && row.kind === "update") ||
      (filter === "new" && row.kind === "new")
  );
  const groups = [...new Set(visible.map((row) => row.group))];
  const proposal = plan.proposals.find((p) => p.id === selected);
  const profileField = selected.startsWith("profile:")
    ? selected.slice("profile:".length)
    : "";

  if (rows.length === 0) {
    return <Alert severity="info">Nothing new was found in these files.</Alert>;
  }
  const tabs: [Filter, string][] = [
    ["all", "All"],
    ["decide", "To decide"],
    ["update", "Updates"],
    ["new", "New"],
  ];
  return (
    <Box
      sx={{
        display: "grid",
        gridTemplateColumns: { xs: "1fr", md: "minmax(0,1fr) minmax(0,1.2fr)" },
        gap: 2,
        minHeight: 0,
      }}
    >
      <Box
        sx={{
          display: "flex",
          flexDirection: "column",
          gap: 1,
          minHeight: 0,
          maxHeight: { md: 480 },
        }}
      >
        <Box sx={{ display: "flex", gap: 0.5, flexWrap: "wrap" }}>
          {tabs.map(([id, label]) => (
            <Button
              key={id}
              size="small"
              variant={filter === id ? "contained" : "outlined"}
              onClick={() => setFilter(id)}
            >
              {label} {counts[id]}
            </Button>
          ))}
        </Box>
        <Box
          role="list"
          aria-label="Found items"
          sx={{ overflowY: "auto", display: "grid", gap: 0.5 }}
        >
          {groups.map((group) => (
            <Box key={group} sx={{ display: "grid", gap: 0.5 }}>
              <Typography variant="overline">{group}</Typography>
              {visible
                .filter((row) => row.group === group)
                .map((row) => (
                  <Box
                    key={row.key}
                    role="listitem"
                    sx={{
                      display: "flex",
                      alignItems: "flex-start",
                      gap: 0.5,
                      p: 0.5,
                      border: "1px solid",
                      borderColor:
                        row.key === selected
                          ? "primary.main"
                          : row.isConflict && !row.isDecided
                            ? "warning.main"
                            : "divider",
                      borderRadius: 1,
                    }}
                  >
                    {row.proposalId ? (
                      <Checkbox
                        size="small"
                        checked={checked.has(row.proposalId)}
                        onChange={() => onToggle(row.proposalId as string)}
                        slotProps={{
                          input: { "aria-label": `Include ${row.title}` },
                        }}
                      />
                    ) : (
                      <Box sx={{ width: 34 }} />
                    )}
                    <Box
                      component="button"
                      type="button"
                      onClick={() => setSelected(row.key)}
                      sx={{
                        all: "unset",
                        cursor: "pointer",
                        flex: 1,
                        display: "grid",
                        gap: 0.25,
                        py: 0.5,
                        minWidth: 0,
                      }}
                    >
                      <Typography sx={{ fontWeight: 600 }}>
                        {row.title}
                      </Typography>
                      {row.help && (
                        <Typography variant="body2" color="text.secondary">
                          {row.help}
                        </Typography>
                      )}
                      <Chips row={row} />
                      {row.sources.length > 0 && (
                        <Typography variant="caption" color="text.secondary">
                          {row.sources.join(", ")}
                        </Typography>
                      )}
                    </Box>
                  </Box>
                ))}
            </Box>
          ))}
          {visible.length === 0 && (
            <Typography variant="body2" color="text.secondary">
              Nothing in this view.
            </Typography>
          )}
        </Box>
      </Box>
      <Box sx={{ overflowY: "auto", maxHeight: { md: 520 }, pr: 0.5 }}>
        {proposal ? (
          <ItemDetail
            proposal={proposal}
            isChecked={checked.has(proposal.id)}
            onToggle={() => onToggle(proposal.id)}
            onChoose={(field, value) => onChoose(proposal.id, field, value)}
            onLines={(lines) => onLines(proposal.id, lines)}
          />
        ) : profileField ? (
          <ProfileDetail
            plan={plan}
            field={profileField}
            onChoose={(value) => onChoose("profile", profileField, value)}
            onAddOthers={onAddOthers}
          />
        ) : (
          <Overview rows={rows} open={setSelected} />
        )}
      </Box>
    </Box>
  );
}
