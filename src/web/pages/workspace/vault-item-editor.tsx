import { HintAdornment } from "@components/description-hint";
import { KeyboardEvent, useEffect, useState } from "react";
import { nanoid } from "@reduxjs/toolkit";
import {
  Alert,
  Box,
  Button,
  Checkbox,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  FormControlLabel,
  IconButton,
  MenuItem,
  ToggleButton,
  Tooltip,
  TextField,
  Typography,
} from "@mui/material";
import ArrowDownwardIcon from "@mui/icons-material/ArrowDownward";
import ArrowUpwardIcon from "@mui/icons-material/ArrowUpward";
import DeleteIcon from "@mui/icons-material/Delete";
import InfoOutlinedIcon from "@mui/icons-material/InfoOutlined";
import { Bullet, Item, Section } from "@custom-types/vault-types";
import { isRatingAcceptable } from "@custom-types/type-guards";
import { getItemLabel } from "@shared/variant/item-label";
import {
  isYearsAcceptable,
  levelLabel,
  tracksLevels,
} from "@shared/vault/vault-utils";
import {
  FieldSpec,
  fieldSpecsFor,
  fromMonthValue,
  toMonthValue,
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
  removeItem,
  sectionsSelector,
  setSectionTracksLevel,
  updateBullet,
  updateItemFields,
} from "@store/vault/vault-slice";

interface FieldProps {
  spec: FieldSpec;
  value: string;
  onChange: (value: string) => void;
}

function Field({ spec, value, onChange }: FieldProps): JSX.Element {
  if (spec.kind === "month") {
    const isCurrent = spec.isEnd === true && value === "";
    return (
      <Box
        sx={{
          gridColumn: `span ${spec.span}`,
          display: "flex",
          gap: 1,
          alignItems: "center",
        }}
      >
        <TextField
          size="small"
          type="month"
          label={spec.label}
          value={toMonthValue(value)}
          disabled={isCurrent}
          onChange={(event) => onChange(fromMonthValue(event.target.value))}
          slotProps={{ inputLabel: { shrink: true } }}
          sx={{ flex: 1 }}
        />
        {spec.isEnd && (
          <FormControlLabel
            label="Current"
            control={
              <Checkbox
                size="small"
                checked={isCurrent}
                onChange={(event) =>
                  onChange(
                    event.target.checked
                      ? ""
                      : fromMonthValue(new Date().toISOString().slice(0, 7))
                  )
                }
              />
            }
          />
        )}
      </Box>
    );
  }
  return (
    <TextField
      size="small"
      label={spec.label}
      value={value}
      multiline={spec.kind === "multiline"}
      minRows={spec.kind === "multiline" ? 3 : undefined}
      onChange={(event) => onChange(event.target.value)}
      slotProps={{
        input: {
          endAdornment: spec.hint ? (
            <HintAdornment hint={spec.hint} />
          ) : undefined,
        },
      }}
      sx={{ gridColumn: `span ${spec.span}` }}
    />
  );
}

/** The level choices, 1 (learning) to 5 (expert). A plus adds half a step (3 + plus = 3.5). */
const LEVEL_STEPS = [1, 2, 3, 4, 5];
const MAX_LEVEL = 5;

/** "3 – Proficient" */
function levelOptionLabel(level: number): string {
  return `${level} – ${levelLabel(level)}`;
}

