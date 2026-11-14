// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { AboutDialog } from "@pages/workspace/about-dialog";
import { APP_VERSION } from "@shared/version";

afterEach(() => {
  cleanup();
  vi.unstubAllEnvs();
});

function openAbout(onClose = vi.fn()): void {
  render(<AboutDialog isOpen onClose={onClose} />);
}

describe("About dialog", () => {
  it("shows who made the app, with the photo and the LinkedIn link", () => {
    openAbout();
    expect(
      screen.getByRole("heading", { name: "Mohammad Amirshahi" })
    ).toBeTruthy();
    expect(
      screen.getByText("Software developer · Nottingham, UK")
    ).toBeTruthy();
    const link = screen.getByRole("link", { name: /LinkedIn profile/ });
    expect(link.getAttribute("href")).toBe(
      "https://www.linkedin.com/in/mohammadamirshahi/"
    );
    expect(link.getAttribute("target")).toBe("_blank");
    expect(link.getAttribute("rel")).toContain("noopener");
  });

  it("tells why it was made and shows the three ideas", () => {
    openAbout();
    expect(
      screen.getByText(/I made this for myself\. Every job needs/)
    ).toBeTruthy();
    expect(
      screen.getByText(/LaTeX makes templates easy to change/)
    ).toBeTruthy();
    ["Write it once", "Pick for each job", "Keep a record"].forEach((title) =>
      expect(screen.getByText(title)).toBeTruthy()
    );
  });

  it("says that the data stays with you, in the words of the running mode", () => {
    vi.stubEnv("VITE_STORAGE_MODE", "browser");
    openAbout();
    expect(screen.getByText(/Your data stays in this browser\./)).toBeTruthy();
    expect(screen.getByText(/download a backup now and then/)).toBeTruthy();
    expect(screen.queryByText(/data folder/)).toBeNull();
    cleanup();
    vi.unstubAllEnvs();
    openAbout();
    expect(screen.getByText(/Your data stays on your computer\./)).toBeTruthy();
    expect(screen.getByText(/files in the data folder/)).toBeTruthy();
  });

  it("explains the AI points honestly: exact text shown, masking possible, AI only proposes", () => {
    openAbout();
    expect(screen.getByText("AI is optional and marked")).toBeTruthy();
    expect(
      screen.getByText("Before anything is sent you see the exact text.")
    ).toBeTruthy();
    expect(
      screen.getByText("Your name, contacts and employers can be masked.")
    ).toBeTruthy();
    expect(
      screen.getByText("AI only proposes. You decide what goes on the CV.")
    ).toBeTruthy();
  });

  it("links the support page and shows the version", () => {
    openAbout();
    const coffee = screen.getByRole("link", { name: /Buy me a coffee/ });
    expect(coffee.getAttribute("href")).toBe(
      "https://ko-fi.com/mohammadamirshahi"
    );
    expect(screen.getByText(`Version ${APP_VERSION}`)).toBeTruthy();
  });

  it("has no 'How to use' button any more, and opens the Privacy note from the footer", () => {
    openAbout();
    expect(screen.queryByRole("button", { name: "How to use" })).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Privacy note" }));
    expect(screen.getByRole("heading", { name: "Privacy note" })).toBeTruthy();
    expect(screen.getByText("Masking is best effort")).toBeTruthy();
  });

  it("calls onClose from the footer button and from the header cross", () => {
    const onClose = vi.fn();
    openAbout(onClose);
    const closers = screen.getAllByRole("button", { name: "Close" });
    expect(closers).toHaveLength(2);
    closers.forEach((button) => fireEvent.click(button));
    expect(onClose).toHaveBeenCalledTimes(2);
  });
});
