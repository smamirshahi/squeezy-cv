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
import { rootReducer } from "@store/store";
import { MAX_IMPORT_PDF_BYTES } from "@custom-types/import-types";

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
    const zone = screen.getByText(/or drop a PDF here/)
      .parentElement as Element;
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
