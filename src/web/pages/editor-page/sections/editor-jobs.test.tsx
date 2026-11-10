// @vitest-environment jsdom
import { afterEach, describe, expect, it } from "vitest";
import {
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
import { rootReducer } from "@store/store";
import { AppStore } from "@store/store-helper";
import { setStyle } from "@store/cv-data/cv-data-slice";
import { setVault } from "@store/vault/vault-slice";
import { setVariants, variantsSelector } from "@store/jobs/jobs-slice";
import { createDefaultVariant } from "@shared/variant/variant-utils";
import { migrateCvFile } from "@shared/vault/migrate-vault";
import { EditorPageStructure } from "@pages/editor-page/sections/editor-page-structure/editor-page-structure";
import { DragEndEvent } from "@dnd-kit/core";
import { getItemLabel, shorten } from "@shared/variant/item-label";
import { getDropIndex } from "@pages/editor-page/sections/job-section-items";
import { EditorJobs } from "@pages/editor-page/sections/editor-jobs";
import { useSyncActiveJob } from "@hooks/use-sync-active-job";
import { updatePageStructure } from "@store/app/app-slice";
import { act } from "@testing-library/react";

afterEach(() => {
  cleanup();
  window.localStorage.clear();
});

function Page(): JSX.Element {
  useSyncActiveJob();
  return <EditorJobs />;
}

function makeStore(): AppStore {
  const store = configureStore({ reducer: rootReducer });
  const file = migrateCvFile(sample);
  store.dispatch(setVault(file.vault));
  store.dispatch(setStyle(file.style));
  store.dispatch(setVariants([createDefaultVariant(file, "v1", undefined)]));
  return store;
}

function show(store: AppStore): void {
  render(
    <Provider store={store}>
      <Page />
    </Provider>
  );
}

function showLayout(store: AppStore): void {
  render(
    <Provider store={store}>
      <LayoutPage />
    </Provider>
  );
}

function LayoutPage(): JSX.Element {
  useSyncActiveJob();
  return <EditorPageStructure />;
}

/** Uses the "New job" dialog; the job shares the current template unless `hasNewTemplate` */
async function createJob(name: string, hasNewTemplate = false): Promise<void> {
  fireEvent.click(screen.getByRole("button", { name: "New job" }));
  fireEvent.change(screen.getByLabelText("New job name"), {
    target: { value: name },
  });
  if (hasNewTemplate) {
    fireEvent.mouseDown(screen.getByLabelText("Template"));
    fireEvent.click(screen.getByRole("option", { name: "New template…" }));
  }
  fireEvent.click(screen.getByRole("button", { name: "Create job" }));
  await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
}

describe("EditorJobs", () => {
  it("creates, duplicates, switches and renames jobs", async () => {
    const store = makeStore();
    show(store);

    await createJob("Second");
    expect(variantsSelector(store.getState())).toHaveLength(2);

    fireEvent.change(screen.getByLabelText("Job name"), {
      target: { value: "Acme" },
    });
    expect(variantsSelector(store.getState())[1].name).toBe("Acme");

    fireEvent.click(screen.getByRole("button", { name: "Duplicate job" }));
    const variants = variantsSelector(store.getState());
    const activeId = store.getState().jobs.activeJobId;
    expect(variants).toHaveLength(3);
    expect(variants[2].name).toBe("Acme (copy)");
    expect(activeId).toBe(variants[2].id);
  });

  it("deletes only after confirming, and never the last job", async () => {
    const store = makeStore();
    show(store);
    expect(
      screen
        .getByRole("button", { name: "Delete job" })
        .hasAttribute("disabled")
    ).toBe(true);

    await createJob("Second");
    fireEvent.click(screen.getByRole("button", { name: "Delete job" }));
    expect(variantsSelector(store.getState())).toHaveLength(2);

    fireEvent.click(screen.getAllByRole("button", { name: "Delete" }).pop()!);
    expect(variantsSelector(store.getState())).toHaveLength(1);
    expect(store.getState().jobs.activeJobId).toBe("v1");
  });

  it("hides an item in the active variant only, without touching the vault", () => {
    const store = makeStore();
    show(store);
    const vaultBefore = JSON.stringify(store.getState().vault);
    const row = screen.getAllByTestId("job-content-item")[0];

    // the eye of the first entry
    fireEvent.click(within(row).getByRole("button", { name: /^Hide / }));

    const selection = variantsSelector(store.getState())[0].selection;
    expect(Object.values(selection).some((s) => s.isVisible === false)).toBe(
      true
    );
    expect(JSON.stringify(store.getState().vault)).toBe(vaultBefore);
  });

  it("writes layout and style edits to the template of the active job, which other jobs on it share", async () => {
    const store = makeStore();
    show(store);
    // a new job shares the template of the current one by default
    await createJob("Second");
    expect(store.getState().jobs.templates).toHaveLength(1);
    const style = {
      ...store.getState().cvData.style,
      paperMargin: "narrow" as const,
    };
    const jobsBefore = store.getState().jobs.jobs;
    act(() => {
      store.dispatch(setStyle(style));
    });
    const after = store.getState().jobs;
    expect(after.templates[0].style.paperMargin).toBe("narrow");
    // only the template changed: the jobs are the same objects
    expect(after.jobs).toBe(jobsBefore);
    expect(
      variantsSelector(store.getState()).map((v) => v.style.paperMargin)
    ).toEqual(["narrow", "narrow"]);
  });

  it("keeps the page layout per template: a job on a new template has its own", async () => {
    const store = makeStore();
    show(store);
    const custom = { fullWidth: ["personalInfo"], left: [], right: [] };

    act(() => {
      store.dispatch(updatePageStructure(custom));
    });
    expect(variantsSelector(store.getState())[0].layout).toEqual(custom);

    await createJob("Second", true);
    expect(store.getState().jobs.templates).toHaveLength(2);
    act(() => {
      store.dispatch(
        updatePageStructure({
          fullWidth: [],
          left: ["personalInfo"],
          right: [],
        })
      );
    });
    // the first variant kept its own layout
    expect(variantsSelector(store.getState())[0].layout).toEqual(custom);

    // switching back loads it into the editor
    fireEvent.mouseDown(screen.getByLabelText("Active job"));
    fireEvent.click(screen.getAllByRole("option")[0]);
    expect(store.getState().app.structure).toEqual(custom);
  });
});

describe("tabs, sections and the explainer", () => {
  it("shows the content and leaves layout to the Templates tool", () => {
    const store = makeStore();
    show(store);
    expect(screen.getByText("What appears on this CV")).toBeTruthy();
    expect(screen.queryByRole("tab", { name: /Sections & layout/ })).toBeNull();
    expect(screen.queryByText("1 · Pick a page layout")).toBeNull();
  });

  it("leaves showing a section to the template: no switch on the Content tab", () => {
    const store = makeStore();
    show(store);
    expect(screen.queryByRole("switch", { name: /Show section/ })).toBeNull();
    expect(
      variantsSelector(store.getState())[0].hiddenSections
    ).toBeUndefined();
  });

  it("removes a section with the bin and brings it back with Add section, not in the vault", () => {
    const store = makeStore();
    showLayout(store);
    const vaultBefore = JSON.stringify(store.getState().vault);
    // nothing is removed yet, so there is nothing to add back
    expect(screen.queryByRole("button", { name: "Add section" })).toBeNull();

    fireEvent.click(
      screen.getByRole("button", { name: "Remove Education from this job" })
    );
    expect(variantsSelector(store.getState())[0].hiddenSections).toEqual([
      "education",
    ]);
    expect(screen.queryByText("Not included")).toBeNull();
    expect(screen.queryByRole("listitem", { name: /Education/ })).toBeNull();
    expect(JSON.stringify(store.getState().vault)).toBe(vaultBefore);

    fireEvent.click(screen.getByRole("button", { name: "Add section" }));
    fireEvent.click(screen.getByRole("menuitem", { name: "Education" }));
    expect(variantsSelector(store.getState())[0].hiddenSections ?? []).toEqual(
      []
    );
    expect(screen.queryByRole("button", { name: "Add section" })).toBeNull();
  });

  it("moves a section down with its arrow button, which writes the template layout", () => {
    const store = makeStore();
    showLayout(store);
    const before = store.getState().app.structure.fullWidth;
    const index = before.indexOf("experience");
    fireEvent.click(
      screen.getByRole("button", { name: "Move Work Experience down" })
    );
    const after = store.getState().app.structure.fullWidth;
    expect(after.indexOf("experience")).toBe(index + 1);
    expect(variantsSelector(store.getState())[0].layout.fullWidth).toEqual(
      after
    );
  });

  it("can close the explainer and bring it back", () => {
    const store = makeStore();
    show(store);
    expect(screen.getByText("How jobs work")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Got it" }));
    expect(screen.queryByText("How jobs work")).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "What is a job?" }));
    expect(screen.getByText("How jobs work")).toBeTruthy();
  });
});

