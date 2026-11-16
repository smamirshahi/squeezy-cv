// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { ResizableAside } from "@pages/workspace/resizable-aside";

afterEach(cleanup);

describe("ResizableAside", () => {
  it("restores widths above the former maximum and allows keyboard resizing", () => {
    localStorage.setItem("squeezy-cv-panel-width:right", "700");
    render(
      <ResizableAside side="right" label="the inspector" defaultWidth={300}>
        <div>content</div>
      </ResizableAside>
    );
    const handle = screen.getByRole("separator", {
      name: "Resize the inspector",
    });

    expect(handle.getAttribute("aria-valuenow")).toBe("700");
    fireEvent.keyDown(handle, { key: "ArrowLeft" });
    expect(handle.getAttribute("aria-valuenow")).toBe("716");
    expect(localStorage.getItem("squeezy-cv-panel-width:right")).toBe("716");
  });

  it("allows a panel to collapse to zero and remembers that width", () => {
    localStorage.setItem("squeezy-cv-panel-width:left", "8");
    render(
      <ResizableAside side="left" label="the vault tree" defaultWidth={300}>
        <div>content</div>
      </ResizableAside>
    );
    const handle = screen.getByRole("separator", {
      name: "Resize the vault tree",
    });

    fireEvent.keyDown(handle, { key: "ArrowLeft" });
    expect(handle.getAttribute("aria-valuenow")).toBe("0");
    expect(localStorage.getItem("squeezy-cv-panel-width:left")).toBe("0");
  });

  it("allows pointer resizing beyond the former maximum width", () => {
    localStorage.clear();
    render(
      <ResizableAside side="left" label="the vault tree" defaultWidth={300}>
        <div>content</div>
      </ResizableAside>
    );
    const handle = screen.getByRole("separator", {
      name: "Resize the vault tree",
    });

    fireEvent.pointerDown(handle, { clientX: 100 });
    fireEvent.pointerMove(window, { clientX: 500 });
    fireEvent.pointerUp(window);

    expect(handle.getAttribute("aria-valuenow")).toBe("700");
    expect(localStorage.getItem("squeezy-cv-panel-width:left")).toBe("700");
  });

  it("grows and shrinks with the arrow keys and resets on double-click", () => {
    localStorage.clear();
    render(
      <ResizableAside side="right" label="the inspector" defaultWidth={300}>
        <div>content</div>
      </ResizableAside>
    );
    const handle = screen.getByRole("separator", {
      name: "Resize the inspector",
    });
    expect(handle.getAttribute("aria-valuenow")).toBe("300");
    fireEvent.keyDown(handle, { key: "ArrowLeft" });
    expect(handle.getAttribute("aria-valuenow")).toBe("316");
    expect(localStorage.getItem("squeezy-cv-panel-width:right")).toBe("316");
    fireEvent.keyDown(handle, { key: "ArrowRight" });
    fireEvent.keyDown(handle, { key: "ArrowRight" });
    expect(handle.getAttribute("aria-valuenow")).toBe("284");
    fireEvent.doubleClick(handle);
    expect(handle.getAttribute("aria-valuenow")).toBe("300");
  });
});
