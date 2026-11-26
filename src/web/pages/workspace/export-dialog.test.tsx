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
import sample from "@fixtures/sample-cv.json";
import { Notifications } from "@components/notifications/notifications";
import { ExportDialog } from "@pages/workspace/export-dialog";
import { createApplication } from "@shared/application/application-utils";
import { createDefaultVariant } from "@shared/variant/variant-utils";
import { migrateCvFile } from "@shared/vault/migrate-vault";
import { loadCvFileIntoStore } from "@store/persistence/persistence-actions";
import { toSavedState } from "@store/persistence/persistence-logic";
import {
  setSavedState,
  setStorageStatus,
} from "@store/persistence/persistence-slice";
import { rootReducer } from "@store/store";
import { AppStore } from "@store/store-helper";

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
}

let calls: Call[] = [];
let clicked: HTMLAnchorElement[] = [];

beforeEach(() => {
  calls = [];
  clicked = [];
  vi.stubGlobal(
    "fetch",
    vi.fn((url: string, init?: RequestInit) => {
      calls.push({ method: init?.method ?? "GET", url });
      if (url === "/api/pdf") {
        return Promise.resolve(new Response("%PDF-1.4", { status: 200 }));
      }
      return Promise.resolve(
        new Response(JSON.stringify(application), { status: 200 })
      );
    })
  );
  URL.createObjectURL = vi.fn(() => "blob:pdf");
  URL.revokeObjectURL = vi.fn();
  vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(function (
    this: HTMLAnchorElement
  ) {
    clicked.push(this);
  });
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

function readyStore(): AppStore {
  const store: AppStore = configureStore({ reducer: rootReducer });
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

async function openDialog(): Promise<void> {
  render(
    <Provider store={readyStore()}>
      <ExportDialog isOpen onClose={() => undefined} />
      <Notifications />
    </Provider>
  );
  await waitFor(() =>
    expect(
      screen
        .getByRole("button", { name: "Download PDF" })
        .hasAttribute("disabled")
    ).toBe(false)
  );
}

describe("export dialog: PDF of a job", () => {
  it("asks the server for the PDF of the active job by its job id", async () => {
    await openDialog();
    const pdfCall = (
      vi.mocked(fetch).mock.calls as unknown as [string, RequestInit][]
    ).find(([url]) => url === "/api/pdf");
    expect(pdfCall?.[1].method).toBe("POST");
    expect(JSON.parse(pdfCall?.[1].body as string)).toEqual({ jobId: "v1" });
  });
});

describe("export dialog: mark as applied after export", () => {
  it("downloads and does nothing else when the option is off", async () => {
    await openDialog();
    fireEvent.click(screen.getByRole("button", { name: "Download PDF" }));
    expect(clicked).toHaveLength(1);
    expect(screen.queryByRole("button", { name: "Save application" })).toBe(
      null
    );
  });

  it("downloads, then asks for the job when the option is on", async () => {
    await openDialog();
    fireEvent.click(
      screen.getByRole("checkbox", { name: "Then mark this as applied" })
    );
    fireEvent.click(screen.getByRole("button", { name: "Download PDF" }));
    expect(clicked).toHaveLength(1);

    fireEvent.change(await screen.findByLabelText(/company/i), {
      target: { value: "Acme Ltd" },
    });
    fireEvent.change(screen.getByLabelText(/^role/i), {
      target: { value: "Senior Dev" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Save application" }));
    await screen.findByText(/Saved: Acme Ltd, Senior Dev/);
    expect(calls.some((c) => c.url === "/api/applications")).toBe(true);
  });
});

describe("export dialog: ATS score", () => {
  it("shows the two scores, the final result and says it is the average", async () => {
    await openDialog();
    expect(screen.getByText(/^Your CV: \d+ of 100$/)).toBeTruthy();
    expect(screen.getByText(/^Final result: \d+ of 100$/)).toBeTruthy();
    expect(
      screen.getByText(/average of the two scores|Your CV alone/)
    ).toBeTruthy();
  });

  it("keeps the reasons in an accordion that opens and closes", async () => {
    await openDialog();
    const header = screen.getByRole("button", { name: /Final result/ });
    expect(header.getAttribute("aria-expanded")).toBe("false");
    expect(screen.queryByText(/A guide, not a guarantee/)).toBe(null);
    fireEvent.click(header);
    expect(header.getAttribute("aria-expanded")).toBe("true");
    expect(await screen.findByText(/A guide, not a guarantee/)).toBeTruthy();
    fireEvent.click(header);
    expect(header.getAttribute("aria-expanded")).toBe("false");
  });
});

describe("export dialog: preview zoom", () => {
  it("zooms in and out in steps and Fit goes back", async () => {
    await openDialog();
    const fit = screen.getByRole("button", { name: /Fit$/ });
    const start = fit.textContent;
    fireEvent.click(screen.getByRole("button", { name: "Zoom in" }));
    expect(fit.textContent).not.toBe(start);
    expect(fit.textContent).toBe("115% · Fit");
    fireEvent.click(screen.getByRole("button", { name: "Zoom out" }));
    fireEvent.click(screen.getByRole("button", { name: "Zoom out" }));
    expect(fit.textContent).toBe("85% · Fit");
    fireEvent.click(fit);
    expect(fit.textContent).toBe(start);
  });

  it("stops at the zoom limits", async () => {
    await openDialog();
    const zoomIn = screen.getByRole("button", { name: "Zoom in" });
    for (let i = 0; i < 10; i += 1) {
      fireEvent.click(zoomIn);
    }
    expect(zoomIn.hasAttribute("disabled")).toBe(true);
    expect(screen.getByRole("button", { name: /Fit$/ }).textContent).toBe(
      "200% · Fit"
    );
  });
});
