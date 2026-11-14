import { HintAdornment } from "@components/description-hint";
import { KeyboardEvent, useEffect, useRef, useState } from "react";
import { nanoid } from "@reduxjs/toolkit";
import {
  Autocomplete,
  Box,
  Button,
  Checkbox,
  Chip,
  FormControlLabel,
  IconButton,
  MenuItem,
  TextField,
  Tooltip,
  Typography,
} from "@components/ui";
import {
  ArrowDownwardOutlined as ArrowDownwardIcon,
  ArrowUpwardOutlined as ArrowUpwardIcon,
  DeleteOutlined as DeleteIcon,
  InfoOutlined as InfoOutlinedIcon,
} from "@components/ui/icons";
import { Bullet, Item, Section } from "@custom-types/vault-types";
import { LocationAutocomplete } from "@pages/workspace/location-autocomplete";
import { isRatingAcceptable } from "@custom-types/type-guards";
import { splitList } from "@shared/vault/split-list";
import { parseBibtex } from "@shared/vault/bibtex";
import { getItemLabel } from "@shared/variant/item-label";
import { setDraftFields } from "@pages/workspace/draft-fields";
import { skillSuggestions } from "@shared/vault/skill-suggestions";
import { isYearsAcceptable, levelLabel } from "@shared/vault/vault-utils";
import {
  FieldSpec,
  fieldSpecsFor,
  fromMonthValue,
  toMonthValue,
  workModeOf,
  WORK_MODES,
} from "@shared/vault/item-fields";
import {
  moveTargets as sectionTargets,
  UNSORTED_SECTION_ID,
} from "@shared/vault/unsorted";
import { WORKSPACE_COLORS } from "@pages/workspace/workspace-tokens";
import { useUnappliedDraft } from "@hooks/navigation";
import { useAppDispatch, useAppSelector } from "@store/store-helper";
import {
  addBullet,
  moveBullet,
  removeBullet,
  moveItemToSection,
  sectionsSelector,
  updateBullet,
  updateItemFields,
} from "@store/vault/vault-slice";

interface FieldProps {
  spec: FieldSpec;
  value: string;
  onChange: (value: string) => void;
  onBlur?: () => void;

  /** Suggestions already taken elsewhere: shown greyed out and not selectable */
  usedValues?: string[];
}

/** Whether a suggestion is in the list of used values (ignoring case) */
function isUsed(option: string, used: string[] | undefined): boolean {
  return (used ?? []).some(
    (value) => value.trim().toLowerCase() === option.toLowerCase()
  );
}

/** A list typed as separate entries: Enter, a comma or leaving the field ends an entry */
function ChipsField({
  spec,
  value,
  onChange,
  onBlur,
}: FieldProps): JSX.Element {
  const [text, setText] = useState("");
  const entries = splitList(value);

  function commit(raw: string): void {
    const entry = raw.trim();
    if (entry !== "" && !entries.includes(entry)) {
      onChange([...entries, entry].join(", "));
    }
    setText("");
  }

  return (
    <Autocomplete
      multiple
      freeSolo
      options={[]}
      value={entries}
      inputValue={text}
      onInputChange={(_event, next, reason) => {
        if (reason === "input") {
          if (next.endsWith(",")) {
            commit(next.slice(0, -1));
          } else {
            setText(next);
          }
        }
      }}
      onChange={(_event, next) => {
        const list = next.map((entry) => entry.trim()).filter(Boolean);
        onChange([...new Set(list)].join(", "));
        setText("");
      }}
      renderValue={(chips, getItemProps) =>
        chips.map((chip, index) => {
          const { key, ...itemProps } = getItemProps({ index });
          return <Chip key={key} label={chip} size="small" {...itemProps} />;
        })
      }
      renderInput={(params) => (
        <TextField
          {...params}
          label={spec.label}
          onBlur={() => {
            commit(text);
            onBlur?.();
          }}
          slotProps={{
            ...params.slotProps,
            input: {
              ...params.slotProps.input,
              endAdornment: spec.hint ? (
                <HintAdornment hint={spec.hint} isMultiline={false} />
              ) : (
                params.slotProps.input.endAdornment
              ),
            },
          }}
        />
      )}
      sx={{ gridColumn: `span ${spec.span}` }}
    />
  );
}

