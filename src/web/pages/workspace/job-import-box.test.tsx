// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { JobImportBox } from "@pages/workspace/job-source";

const fetchMock = vi.fn();
const READ = {
  company: "JUXT",
  role: "Front End Developer",
  location: "London",
  advert: "About the job",
  workMode: "hybrid",
  employmentType: "fullTime",
};
const NONE = { company: "", role: "", location: "", advert: "" };

function reply(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status });
}

/** Answers the AI status (Gemini set up or not) and the two job routes */
function serve(options: {
  isGeminiSet: boolean;
  link: unknown;
  text: unknown;
}) {
  fetchMock.mockImplementation((url: string) => {
    if (url === "/api/ai/job-link") {
      return Promise.resolve(reply(options.link));
    }
    if (url === "/api/ai/job-fields") {
      return Promise.resolve(reply(options.text));
    }
    return Promise.resolve(
      reply({
        isConfigured: true,
        provider: "claude",
        providers: [
          { id: "claude", isConfigured: true },
          { id: "gemini", isConfigured: options.isGeminiSet },
        ],
        choice: {
          tailor: "claude",
          import: "claude",
          hide: "claude",
          chat: "claude",
          place: "claude",
        },
      })
    );
  });
}

function open(onFill = vi.fn()) {
  render(
    <JobImportBox
      imported={null}
      onFill={onFill}
      onUndo={() => undefined}
      onUseAnother={() => undefined}
    />
  );
  return onFill;
}

beforeEach(() => {
  fetchMock.mockReset();
  vi.stubGlobal("fetch", fetchMock);
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

async function typeIn(text: string): Promise<void> {
  fireEvent.change(screen.getByLabelText("Job link or job text"), {
    target: { value: text },
  });
  await screen.findByRole("button", { name: /Fill/ });
}

describe("JobImportBox", () => {
  it("fills from pasted text", async () => {
    serve({ isGeminiSet: false, link: NONE, text: READ });
    const onFill = open();
    await typeIn("About the job at JUXT");
    await waitFor(() =>
      expect(
        screen.getByRole<HTMLButtonElement>("button", {
          name: "Fill from text",
        }).disabled
      ).toBe(false)
    );
    fireEvent.click(screen.getByRole("button", { name: "Fill from text" }));
    await waitFor(() => expect(onFill).toHaveBeenCalledWith(READ, "", "text"));
  });

  it("reads a link with Gemini when a key is set", async () => {
    serve({ isGeminiSet: true, link: READ, text: NONE });
    const onFill = open();
    await typeIn("https://www.linkedin.com/jobs/view/1/");
    await waitFor(() =>
      expect(
        screen.getByRole<HTMLButtonElement>("button", { name: "Fill" }).disabled
      ).toBe(false)
    );
    fireEvent.click(screen.getByRole("button", { name: "Fill" }));
    await waitFor(() =>
      expect(onFill).toHaveBeenCalledWith(
        READ,
        "https://www.linkedin.com/jobs/view/1/",
        "link"
      )
    );
  });

  it("asks for the page text, keeping the link, when the link cannot be read", async () => {
    serve({ isGeminiSet: true, link: NONE, text: READ });
    const onFill = open();
    await typeIn("https://www.linkedin.com/jobs/view/1/");
    await waitFor(() =>
      expect(
        screen.getByRole<HTMLButtonElement>("button", { name: "Fill" }).disabled
      ).toBe(false)
    );
    fireEvent.click(screen.getByRole("button", { name: "Fill" }));
    await screen.findByText(/LinkedIn did not let us read this page/);
    expect(onFill).not.toHaveBeenCalled();
    expect(screen.getByLabelText<HTMLInputElement>("Job link").value).toBe(
      "https://www.linkedin.com/jobs/view/1/"
    );
    fireEvent.change(screen.getByLabelText("Job page text"), {
      target: { value: "About the job" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Fill from text" }));
    await waitFor(() =>
      expect(onFill).toHaveBeenCalledWith(
        READ,
        "https://www.linkedin.com/jobs/view/1/",
        "text"
      )
    );
  });

  it("asks for the page text at once when a link is given without a Gemini key", async () => {
    serve({ isGeminiSet: false, link: NONE, text: READ });
    open();
    await typeIn("https://www.linkedin.com/jobs/view/1/");
    fireEvent.click(await screen.findByRole("button", { name: "Fill" }));
    await screen.findByText(/needs a Gemini key/);
    expect(
      fetchMock.mock.calls.some(([url]) => url === "/api/ai/job-link")
    ).toBe(false);
  });
});
