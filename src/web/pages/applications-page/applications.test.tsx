// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { Provider } from "react-redux";
import { configureStore } from "@reduxjs/toolkit";
import sample from "@fixtures/sample-cv.json";
import { ApplicationView } from "@pages/applications-page/application-view";
import { MarkAsApplied } from "@pages/applications-page/mark-as-applied";
import { rememberListSearch } from "@pages/applications-page/last-search";
import { createApplication } from "@shared/application/application-utils";
import { createDefaultVariant } from "@shared/variant/variant-utils";
import { migrateCvFile } from "@shared/vault/migrate-vault";
import { toSavedState } from "@store/persistence/persistence-logic";
import {
  setSavedState,
  setStorageStatus,
} from "@store/persistence/persistence-slice";
import { rootReducer } from "@store/store";
import { loadCvFileIntoStore } from "@store/persistence/persistence-actions";
import { AppStore } from "@store/store-helper";

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

const file = migrateCvFile(sample);
const variant = createDefaultVariant(file, "v1");
const application = createApplication(
  { jobId: "v1", company: "Acme Ltd", role: "Senior Dev" },
  file.vault,
  variant,
  "2026-11-06",
  "aaaa"
);

interface Call {
  method: string;
  url: string;
  body: unknown;
}

/** Answers every call with `reply` and remembers what was asked */
function stubServer(reply: (call: Call) => unknown): Call[] {
  const calls: Call[] = [];
  vi.stubGlobal(
    "fetch",
    vi.fn((url: string, init?: RequestInit) => {
      const call: Call = {
        method: init?.method ?? "GET",
        url,
        body:
          typeof init?.body === "string" ? JSON.parse(init.body) : undefined,
      };
      calls.push(call);
      return Promise.resolve(
        new Response(JSON.stringify(reply(call)), { status: 200 })
      );
    })
  );
  return calls;
}

function readyStore(): AppStore {
  const store = configureStore({ reducer: rootReducer });
  loadCvFileIntoStore(store.dispatch, file, [variant]);
  store.dispatch(setStorageStatus({ status: "ready" }));
  const s = store.getState();
  store.dispatch(
    setSavedState(
      toSavedState(
        s.vault,
        s.cvData.metaData,
        s.cvData.style,
        s.jobs.templates,
        s.jobs.jobs
      )
    )
  );
  return store;
}

