// @vitest-environment jsdom
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { ResizableAside } from "@pages/workspace/resizable-aside";

describe("ResizableAside", () => {
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
    expect(localStorage.getItem("cv-builder-panel-width:right")).toBe("316");
    fireEvent.keyDown(handle, { key: "ArrowRight" });
    fireEvent.keyDown(handle, { key: "ArrowRight" });
    expect(handle.getAttribute("aria-valuenow")).toBe("284");
    fireEvent.doubleClick(handle);
    expect(handle.getAttribute("aria-valuenow")).toBe("300");
  });
});
