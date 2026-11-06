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
  TextField,
  Typography,
} from "@mui/material";
import ArrowDownwardIcon from "@mui/icons-material/ArrowDownward";
import ArrowUpwardIcon from "@mui/icons-material/ArrowUpward";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import { Bullet, Item, Section } from "@custom-types/vault-types";
import { getItemLabel } from "@shared/variant/item-label";
import {
  FieldSpec,
  fieldSpecsFor,
  fromMonthValue,
  toMonthValue,
} from "@shared/vault/item-fields";
import { WORKSPACE_COLORS } from "@pages/workspace/workspace-tokens";
import { useAppDispatch, useAppSelector } from "@store/store-helper";
import { variantsSelector } from "@store/variants/variants-slice";
import {
  addBullet,
  moveBullet,
  removeBullet,
  removeItem,
  setBulletAlt,
  setItemTags,
  updateBullet,
  updateItemFields,
} from "@store/vault/vault-slice";

const ALT_KINDS = [
  { kind: "short", label: "Short" },
  { kind: "long", label: "Long" },
  { kind: "formal", label: "Formal" },
] as const;

interface TagsProps {
  tags: string[];
  label: string;
  onChange: (tags: string[]) => void;
}

/** Tags as chips you can remove, and a box to add one (Enter) */
function TagEditor({ tags, label, onChange }: TagsProps): JSX.Element {
  const [text, setText] = useState<string>("");
  function add(): void {
    const tag = text.trim();
    if (tag && !tags.includes(tag)) {
      onChange([...tags, tag]);
    }
    setText("");
  }
  return (
    <Box
      sx={{ display: "flex", alignItems: "center", gap: 0.5, flexWrap: "wrap" }}
    >
      {tags.map((tag) => (
        <Chip
          key={tag}
          size="small"
          label={tag}
          onDelete={() => onChange(tags.filter((entry) => entry !== tag))}
        />
      ))}
      <TextField
        size="small"
        variant="standard"
        placeholder="+ tag"
        value={text}
        onChange={(event) => setText(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === "Enter") {
            event.preventDefault();
            add();
          }
        }}
        onBlur={add}
        slotProps={{ htmlInput: { "aria-label": label } }}
        sx={{ width: 90 }}
      />
    </Box>
  );
}

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
        <TagEditor
          tags={bullet.tags}
          label={`Add a tag to bullet ${index + 1}`}
          onChange={(tags) =>
            dispatch(updateBullet({ ...ref, update: { tags } }))
          }
        />
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
 * and next item. It is a fact: it changes in every variant that shows the item.
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
          ? "No variant shows this item right now."
          : `Changes apply to ${shownIn === variants.length ? "all " : ""}${shownIn} ${shownIn === 1 ? "variant" : "variants"} that use it.`}{" "}
        To change only one variant, edit it on the page instead. Changes are
        saved to the vault as you type; use Save to write them to disk.
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
        <Box sx={{ gridColumn: "span 3" }}>
          <Typography
            sx={{
              fontSize: 11,
              fontWeight: 700,
              color: WORKSPACE_COLORS.muted,
              mb: 0.5,
            }}
          >
            TAGS (for matching a job)
          </Typography>
          <TagEditor
            tags={item.tags}
            label="Add a tag to this item"
            onChange={(tags) => dispatch(setItemTags({ ...ref, tags }))}
          />
        </Box>
      </Box>

      <Box sx={{ display: "flex", alignItems: "center" }}>
        <Typography sx={{ fontWeight: 700, flex: 1 }}>
          Bullets · {item.bullets.length}
        </Typography>
        <Typography sx={{ fontSize: 12, color: WORKSPACE_COLORS.muted }}>
          Ctrl/⌘+Enter in a bullet adds the next one
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
          Add bullet
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
            It is removed from the vault and from every variant. Until you press
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
