// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { AboutDialog } from "@pages/workspace/about-dialog";

afterEach(() => {
  cleanup();
  vi.unstubAllEnvs();
});

function openAbout(): void {
  render(<AboutDialog isOpen onClose={() => undefined} />);
}

describe("privacy note in the About dialog", () => {
  it("says in the browser version that the data lives in this browser", () => {
    vi.stubEnv("VITE_STORAGE_MODE", "browser");
    openAbout();
    expect(screen.getByText(/Your data stays in this browser\./)).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Privacy note" }));
    expect(screen.getByRole("heading", { name: "Privacy note" })).toBeTruthy();
    expect(screen.getByText("Masking is best effort")).toBeTruthy();
    expect(screen.getByText("Your AI key")).toBeTruthy();
  });

  it("says in the server version that the data is on this computer", () => {
    openAbout();
    expect(screen.getByText(/Your data stays on your computer\./)).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Privacy note" }));
    expect(screen.queryByText("Your AI key")).toBeNull();
  });
});
