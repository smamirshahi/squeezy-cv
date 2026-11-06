import { RefObject, useLayoutEffect, useState } from "react";
import { Box, IconButton, Tooltip } from "@mui/material";
import ArrowDownwardIcon from "@mui/icons-material/ArrowDownward";
import ArrowUpwardIcon from "@mui/icons-material/ArrowUpward";
import FormatBoldIcon from "@mui/icons-material/FormatBold";
import VisibilityIcon from "@mui/icons-material/Visibility";
import VisibilityOffIcon from "@mui/icons-material/VisibilityOff";
import { useActiveVariantLock } from "@pages/workspace/variant-lock";
import { useBlockActions } from "@pages/workspace/use-block-actions";
import { WORKSPACE_COLORS } from "@pages/workspace/workspace-tokens";
import { useAppSelector } from "@store/store-helper";
import { activeVariantSelector } from "@store/variants/variants-slice";
import { sectionsSelector } from "@store/vault/vault-slice";

const GAP_PX = 12;

interface Props {
  /** The scrolling, positioned canvas the toolbar floats in */
  canvasRef: RefObject<HTMLElement | null>;
}

/**
 * A small toolbar beside the item selected on the page (design B1): show/hide, emphasis and
 * move up/down, the same actions as H, B and Alt+arrows. It sits to the right of the paper at the
 * height of the item, and follows it when the zoom, the selection or the content changes.
 */
export function BlockToolbar({ canvasRef }: Props): JSX.Element | null {
  const actions = useBlockActions();
  const { isReadOnly } = useActiveVariantLock();
  const zoom = useAppSelector((s) => s.app.canvasZoom);
  const variant = useAppSelector(activeVariantSelector);
  const sections = useAppSelector(sectionsSelector);
  const [position, setPosition] = useState<{
    top: number;
    left: number;
  } | null>(null);
  const { itemId } = actions;

  useLayoutEffect(() => {
    const canvas = canvasRef.current;
    const element = itemId
      ? document.querySelector<HTMLElement>(
          `[data-cv-paper] [data-cv-item="${itemId}"]`
        )
      : null;
    const paper = document.querySelector<HTMLElement>("[data-cv-paper]");
    if (!canvas || !element || !paper) {
      // a hidden item is not on the page: the toolbar stays where it was so it can be shown again
      if (!itemId || actions.isShown) {
        setPosition(null);
      }
      return;
    }
    const canvasBox = canvas.getBoundingClientRect();
    const itemBox = element.getBoundingClientRect();
    const paperBox = paper.getBoundingClientRect();
    setPosition({
      top: itemBox.top - canvasBox.top + canvas.scrollTop,
      left: paperBox.right - canvasBox.left + canvas.scrollLeft + GAP_PX,
    });
  }, [canvasRef, itemId, actions.isShown, zoom, variant, sections]);

  if (!itemId || !position) {
    return null;
  }

  return (
    <Box
      role="toolbar"
      aria-label="Selected block"
      sx={{
        position: "absolute",
        top: position.top,
        left: position.left,
        zIndex: 3,
        display: "flex",
        flexDirection: "column",
        gap: 0.5,
        p: 0.5,
        bgcolor: WORKSPACE_COLORS.panel,
        border: `1px solid ${WORKSPACE_COLORS.borderStrong}`,
        borderRadius: 1,
        boxShadow: "0 4px 14px rgba(0,0,0,.18)",
      }}
    >
      <Tooltip title="Show or hide (H)" placement="right">
        <span>
          <IconButton
            size="small"
            disabled={isReadOnly}
            aria-label={actions.isShown ? "Hide block" : "Show block"}
            aria-pressed={actions.isShown}
            onClick={actions.toggleShown}
          >
            {actions.isShown ? (
              <VisibilityIcon fontSize="inherit" />
            ) : (
              <VisibilityOffIcon fontSize="inherit" />
            )}
          </IconButton>
        </span>
      </Tooltip>
      <Tooltip title="Emphasis (B)" placement="right">
        <span>
          <IconButton
            size="small"
            disabled={isReadOnly}
            aria-label="Emphasis"
            aria-pressed={actions.isEmphasised}
            onClick={actions.toggleEmphasis}
            sx={
              actions.isEmphasised
                ? {
                    bgcolor: WORKSPACE_COLORS.accentSoft,
                    color: WORKSPACE_COLORS.accentText,
                  }
                : undefined
            }
          >
            <FormatBoldIcon fontSize="inherit" />
          </IconButton>
        </span>
      </Tooltip>
      <Tooltip title="Move up (Alt+↑)" placement="right">
        <span>
          <IconButton
            size="small"
            disabled={isReadOnly || !actions.canMoveUp}
            aria-label="Move block up"
            onClick={() => actions.move(-1)}
          >
            <ArrowUpwardIcon fontSize="inherit" />
          </IconButton>
        </span>
      </Tooltip>
      <Tooltip title="Move down (Alt+↓)" placement="right">
        <span>
          <IconButton
            size="small"
            disabled={isReadOnly || !actions.canMoveDown}
            aria-label="Move block down"
            onClick={() => actions.move(1)}
          >
            <ArrowDownwardIcon fontSize="inherit" />
          </IconButton>
        </span>
      </Tooltip>
    </Box>
  );
}
