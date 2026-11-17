import { ReactNode } from "react";
import {
  Box,
  MenuItem,
  Switch,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
} from "@components/ui";
import { InfoOutlined as InfoIcon } from "@components/ui/icons";
import { CitationRuns } from "@components/cv-citation";
import { Section } from "@custom-types/vault-types";
import { DropdownCitationStyle } from "@pages/editor-page/sections/editor-style-settings/dropdown-citation-style";
import { DropdownSkillIcon } from "@pages/editor-page/sections/editor-style-settings/dropdown-skill-icon";
import { WORKSPACE_COLORS } from "@pages/workspace/workspace-tokens";
import { ENTRY_DETAILS, isDetailShown } from "@shared/style/entry-details";
import {
  DEFAULT_MAX_AUTHORS,
  DEFAULT_PUBLICATION_LINKS,
  formatCitation,
} from "@shared/vault/citation";
import {
  setEducationOrder,
  setExperienceOrder,
  setHighlightOwnName,
  setIsReferencesOnRequest,
  setMaxAuthors,
  setPublicationLinks,
  setPublicationOrder,
  setShouldShowGender,
  setSkillsLayout,
  setDetailShown,
  setShouldShowLinks,
  setShouldShowMaritalStatus,
  setShouldShowNationality,
  setShouldShowPhoto,
  setShouldShowReferenceContacts,
  setShouldShowRightToWork,
  styleSelector,
} from "@store/cv-data/cv-data-slice";
import { useAppDispatch, useAppSelector } from "@store/store-helper";
import { updateProfile, vaultSelector } from "@store/vault/vault-slice";

/** One group of settings, drawn as a card */
function PropertyCard({
  title,
  children,
}: {
  title?: string;
  children: ReactNode;
}): JSX.Element {
  return (
    <Box
      sx={{
        p: 2,
        display: "flex",
        flexDirection: "column",
        gap: 1.5,
        border: `1px solid ${WORKSPACE_COLORS.border}`,
        borderRadius: 1.5,
        bgcolor: WORKSPACE_COLORS.panel,
      }}
    >
      {title && (
        <Typography
          component="h3"
          sx={{
            fontSize: 11,
            fontWeight: 700,
            letterSpacing: ".07em",
            textTransform: "uppercase",
            color: WORKSPACE_COLORS.muted,
          }}
        >
          {title}
        </Typography>
      )}
      {children}
    </Box>
  );
}

/** A switch with its name and a line of help, one row */
function SwitchRow({
  label,
  hint,
  checked,
  onChange,
}: {
  label: string;
  hint?: string;
  checked: boolean;
  onChange: (value: boolean) => void;
}): JSX.Element {
  return (
    <Box sx={{ display: "flex", alignItems: "flex-start", gap: 1 }}>
      <Switch
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
        slotProps={{ input: { "aria-label": label } }}
      />
      <Box sx={{ flex: 1, minWidth: 0, pt: 0.75 }}>
        <Typography sx={{ fontWeight: 600, fontSize: 14 }}>{label}</Typography>
        {hint && (
          <Typography sx={{ fontSize: 12.5, color: WORKSPACE_COLORS.muted }}>
            {hint}
          </Typography>
        )}
      </Box>
    </Box>
  );
}

/** Two or three choices side by side */
function Choice<T extends string | number>({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: T;
  options: { value: T; label: string }[];
  onChange: (value: T) => void;
}): JSX.Element {
  return (
    <Box>
      <Typography sx={{ fontWeight: 600, fontSize: 14, mb: 0.75 }}>
        {label}
      </Typography>
      <ToggleButtonGroup
        exclusive
        fullWidth
        size="small"
        value={value}
        aria-label={label}
        onChange={(_event, next: T | null) => {
          if (next !== null) {
            onChange(next);
          }
        }}
      >
        {options.map((option) => (
          <ToggleButton
            key={String(option.value)}
            value={option.value}
            sx={{ minHeight: { xs: 44, lg: 36 }, textTransform: "none" }}
          >
            {option.label}
          </ToggleButton>
        ))}
      </ToggleButtonGroup>
    </Box>
  );
}

function Note({ children }: { children: ReactNode }): JSX.Element {
  return (
    <Box
      sx={{
        display: "flex",
        gap: 1,
        fontSize: 12.5,
        color: WORKSPACE_COLORS.muted,
      }}
    >
      <InfoIcon sx={{ fontSize: 16, mt: 0.25 }} />
      <Box>{children}</Box>
    </Box>
  );
}

const PER_JOB_NOTE =
  "Which entries show is decided per job, in Apply › Template & content.";

