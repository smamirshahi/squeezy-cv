// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { AiBadge, AiButton } from "@components/ai-button";

afterEach(cleanup);

describe("AiButton", () => {
  it("shows the AI sparkle icon and the AI colour, and still works as a button", () => {
    const onClick = vi.fn();
    render(<AiButton onClick={onClick}>Score entries</AiButton>);
    const button = screen.getByRole("button", { name: "Score entries" });
    expect(
      button.querySelector('[data-testid="AutoAwesomeOutlinedIcon"]')
    ).toBeTruthy();
    // purple = the theme's secondary colour
    expect(button.className).toMatch(/colorSecondary/);
    fireEvent.click(button);
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it("can be disabled and takes another start icon (a spinner while it works)", () => {
    render(
      <AiButton disabled startIcon={<span data-testid="spinner" />}>
        Working…
      </AiButton>
    );
    const button = screen.getByRole("button", { name: "Working…" });
    expect((button as HTMLButtonElement).disabled).toBe(true);
    expect(screen.getByTestId("spinner")).toBeTruthy();
    expect(
      button.querySelector('[data-testid="AutoAwesomeOutlinedIcon"]')
    ).toBeNull();
  });
});

describe("AiBadge", () => {
  afterEach(cleanup);

  it("is named by its label, in both sizes", () => {
    render(
      <>
        <AiBadge label="Small mark" />
        <AiBadge isProminent label="Large mark" />
      </>
    );
    expect(screen.getByRole("img", { name: "Small mark" })).toBeTruthy();
    expect(screen.getByRole("img", { name: "Large mark" })).toBeTruthy();
  });
});