describe("Mark as applied", () => {
  it("asks for company and role, then freezes the saved CV", async () => {
    const calls = stubServer(() => application);
    render(
      <Provider store={readyStore()}>
        <MarkAsApplied />
      </Provider>
    );
    fireEvent.click(screen.getByRole("button", { name: /mark as applied/i }));

    const submit = screen.getByRole("button", { name: "Save application" });
    expect((submit as HTMLButtonElement).disabled).toBe(true);

    fireEvent.change(screen.getByLabelText(/company/i), {
      target: { value: "Acme Ltd" },
    });
    expect((submit as HTMLButtonElement).disabled).toBe(true);
    fireEvent.change(screen.getByLabelText(/^role/i), {
      target: { value: "Senior Dev" },
    });
    expect((submit as HTMLButtonElement).disabled).toBe(false);
    fireEvent.click(submit);

    await screen.findByText(/Saved: Acme Ltd, Senior Dev/);
    // Nothing was unsaved, so the only write is the application
    expect(calls).toHaveLength(1);
    expect(calls[0]).toMatchObject({
      method: "POST",
      url: "/api/applications",
      body: { jobId: "v1", company: "Acme Ltd", role: "Senior Dev" },
    });
  });

  it("shows what went wrong and keeps the form", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(() =>
        Promise.resolve(
          new Response(
            JSON.stringify({ code: "pdf_failed", message: "No Chromium" }),
            { status: 500 }
          )
        )
      )
    );
    render(
      <Provider store={readyStore()}>
        <MarkAsApplied />
      </Provider>
    );
    fireEvent.click(screen.getByRole("button", { name: /mark as applied/i }));
    fireEvent.change(screen.getByLabelText(/company/i), {
      target: { value: "A" },
    });
    fireEvent.change(screen.getByLabelText(/^role/i), {
      target: { value: "B" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Save application" }));
    await screen.findByText("No Chromium");
    expect(screen.getByLabelText<HTMLInputElement>(/company/i).value).toBe("A");
  });
});

describe("Application page", () => {
  it("shows the application, its timeline and the CV that was sent", async () => {
    stubServer(() => application);
    const { container } = render(
      <ApplicationView applicationId={application.id} />
    );
    await screen.findByText("Acme Ltd");
    expect(screen.getByText("Senior Dev")).toBeTruthy();
    expect(screen.getByText("6 Nov 2026")).toBeTruthy();
    expect(container.querySelector("iframe")?.getAttribute("src")).toBe(
      `/api/applications/${application.id}/pdf`
    );
    expect(screen.getByText("The CV you sent")).toBeTruthy();
  });

  it("labels the PDF with the day it was sent and shows it before the timeline", async () => {
    stubServer(() => application);
    const { container } = render(
      <ApplicationView applicationId={application.id} />
    );
    await screen.findByText(/CV as sent on 6 Nov 2026/);
    const frame = container.querySelector("iframe") as Element;
    const timeline = screen.getByText("Timeline");
    expect(
      frame.compareDocumentPosition(timeline) & Node.DOCUMENT_POSITION_FOLLOWING
    ).toBeTruthy();
  });

  it("starts the timeline with 'Draft created' when it knows when the job was created", async () => {
    stubServer(() => application);
    render(
      <ApplicationView
        applicationId={application.id}
        draftCreatedAt="2026-11-02"
      />
    );
    await screen.findByText("Timeline");
    const [first] = screen.getAllByRole("listitem");
    expect(first.textContent).toBe("2 Nov 2026 - Draft created");
  });

  it("has no 'Draft created' line without that date", async () => {
    stubServer(() => application);
    render(<ApplicationView applicationId={application.id} />);
    await screen.findByText("Timeline");
    expect(screen.queryByText(/Draft created/)).toBeNull();
  });

  it("'All applications' goes back to the list with the search that was there", async () => {
    stubServer(() => application);
    rememberListSearch("?q=acme&status=interview");
    render(<ApplicationView applicationId={application.id} />);
    fireEvent.click(
      await screen.findByRole("link", { name: /All applications/ })
    );
    expect(window.location.pathname).toBe("/applications");
    expect(window.location.search).toBe("?q=acme&status=interview");
  });

  it("says so when the stored PDF is missing", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn((_url: string, init?: RequestInit) =>
        Promise.resolve(
          init?.method === "HEAD"
            ? new Response("", { status: 404 })
            : new Response(JSON.stringify(application), { status: 200 })
        )
      )
    );
    const { container } = render(
      <ApplicationView applicationId={application.id} />
    );
    await screen.findByText(/PDF of this application is missing/);
    expect(container.querySelector("iframe")).toBeNull();
  });

  it("names the job and template it was sent with, and says the sent CV is a frozen copy", async () => {
    const named = {
      ...application,
      jobId: "v1",
      templateId: "tpl1",
      jobName: "Acme - Dev",
      templateName: "Classic",
    };
    stubServer(() => named);
    render(<ApplicationView applicationId={named.id} />);
    await screen.findByText("Acme Ltd");
    expect(screen.getByTestId("application-sources").textContent).toContain(
      "Job: Acme - Dev"
    );
    expect(screen.getByTestId("application-sources").textContent).toContain(
      "Template: Classic"
    );
    expect(
      screen.getByText(
        /frozen copy; later edits to the template or job do not change it/
      )
    ).toBeTruthy();
  });

  it("an application from before jobs shows the variant name as the job", async () => {
    stubServer(() => application);
    render(<ApplicationView applicationId={application.id} />);
    await screen.findByText("Acme Ltd");
    expect(screen.getByTestId("application-sources").textContent).toContain(
      `Job: ${variant.name}`
    );
  });

  describe("Create new job from this", () => {
    const sent = {
      ...application,
      jobId: "v1",
      templateId: "tpl1",
      jobName: "Acme - Dev",
      templateName: "Classic",
    };

    function stubWithTemplates(templateIds: string[]): Call[] {
      return stubServer((call) => {
        if (call.url === "/api/templates" && call.method === "GET") {
          return templateIds.map((id) => ({
            id,
            name: id,
            isCorrupt: false,
          }));
        }
        if (call.method === "PUT") {
          return { status: "saved" };
        }
        return sent;
      });
    }

    it("makes a new job on the template it was sent with, with the sent choices", async () => {
      const calls = stubWithTemplates(["tpl1"]);
      render(<ApplicationView applicationId={sent.id} />);
      await screen.findByText("Acme Ltd");
      fireEvent.click(
        screen.getByRole("button", { name: "Create new job from this" })
      );
      await screen.findByText(/A copy was added to your jobs/);
      const puts = calls.filter((c) => c.method === "PUT");
      expect(puts).toHaveLength(1);
      expect(puts[0].url).toMatch(/^\/api\/jobs\//);
      expect(puts[0].body).toMatchObject({
        templateId: "tpl1",
        company: "Acme Ltd",
        role: "Senior Dev",
        selection: sent.submitted.variant.selection,
      });
    });

    it("keeps the look as a template of its own when the sent template is gone", async () => {
      const calls = stubWithTemplates(["other"]);
      render(<ApplicationView applicationId={sent.id} />);
      await screen.findByText("Acme Ltd");
      fireEvent.click(
        screen.getByRole("button", { name: "Create new job from this" })
      );
      await screen.findByText(/A copy was added to your jobs/);
      const puts = calls.filter((c) => c.method === "PUT");
      expect(puts.map((c) => c.url.split("/")[2])).toEqual([
        "templates",
        "jobs",
      ]);
    });
  });

  it("changes the status with a date and records it", async () => {
    const calls = stubServer((call) =>
      call.method === "PATCH"
        ? {
            ...application,
            status: "interview",
            history: [
              ...application.history,
              { status: "interview", at: "2026-11-14" },
            ],
          }
        : application
    );
    render(<ApplicationView applicationId={application.id} />);
    await screen.findByText("Acme Ltd");

    fireEvent.mouseDown(screen.getByRole("combobox"));
    fireEvent.click(await screen.findByRole("option", { name: "Interview" }));
    fireEvent.change(screen.getByLabelText("Date"), {
      target: { value: "2026-11-14" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Save" }));

    await waitFor(() => {
      expect(calls.at(-1)).toMatchObject({
        method: "PATCH",
        body: { status: "interview", statusAt: "2026-11-14" },
      });
    });
    await screen.findByText("14 Nov 2026");
  });

  it("explains a missing application", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(() =>
        Promise.resolve(
          new Response(
            JSON.stringify({
              code: "not_found",
              message: "There is no application x.",
            }),
            { status: 404 }
          )
        )
      )
    );
    render(<ApplicationView applicationId="x" />);
    await screen.findByText("There is no application x.");
  });
});
