import { A4_HEIGHT_MM, A4_WIDTH_MM } from "@custom-styles/custom-styles";
import { Paper } from "@mui/material";
import { useState } from "react";
import { WidthProvider, Responsive, Layout } from "react-grid-layout";

const ResponsiveReactGridLayout = WidthProvider(Responsive);

interface Props {
  /** The reference to the content */
  contentRef: React.RefObject<HTMLDivElement | null>;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function DragDropPage({ contentRef }: Props): JSX.Element {
  // Initialize state, just like before
  const [items, setItems] = useState<Layout[]>(() => {
    const initial = [0, 1, 2, 3, 4].map((i, _, list) => ({
      i: i.toString(),
      x: i * 2,
      y: 0,
      w: 2,
      h: 2,
    }));
    return initial;
  });

  const [newCounter, setNewCounter] = useState<number>(0);
  const [breakpoint, setBreakpoint] = useState<string | null>(null);
  const [cols, setCols] = useState<number | null>(null);
  const [layout, setLayout] = useState<Layout[]>([]);

  // Function declaration for adding an item
  function onAddItem(): void {
    const nextItem = {
      i: "n" + newCounter,
      x: (items.length * 2) % (cols || 12),
      y: Infinity, // puts it at the bottom
      w: 2,
      h: 2,
    };

    setItems((prevItems) => prevItems.concat(nextItem));
    setNewCounter((prevCount) => prevCount + 1);
  }

  // Function declaration for breakpoint change
  function onBreakpointChange(newBreakpoint: string, newCols: number): void {
    setBreakpoint(newBreakpoint);
    setCols(newCols);
  }

  // Function declaration for layout change
  function onLayoutChange(currentLayout: Layout[]): void {
    setLayout(currentLayout);
  }

  // Function declaration for removing an item
  function onRemoveItem(id: string): void {
    console.log("removing", id);
    // setItems((prevItems) => _.reject(prevItems, { i: id }));
  }

  // Function declaration for rendering each grid element
  function createElement(layout: Layout): JSX.Element {
    return (
      <div
        key={layout.i}
        data-grid={layout}
        style={{
          border: "1px solid red",
          position: "relative",
        }}
      >
        {<span className="text">{layout.i}</span>}
        <span
          className="remove"
          style={{
            position: "absolute",
            right: "2px",
            top: 0,
            cursor: "pointer",
          }}
          onClick={() => onRemoveItem(layout.i)}
        >
          x
        </span>
      </div>
    );
  }

  return (
    <Paper
      ref={contentRef}
      elevation={3}
      sx={{
        width: `${A4_WIDTH_MM}mm`,
        minHeight: `${A4_HEIGHT_MM}mm`,
        padding: "20mm",
        boxSizing: "border-box",
        mx: "auto",
        fontSize: "12pt",
        fontFamily: "Calibri, sans-serif",
      }}
    >
      <button onClick={onAddItem}>Add Item</button>
      <ResponsiveReactGridLayout
        onLayoutChange={onLayoutChange}
        onBreakpointChange={onBreakpointChange}
        style={{ width: "100%", height: "100%" }}
      >
        {items.map((item) => createElement(item))}
      </ResponsiveReactGridLayout>
    </Paper>
  );
}

// Attach the same defaultProps as in the original class
DragDropPage.defaultProps = {
  className: "layout",
  cols: { lg: 12, md: 10, sm: 6, xs: 4, xxs: 2 },
  rowHeight: 100,
};