const LEVEL_HINT =
  "Level: how well you know the skill, from 1 (just learning) to 5 (expert); the + means a bit above that level. It is not years of experience; that is the Years field. Both are optional, and each template decides whether to show them.";

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
  const isPlus = (bullet.rating ?? 0) - level === 0.5;
  return (
    <Box
      sx={{
        border: `1px solid ${WORKSPACE_COLORS.border}`,
        borderRadius: 1.5,
        bgcolor: WORKSPACE_COLORS.panel,
        p: 1,
        display: "flex",
        alignItems: "center",
        gap: 1,
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
      <TextField
        size="small"
        value={bullet.text}
        placeholder="Skill name"
        onChange={(event) =>
          dispatch(
            updateBullet({ ...ref, update: { text: event.target.value } })
          )
        }
        onKeyDown={(event: KeyboardEvent) => {
          if (event.key === "Enter") {
            event.preventDefault();
            onNewAfter(index);
          }
        }}
        slotProps={{
          htmlInput: {
            "aria-label": `Skill ${index + 1} name`,
            "data-bullet-input": bullet.id,
          },
        }}
        sx={{ flex: 1 }}
      />
      {tracksLevels(section) && (
        <>
          <TextField
            select
            size="small"
            label="Level"
            value={level > 0 ? String(level) : ""}
            onChange={(event) => {
              const chosen = Number(event.target.value);
              const rating =
                isPlus && chosen < MAX_LEVEL ? chosen + 0.5 : chosen;
              if (isRatingAcceptable(rating)) {
                dispatch(updateBullet({ ...ref, update: { rating } }));
              }
            }}
            sx={{ width: 150 }}
          >
            {LEVEL_STEPS.map((step) => (
              <MenuItem key={step} value={String(step)}>
                {levelOptionLabel(step)}
              </MenuItem>
            ))}
          </TextField>
          <Tooltip title="Plus: a bit above this level (3 + plus = three and a half)">
            <span>
              <ToggleButton
                value="plus"
                size="small"
                selected={isPlus}
                disabled={level === 0 || level >= MAX_LEVEL}
                aria-label={`${skillName} plus`}
                onChange={() => {
                  const rating = isPlus ? level : level + 0.5;
                  if (isRatingAcceptable(rating)) {
                    dispatch(updateBullet({ ...ref, update: { rating } }));
                  }
                }}
                sx={{ px: 1, py: 0.75, minWidth: 0, lineHeight: 1 }}
              >
                +
              </ToggleButton>
            </span>
          </Tooltip>
        </>
      )}
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
        sx={{ width: 80 }}
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
  const [isRemoving, setIsRemoving] = useState<boolean>(false);
  // Edits of the fields wait here until Apply (a skills group saves as you type)
  const [draft, setDraft] = useState<Record<string, string>>({});
  const index = section.items.findIndex((entry) => entry.id === item.id);
  const ref = { sectionId: section.id, itemId: item.id };
  const isSkills = section.type === "skills";
  const vaultSections = useAppSelector(sectionsSelector);
  const moveTargets = sectionTargets({ sections: vaultSections }, section.id);
  const changes = Object.fromEntries(
    Object.entries(draft).filter(
      ([key, value]) => value !== (item.fields[key] ?? "")
    )
  );
  const isDirty = Object.keys(changes).length > 0;
  useUnappliedDraft(isDirty);

  function apply(): void {
    dispatch(updateItemFields({ ...ref, fields: changes }));
    setDraft({});
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

  function newBulletAfter(position: number): void {
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
      <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Typography sx={{ fontSize: 12, color: WORKSPACE_COLORS.muted }}>
            {section.title} › Item {index + 1} of {section.items.length}
          </Typography>
          <Typography sx={{ fontSize: 18, fontWeight: 700 }}>
            {getItemLabel(item)}
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

      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
          gap: 1.5,
          p: 2,
          bgcolor: WORKSPACE_COLORS.panel,
          border: `1px solid ${WORKSPACE_COLORS.border}`,
          borderRadius: 1.5,
        }}
      >
        {fieldSpecsFor(section.type).map((spec) => (
          <Field
            key={spec.key}
            spec={{
              ...spec,
              // One input per line; start, end and Current share one line
              span: spec.kind !== "month" ? 3 : spec.isEnd ? 2 : 1,
            }}
            value={draft[spec.key] ?? item.fields[spec.key] ?? ""}
            onChange={(value) =>
              isSkills
                ? dispatch(
                    updateItemFields({ ...ref, fields: { [spec.key]: value } })
                  )
                : setDraft((current) => ({ ...current, [spec.key]: value }))
            }
          />
        ))}
      </Box>

      {isSkills && (
        <>
          <Alert severity="warning" sx={{ py: 0 }}>
            You are editing vault facts. Levels and years are stored here, and
            each job decides whether and how to show them. The AI never changes
            a level.
          </Alert>
          <FormControlLabel
            control={
              <Checkbox
                checked={tracksLevels(section)}
                onChange={(event) =>
                  dispatch(
                    setSectionTracksLevel({
                      id: section.id,
                      tracksLevel: event.target.checked,
                    })
                  )
                }
              />
            }
            label="Track my level (optional)"
          />
        </>
      )}
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
      <Box sx={{ display: "flex", gap: 1 }}>
        {isSkills && (
          <Button
            variant="outlined"
            onClick={() => newBulletAfter(item.bullets.length - 1)}
          >
            Add skill
          </Button>
        )}
        <Box sx={{ flex: 1 }} />
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
        <Button color="error" onClick={() => setIsRemoving(true)}>
          Remove this item
        </Button>
      </Box>

      <Dialog open={isRemoving} onClose={() => setIsRemoving(false)}>
        <DialogTitle>Remove “{getItemLabel(item)}”?</DialogTitle>
        <DialogContent>
          <DialogContentText>
            It is removed from the vault and from every job. Until you press
            Save you can still reload the page to get it back.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setIsRemoving(false)}>Cancel</Button>
          <Button
            color="error"
            onClick={() => {
              const neighbour =
                section.items[index + 1] ?? section.items[index - 1];
              dispatch(removeItem(ref));
              onSelectItem(neighbour?.id ?? "");
              setIsRemoving(false);
            }}
          >
            Remove
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
