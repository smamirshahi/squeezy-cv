import { KeyboardEvent, PointerEvent, ReactNode, useState } from "react";
import { Box, type Breakpoint } from "@components/ui";
import { WORKSPACE_COLORS } from "@pages/workspace/workspace-tokens";
import {
  normalisePanelWidth,
  readPanelWidth,
  writePanelWidth,
  PanelSide,
} from "@pages/workspace/panel-width";

const KEY_STEP = 16;

/** One height, or one per breakpoint (a phone usually gets less than a tablet) */
type StackedHeight =
  string | number | Partial<Record<Breakpoint, string | number>>;

interface Props {
  side: PanelSide;
  label: string;
  defaultWidth: number;

  /**
   * Below this breakpoint the panel is not a side panel any more: it takes the full width, the
   * handle is hidden and the parent decides where it goes (it must stack its children).
   */
  stackBelow?: Breakpoint;

  /** Height of the stacked panel (a CSS length), needed because a panel fills its parent */
  stackedHeight?: StackedHeight;
  children: ReactNode;
}

/**
 * A side panel whose width can be dragged (or changed with the arrow keys on the handle).
 * Double-click the handle to reset. The width is remembered per side in this browser.
 */
export function ResizableAside({
  side,
  label,
  defaultWidth,
  stackBelow,
  stackedHeight,
  children,
}: Props): JSX.Element {
  const [width, setWidth] = useState<number>(() =>
    readPanelWidth(side, defaultWidth)
  );
  const isLeft = side === "left";

  function change(next: number): void {
    const normalised = normalisePanelWidth(next);
    setWidth(normalised);
    writePanelWidth(side, normalised);
  }

  function onPointerDown(event: PointerEvent<HTMLDivElement>): void {
    event.preventDefault();
    const startX = event.clientX;
    const startWidth = width;
    function onMove(move: globalThis.PointerEvent): void {
      const delta = move.clientX - startX;
      change(startWidth + (isLeft ? delta : -delta));
    }
    function onUp(): void {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
    }
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
  }

  function onKeyDown(event: KeyboardEvent<HTMLDivElement>): void {
    if (event.key === "ArrowLeft" || event.key === "ArrowRight") {
      event.preventDefault();
      const grows =
        (event.key === "ArrowRight" && isLeft) ||
        (event.key === "ArrowLeft" && !isLeft);
      change(width + (grows ? KEY_STEP : -KEY_STEP));
    }
  }

  const handle = (
    <Box
      role="separator"
      aria-orientation="vertical"
      aria-label={`Resize ${label}`}
      aria-valuenow={width}
      tabIndex={0}
      onPointerDown={onPointerDown}
      onKeyDown={onKeyDown}
      onDoubleClick={() => change(defaultWidth)}
      sx={{
        flex: "none",
        alignSelf: "stretch",
        width: 6,
        display: stackBelow ? { xs: "none", [stackBelow]: "block" } : "block",
        cursor: "col-resize",
        touchAction: "none",
        "&:hover, &:focus-visible": { bgcolor: WORKSPACE_COLORS.border },
      }}
    />
  );

  return (
    <>
      {!isLeft && handle}
      <Box
        sx={{
          // Never more than 45% of the window, so a width saved on a big screen cannot squeeze the
          // content on a small one
          width: stackBelow ? { xs: "100%", [stackBelow]: width } : width,
          maxWidth: stackBelow ? { xs: "none", [stackBelow]: "45vw" } : "45vw",
          height:
            stackBelow && stackedHeight !== undefined
              ? {
                  ...(typeof stackedHeight === "object"
                    ? stackedHeight
                    : { xs: stackedHeight }),
                  [stackBelow]: "auto",
                }
              : undefined,
          flex: "none",
          display: "flex",
          flexDirection: "column",
          alignSelf: "stretch",
          minHeight: 0,
          // The panel inside always fills the full height, however short its content is;
          // long content scrolls inside it (it sets its own overflow). `&&` outranks the
          // panels' own `flex: none`.
          "&& > *": { flex: "1 1 0", minHeight: 0 },
        }}
      >
        {children}
      </Box>
      {isLeft && handle}
    </>
  );
}
