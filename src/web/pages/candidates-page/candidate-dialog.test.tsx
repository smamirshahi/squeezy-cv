// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { CandidateDialog } from "@pages/candidates-page/candidate-dialog";

afterEach(cleanup);

describe("CandidateDialog", () => {
  it("cannot save without a company or a role", () => {
    render(<CandidateDialog isOpen onClose={vi.fn()} onSave={vi.fn()} />);
    expect(
      screen.getByRole<HTMLButtonElement>("button", { name: "Save" }).disabled
    ).toBe(true);
  });

  it("saves what was typed and closes", async () => {
    const onSave = vi.fn().mockResolvedValue(undefined);
    const onClose = vi.fn();
    render(<CandidateDialog isOpen onClose={onClose} onSave={onSave} />);
    fireEvent.change(screen.getByLabelText("Company"), {
      target: { value: "Acme" },
    });
    fireEvent.change(screen.getByLabelText("Apply by"), {
      target: { value: "2026-11-20" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Save" }));
    await waitFor(() => expect(onClose).toHaveBeenCalled());
    expect(onSave).toHaveBeenCalledWith(
      expect.objectContaining({ company: "Acme", applyBy: "2026-11-20" })
    );
  });

  it("shows the reason when saving fails and stays open", async () => {
    const onClose = vi.fn();
    render(
      <CandidateDialog
        isOpen
        onClose={onClose}
        onSave={() => Promise.reject(new Error("Server said no"))}
        initial={{ company: "Acme" }}
      />
    );
    fireEvent.click(screen.getByRole("button", { name: "Save" }));
    expect(await screen.findByText("Server said no")).toBeTruthy();
    expect(onClose).not.toHaveBeenCalled();
  });
});