function Field({
  spec,
  value,
  onChange,
  onBlur,
  usedValues,
}: FieldProps): JSX.Element {
  if (spec.kind === "chips") {
    return (
      <ChipsField
        spec={spec}
        value={value}
        onChange={onChange}
        onBlur={onBlur}
      />
    );
  }
  if (spec.suggestions) {
    return (
      <Autocomplete
        freeSolo
        options={spec.suggestions}
        getOptionDisabled={(option) => isUsed(option, usedValues)}
        inputValue={value}
        onInputChange={(_event, text) => onChange(text)}
        filterOptions={(all, state) =>
          all.filter((option) =>
            option.toLowerCase().includes(state.inputValue.toLowerCase())
          )
        }
        renderInput={(params) => (
          <TextField {...params} label={spec.label} onBlur={onBlur} />
        )}
        sx={{ gridColumn: `span ${spec.span}` }}
      />
    );
  }
  return (
    <TextField
      size="medium"
      label={spec.label}
      value={value}
      multiline={spec.kind === "multiline"}
      minRows={spec.kind === "multiline" ? 3 : undefined}
      onChange={(event) => onChange(event.target.value)}
      slotProps={{
        input: {
          endAdornment: spec.hint ? (
            <HintAdornment
              hint={spec.hint}
              isMultiline={spec.kind === "multiline"}
            />
          ) : undefined,
        },
      }}
      sx={{ gridColumn: `span ${spec.span}` }}
    />
  );
}

interface DateFieldsProps {
  startValue: string;
  endValue: string;
  onStartChange: (value: string) => void;
  onEndChange: (value: string) => void;
}

function DateFields({
  startValue,
  endValue,
  onStartChange,
  onEndChange,
}: DateFieldsProps): JSX.Element {
  const isCurrent = endValue === "";
  return (
    <Box
      role="group"
      aria-label="Dates"
      sx={{
        gridColumn: "span 3",
        // Start, End and Current share a line only when it fits: they wrap only on a phone
        display: { xs: "flex", sm: "grid" },
        flexWrap: "wrap",
        gridTemplateColumns: "minmax(0, 1fr) minmax(0, 1fr) auto",
        gap: 1.5,
        alignItems: "center",
        "& > .MuiTextField-root": { flex: { xs: "1 1 140px", sm: "none" } },
      }}
    >
      <TextField
        size="medium"
        type="month"
        label="Start"
        value={toMonthValue(startValue)}
        onChange={(event) => onStartChange(fromMonthValue(event.target.value))}
        slotProps={{ inputLabel: { shrink: true } }}
        sx={{ minWidth: 0, width: { xs: "auto", sm: "100%" } }}
      />
      <TextField
        size="medium"
        type="month"
        label="End"
        value={toMonthValue(endValue)}
        disabled={isCurrent}
        onChange={(event) => onEndChange(fromMonthValue(event.target.value))}
        slotProps={{ inputLabel: { shrink: true } }}
        sx={{ minWidth: 0, width: { xs: "auto", sm: "100%" } }}
      />
      <FormControlLabel
        label="Current"
        sx={{
          m: 0,
          justifySelf: "end",
          whiteSpace: "nowrap",
          minHeight: { xs: 44, lg: "auto" },
        }}
        control={
          <Checkbox
            size="small"
            checked={isCurrent}
            onChange={(event) =>
              onEndChange(
                event.target.checked
                  ? ""
                  : fromMonthValue(new Date().toISOString().slice(0, 7))
              )
            }
          />
        }
      />
    </Box>
  );
}

interface LocationFieldProps {
  value: string;
  workMode: string;
  onLocationChange: (value: string) => void;
  onWorkModeChange: (workMode: string) => void;
}

