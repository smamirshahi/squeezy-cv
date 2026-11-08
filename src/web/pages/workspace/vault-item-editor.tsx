import { KeyboardEvent, useEffect, useState } from "react";
import { nanoid } from "@reduxjs/toolkit";
import {
  Alert,
  Box,
  Button,
  Checkbox,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  FormControlLabel,
  IconButton,
  MenuItem,
  Rating,
  TextField,
  Typography,
} from "@mui/material";
import ArrowDownwardIcon from "@mui/icons-material/ArrowDownward";
import ArrowUpwardIcon from "@mui/icons-material/ArrowUpward";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutlined";
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
import { moveTargets as sectionTargets } from "@shared/vault/unsorted";
import { WORKSPACE_COLORS } from "@pages/workspace/workspace-tokens";
import { useAppDispatch, useAppSelector } from "@store/store-helper";
import { variantsSelector } from "@store/jobs/jobs-slice";
import {
  addBullet,
  moveBullet,
  removeBullet,
  moveItemToSection,
  removeItem,
  sectionsSelector,
  setBulletAlt,
  setSectionTracksLevel,
  updateBullet,
  updateItemFields,
} from "@store/vault/vault-slice";

const ALT_KINDS = [
  { kind: "short", label: "Short" },
  { kind: "long", label: "Long" },
  { kind: "formal", label: "Formal" },
] as const;

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
      sx={{ gridColumn: `span ${spec.span}` }}
    />
  );
}

interface BulletCardProps {
  section: Section;
  item: Item;
  bullet: Bullet;
  index: number;
  count: number;
  onNewAfter: (index: number) => void;
}

/** One bullet: its canonical text, tags and alternative wordings. Every change is saved to the vault at once. */
function BulletCard({
  section,
  item,
  bullet,
  index,
  count,
  onNewAfter,
}: BulletCardProps): JSX.Element {
  const dispatch = useAppDispatch();
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const ref = { sectionId: section.id, itemId: item.id, bulletId: bullet.id };
  const altCount = ALT_KINDS.filter(({ kind }) => bullet.alt?.[kind]).length;

  if (section.type === "skills") {
    const skillName = bullet.text || `Skill ${index + 1}`;
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
            <Rating
              name={`level-${bullet.id}`}
              value={bullet.rating ?? 0}
              precision={0.5}
              getLabelText={(value) => `${skillName} level ${value}`}
              onChange={(_, value) => {
                const rating = value ?? 0;
                if (isRatingAcceptable(rating)) {
                  dispatch(updateBullet({ ...ref, update: { rating } }));
                }
              }}
            />
            <Typography
              sx={{
                fontSize: 12,
                width: 72,
                color: bullet.rating
                  ? WORKSPACE_COLORS.text
                  : WORKSPACE_COLORS.muted,
              }}
            >
              {levelLabel(bullet.rating)}
            </Typography>
            <Button
              size="small"
              aria-label={`Clear level of ${skillName}`}
              disabled={!bullet.rating}
              onClick={() =>
                dispatch(updateBullet({ ...ref, update: { rating: 0 } }))
              }
            >
              No level
            </Button>
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
          <DeleteOutlineIcon fontSize="small" />
        </IconButton>
      </Box>
    );
  }

  return (
    <Box
      sx={{
        border: `1px solid ${WORKSPACE_COLORS.border}`,
        borderRadius: 1.5,
        bgcolor: WORKSPACE_COLORS.panel,
        p: 1,
        display: "flex",
        flexDirection: "column",
        gap: 0.75,
      }}
    >
      <Box sx={{ display: "flex", gap: 0.5, alignItems: "flex-start" }}>
        <Box sx={{ display: "flex", flexDirection: "column" }}>
          <IconButton
            size="small"
            aria-label={`Move bullet ${index + 1} up`}
            disabled={index === 0}
            onClick={() => dispatch(moveBullet({ ...ref, toIndex: index - 1 }))}
          >
            <ArrowUpwardIcon fontSize="inherit" />
          </IconButton>
          <IconButton
            size="small"
            aria-label={`Move bullet ${index + 1} down`}
            disabled={index === count - 1}
            onClick={() => dispatch(moveBullet({ ...ref, toIndex: index + 1 }))}
          >
            <ArrowDownwardIcon fontSize="inherit" />
          </IconButton>
        </Box>
        <TextField
          fullWidth
          multiline
          minRows={2}
          size="small"
          value={bullet.text}
          onChange={(event) =>
            dispatch(
              updateBullet({ ...ref, update: { text: event.target.value } })
            )
          }
          onKeyDown={(event: KeyboardEvent) => {
            if (event.key === "Enter" && (event.metaKey || event.ctrlKey)) {
              event.preventDefault();
              onNewAfter(index);
            }
          }}
          slotProps={{
            htmlInput: {
              "aria-label": `Bullet ${index + 1} text`,
              "data-bullet-input": bullet.id,
            },
          }}
        />
        <IconButton
          size="small"
          aria-label={`Remove bullet ${index + 1}`}
          onClick={() => dispatch(removeBullet(ref))}
        >
          <DeleteOutlineIcon fontSize="small" />
        </IconButton>
      </Box>
      <Box sx={{ display: "flex", alignItems: "center", gap: 1, pl: 4.5 }}>
        <Box sx={{ flex: 1 }} />
        <Chip
          size="small"
          label={
            altCount > 0
              ? `${altCount} wording${altCount === 1 ? "" : "s"}`
              : "Canonical"
          }
          color={altCount > 0 ? "primary" : "default"}
        />
        <Button
          size="small"
          aria-expanded={isOpen}
          onClick={() => setIsOpen((wasOpen) => !wasOpen)}
        >
          Wordings
        </Button>
      </Box>
      {isOpen && (
        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: "56px 1fr",
            gap: 0.75,
            alignItems: "center",
            pl: 4.5,
          }}
        >
          {ALT_KINDS.map(({ kind, label }) => (
            <Box key={kind} sx={{ display: "contents" }}>
              <Typography
                sx={{
                  fontSize: 11,
                  fontWeight: 700,
                  color: WORKSPACE_COLORS.muted,
                }}
              >
                {label.toUpperCase()}
              </Typography>
              <TextField
                size="small"
                value={bullet.alt?.[kind] ?? ""}
                placeholder="Empty: the canonical text is used"
                onChange={(event) =>
                  dispatch(
                    setBulletAlt({ ...ref, kind, text: event.target.value })
                  )
                }
                slotProps={{
                  htmlInput: {
                    "aria-label": `${label} wording of bullet ${index + 1}`,
                  },
                }}
              />
            </Box>
          ))}
        </Box>
      )}
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
 * The vault item editor (design B2): the fields of one item and its bullets with tags and
 * wordings, saved to the vault as you type (no Apply step). `[` and `]` go to the previous
 * and next item. It is a fact: it changes in every job that shows the item.
 */
