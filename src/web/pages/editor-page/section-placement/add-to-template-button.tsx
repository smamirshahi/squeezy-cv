import { MouseEvent, useState } from "react";
import { Button, Menu, MenuItem } from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import { appSelector, updatePageStructure } from "@store/app/app-slice";
import { getPreviewPartLabel } from "@store/vault/section-labels";
import { sectionsSelector } from "@store/vault/vault-slice";
import { useAppDispatch, useAppSelector } from "@store/store-helper";

/**
 * "Add section to template": new vault sections are not placed in a template by
 * themselves; this lists the ones the template does not place yet and puts the chosen one
 * at the end of the page (full width, or the left column when the template has columns).
 * Gone when every section is placed.
 */
export function AddToTemplateButton(): JSX.Element | null {
  const dispatch = useAppDispatch();
  const sections = useAppSelector(sectionsSelector);
  const { structure } = useAppSelector(appSelector);
  const [anchor, setAnchor] = useState<HTMLElement | null>(null);
  const placed = new Set([
    ...structure.fullWidth,
    ...structure.left,
    ...structure.right,
  ]);
  const available = sections.filter((section) => !placed.has(section.id));
  const hasColumns = structure.left.length > 0 || structure.right.length > 0;

  if (available.length === 0) {
    return null;
  }

  function add(id: string): void {
    const side = hasColumns ? "left" : "fullWidth";
    dispatch(
      updatePageStructure({ ...structure, [side]: [...structure[side], id] })
    );
    setAnchor(null);
  }

  return (
    <>
      <Button
        size="small"
        startIcon={<AddIcon />}
        onClick={(event: MouseEvent<HTMLElement>) =>
          setAnchor(event.currentTarget)
        }
        sx={{ alignSelf: "flex-start" }}
      >
        Add section to template
      </Button>
      <Menu
        anchorEl={anchor}
        open={anchor !== null}
        onClose={() => setAnchor(null)}
      >
        {available.map((section) => (
          <MenuItem key={section.id} onClick={() => add(section.id)}>
            {getPreviewPartLabel(section.id, sections)}
          </MenuItem>
        ))}
      </Menu>
    </>
  );
}