function PersonalInfoProperties(): JSX.Element {
  const dispatch = useAppDispatch();
  const style = useAppSelector(styleSelector);
  return (
    <>
      <PropertyCard title="Show in the header">
        <SwitchRow
          label="Profile photo"
          hint="Shown at the top right of the CV. Only has an effect when a photo is added in Main Info."
          checked={style.shouldShowPhoto !== false}
          onChange={(value) => dispatch(setShouldShowPhoto(value))}
        />
        <SwitchRow
          label="Nationality"
          hint="Off by default."
          checked={style.shouldShowNationality ?? false}
          onChange={(value) => dispatch(setShouldShowNationality(value))}
        />
        <SwitchRow
          label="Marital status"
          hint="Off by default."
          checked={style.shouldShowMaritalStatus ?? false}
          onChange={(value) => dispatch(setShouldShowMaritalStatus(value))}
        />
        <SwitchRow
          label="Gender"
          hint="Off by default."
          checked={style.shouldShowGender ?? false}
          onChange={(value) => dispatch(setShouldShowGender(value))}
        />
        <SwitchRow
          label="Right to work"
          hint="For example “UK citizen” or “Skilled Worker visa”."
          checked={style.shouldShowRightToWork ?? false}
          onChange={(value) => dispatch(setShouldShowRightToWork(value))}
        />
      </PropertyCard>
      <Note>
        Most UK CVs leave out nationality, marital status and gender. Turn them
        on only if the job asks.
      </Note>
    </>
  );
}

function ContactInfoProperties(): JSX.Element {
  const dispatch = useAppDispatch();
  const style = useAppSelector(styleSelector);
  return (
    <>
      <PropertyCard>
        <SwitchRow
          label="Links (LinkedIn, GitHub, ...)"
          hint="Turns links on or off for the whole template."
          checked={style.shouldShowLinks !== false}
          onChange={(value) => dispatch(setShouldShowLinks(value))}
        />
      </PropertyCard>
      <Note>
        Which links appear, and in what order, is chosen separately for each
        job. The small icons in front of details are set in Design.
      </Note>
    </>
  );
}

const ORDER_OPTIONS = [
  { value: "newest", label: "Newest first" },
  { value: "oldest", label: "Oldest first" },
] as const;

const SKILLS_LAYOUT_OPTIONS = [
  { value: "list", label: "List" },
  { value: "two", label: "2 columns" },
  { value: "three", label: "3 columns" },
  { value: "inline", label: "One line" },
] as const;

function SkillsLayoutChoice(): JSX.Element {
  const dispatch = useAppDispatch();
  const { skillsLayout } = useAppSelector(styleSelector);
  return (
    <>
      <Choice
        label="Skills layout"
        value={skillsLayout ?? "list"}
        options={[...SKILLS_LAYOUT_OPTIONS]}
        onChange={(next) => dispatch(setSkillsLayout(next))}
      />
      <Typography sx={{ fontSize: 12.5, color: WORKSPACE_COLORS.muted }}>
        Skills are short, so columns or one line per group save space. The level
        is written after each skill.
      </Typography>
    </>
  );
}

/** One switch per detail of an entry; all are on unless the template hides them */
function EntryDetailsCard({
  kind,
}: {
  kind: keyof typeof ENTRY_DETAILS;
}): JSX.Element {
  const dispatch = useAppDispatch();
  const { hiddenDetails } = useAppSelector(styleSelector);
  return (
    <PropertyCard title="Show in each entry">
      {ENTRY_DETAILS[kind].map((detail) => (
        <SwitchRow
          key={detail.key}
          label={detail.label}
          checked={isDetailShown(hiddenDetails, detail.key)}
          onChange={(isShown) =>
            dispatch(setDetailShown({ key: detail.key, isShown }))
          }
        />
      ))}
    </PropertyCard>
  );
}

function EntryOrderProperties({
  kind,
}: {
  kind: "experience" | "education";
}): JSX.Element {
  const dispatch = useAppDispatch();
  const { experienceOrder, educationOrder } = useAppSelector(styleSelector);
  const isExperience = kind === "experience";
  const value = (isExperience ? experienceOrder : educationOrder) ?? "newest";
  return (
    <>
      <PropertyCard>
        <Choice
          label="Order of entries"
          value={value}
          options={[...ORDER_OPTIONS]}
          onChange={(next) =>
            dispatch(
              isExperience ? setExperienceOrder(next) : setEducationOrder(next)
            )
          }
        />
        <Typography sx={{ fontSize: 12.5, color: WORKSPACE_COLORS.muted }}>
          By end date, then start date. An entry that is still going on counts
          as the latest. An order a job sets by hand wins over this.
        </Typography>
      </PropertyCard>
      <EntryDetailsCard kind={kind} />
      <Note>
        {PER_JOB_NOTE}
        {isExperience ? " The bullet point icon is set in Design." : ""}
      </Note>
    </>
  );
}

