// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { Provider } from "react-redux";
import { configureStore } from "@reduxjs/toolkit";
import { ImportCvDialog } from "@pages/workspace/import-cv-dialog";
import sample from "@fixtures/sample-cv.json";
import { migrateCvFile } from "@shared/vault/migrate-vault";
import { rootReducer } from "@store/store";
import { MAX_IMPORT_PDF_BYTES } from "@custom-types/import-types";
import { OPEN_AI_SETTINGS_EVENT } from "@pages/workspace/ai-settings-event";

const fetchMock = vi.fn();

beforeEach(() => {
  fetchMock.mockReset();
  vi.stubGlobal("fetch", fetchMock);
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

function reply(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status });
}

/** Answers the AI status and, for the PDF route, whatever `pdf` says */
function serve(pdf: () => Response): void {
  fetchMock.mockImplementation((url: string) =>
    Promise.resolve(
      url === "/api/import/pdf"
        ? pdf()
        : reply({ isConfigured: true, provider: "claude" })
    )
  );
}

function open(): void {
  render(
    <Provider store={configureStore({ reducer: rootReducer })}>
      <ImportCvDialog isOpen onClose={() => undefined} />
    </Provider>
  );
}

function choose(file: File): void {
  fireEvent.change(screen.getByLabelText("PDF file"), {
    target: { files: [file] },
  });
}

const PDF = new File(["%PDF-1.4"], "cv.pdf", { type: "application/pdf" });

describe("ImportCvDialog with a PDF", () => {
  it("puts the text of the chosen PDF in the editable box", async () => {
    serve(() => reply({ text: "Alex Morgan\nAcme", pages: 2 }));
    open();
    choose(PDF);
    await waitFor(() =>
      expect(
        screen.getByLabelText<HTMLTextAreaElement>("Your CV text").value
      ).toBe("Alex Morgan\nAcme")
    );
    expect(
      screen.getByText(/Text taken from cv\.pdf \(2 pages\)/)
    ).toBeTruthy();
    expect(screen.getByText(/16 \/ 30000 characters/)).toBeTruthy();
    expect(
      fetchMock.mock.calls.find(([url]) => url === "/api/import/pdf")?.[1]
        .headers["Content-Type"]
    ).toBe("application/pdf");
  });

  it("reads a dropped PDF the same way", async () => {
    serve(() => reply({ text: "Dropped text", pages: 1 }));
    open();
    const zone = screen.getByRole("button", {
      name: "Choose a PDF file, or drop one here",
    });
    fireEvent.drop(zone, { dataTransfer: { files: [PDF] } });
    await waitFor(() =>
      expect(
        screen.getByLabelText<HTMLTextAreaElement>("Your CV text").value
      ).toBe("Dropped text")
    );
  });

  it("shows the server's reason and leaves the box alone", async () => {
    serve(() =>
      reply(
        {
          code: "no_text",
          message: "This PDF has no text layer. OCR is not supported.",
        },
        400
      )
    );
    open();
    fireEvent.change(screen.getByLabelText("Your CV text"), {
      target: { value: "typed" },
    });
    choose(PDF);
    await screen.findByText(/OCR is not supported/);
    expect(
      screen.getByLabelText<HTMLTextAreaElement>("Your CV text").value
    ).toBe("typed");
  });

  it("refuses a file over the size limit without sending it", async () => {
    serve(() => reply({ text: "x", pages: 1 }));
    open();
    const big = new File(["x"], "big.pdf", { type: "application/pdf" });
    Object.defineProperty(big, "size", { value: MAX_IMPORT_PDF_BYTES + 1 });
    choose(big);
    await screen.findByText(/larger than 5 MB/);
    expect(
      fetchMock.mock.calls.some(([url]) => url === "/api/import/pdf")
    ).toBe(false);
  });

  it("says the PDF text is sent to the chosen provider", async () => {
    serve(() => reply({ text: "x", pages: 1 }));
    open();
    await screen.findByText(/paste or take from a PDF/);
  });
});

describe("ImportCvDialog AI card", () => {
  function serveStatus(status: unknown): void {
    fetchMock.mockImplementation(() => Promise.resolve(reply(status)));
  }

  it("names the AI chosen for the import and says an online one gets the text", async () => {
    serveStatus({
      isConfigured: true,
      provider: "claude",
      choice: { import: "groq" },
      providers: [
        { id: "claude", isConfigured: true },
        { id: "groq", isConfigured: true },
      ],
    });
    open();
    const card = screen.getByRole("region", {
      name: "AI for sorting the CV text",
    });
    await waitFor(() => expect(card.textContent).toMatch(/Groq · online/));
    expect(card.textContent).toMatch(/is sent to/);
  });

  it("says a local AI keeps the text on this computer", async () => {
    serveStatus({ isConfigured: true, provider: "ollama" });
    open();
    const card = screen.getByRole("region", {
      name: "AI for sorting the CV text",
    });
    await waitFor(() =>
      expect(card.textContent).toMatch(/Ollama · on this computer/)
    );
    expect(card.textContent).toMatch(/stays on this computer/);
  });

  it("opens the AI settings on the import task with Change AI", () => {
    serveStatus({ isConfigured: true, provider: "ollama" });
    const heard = vi.fn();
    window.addEventListener(OPEN_AI_SETTINGS_EVENT, heard);
    open();
    fireEvent.click(screen.getByRole("button", { name: "Change AI" }));
    window.removeEventListener(OPEN_AI_SETTINGS_EVENT, heard);
    expect(heard).toHaveBeenCalledTimes(1);
    expect(
      (heard.mock.calls[0][0] as CustomEvent<{ task?: string }>).detail.task
    ).toBe("import");
  });

  it("names the provider that is not set up (not only Claude) and blocks Analyze", async () => {
    serveStatus({
      isConfigured: false,
      provider: "gemini",
      providers: [{ id: "gemini", isConfigured: false }],
    });
    open();
    await screen.findByText(/Gemini is not set up/);
    expect(
      screen
        .getByRole("button", { name: "Analyze with AI" })
        .hasAttribute("disabled")
    ).toBe(true);
  });

  it("can analyse with any provider that is set up and shows the result", async () => {
    fetchMock.mockImplementation((url: string) =>
      Promise.resolve(
        url === "/api/ai/import"
          ? reply({
              vault: {
                ...migrateCvFile(sample).vault,
                profile: {
                  ...migrateCvFile(sample).vault.profile,
                  fullName: "Alex Morgan",
                },
              },
              warnings: [],
            })
          : reply({
              isConfigured: true,
              provider: "groq",
              providers: [{ id: "groq", isConfigured: true }],
            })
      )
    );
    open();
    fireEvent.change(screen.getByLabelText("Your CV text"), {
      target: { value: "Alex Morgan, developer" },
    });
    const analyse = screen.getByRole("button", { name: "Analyze with AI" });
    await waitFor(() => expect(analyse.hasAttribute("disabled")).toBe(false));
    fireEvent.click(analyse);
    await screen.findByText(/Found: Alex Morgan/);
  });
});
