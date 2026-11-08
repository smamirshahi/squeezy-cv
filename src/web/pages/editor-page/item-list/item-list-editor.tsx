import { useContext, useState } from "react";
import { createPortal } from "react-dom";
import { Box, Button, IconButton, Typography } from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import DeleteIcon from "@mui/icons-material/Delete";
import VisibilityIcon from "@mui/icons-material/Visibility";
import VisibilityOffIcon from "@mui/icons-material/VisibilityOff";
import { SortingIcons } from "@pages/editor-page/accordion/sorting-icons";
import { ItemPanelContext } from "@pages/editor-page/item-list/item-panel-context";
import { WORKSPACE_COLORS } from "@pages/workspace/workspace-tokens";

interface ItemRow {
  id: string;
  title: string;
  /** Only used with `onVisibilityChange` */
  shouldShow?: boolean;
}

interface Props {
  rows: ItemRow[];
  /** What to call the thing in the panel hint, e.g. "experience" */
  noun: string;
  onRemove: (id: string) => void;
  /** Leave out when the order is automatic (no arrows then) */
  onMove?: (fromIndex: number, toIndex: number) => void;
  /** Leave out when what is shown is decided per job elsewhere: no eye button then */
  onVisibilityChange?: (id: string, shouldShow: boolean) => void;
  /** Adds an item (it gets selected). Leave out for no button. */
  onAdd?: () => void;
  addLabel?: string;
  /** The form of the selected item */
  renderForm: (id: string) => JSX.Element;
}

/**
 * The list of items of a section. The middle area only shows the titles; the inputs of the
 * selected item open in the right panel.
 */
export function ItemListEditor({
  rows,
  noun,
  onRemove,
  onMove,
  onVisibilityChange,
  onAdd,
  addLabel,
  renderForm,
}: Props): JSX.Element {
  const panel = useContext(ItemPanelContext);
  const [chosenId, setChosenId] = useState<string | null>(null);
  const [knownIds, setKnownIds] = useState<string[]>(rows.map((row) => row.id));
  // An item that appears (Add button or the footer's button) becomes the selected one
  if (
    knownIds.length !== rows.length ||
    rows.some((row, index) => row.id !== knownIds[index])
  ) {
    const added = rows.find((row) => !knownIds.includes(row.id));
    setKnownIds(rows.map((row) => row.id));
    if (added) {
      setChosenId(added.id);
    }
  }
  const selected =
    rows.find((row) => row.id === chosenId) ??
    (rows.length > 0 ? rows[0] : undefined);

  const form = (
    <Box aria-label="Item form" role="region" sx={{ p: panel ? 0 : 2 }}>
      {selected ? (
        renderForm(selected.id)
      ) : (
        <Typography sx={{ color: "text.secondary" }}>
          No {noun} yet. Add one to edit it here.
        </Typography>
      )}
    </Box>
  );

  return (
    <>
      <Box
        component="ul"
        aria-label="Items"
        sx={{ listStyle: "none", m: 0, p: 0 }}
      >
        {rows.map((row, index) => {
          const isSelected = selected?.id === row.id;
          return (
            <Box
              component="li"
              key={row.id}
              data-selected={isSelected}
              sx={{
                display: "flex",
                alignItems: "center",
                borderBottom: `1px solid ${WORKSPACE_COLORS.border}`,
                borderLeft: `3px solid ${
                  isSelected ? WORKSPACE_COLORS.accent : "transparent"
                }`,
                bgcolor: isSelected
                  ? WORKSPACE_COLORS.accentSoft
                  : "transparent",
              }}
            >
              {onMove && (
                <SortingIcons
                  index={index}
                  swapFunction={onMove}
                  isLastEntity={index === rows.length - 1}
                />
              )}
              <Box
                component="button"
                type="button"
                aria-pressed={isSelected}
                onClick={() => setChosenId(row.id)}
                sx={{
                  flex: 1,
                  minWidth: 0,
                  textAlign: "left",
                  background: "none",
                  border: 0,
                  color: "inherit",
                  font: "inherit",
                  cursor: "pointer",
                  px: 1.5,
                  py: 1.5,
                  fontWeight: isSelected ? 600 : 400,
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}
              >
                {row.title || "(untitled)"}
              </Box>
              {onVisibilityChange && (
                <IconButton
                  aria-label={row.shouldShow ? "Hide item" : "Show item"}
                  onClick={() => onVisibilityChange(row.id, !row.shouldShow)}
                >
                  {row.shouldShow ? <VisibilityIcon /> : <VisibilityOffIcon />}
                </IconButton>
              )}
              <IconButton
                aria-label={`Delete ${row.title || "item"}`}
                onClick={() => onRemove(row.id)}
              >
                <DeleteIcon />
              </IconButton>
            </Box>
          );
        })}
      </Box>
      {onAdd && (
        <Button
          startIcon={<AddIcon />}
          sx={{ alignSelf: "flex-start", mt: 1 }}
          onClick={onAdd}
        >
          {addLabel}
        </Button>
      )}
      {panel ? createPortal(form, panel) : form}
    </>
  );
}
