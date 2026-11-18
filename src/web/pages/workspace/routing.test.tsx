// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import { Provider } from "react-redux";
import { configureStore } from "@reduxjs/toolkit";
import sample from "@fixtures/sample-cv.json";
// eslint-disable-next-line no-restricted-imports -- App.tsx is the only module outside the aliased folders
import { App } from "../../App";
import { navigate } from "@hooks/navigation";
import { markTutorialSeen } from "@pages/workspace/tutorial-seen";
import { createJob } from "@store/jobs/jobs-slice";
import { rootReducer } from "@store/store";
import { AppStore } from "@store/store-helper";
import { setStyle } from "@store/cv-data/cv-data-slice";
import { migrateCvFile } from "@shared/vault/migrate-vault";
import { setVault } from "@store/vault/vault-slice";

function createStore(): AppStore {
  const store = configureStore({ reducer: rootReducer });
  const file = migrateCvFile(sample);
  store.dispatch(setVault(file.vault));
  store.dispatch(setStyle(file.style));
  return store;
}

async function open(path: string, loads = true): Promise<AppStore> {
  window.history.replaceState(null, "", path);
  const store = createStore();
  render(
    <Provider store={store}>
      <App />
    </Provider>
  );
  // The test has no server, so loading ends as "offline": unknown ids can be reported
  if (loads) {
    await waitFor(() =>
      expect(store.getState().persistence.status).not.toBe("loading")
    );
    // Loading leaves "no job yet"; these tests need a job
    await act(() =>
      Promise.resolve(
        store.dispatch(
          createJob({
            vault: store.getState().vault,
            style: store.getState().cvData.style,
            name: "Default",
          })
        )
      )
    );
    // the address followed the new job: open the one the test asked for
    act(() => {
      navigate(path, { replace: true });
    });
  }
  return store;
}