function PublicationsProperties(): JSX.Element {
  const dispatch = useAppDispatch();
  const style = useAppSelector(styleSelector);
  const { profile } = useAppSelector(vaultSelector);
  const ownName = profile.citationName?.trim() || profile.fullName;
  // a sample line made of the user's own name between two other authors
  const sampleOwn = ownName.trim() === "" ? "Doe, J." : ownName.split(";")[0];
  const sample = formatCitation(
    {
      authors: `Roe, R.; ${sampleOwn.trim()}; Lee, K.`,
      title: "Faster rendering for dashboards",
      journal: "Journal of Example Computing",
      year: "2021",
      link: "10.1234/example",
    },
    {
      style: style.citationStyle,
      links: style.publicationLinks,
      highlightOwnName: style.highlightOwnName,
      maxAuthors: style.maxAuthors,
      ownName,
    }
  );
  return (
    <>
      <PropertyCard>
        <DropdownCitationStyle />
        <Box>
          <Typography
            sx={{
              fontSize: 11,
              fontWeight: 700,
              letterSpacing: ".07em",
              textTransform: "uppercase",
              color: WORKSPACE_COLORS.muted,
              mb: 0.5,
            }}
          >
            Sample
          </Typography>
          <Box
            data-testid="citation-sample"
            sx={{
              p: 1.25,
              fontSize: 13,
              bgcolor: WORKSPACE_COLORS.panelAlt,
              borderRadius: 1,
            }}
          >
            <CitationRuns segments={sample} />
          </Box>
        </Box>
      </PropertyCard>
      <PropertyCard>
        <SwitchRow
          label="Make my name bold"
          hint="Helps a reader find your papers at a glance."
          checked={style.highlightOwnName !== false}
          onChange={(value) => dispatch(setHighlightOwnName(value))}
        />
        <TextField
          size="small"
          label="My name as written in citations"
          placeholder={profile.fullName || "Doe, J."}
          value={profile.citationName ?? ""}
          onChange={(event) =>
            dispatch(
              updateProfile({
                citationName:
                  event.target.value === "" ? undefined : event.target.value,
              })
            )
          }
          helperText="Matched by surname and first initial. Separate other spellings with a semicolon. Left empty, your full name is used. It is saved in your vault."
        />
      </PropertyCard>
      <PropertyCard>
        <Choice
          label="Link"
          value={style.publicationLinks ?? DEFAULT_PUBLICATION_LINKS}
          options={[
            { value: "end", label: "At the end" },
            { value: "none", label: "Not shown" },
          ]}
          onChange={(next) => dispatch(setPublicationLinks(next))}
        />
        <TextField
          select
          size="small"
          label="Authors before “et al.”"
          value={style.maxAuthors ?? DEFAULT_MAX_AUTHORS}
          onChange={(event) => {
            const raw = event.target.value;
            dispatch(
              // the menu items carry numbers, so the value arrives as 3 (not "3")
              setMaxAuthors(raw === "all" ? "all" : Number(raw) === 3 ? 3 : 6)
            );
          }}
        >
          <MenuItem value={3}>3</MenuItem>
          <MenuItem value={6}>6</MenuItem>
          <MenuItem value="all">All</MenuItem>
        </TextField>
        <Choice
          label="Order of entries"
          value={style.publicationOrder ?? "newest"}
          options={[
            { value: "newest", label: "Newest first" },
            { value: "manual", label: "My order" },
          ]}
          onChange={(next) => dispatch(setPublicationOrder(next))}
        />
      </PropertyCard>
      <Note>{PER_JOB_NOTE}</Note>
    </>
  );
}

function ReferencesProperties(): JSX.Element {
  const dispatch = useAppDispatch();
  const style = useAppSelector(styleSelector);
  return (
    <PropertyCard>
      <SwitchRow
        label="Contact details (email, phone)"
        hint="These are other people's details, so they are hidden unless you turn this on. They are never sent to AI."
        checked={style.shouldShowReferenceContacts ?? false}
        onChange={(value) => dispatch(setShouldShowReferenceContacts(value))}
      />
      <SwitchRow
        label="Only say “References available on request”"
        hint="Replaces the list of people with one line. The section still has to be in the vault and placed on the template."
        checked={style.isReferencesOnRequest ?? false}
        onChange={(value) => dispatch(setIsReferencesOnRequest(value))}
      />
    </PropertyCard>
  );
}

/**
 * The settings of one section of the template, by its id: the header parts by name, the
 * others by the type of the vault section. A section without settings of its own says so.
 */
export function SectionProperties({
  id,
  section,
}: {
  id: string;
  section: Section | undefined;
}): JSX.Element {
  if (id === "personalInfo") {
    return <PersonalInfoProperties />;
  }
  if (id === "contactInfo") {
    return <ContactInfoProperties />;
  }
  switch (section?.type) {
    case "experience":
      return <EntryOrderProperties kind="experience" />;
    case "education":
      return <EntryOrderProperties kind="education" />;
    case "publications":
      return <PublicationsProperties />;
    case "skills":
      return (
        <>
          <PropertyCard>
            <SkillsLayoutChoice />
            <DropdownSkillIcon />
          </PropertyCard>
          <Note>
            How the levels look (dots, bars, columns) is set per template in the
            inspector on a job. {PER_JOB_NOTE}
          </Note>
        </>
      );
    case "references":
      return <ReferencesProperties />;
    case "projects":
      return (
        <>
          <EntryDetailsCard kind="projects" />
          <Note>{PER_JOB_NOTE}</Note>
        </>
      );
    default:
      return (
        <Note>
          This section has no settings of its own. Its look comes from Design.{" "}
          {PER_JOB_NOTE}
        </Note>
      );
  }
}