describe("layout templates", () => {
  it("switches between the single-column and two-column template", () => {
    const store = makeStore();
    render(
      <Provider store={store}>
        <EditorPageStructure />
      </Provider>
    );

    fireEvent.click(screen.getByRole("radio", { name: /Two columns/ }));
    expect(store.getState().app.structure.left).toEqual(["experience"]);

    fireEvent.click(screen.getByRole("radio", { name: /Single column/ }));
    const { fullWidth, left, right } = store.getState().app.structure;
    expect(left).toEqual([]);
    expect(right).toEqual([]);
    expect(fullWidth).toContain("experience");
  });

  it("starts new variants as one column", () => {
    const layout = createDefaultVariant(migrateCvFile(sample), "x").layout;
    expect(layout.left).toEqual([]);
    expect(layout.right).toEqual([]);
    expect(layout.fullWidth.slice(0, 2)).toEqual([
      "personalInfo",
      "contactInfo",
    ]);
  });
});

describe("reordering", () => {
  it("moves a bullet down with the arrow buttons, in the active variant only", () => {
    const store = makeStore();
    show(store);

    const item = store
      .getState()
      .vault.sections.flatMap((s) => s.items)
      .find((i) => i.bullets.length >= 2);
    if (!item) {
      throw new Error("fixture needs an item with two bullets");
    }
    // bullets are listed once their item is expanded
    fireEvent.click(
      screen.getByRole("button", {
        name: new RegExp(`^Expand ${getItemLabel(item).slice(0, 20)}`),
      })
    );
    // the first bullet's "down" arrow: bullets come after their item's own arrows
    const label = shorten(item.bullets[0].text);
    // go up from the bullet's text to the row that holds its arrows
    let row: HTMLElement | null = screen.getByText(label);
    while (row && !row.querySelector('[data-testid="ArrowDownwardIcon"]')) {
      row = row.parentElement;
    }
    const down = row?.querySelector('[data-testid="ArrowDownwardIcon"]');
    fireEvent.click(down!.closest("button")!);

    const orders = variantsSelector(store.getState())[0].selection[item.id]
      .bullets;
    expect(orders?.[item.bullets[0].id].order).toBe(1);
    expect(orders?.[item.bullets[1].id].order).toBe(0);
  });

  it("works out the drop index of a drag", () => {
    const ids = ["a", "b", "c"];
    function event(active: string, over: string | null): DragEndEvent {
      return {
        active: { id: active },
        over: over === null ? null : { id: over },
      } as DragEndEvent;
    }
    expect(getDropIndex(ids, event("a", "c"))).toBe(2);
    expect(getDropIndex(ids, event("c", "a"))).toBe(0);
    expect(getDropIndex(ids, event("a", "a"))).toBeNull();
    expect(getDropIndex(ids, event("a", null))).toBeNull();
    expect(getDropIndex(ids, event("a", "zzz"))).toBeNull();
  });

  it("has a drag handle for every item and bullet", () => {
    const store = makeStore();
    show(store);
    // bullets are listed once their item is expanded
    for (const button of screen.queryAllByRole("button", {
      name: /^Expand /,
    })) {
      fireEvent.click(button);
    }
    const total = store
      .getState()
      .vault.sections.reduce(
        (sum, s) => sum + s.items.reduce((n, i) => n + 1 + i.bullets.length, 0),
        0
      );
    expect(screen.getAllByLabelText("Drag to reorder")).toHaveLength(total);
  });
});
