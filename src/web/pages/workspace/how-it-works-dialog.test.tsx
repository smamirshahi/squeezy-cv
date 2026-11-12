// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { HowItWorksDialog } from "@pages/workspace/how-it-works-dialog";

afterEach(cleanup);

function open(onClose = vi.fn()): void {
  render(
    <HowItWorksDialog isOpen startTutorial="applications" onClose={onClose} />
  );
}

describe("the Applications tutorial", () => {
  it("is in the list of tutorials", () => {
    open();
    const list = screen.getByRole("navigation", { name: "Tutorials" });
    expect(list.textContent).toContain("Your applications");
    expect(screen.getByText("Your applications · Step 1 of 4")).toBeTruthy();
  });

  it("goes through the four steps with Next and ends with Got it", () => {
    const onClose = vi.fn();
    open(onClose);
    const titles = ["Applications", "Statuses", "Applied", "Follow up"];
    titles.forEach((title, index) => {
      expect(screen.getByRole("heading", { name: title })).toBeTruthy();
      if (index < titles.length - 1) {
        fireEvent.click(screen.getByRole("button", { name: "Next" }));
      }
    });
    expect(onClose).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "Got it" }));
    expect(onClose).toHaveBeenCalledOnce();
  });

  it("matches the app: Candidates are a stage, No reply is a flag after 30 days", () => {
    open();
    fireEvent.click(screen.getByRole("button", { name: "Step 2: Statuses" }));
    expect(screen.getByText(/Candidate, Draft/)).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Step 4: Follow up" }));
    expect(screen.getByText(/30 days/)).toBeTruthy();
  });

  it("explains Mark as applied and the frozen copy", () => {
    open();
    fireEvent.click(screen.getByRole("button", { name: "Step 3: Applied" }));
    expect(
      screen.getAllByText("Mark as applied", { selector: "b" }).length
    ).toBeGreaterThan(0);
    expect(screen.getByText("freezes a copy")).toBeTruthy();
  });

  it("opens on the chosen tutorial from the list", () => {
    render(<HowItWorksDialog isOpen onClose={vi.fn()} />);
    fireEvent.click(screen.getByRole("button", { name: /Your applications/ }));
    expect(screen.getByRole("heading", { name: "Applications" })).toBeTruthy();
  });
});
