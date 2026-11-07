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
  { variantId: "v1", company: "Acme Ltd", role: "Senior Dev" },
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
        s.variants.templates,
        s.variants.jobs
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
    // Nothing was unsaved, so the only writes are the application and then a re-read of the locks
    expect(calls).toHaveLength(2);
    expect(calls[1]).toMatchObject({ method: "GET", url: "/api/applications" });
    expect(calls[0]).toMatchObject({
      method: "POST",
      url: "/api/applications",
      body: { variantId: "v1", company: "Acme Ltd", role: "Senior Dev" },
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
