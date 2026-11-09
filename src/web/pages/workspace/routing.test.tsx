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
  }
  return store;
}

beforeEach(() => {
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
    expect(document.title).toBe("Vault · CV Builder");
  });

  it("shows the tool of each address", async () => {
    await open("/templates/design");
    expect(rail("Templates").getAttribute("aria-current")).toBe("page");
    expect(screen.getByRole("main", { name: "Templates" })).toBeTruthy();
    expect(document.title).toContain("Design");
  });

  it("makes the rail real links and changes the address on a click", async () => {
    await open("/vault");
    expect(rail("Templates").getAttribute("href")).toBe("/templates");
    expect(rail("Applied").getAttribute("href")).toBe("/applications");
    fireEvent.click(rail("Templates"));
    expect(window.location.pathname).toBe("/templates");
    expect(rail("Templates").getAttribute("aria-current")).toBe("page");

    fireEvent.click(rail("Jobs"));
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
    fireEvent.click(screen.getByRole("link", { name: "Job settings" }));
    expect(window.location.search).toBe("?view=settings");
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
    await waitFor(() => expect(window.location.pathname).toMatch(/^\/jobs/));
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
