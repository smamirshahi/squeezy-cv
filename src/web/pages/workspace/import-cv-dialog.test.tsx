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
import { registerSendHost } from "@store/persistence/send-gate";
import {
  OPEN_AI_SETTINGS_EVENT,
  announceAiSettingsChanged,
} from "@pages/workspace/ai-settings-event";

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

function choose(...files: File[]): void {
  fireEvent.change(screen.getByLabelText("PDF file"), {
    target: { files },
  });
}

const PDF = new File(["%PDF-1.4"], "cv.pdf", { type: "application/pdf" });

describe("ImportCvDialog with PDFs", () => {
  it("lists a chosen PDF as read, without putting its text in the box", async () => {
    serve(() => reply({ text: "Alex Morgan\nAcme", pages: 2 }));
    open();
    choose(PDF);
    await screen.findByText(/cv\.pdf: read \(16 characters\)/);
    expect(
      screen.getByLabelText<HTMLTextAreaElement>("Or paste CV text").value
    ).toBe("");
    expect(
      fetchMock.mock.calls.find(([url]) => url === "/api/import/pdf")?.[1]
        .headers["Content-Type"]
    ).toBe("application/pdf");
  });

  it("lists several PDFs and lets one be removed", async () => {
    serve(() => reply({ text: "Some text", pages: 1 }));
    open();
    choose(
      PDF,
      new File(["%PDF-1.4"], "linkedin.pdf", { type: "application/pdf" })
    );
    await screen.findByText(/cv\.pdf: read/);
    await screen.findByText(/linkedin\.pdf: read/);
    fireEvent.click(screen.getAllByRole("button", { name: "Remove" })[0]);
    expect(screen.queryByText(/cv\.pdf: read/)).toBeNull();
    expect(screen.getByText(/linkedin\.pdf: read/)).toBeTruthy();
  });

  it("reads a dropped PDF the same way", async () => {
    serve(() => reply({ text: "Dropped text", pages: 1 }));
    open();
    const zone = screen.getByRole("button", {
      name: "Choose PDF files, or drop them here",
    });
    fireEvent.drop(zone, { dataTransfer: { files: [PDF] } });
    await screen.findByText(/cv\.pdf: read \(12 characters\)/);
  });

  it("shows the server's reason for a file that failed and leaves the box alone", async () => {
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
    fireEvent.change(screen.getByLabelText("Or paste CV text"), {
      target: { value: "typed" },
    });
    choose(PDF);
    await screen.findByText(/failed \(This PDF has no text layer/);
    expect(
      screen.getByLabelText<HTMLTextAreaElement>("Or paste CV text").value
    ).toBe("typed");
  });

  it("refuses a file over the size limit without sending it", async () => {
    serve(() => reply({ text: "x", pages: 1 }));
    open();
    const big = new File(["x"], "big.pdf", { type: "application/pdf" });
    Object.defineProperty(big, "size", { value: MAX_IMPORT_PDF_BYTES + 1 });
    choose(big);
    await screen.findByText(/Larger than 5 MB/);
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

  it("shows the newly chosen AI after the settings dialog closes", async () => {
    serveStatus({ isConfigured: true, provider: "groq" });
    open();
    const card = screen.getByRole("region", {
      name: "AI for sorting the CV text",
    });
    await waitFor(() => expect(card.textContent).toMatch(/Groq · online/));
    serveStatus({ isConfigured: true, provider: "claude" });
    announceAiSettingsChanged();
    await waitFor(() => expect(card.textContent).toMatch(/Claude · online/));
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

  function importedAs(phone: string, name = "Alex Morgan"): unknown {
    const base = migrateCvFile(sample).vault;
    return {
      vault: {
        ...base,
        profile: { ...base.profile, fullName: name, phone },
        sections: [],
        links: [],
      },
      warnings: [],
    };
  }

  function serveImports(...answers: unknown[]): void {
    let call = 0;
    fetchMock.mockImplementation((url: string) =>
      Promise.resolve(
        url === "/api/ai/import"
          ? reply(answers[Math.min(call++, answers.length - 1)])
          : reply({
              isConfigured: true,
              provider: "groq",
              providers: [{ id: "groq", isConfigured: true }],
            })
      )
    );
  }

  async function analyse(): Promise<void> {
    const button = screen.getByRole("button", { name: "Analyze with AI" });
    await waitFor(() => expect(button.hasAttribute("disabled")).toBe(false));
    fireEvent.click(button);
  }

  it("can analyse with any provider that is set up and shows the review", async () => {
    serveImports(importedAs("+44 7700 900000"));
    open();
    fireEvent.change(screen.getByLabelText("Or paste CV text"), {
      target: { value: "Alex Morgan, developer" },
    });
    await analyse();
    await screen.findByText("Here is what we found");
    expect(
      screen
        .getByRole("button", { name: "Add to my vault" })
        .hasAttribute("disabled")
    ).toBe(false);
  });

  it("sends each source to the AI and blocks adding until a conflict is decided", async () => {
    let call = 0;
    const answers = [
      importedAs("+44 7700 111111"),
      importedAs("+44 7700 222222"),
    ];
    fetchMock.mockImplementation((url: string) =>
      Promise.resolve(
        url === "/api/import/pdf"
          ? reply({ text: "Alex Morgan, second CV", pages: 1 })
          : url === "/api/ai/import"
            ? reply(answers[call++])
            : reply({ isConfigured: true, provider: "groq" })
      )
    );
    open();
    choose(PDF);
    await screen.findByText(/cv\.pdf: read/);
    fireEvent.change(screen.getByLabelText("Or paste CV text"), {
      target: { value: "Alex Morgan, first CV" },
    });
    await analyse();
    await screen.findByText("Here is what we found");
    expect(
      fetchMock.mock.calls.filter(([url]) => url === "/api/ai/import")
    ).toHaveLength(2);

    const add = screen.getByRole("button", { name: "Add to my vault" });
    expect(add.hasAttribute("disabled")).toBe(true);
    fireEvent.click(screen.getByRole("button", { name: "Go to the first" }));
    fireEvent.click(await screen.findByRole("radio", { name: /111111/ }));
    await waitFor(() => expect(add.hasAttribute("disabled")).toBe(false));
  });
});

describe("ImportCvDialog progress and cancelling", () => {
  const A = new File(["%PDF-1.4"], "a.pdf", { type: "application/pdf" });
  const B = new File(["%PDF-1.4"], "b.pdf", { type: "application/pdf" });

  function imported(phone: string): unknown {
    const base = migrateCvFile(sample).vault;
    return {
      vault: {
        ...base,
        profile: { ...base.profile, fullName: "Alex Morgan", phone },
        sections: [],
        links: [],
      },
      warnings: [],
    };
  }

  /** Answers PDFs and status; each AI import is answered by the next function of `imports` */
  function serveSteps(...imports: (() => Promise<Response>)[]): void {
    let call = 0;
    fetchMock.mockImplementation((url: string) => {
      if (url === "/api/import/pdf") {
        return Promise.resolve(reply({ text: "Alex Morgan, CV", pages: 1 }));
      }
      if (url === "/api/ai/import") {
        return imports[Math.min(call++, imports.length - 1)]();
      }
      return Promise.resolve(
        reply({
          isConfigured: true,
          provider: "groq",
          providers: [{ id: "groq", isConfigured: true }],
        })
      );
    });
  }

  function importCalls(): number {
    return fetchMock.mock.calls.filter(([url]) => url === "/api/ai/import")
      .length;
  }

  async function press(): Promise<void> {
    const button = screen.getByRole("button", { name: "Analyze with AI" });
    await waitFor(() => expect(button.hasAttribute("disabled")).toBe(false));
    fireEvent.click(button);
  }

  it("marks the dialog as a beta", () => {
    serveSteps(() => Promise.resolve(reply(imported("1"))));
    open();
    expect(screen.getByText("BETA")).toBeTruthy();
  });

  it("shows which file the AI is on, and lets a file that is still waiting be removed", async () => {
    let release: (response: Response) => void = () => undefined;
    serveSteps(
      () =>
        new Promise<Response>((resolve) => {
          release = resolve;
        }),
      () => Promise.resolve(reply(imported("+44 7700 111111")))
    );
    open();
    choose(A, B);
    await screen.findByText(/b\.pdf: read/);
    await press();

    await screen.findByText("Analyzing…");
    expect(screen.getByText("Waiting")).toBeTruthy();
    expect(
      screen.getByText(/The AI is reading a\.pdf \(1 of 2\)/)
    ).toBeTruthy();
    // Only the waiting file can still be removed
    const remove = screen.getAllByRole("button", { name: "Remove" });
    expect(remove).toHaveLength(1);
    fireEvent.click(remove[0]);
    expect(screen.queryByText(/b\.pdf: read/)).toBeNull();

    release(reply(imported("+44 7700 111111")));
    await screen.findByText("Here is what we found");
    expect(importCalls()).toBe(1);
  });

  it("keeps what is analyzed when the user cancels, and only sends the rest next time", async () => {
    serveSteps(
      () => Promise.resolve(reply(imported("+44 7700 111111"))),
      () =>
        Promise.resolve(
          reply(
            { code: "cancelled", message: "Cancelled. Nothing was sent." },
            409
          )
        ),
      () => Promise.resolve(reply(imported("+44 7700 111111")))
    );
    open();
    choose(A, B);
    await screen.findByText(/b\.pdf: read/);
    await press();

    await screen.findByText(/Cancelled\. Nothing more was sent/);
    // The first file keeps its badge and every row can be removed again
    expect(screen.getAllByText("Analyzed")).toHaveLength(1);
    expect(screen.getAllByRole("button", { name: "Remove" })).toHaveLength(2);
    expect(importCalls()).toBe(2);

    await press();
    await screen.findByText("Here is what we found");
    // Only b.pdf was sent again
    expect(importCalls()).toBe(3);
  });

  it("sends a file again when it was removed and chosen again", async () => {
    serveSteps(
      () => Promise.resolve(reply(imported("+44 7700 111111"))),
      () =>
        Promise.resolve(
          reply({ code: "cancelled", message: "Cancelled." }, 409)
        ),
      () => Promise.resolve(reply(imported("+44 7700 111111"))),
      () => Promise.resolve(reply(imported("+44 7700 111111")))
    );
    open();
    choose(A, B);
    await screen.findByText(/b\.pdf: read/);
    await press();
    await screen.findByText(/Cancelled\./);
    fireEvent.click(screen.getAllByRole("button", { name: "Remove" })[0]);
    expect(screen.queryByText("Analyzed")).toBeNull();
    await press();
    await screen.findByText("Here is what we found");
    // a.pdf was removed: only b.pdf counts, and it was not analyzed before
    expect(importCalls()).toBe(3);
  });

  it("asks once for all the files, and not again after the user approves", async () => {
    const host = vi
      .fn()
      .mockResolvedValue({ masking: { custom: [], skip: [] } });
    const unregister = registerSendHost(host);
    try {
      fetchMock.mockImplementation((url: string, init?: RequestInit) => {
        const headers = init?.headers as Record<string, string> | undefined;
        if (url === "/api/import/pdf") {
          return Promise.resolve(reply({ text: "Alex Morgan, CV", pages: 1 }));
        }
        if (url === "/api/ai/import") {
          return Promise.resolve(
            reply(
              headers?.["x-ai-preview"]
                ? {
                    provider: "claude",
                    calls: [
                      { promptName: "import-cv", system: "s", input: "i" },
                    ],
                    terms: [],
                    suggestions: [],
                  }
                : imported("+44 7700 111111")
            )
          );
        }
        return Promise.resolve(
          reply({
            isConfigured: true,
            provider: "claude",
            providers: [{ id: "claude", isConfigured: true }],
          })
        );
      });
      open();
      choose(A, B);
      await screen.findByText(/b\.pdf: read/);
      await press();
      await screen.findByText("Here is what we found");
      expect(host).toHaveBeenCalledTimes(1);
      expect(host.mock.calls[0][0].subject).toBe("2 files");
      // The window shows both files' messages
      expect(host.mock.calls[0][0].preview.calls).toHaveLength(2);
      const real = fetchMock.mock.calls.filter(
        ([url, init]) =>
          url === "/api/ai/import" &&
          !(init?.headers as Record<string, string> | undefined)?.[
            "x-ai-preview"
          ]
      );
      expect(real).toHaveLength(2);
    } finally {
      unregister();
    }
  });

  it("stops after the first file when the user cancels the one window", async () => {
    const unregister = registerSendHost(() => Promise.resolve(null));
    try {
      fetchMock.mockImplementation((url: string, init?: RequestInit) => {
        const headers = init?.headers as Record<string, string> | undefined;
        if (url === "/api/import/pdf") {
          return Promise.resolve(reply({ text: "Alex Morgan, CV", pages: 1 }));
        }
        if (url === "/api/ai/import" && headers?.["x-ai-preview"]) {
          return Promise.resolve(
            reply({
              provider: "claude",
              calls: [{ promptName: "import-cv", system: "s", input: "i" }],
              terms: [],
              suggestions: [],
            })
          );
        }
        return Promise.resolve(
          reply({
            isConfigured: true,
            provider: "claude",
            providers: [{ id: "claude", isConfigured: true }],
          })
        );
      });
      open();
      choose(A, B);
      await screen.findByText(/b\.pdf: read/);
      await press();
      await screen.findByText(/Cancelled\. Nothing more was sent/);
      expect(screen.queryByText("Analyzed")).toBeNull();
      // Only the two previews were made, nothing was sent
      expect(importCalls()).toBe(2);
    } finally {
      unregister();
    }
  });
});
