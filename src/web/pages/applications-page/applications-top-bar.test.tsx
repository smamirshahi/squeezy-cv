// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import {
  ApplicationsTopBar,
  describeAiChip,
} from "@pages/applications-page/applications-top-bar";
import { AiStatus } from "@store/persistence/api-client";

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

function stubStatus(body: unknown, status = 200): void {
  vi.stubGlobal(
    "fetch",
    vi.fn(() => Promise.resolve(new Response(JSON.stringify(body), { status })))
  );
}

describe("describeAiChip", () => {
  it("names the provider and whether text leaves this computer", () => {
    expect(describeAiChip({ isConfigured: true, provider: "ollama" })).toBe(
      "Ollama · local"
    );
    expect(describeAiChip({ isConfigured: true, provider: "claude" })).toBe(
      "Claude · online"
    );
  });

  it("gives nothing for an answer it does not understand", () => {
    expect(describeAiChip([] as unknown as AiStatus)).toBe("");
    expect(describeAiChip({ provider: "nope" } as unknown as AiStatus)).toBe(
      ""
    );
  });
});

describe("ApplicationsTopBar", () => {
  it("shows the app name, where you are, the AI provider and the way back", async () => {
    stubStatus({ isConfigured: true, provider: "ollama" });
    render(<ApplicationsTopBar />);
    expect(screen.getByText("CV Builder")).toBeTruthy();
    expect(screen.getByText("Applications")).toBeTruthy();
    expect(await screen.findByText("Ollama · local")).toBeTruthy();
    expect(
      screen
        .getByRole("link", { name: "Back to the editor" })
        .getAttribute("href")
    ).toBe("/");
  });

  it("still works when the AI status cannot be read", async () => {
    stubStatus({ code: "x", message: "down" }, 500);
    render(<ApplicationsTopBar />);
    expect(
      screen.getByRole("link", { name: "Back to the editor" })
    ).toBeTruthy();
    await new Promise((resolve) => setTimeout(resolve, 20));
    expect(screen.queryByText(/local|online/)).toBeNull();
  });
});
