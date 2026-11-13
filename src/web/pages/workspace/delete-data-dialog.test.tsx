// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { DeleteDataDialog } from "@pages/workspace/delete-data-dialog";

const deleteAll = vi.fn<() => Promise<void>>();
vi.mock("@store/persistence/browser/delete-all-data", () => ({
  deleteAllBrowserData: () => deleteAll(),
}));

afterEach(() => {
  cleanup();
  deleteAll.mockReset();
});

function open(props: Partial<Parameters<typeof DeleteDataDialog>[0]> = {}): {
  onClose: () => void;
  onDeleted: () => void;
  onDownloadBackup: () => Promise<void>;
} {
  const handlers = {
    onClose: vi.fn(),
    onDeleted: vi.fn(),
    onDownloadBackup: vi.fn().mockResolvedValue(undefined),
  };
  render(<DeleteDataDialog isOpen {...handlers} {...props} />);
  return handlers;
}

describe("Delete all my data dialog", () => {
  it("keeps the delete button off until DELETE is typed", () => {
    open();
    const button = screen.getByRole("button", { name: "Delete everything" });
    expect(button.hasAttribute("disabled")).toBe(true);
    const field = screen.getByLabelText("Type DELETE to confirm");
    fireEvent.change(field, { target: { value: "delete" } });
    expect(button.hasAttribute("disabled")).toBe(true);
    fireEvent.change(field, { target: { value: "DELETE" } });
    expect(button.hasAttribute("disabled")).toBe(false);
  });

  it("offers a backup first and leaves everything alone on Cancel", () => {
    const { onClose, onDownloadBackup } = open();
    fireEvent.click(
      screen.getByRole("button", { name: "Download backup first" })
    );
    expect(onDownloadBackup).toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
    expect(onClose).toHaveBeenCalled();
    expect(deleteAll).not.toHaveBeenCalled();
  });

  it("deletes and then moves on", async () => {
    deleteAll.mockResolvedValue(undefined);
    const { onDeleted } = open();
    fireEvent.change(screen.getByLabelText("Type DELETE to confirm"), {
      target: { value: "DELETE" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Delete everything" }));
    await waitFor(() => expect(onDeleted).toHaveBeenCalled());
    expect(deleteAll).toHaveBeenCalledTimes(1);
  });

  it("shows why it failed (another tab open) and stays open", async () => {
    deleteAll.mockRejectedValue(
      new Error(
        "Another CV Builder tab is still open. Close the other tabs and try again."
      )
    );
    const { onDeleted } = open();
    fireEvent.change(screen.getByLabelText("Type DELETE to confirm"), {
      target: { value: "DELETE" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Delete everything" }));
    await screen.findByText(/Close the other tabs/);
    expect(onDeleted).not.toHaveBeenCalled();
  });
});