/** City and country, plus an optional work mode (on-site, hybrid, remote) */
function LocationField({
  value,
  workMode,
  onLocationChange,
  onWorkModeChange,
}: LocationFieldProps): JSX.Element {
  return (
    <Box
      role="group"
      aria-label="Location"
      sx={{
        gridColumn: "span 3",
        display: "grid",
        // One above the other where the room is narrow (phone, small laptop panel)
        gridTemplateColumns: {
          xs: "minmax(0, 1fr)",
          sm: "minmax(0, 1fr) 200px",
          md: "minmax(0, 1fr)",
          lg: "minmax(0, 1fr) 200px",
        },
        gap: 1.5,
        alignItems: "center",
      }}
    >
      <LocationAutocomplete
        label="Location (city, country)"
        placeholder="London, United Kingdom"
        value={value}
        onChange={onLocationChange}
      />
      <TextField
        select
        size="medium"
        label="Work mode (optional)"
        value={workMode}
        onChange={(event) => onWorkModeChange(event.target.value)}
        slotProps={{
          inputLabel: { shrink: true },
          select: { displayEmpty: true },
        }}
      >
        <MenuItem value="">Not stated</MenuItem>
        {WORK_MODES.map((choice) => (
          <MenuItem key={choice.value} value={choice.value}>
            {choice.label}
          </MenuItem>
        ))}
      </TextField>
    </Box>
  );
}

/** The level choices, 1 (learning) to 5 (expert). */
const LEVEL_STEPS = [1, 2, 3, 4, 5];

/** "3 – Proficient" */
function levelOptionLabel(level: number, category?: string): string {
  return `${level} – ${levelLabel(level, category)}`;
}

const LEVEL_HINT =
  "Level: how well you know the skill, from 1 (just learning) to 5 (expert). It is not years of experience; that is the Years field. Both are optional, and each template decides whether to show them.";

interface SkillCardProps {
  section: Section;
  item: Item;
  bullet: Bullet;
  index: number;
  count: number;
  onNewAfter: (index: number) => void;
}

/** One skill of a group: name, level and years. Every change is saved to the vault at once. */
function SkillCard({
  section,
  item,
  bullet,
  index,
  count,
  onNewAfter,
}: SkillCardProps): JSX.Element {
  const dispatch = useAppDispatch();
  const ref = { sectionId: section.id, itemId: item.id, bulletId: bullet.id };
  const skillName = bullet.text || `Skill ${index + 1}`;
  const level = Math.floor(bullet.rating ?? 0);
  return (
    <Box
      sx={{
        border: `1px solid ${WORKSPACE_COLORS.border}`,
        borderRadius: 1.5,
        bgcolor: WORKSPACE_COLORS.panel,
        p: 1,
        display: "flex",
        flexWrap: { xs: "wrap", lg: "nowrap" },
        alignItems: "center",
        gap: 1,
        "& .MuiIconButton-root": {
          minWidth: { xs: 44, lg: 0 },
          minHeight: { xs: 44, lg: 0 },
        },
      }}
    >
      <Box sx={{ display: "flex" }}>
        <IconButton
          size="small"
          aria-label={`Move skill ${index + 1} up`}
          disabled={index === 0}
          onClick={() => dispatch(moveBullet({ ...ref, toIndex: index - 1 }))}
        >
          <ArrowUpwardIcon fontSize="inherit" />
        </IconButton>
        <IconButton
          size="small"
          aria-label={`Move skill ${index + 1} down`}
          disabled={index === count - 1}
          onClick={() => dispatch(moveBullet({ ...ref, toIndex: index + 1 }))}
        >
          <ArrowDownwardIcon fontSize="inherit" />
        </IconButton>
      </Box>
      <Autocomplete
        freeSolo
        size="small"
        options={skillSuggestions(item.fields.category)}
        getOptionDisabled={(option) =>
          isUsed(
            option,
            item.bullets
              .filter((other) => other.id !== bullet.id)
              .map((other) => other.text)
          )
        }
        inputValue={bullet.text}
        onInputChange={(_event, text) =>
          dispatch(updateBullet({ ...ref, update: { text } }))
        }
        filterOptions={(all, state) =>
          state.inputValue.trim() === ""
            ? all
            : all.filter((option) =>
                option.toLowerCase().includes(state.inputValue.toLowerCase())
              )
        }
        sx={{ flex: { xs: "1 1 160px", lg: 1 }, minWidth: 0 }}
        renderInput={(params) => (
          <TextField
            {...params}
            placeholder="Skill name"
            onKeyDown={(event: KeyboardEvent) => {
              if (
                event.key === "Enter" &&
                !params.slotProps?.htmlInput?.["aria-activedescendant"]
              ) {
                event.preventDefault();
                onNewAfter(index);
              }
            }}
            slotProps={{
              ...params.slotProps,
              htmlInput: {
                ...params.slotProps?.htmlInput,
                "aria-label": `Skill ${index + 1} name`,
                "data-bullet-input": bullet.id,
              },
            }}
          />
        )}
      />
      <TextField
        select
        size="small"
        label="Level"
        value={level > 0 ? String(level) : ""}
        onChange={(event) => {
          const chosen = Number(event.target.value);
          if (isRatingAcceptable(chosen)) {
            dispatch(updateBullet({ ...ref, update: { rating: chosen } }));
          }
        }}
        sx={{ width: 150, flex: { xs: "1 1 130px", lg: "none" } }}
      >
        {LEVEL_STEPS.map((step) => (
          <MenuItem key={step} value={String(step)}>
            {levelOptionLabel(step, item.fields.category)}
          </MenuItem>
        ))}
      </TextField>
      <TextField
        size="small"
        label="Years"
        type="number"
        value={bullet.years ?? ""}
        onChange={(event) => {
          const text = event.target.value.trim();
          if (text === "") {
            dispatch(updateBullet({ ...ref, update: { years: null } }));
            return;
          }
          const years = Number(text);
          if (isYearsAcceptable(years)) {
            dispatch(updateBullet({ ...ref, update: { years } }));
          }
        }}
        slotProps={{
          htmlInput: {
            min: 0,
            step: 1,
            "aria-label": `${skillName} years`,
          },
        }}
        sx={{ width: 80, flex: { xs: "1 1 80px", lg: "none" } }}
      />
      <IconButton
        size="small"
        aria-label={`Remove skill ${index + 1}`}
        onClick={() => dispatch(removeBullet(ref))}
      >
        <DeleteIcon fontSize="small" />
      </IconButton>
    </Box>
  );
}