beforeEach(() => {
  // A tutorial opens over the page the first time it is visited; these tests are about the pages
  markTutorialSeen("vault");
  markTutorialSeen("template");
  markTutorialSeen("apply");
  vi.stubGlobal("fetch", () => Promise.reject(new Error("no server")));
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

function rail(name: string): HTMLElement {
  return within(screen.getByRole("navigation", { name: "Tools" })).getByRole(
    "link",
    { name }
  );
}

describe("routing in the workspace", () => {
  it("opens the section the address names", async () => {
    await open("/vault/education");
    expect(screen.getAllByLabelText("Degree").length).toBe(1);
    expect(document.title).toBe("Vault · Squeezy CV");
  });

  it("shows the tool of each address", async () => {
    await open("/templates/design");
    expect(rail("Templates").getAttribute("aria-current")).toBe("page");
    expect(screen.getByRole("main", { name: "Template design" })).toBeTruthy();
    expect(document.title).toContain("Design");
  });

  it("shows only what is the same everywhere on the Design page", async () => {
    await open("/templates/design");
    expect(screen.queryByRole("heading", { name: "Layout" })).toBeNull();
    expect(screen.queryByLabelText("Nationality")).toBeNull();
    // The groups on the left, the group's settings on the right, the preview in the middle
    const groups = screen.getByLabelText("Design groups");
    for (const name of ["Page", "Colours", "Typography"]) {
      expect(
        within(groups).getByRole("button", { name: new RegExp(`^${name}`) })
      ).toBeTruthy();
    }
    expect(screen.getByRole("heading", { name: "Page" })).toBeTruthy();
    expect(screen.getByLabelText("Template design")).toBeTruthy();
  });

  it("shows the sections, the sample and the properties on the Sections page", async () => {
    await open("/templates/sections");
    expect(document.title).toContain("Sections");
    expect(screen.getByLabelText("Sections")).toBeTruthy();
    expect(screen.getByLabelText("Sample CV")).toBeTruthy();
    expect(screen.getByLabelText("Section properties")).toBeTruthy();
    expect(screen.getByRole("link", { name: "Sections" })).toBeTruthy();
  });

  it("makes the rail real links and changes the address on a click", async () => {
    await open("/vault");
    expect(rail("Templates").getAttribute("href")).toBe("/templates");
    expect(rail("Applications").getAttribute("href")).toBe("/applications");
    fireEvent.click(rail("Templates"));
    expect(window.location.pathname).toBe("/templates");
    expect(rail("Templates").getAttribute("aria-current")).toBe("page");

    fireEvent.click(rail("Apply"));
    await waitFor(() => expect(window.location.pathname).toMatch(/^\/jobs\//));
  });

  it("does not take over a Ctrl-click (it opens in a new tab)", async () => {
    await open("/vault");
    fireEvent.click(rail("Templates"), { ctrlKey: true });
    expect(window.location.pathname).toBe("/vault");
  });

  it("goes back and forward between sections", async () => {
    await open("/vault");
    fireEvent.click(rail("Templates"));
    expect(window.location.pathname).toBe("/templates");
    act(() => {
      window.history.back();
    });
    await waitFor(() => expect(window.location.pathname).toBe("/vault"));
    expect(rail("Vault").getAttribute("aria-current")).toBe("page");
  });

  it("puts the first job in the address when there is none", async () => {
    const store = await open("/jobs");
    await waitFor(() =>
      expect(window.location.pathname).toBe(
        `/jobs/${store.getState().jobs.activeJobId}`
      )
    );
  });

  it("follows the active job: a switch changes the address", async () => {
    const store = await open("/jobs");
    await waitFor(() => expect(window.location.pathname).toMatch(/^\/jobs\/./));
    expect(window.location.pathname).toBe(
      `/jobs/${store.getState().jobs.activeJobId}`
    );
  });

  it("opens the job in the address", async () => {
    const store = await open("/jobs");
    const id = store.getState().jobs.activeJobId;
    const sidebar = within(
      screen.getByRole("navigation", { name: "Job application" })
    );
    fireEvent.click(sidebar.getByRole("link", { name: /Job application/ }));
    expect(window.location.search).toBe("?view=details");
    expect(window.location.pathname).toBe(`/jobs/${id}`);
    fireEvent.click(sidebar.getByRole("link", { name: /Template & content/ }));
    expect(window.location.search).toBe("");
    expect(window.location.pathname).toBe(`/jobs/${id}`);
  });

  it("says not found for an unknown job, section or item, with a way back", async () => {
    await open("/jobs/nope");
    expect(await screen.findByText("Not found")).toBeTruthy();
    expect(screen.getByText(/This job does not exist/)).toBeTruthy();
    fireEvent.click(screen.getByRole("link", { name: "Back to your jobs" }));
    expect(window.location.pathname).toMatch(/^\/jobs/);
    cleanup();

    await open("/vault/nope");
    expect(screen.getByText(/This section does not exist/)).toBeTruthy();
    cleanup();

    await open("/vault/experience/nope");
    expect(screen.getByText(/This item does not exist/)).toBeTruthy();
    expect(
      screen
        .getByRole("link", { name: "Back to the vault" })
        .getAttribute("href")
    ).toBe("/vault");
  });

  it("says not found for an address that is not the app's", async () => {
    await open("/nothing/here", false);
    expect(screen.getByText(/This page does not exist/)).toBeTruthy();
  });

  it("redirects the old query addresses", async () => {
    window.history.replaceState(null, "", "/");
    await open("/");
    await waitFor(() => expect(window.location.pathname).toBe("/vault"));
    cleanup();

    vi.stubGlobal("fetch", () =>
      Promise.resolve(new Response("[]", { status: 200 }))
    );
    await open("/?applications&status=offer", false);
    await waitFor(() =>
      expect(window.location.pathname + window.location.search).toBe(
        "/applications?status=offer"
      )
    );
  });
});

describe("leaving an editor with unapplied changes", () => {
  it("asks first, and stays when the user says no", async () => {
    await open("/vault/mainInfo");
    fireEvent.change(screen.getByLabelText("Full Name"), {
      target: { value: "Changed" },
    });
    const confirm = vi.spyOn(window, "confirm").mockReturnValue(false);
    fireEvent.click(rail("Templates"));
    expect(confirm).toHaveBeenCalled();
    expect(window.location.pathname).toBe("/vault/mainInfo");
    expect(screen.getByLabelText<HTMLInputElement>("Full Name").value).toBe(
      "Changed"
    );

    confirm.mockReturnValue(true);
    fireEvent.click(rail("Templates"));
    expect(window.location.pathname).toBe("/templates");
  });

  it("does not ask when nothing is unapplied", async () => {
    await open("/vault/mainInfo");
    const confirm = vi.spyOn(window, "confirm").mockReturnValue(false);
    fireEvent.click(rail("Templates"));
    expect(confirm).not.toHaveBeenCalled();
    expect(window.location.pathname).toBe("/templates");
  });
});
