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
  { variantId: "v1", company: "Acme Ltd", role: "Senior Dev" },
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
        s.variants.variants
      )
    )
  );
  return store;
}

async function openDialog(): Promise<void> {
  render(
    <Provider store={readyStore()}>
      <ExportDialog isOpen onClose={() => undefined} />
    </Provider>
  );
  await waitFor(() =>
    expect(
      screen.getByRole("button", {
        name: "Download PDF",
      }).disabled
    ).toBe(false)
  );
}

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
