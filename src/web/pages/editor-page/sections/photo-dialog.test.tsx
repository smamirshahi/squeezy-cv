// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { PhotoDialog } from "@pages/editor-page/sections/photo-dialog";

afterEach(cleanup);

const PIXEL =
  "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==";

function open(photo?: string): void {
  render(
    <PhotoDialog
      isOpen
      photo={photo}
      photoSource={photo}
      photoCrop={undefined}
      onClose={() => undefined}
      onApply={vi.fn()}
    />
  );
}

describe("PhotoDialog without an image", () => {
  it("shows the same person placeholder as the Add photo tile in the frame", () => {
    open();
    const frame = screen.getByRole("group", { name: /^Photo frame/ });
    expect(
      frame.querySelector('[data-testid="PersonOutlinedIcon"]')
    ).toBeTruthy();
    expect(screen.queryByAltText("Photo being adjusted")).toBeNull();
  });

  it("calls the button Add image, not Change image", () => {
    open();
    expect(screen.getByText("Add image")).toBeTruthy();
    expect(screen.queryByText("Change image")).toBeNull();
    expect(screen.queryByRole("button", { name: "Remove image" })).toBeNull();
  });
});

describe("PhotoDialog with an image", () => {
  it("calls the button Change image and hides the placeholder", () => {
    open(PIXEL);
    expect(screen.getByText("Change image")).toBeTruthy();
    expect(screen.queryByText("Add image")).toBeNull();
    const frame = screen.getByRole("group", { name: /^Photo frame/ });
    expect(
      frame.querySelector('[data-testid="PersonOutlinedIcon"]')
    ).toBeNull();
    expect(screen.getByAltText("Photo being adjusted")).toBeTruthy();
  });

  it("goes back to the placeholder and Add image after Remove image", () => {
    open(PIXEL);
    fireEvent.click(screen.getByRole("button", { name: "Remove image" }));
    expect(screen.getByText("Add image")).toBeTruthy();
    const frame = screen.getByRole("group", { name: /^Photo frame/ });
    expect(
      frame.querySelector('[data-testid="PersonOutlinedIcon"]')
    ).toBeTruthy();
  });

  it("applies an empty photo when the image was removed", () => {
    const onApply = vi.fn();
    render(
      <PhotoDialog
        isOpen
        photo={PIXEL}
        photoSource={PIXEL}
        photoCrop={undefined}
        onClose={() => undefined}
        onApply={onApply}
      />
    );
    fireEvent.click(screen.getByRole("button", { name: "Remove image" }));
    fireEvent.click(screen.getByRole("button", { name: "Apply" }));
    expect(onApply).toHaveBeenCalledWith({
      photo: "",
      photoSource: "",
      photoCrop: undefined,
    });
  });
});