export function VaultItemEditor({
  section,
  item,
  onSelectItem,
}: Props): JSX.Element {
  const dispatch = useAppDispatch();
  const variants = useAppSelector(variantsSelector);
  const [focusBulletId, setFocusBulletId] = useState<string>("");
  const [isRemoving, setIsRemoving] = useState<boolean>(false);
  const index = section.items.findIndex((entry) => entry.id === item.id);
  const shownIn = variants.filter(
    (variant) => variant.selection[item.id]?.isVisible !== false
  ).length;
  const ref = { sectionId: section.id, itemId: item.id };
  const isSkills = section.type === "skills";
  const vaultSections = useAppSelector(sectionsSelector);
  const moveTargets = sectionTargets({ sections: vaultSections }, section.id);

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
        {moveTargets.length > 0 && (
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

      <Alert severity="warning">
        You are editing a <b>vault fact</b>.{" "}
        {shownIn === 0
          ? "No job shows this item right now."
          : `Changes apply to ${shownIn === variants.length ? "all " : ""}${shownIn} ${shownIn === 1 ? "job" : "jobs"} that use it.`}{" "}
        To change only one job, edit it on the page instead. Changes are saved
        to the vault as you type; use Save to write them to disk.
      </Alert>

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
            spec={spec}
            value={item.fields[spec.key] ?? ""}
            onChange={(value) =>
              dispatch(
                updateItemFields({ ...ref, fields: { [spec.key]: value } })
              )
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
      <Box sx={{ display: "flex", alignItems: "center" }}>
        <Typography sx={{ fontWeight: 700, flex: 1 }}>
          {isSkills ? "Skills" : "Bullets"} · {item.bullets.length}
        </Typography>
        <Typography sx={{ fontSize: 12, color: WORKSPACE_COLORS.muted }}>
          {isSkills
            ? "Enter in a skill adds the next one. A level is optional."
            : "Ctrl/⌘+Enter in a bullet adds the next one"}
        </Typography>
      </Box>
      {item.bullets.map((bullet, bulletIndex) => (
        <BulletCard
          key={bullet.id}
          section={section}
          item={item}
          bullet={bullet}
          index={bulletIndex}
          count={item.bullets.length}
          onNewAfter={newBulletAfter}
        />
      ))}
      <Box sx={{ display: "flex", gap: 1 }}>
        <Button
          variant="outlined"
          onClick={() => newBulletAfter(item.bullets.length - 1)}
        >
          {isSkills ? "Add skill" : "Add bullet"}
        </Button>
        <Box sx={{ flex: 1 }} />
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