interface Props {
  section: Section;
  item: Item;

  /** Select another item of the vault ("" = none) */
  onSelectItem: (itemId: string) => void;
}

/**
 * The vault item editor (design B2): the fields of one item (a skills group also has its
 * skills), kept in a draft until Apply (a skills group saves as you type). `[` and `]` go to the previous
 * and next item. It is a fact: it changes in every job that shows the item.
 */
export function VaultItemEditor({
  section,
  item,
  onSelectItem,
}: Props): JSX.Element {
  const dispatch = useAppDispatch();
  const [focusBulletId, setFocusBulletId] = useState<string>("");
  // Edits of the fields wait here until Apply (a skills group saves as you type)
  const [bibtexMessage, setBibtexMessage] = useState("");
  const [draft, setDraft] = useState<Record<string, string>>({});
  const index = section.items.findIndex((entry) => entry.id === item.id);
  const ref = { sectionId: section.id, itemId: item.id };
  const isSkills = section.type === "skills";
  const fieldSpecs = fieldSpecsFor(section.type);
  const vaultSections = useAppSelector(sectionsSelector);
  const moveTargets = sectionTargets({ sections: vaultSections }, section.id);
  const changes = Object.fromEntries(
    Object.entries(draft).filter(
      ([key, value]) => value !== (item.fields[key] ?? "")
    )
  );
  const isDirty = Object.keys(changes).length > 0;
  useUnappliedDraft(isDirty);
  const draftKey = JSON.stringify(draft);
  useEffect(() => {
    setDraftFields(isDirty ? { itemId: item.id, fields: draft } : null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isDirty, item.id, draftKey]);
  useEffect(() => () => setDraftFields(null), []);

  function apply(): void {
    dispatch(updateItemFields({ ...ref, fields: changes }));
    setDraft({});
  }

  function pasteBibtex(text: string): void {
    const parsed = parseBibtex(text);
    if (!parsed) {
      setBibtexMessage(
        text.trim() === "" ? "" : "No BibTeX entry found in this text."
      );
      return;
    }
    setBibtexMessage("");
    setDraft((current) => ({ ...current, ...parsed }));
  }

  function changeField(key: string, value: string): void {
    if (isSkills) {
      dispatch(updateItemFields({ ...ref, fields: { [key]: value } }));
    } else {
      setDraft((current) => ({ ...current, [key]: value }));
    }
  }

  useEffect(() => {
    if (!focusBulletId) {
      return;
    }
    document
      .querySelector<HTMLElement>(`[data-bullet-input="${focusBulletId}"]`)
      ?.focus();
    setFocusBulletId("");
  }, [focusBulletId, item.bullets.length]);

  function go(delta: -1 | 1): void {
    const next = section.items[index + delta];
    if (next) {
      onSelectItem(next.id);
    }
  }

  /** Empty skill rows are dropped when the group is left or its category is edited */
  const emptySkillIds = isSkills
    ? item.bullets.filter((b) => b.text.trim() === "").map((b) => b.id)
    : [];
  const emptyIdsRef = useRef<string[]>([]);
  emptyIdsRef.current = emptySkillIds;
  const sectionId = section.id;
  const itemId = item.id;
  useEffect(
    () => () => {
      for (const bulletId of emptyIdsRef.current) {
        dispatch(removeBullet({ sectionId, itemId, bulletId }));
      }
    },
    [dispatch, sectionId, itemId]
  );

  function removeEmptySkills(): void {
    for (const bulletId of emptySkillIds) {
      dispatch(removeBullet({ ...ref, bulletId }));
    }
  }

  function newBulletAfter(position: number): void {
    // Only one empty skill at a time: use the existing empty one
    const existing = item.bullets.find((b) => b.text.trim() === "");
    if (existing) {
      setFocusBulletId(existing.id);
      document
        .querySelector<HTMLElement>(`[data-bullet-input="${existing.id}"]`)
        ?.focus();
      return;
    }
    const id = nanoid();
    dispatch(addBullet({ ...ref, id }));
    dispatch(moveBullet({ ...ref, bulletId: id, toIndex: position + 1 }));
    setFocusBulletId(id);
  }

  return (
    <Box
      aria-label="Edit item"
      sx={{ display: "flex", flexDirection: "column", gap: 2 }}
      onKeyDown={(event) => {
        const target = event.target as HTMLElement;
        if (
          ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName) ||
          event.metaKey ||
          event.ctrlKey
        ) {
          return;
        }
        if (event.key === "[") {
          go(-1);
        } else if (event.key === "]") {
          go(1);
        }
      }}
    >
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          flexWrap: { xs: "wrap", lg: "nowrap" },
          gap: 1,
          "& .MuiButton-root": { minHeight: { xs: 44, lg: 0 } },
        }}
      >
        <Box sx={{ flex: 1, minWidth: { xs: 160, lg: 0 } }}>
          <Typography sx={{ fontSize: 12, color: WORKSPACE_COLORS.muted }}>
            {section.title} › Item {index + 1} of {section.items.length}
          </Typography>
          <Typography sx={{ fontSize: 18, fontWeight: 700 }}>
            {getItemLabel({ ...item, fields: { ...item.fields, ...draft } })}
          </Typography>
        </Box>
        {/* Only Unsorted needs it: its items have no other manual way into a section */}
        {section.id === UNSORTED_SECTION_ID && moveTargets.length > 0 && (
          <TextField
            select
            size="small"
            label="Move to section"
            value=""
            onChange={(event) =>
              dispatch(
                moveItemToSection({
                  ...ref,
                  toSectionId: event.target.value,
                })
              )
            }
            sx={{ minWidth: 180 }}
            slotProps={{ select: { displayEmpty: true } }}
          >
            {moveTargets.map((target) => (
              <MenuItem key={target.id} value={target.id}>
                {target.title}
              </MenuItem>
            ))}
          </TextField>
        )}
        <Button
          size="small"
          variant="outlined"
          disabled={index <= 0}
          onClick={() => go(-1)}
        >
          Prev [
        </Button>
        <Button
          size="small"
          variant="outlined"
          disabled={index >= section.items.length - 1}
          onClick={() => go(1)}
        >
          Next ]
        </Button>
      </Box>

      {section.type === "publications" && (
        <TextField
          label="Paste BibTeX or LaTeX entry"
          placeholder="@article{key, title = {...}, author = {...}, journal = {...}, year = {2024}}"
          helperText={
            bibtexMessage ||
            "Fills the fields below from the entry. Edit them after if needed."
          }
          error={bibtexMessage !== ""}
          value=""
          multiline
          minRows={3}
          onChange={(event) => pasteBibtex(event.target.value)}
        />
      )}

      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
          gap: 2.5,
          ...(isSkills
            ? {}
            : {
                p: 2.5,
                bgcolor: WORKSPACE_COLORS.panel,
                border: `1px solid ${WORKSPACE_COLORS.border}`,
                borderRadius: 1.5,
              }),
        }}
      >
        {fieldSpecs.map((spec) => {
          if (
            spec.key === "location" &&
            (section.type === "experience" || section.type === "education")
          ) {
            return (
              <LocationField
                key={spec.key}
                value={draft[spec.key] ?? item.fields[spec.key] ?? ""}
                workMode={
                  "workMode" in draft
                    ? (draft.workMode ?? "")
                    : workModeOf(item.fields)
                }
                onLocationChange={(value) => changeField(spec.key, value)}
                onWorkModeChange={(workMode) =>
                  changeField("workMode", workMode)
                }
              />
            );
          }
          if (spec.kind === "month") {
            if (spec.isEnd) {
              return null;
            }
            const endSpec = fieldSpecs.find(
              (candidate) => candidate.kind === "month" && candidate.isEnd
            );
            if (!endSpec) {
              throw new Error(
                `Missing end-date field for ${section.type} section`
              );
            }
            return (
              <DateFields
                key="dates"
                startValue={draft[spec.key] ?? item.fields[spec.key] ?? ""}
                endValue={draft[endSpec.key] ?? item.fields[endSpec.key] ?? ""}
                onStartChange={(value) => changeField(spec.key, value)}
                onEndChange={(value) => changeField(endSpec.key, value)}
              />
            );
          }
          return (
            <Field
              key={spec.key}
              spec={{ ...spec, span: 3 }}
              value={draft[spec.key] ?? item.fields[spec.key] ?? ""}
              onChange={(value) => changeField(spec.key, value)}
              onBlur={isSkills ? removeEmptySkills : undefined}
              usedValues={
                isSkills && spec.key === "category"
                  ? section.items
                      .filter((other) => other.id !== item.id)
                      .map((other) => other.fields.category ?? "")
                  : undefined
              }
            />
          );
        })}
      </Box>

      {isSkills && (
        <>
          <Box sx={{ display: "flex", alignItems: "center" }}>
            <Typography sx={{ fontWeight: 700 }}>
              Skills · {item.bullets.length}
            </Typography>
            <Tooltip title={LEVEL_HINT}>
              <InfoOutlinedIcon
                fontSize="small"
                tabIndex={0}
                aria-label="About level and years"
                sx={{ ml: 0.5, color: "text.secondary", cursor: "help" }}
              />
            </Tooltip>
            <Typography
              sx={{
                fontSize: 12,
                color: WORKSPACE_COLORS.muted,
                flex: 1,
                textAlign: "right",
              }}
            >
              Enter in a skill adds the next one.
            </Typography>
          </Box>
          {item.bullets.map((bullet, bulletIndex) => (
            <SkillCard
              key={bullet.id}
              section={section}
              item={item}
              bullet={bullet}
              index={bulletIndex}
              count={item.bullets.length}
              onNewAfter={newBulletAfter}
            />
          ))}
        </>
      )}
      <Box
        sx={{
          display: "flex",
          gap: 1,
          // Below the desktop size the Apply row stays in view while the form scrolls
          position: { xs: "sticky", lg: "static" },
          bottom: 0,
          zIndex: 1,
          py: { xs: 1, lg: 0 },
          bgcolor: { xs: WORKSPACE_COLORS.panel, lg: "transparent" },
          borderTop: {
            xs: `1px solid ${WORKSPACE_COLORS.border}`,
            lg: "none",
          },
          "& .MuiButton-root": { minHeight: { xs: 44, lg: 0 } },
        }}
      >
        <Box sx={{ flex: 1 }} />
        {isSkills && (
          <Button
            variant="outlined"
            onClick={() => newBulletAfter(item.bullets.length - 1)}
          >
            Add skill
          </Button>
        )}
        {!isSkills && (
          <>
            <Button disabled={!isDirty} onClick={() => setDraft({})}>
              Discard
            </Button>
            <Button variant="contained" disabled={!isDirty} onClick={apply}>
              Apply
            </Button>
          </>
        )}
      </Box>
    </Box>
  );
}
