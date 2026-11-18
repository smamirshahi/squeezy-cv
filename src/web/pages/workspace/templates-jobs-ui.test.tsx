// @vitest-environment jsdom
import { afterEach, describe, expect, it } from "vitest";
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
import { TemplateDesignPage } from "@pages/workspace/template-design-page";
import { Inspector } from "@pages/workspace/inspector";
import { JobSwitcher } from "@pages/workspace/job-switcher";
import { TemplatesPage } from "@pages/workspace/templates-page";
import { deleteBlockReason } from "@pages/workspace/templates-page";
import {
  jobCountText,
  nextTemplateName,
} from "@pages/workspace/template-scope";
import { useSyncActiveJob } from "@hooks/use-sync-active-job";
import { setSelectedBlock, updatePageStructure } from "@store/app/app-slice";
import { rootReducer } from "@store/store";
import { AppStore } from "@store/store-helper";
import {
  activeVariantSelector,
  addTemplate,
  createJob,
  setJobTemplate,
  setPageLimit,
  variantsSelector,
} from "@store/jobs/jobs-slice";
import { setVault } from "@store/vault/vault-slice";
import { migrateCvFile } from "@shared/vault/migrate-vault";
import { Template } from "@custom-types/template-types";

afterEach(cleanup);

const file = migrateCvFile(sample);

function Frame({ children }: { children: JSX.Element }): JSX.Element {
  useSyncActiveJob();
  return children;
}

function setup(content: JSX.Element): AppStore {
  // creating a template navigates to its Sections tab: start every test on the list
  window.history.replaceState({}, "", "/templates");
  const store: AppStore = configureStore({ reducer: rootReducer });
  store.dispatch(setVault(file.vault));
  render(
    <Provider store={store}>
      <Frame>{content}</Frame>
    </Provider>
  );
  return store;
}

/** Adds a job (and a template when `templateName` is given) as the app would */
function addJob(
  store: AppStore,
  id: string,
  templateId?: string,
  templateName?: string
): void {
  act(() => {
    if (templateName && templateId) {
      store.dispatch(addTemplate({ id: templateId, name: templateName }));
    }
    store.dispatch(
      createJob({
        vault: store.getState().vault,
        style: store.getState().cvData.style,
        name: id,
        id,
        templateId,
      })
    );
  });
}

const jobs = (store: AppStore) => store.getState().jobs.jobs;
const templates = (store: AppStore) => store.getState().jobs.templates;

async function closed(): Promise<void> {
  await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
}

describe("job switcher", () => {
  it("shows the active job and its template next to it, both labelled", () => {
    setup(<JobSwitcher />);
    expect(screen.getByLabelText("Switch job").textContent).toBe("Default");
    expect(screen.getByLabelText("Template of this job").textContent).toBe(
      "Template 1"
    );
  });

  it("switches the job being edited and loads its template's look into the editor", () => {
    const store = setup(<JobSwitcher />);
    addJob(store, "acme", "t2", "Template 2");
    const two = templates(store)[1];
    act(() => {
      store.dispatch(
        updatePageStructure({
          fullWidth: ["personalInfo"],
          left: [],
          right: [],
        })
      );
    });
    expect(store.getState().jobs.activeJobId).toBe("acme");
    expect(two.id).toBe("t2");

    fireEvent.mouseDown(screen.getByLabelText("Switch job"));
    fireEvent.click(screen.getByRole("option", { name: "Default" }));
    expect(store.getState().jobs.activeJobId).toBe("default");
    // the template of "Default" kept its own layout
    expect(store.getState().app.structure).toEqual(templates(store)[0].layout);
    expect(screen.getByLabelText("Template of this job").textContent).toBe(
      "Template 1"
    );
  });

  it("changes the template of the job and shows the new template's look", () => {
    const store = setup(<JobSwitcher />);
    addJob(store, "acme", "t2", "Template 2");
    act(() => {
      store.dispatch(
        updatePageStructure({
          fullWidth: ["personalInfo"],
          left: [],
          right: [],
        })
      );
    });
    // the job "acme" is active on Template 2 with a changed layout; move "default" there
    fireEvent.mouseDown(screen.getByLabelText("Switch job"));
    fireEvent.click(screen.getByRole("option", { name: "Default" }));

    fireEvent.mouseDown(screen.getByLabelText("Template of this job"));
    fireEvent.click(screen.getByRole("option", { name: /Template 2/ }));

    expect(jobs(store).find((j) => j.id === "default")?.templateId).toBe("t2");
    expect(store.getState().app.structure.fullWidth).toEqual(["personalInfo"]);
    expect(screen.getByLabelText("Template of this job").textContent).toBe(
      "Template 2"
    );
    // the job's own choices are kept
    expect(jobs(store).find((j) => j.id === "default")?.selection).toEqual({});
  });

  it("lists how many jobs use each template in the template menu", () => {
    const store = setup(<JobSwitcher />);
    addJob(store, "acme");
    fireEvent.mouseDown(screen.getByLabelText("Template of this job"));
    expect(
      within(screen.getByRole("listbox")).getByText("2 jobs")
    ).toBeTruthy();
  });
});

describe("new job", () => {
  function fill(name: string): void {
    fireEvent.click(screen.getByRole("button", { name: "New job" }));
    fireEvent.change(screen.getByLabelText("New job name"), {
      target: { value: name },
    });
  }

  it("needs a name, and shares the current template by default", async () => {
    const store = setup(<JobSwitcher />);
    fireEvent.click(screen.getByRole("button", { name: "New job" }));
    expect(
      screen
        .getByRole("button", { name: "Create job" })
        .hasAttribute("disabled")
    ).toBe(true);
    fireEvent.change(screen.getByLabelText("New job name"), {
      target: { value: "Acme, Frontend" },
    });
    expect(screen.getByText(/Shared with 1 job/)).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Create job" }));
    await closed();

    expect(jobs(store)).toHaveLength(2);
    expect(templates(store)).toHaveLength(1);
    const created = jobs(store)[1];
    expect(created.name).toBe("Acme, Frontend");
    expect(created.templateId).toBe(templates(store)[0].id);
    expect(store.getState().jobs.activeJobId).toBe(created.id);

    // a style change in the template reaches both jobs
    act(() => {
      store.dispatch(setPageLimit({ id: created.id, pageLimit: 1 }));
    });
    expect(variantsSelector(store.getState()).map((v) => v.pageLimit)).toEqual([
      1, 1,
    ]);
  });

  it("can use another existing template", async () => {
    const store = setup(<JobSwitcher />);
    addJob(store, "acme", "t2", "Template 2");
    fill("Third");
    fireEvent.mouseDown(screen.getByLabelText("Template"));
    fireEvent.click(screen.getByRole("option", { name: /Template 1/ }));
    fireEvent.click(screen.getByRole("button", { name: "Create job" }));
    await closed();
    expect(jobs(store).find((j) => j.name === "Third")?.templateId).toBe(
      templates(store)[0].id
    );
    expect(templates(store)).toHaveLength(2);
  });

  it("offers a separate new template, named Template N by default", async () => {
    const store = setup(<JobSwitcher />);
    fill("Acme");
    fireEvent.mouseDown(screen.getByLabelText("Template"));
    fireEvent.click(screen.getByRole("option", { name: "New template…" }));
    expect(
      screen.getByLabelText<HTMLInputElement>("New template name").value
    ).toBe("Template 2");
    fireEvent.change(screen.getByLabelText("New template name"), {
      target: { value: "Compact" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Create job" }));
    await closed();

    expect(templates(store).map((t) => t.name)).toEqual([
      "Template 1",
      "Compact",
    ]);
    const created = jobs(store).find((j) => j.name === "Acme")!;
    expect(created.templateId).toBe(templates(store)[1].id);
    // the first job stays on its template
    expect(jobs(store)[0].templateId).toBe(templates(store)[0].id);
  });

  it("starts again from the job being edited each time it opens", async () => {
    const store = setup(<JobSwitcher />);
    fill("First");
    fireEvent.mouseDown(screen.getByLabelText("Template"));
    fireEvent.click(screen.getByRole("option", { name: "New template…" }));
    fireEvent.click(screen.getByRole("button", { name: "Create job" }));
    await closed();
    expect(templates(store)).toHaveLength(2);

    // the second job shares the template of the first one (the job being edited now)
    fill("Second");
    expect(screen.getByLabelText("New job name")).toHaveProperty(
      "value",
      "Second"
    );
    fireEvent.click(screen.getByRole("button", { name: "Create job" }));
    await closed();
    expect(templates(store)).toHaveLength(2);
    expect(jobs(store).find((j) => j.name === "Second")?.templateId).toBe(
      templates(store)[1].id
    );

    // and the name of the earlier job is not left in the field
    fireEvent.click(screen.getByRole("button", { name: "New job" }));
    expect(screen.getByLabelText("New job name")).toHaveProperty("value", "");
  });

  it("makes nothing when cancelled", async () => {
    const store = setup(<JobSwitcher />);
    fill("Acme");
    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
    await closed();
    expect(jobs(store)).toHaveLength(1);
  });
});

describe("templates page", () => {
  function users(store: AppStore): void {
    addJob(store, "acme");
    addJob(store, "beta", "t2", "Template 2");
  }

  it("lists templates with their jobs and counts", () => {
    const store = setup(<TemplatesPage />);
    users(store);
    const list = screen.getByRole("list", { name: "Templates" });
    const rows = within(list).getAllByRole("listitem");
    expect(rows).toHaveLength(2);
    const rowOf = (name: string): HTMLElement =>
      rows.find((row) => within(row).queryByText(name))!;

    const first = rowOf("Template 1");
    fireEvent.click(
      within(first).getByRole("button", {
        name: "2 jobs prepared with this template",
      })
    );
    expect(within(first).getByText("Default")).toBeTruthy();
    expect(within(first).getByText("acme")).toBeTruthy();
    expect(
      within(rowOf("Template 2")).getByRole("button", {
        name: "1 job prepared with this template",
      })
    ).toBeTruthy();
  });

  it("creates a template from the active look, named by default, and opens its Sections tab", () => {
    const store = setup(<TemplatesPage />);
    fireEvent.click(screen.getByRole("button", { name: "New template" }));
    // one form at a time: New and the card buttons are off while it is open
    expect(
      screen
        .getByRole("button", { name: "New template" })
        .hasAttribute("disabled")
    ).toBe(true);
    expect(
      screen
        .getByRole("button", { name: "Rename template Template 1" })
        .hasAttribute("disabled")
    ).toBe(true);
    fireEvent.click(screen.getByRole("button", { name: "Create template" }));
    expect(templates(store).map((t) => t.name)).toEqual([
      "Template 1",
      "Template 2",
    ]);
    expect(window.location.pathname).toBe(
      `/templates/${templates(store)[1].id}/sections`
    );
    expect(screen.queryByRole("form", { name: "New template" })).toBeNull();
  });

  it("creates a template with the name typed, as a copy of the active look", () => {
    const store = setup(<TemplatesPage />);
    fireEvent.click(screen.getByRole("button", { name: "New template" }));
    fireEvent.change(screen.getByLabelText("Name"), {
      target: { value: "Two columns" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Create template" }));
    expect(templates(store)[1].name).toBe("Two columns");
    expect(templates(store)[1].layout).toEqual(templates(store)[0].layout);
    expect(jobs(store)).toHaveLength(1);
  });

  it("cancels a new template with Escape or Cancel, and creates nothing", () => {
    const store = setup(<TemplatesPage />);
    fireEvent.click(screen.getByRole("button", { name: "New template" }));
    fireEvent.keyDown(screen.getByLabelText("Name"), { key: "Escape" });
    expect(screen.queryByRole("form", { name: "New template" })).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "New template" }));
    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
    expect(screen.queryByRole("form", { name: "New template" })).toBeNull();
    expect(templates(store)).toHaveLength(1);
  });

  it("does not accept a name another template already has", () => {
    const store = setup(<TemplatesPage />);
    fireEvent.click(screen.getByRole("button", { name: "New template" }));
    fireEvent.change(screen.getByLabelText("Name"), {
      target: { value: "template 1" },
    });
    expect(screen.getByRole("alert").textContent).toContain("already exists");
    expect(
      screen
        .getByRole("button", { name: "Create template" })
        .hasAttribute("disabled")
    ).toBe(true);
    expect(templates(store)).toHaveLength(1);
  });

  it("duplicates a template without moving any job", () => {
    const store = setup(<TemplatesPage />);
    fireEvent.click(
      screen.getByRole("button", { name: "Duplicate template Template 1" })
    );
    expect(templates(store).map((t) => t.name)).toEqual([
      "Template 1",
      "Template 1 (copy)",
    ]);
    expect(jobs(store)[0].templateId).toBe(templates(store)[0].id);
  });

  it("renames a template and its subtitle in place", () => {
    const store = setup(<TemplatesPage />);
    fireEvent.click(
      screen.getByRole("button", { name: "Rename template Template 1" })
    );
    fireEvent.change(screen.getByLabelText("Name"), {
      target: { value: "Classic" },
    });
    fireEvent.change(screen.getByLabelText("Subtitle (optional)"), {
      target: { value: "Plain and short" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Rename" }));
    expect(templates(store)[0].name).toBe("Classic");
    expect(templates(store)[0].subtitle).toBe("Plain and short");
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(
      screen.getByRole("button", { name: "Rename template Classic" })
    ).toBeTruthy();
  });

  it("cancels a rename with Escape and keeps the old name", () => {
    const store = setup(<TemplatesPage />);
    fireEvent.click(
      screen.getByRole("button", { name: "Rename template Template 1" })
    );
    fireEvent.change(screen.getByLabelText("Name"), {
      target: { value: "Changed" },
    });
    fireEvent.keyDown(screen.getByLabelText("Name"), { key: "Escape" });
    expect(templates(store)[0].name).toBe("Template 1");
    expect(screen.queryByRole("form", { name: "Rename template" })).toBeNull();
  });

  it("does not accept an empty name", () => {
    setup(<TemplatesPage />);
    fireEvent.click(
      screen.getByRole("button", { name: "Rename template Template 1" })
    );
    fireEvent.change(screen.getByLabelText("Name"), {
      target: { value: "  " },
    });
    expect(
      screen.getByRole("button", { name: "Rename" }).hasAttribute("disabled")
    ).toBe(true);
  });

  it("deletes a template jobs use by moving them to the chosen template", async () => {
    const store = setup(<TemplatesPage />);
    users(store);
    act(() => {
      store.dispatch(addTemplate({ id: "spare", name: "Spare" }));
    });
    const button = screen.getByRole("button", {
      name: "Delete template Template 1",
    });
    expect(button.hasAttribute("disabled")).toBe(false);
    fireEvent.click(button);
    expect(screen.getByText(/2 jobs use it/)).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Delete template" }));
    await closed();
    expect(templates(store).map((t) => t.name)).not.toContain("Template 1");
    expect(
      jobs(store).every((j) =>
        templates(store).some((t) => t.id === j.templateId)
      )
    ).toBe(true);
  });

  it("deletes an unused template only after confirming", async () => {
    const store = setup(<TemplatesPage />);
    act(() => {
      store.dispatch(addTemplate({ id: "spare", name: "Spare" }));
    });
    const button = screen.getByRole("button", {
      name: "Delete template Spare",
    });
    expect(button.hasAttribute("disabled")).toBe(false);
    fireEvent.click(button);
    expect(templates(store)).toHaveLength(2);
    fireEvent.click(screen.getByRole("button", { name: "Delete template" }));
    await closed();
    expect(templates(store).map((t) => t.id)).not.toContain("spare");
  });

  it("explains the reasons in words", () => {
    expect(deleteBlockReason(1)).toContain("only template");
    expect(deleteBlockReason(2)).toBe("");
    expect(jobCountText(1)).toBe("1 job");
    expect(jobCountText(0)).toBe("0 jobs");
    const named = [
      { name: "Template 1" },
      { name: "Template 3" },
    ] as Template[];
    expect(nextTemplateName(named)).toBe("Template 4");
    expect(nextTemplateName([{ name: "Template 2" }] as Template[])).toBe(
      "Template 3"
    );
  });
});

describe("inspector and style settings say what they change", () => {
  it("with nothing selected, the page settings change the template, shared by N jobs", () => {
    const store = setup(<Inspector />);
    expect(
      screen.getByText("Changes template “Template 1”, used by 1 job.")
    ).toBeTruthy();
    addJob(store, "acme");
    expect(
      screen.getByText("Changes template “Template 1”, used by 2 jobs.")
    ).toBeTruthy();

    // the layout buttons change the template, so both jobs follow
    fireEvent.click(screen.getByRole("button", { name: "Two columns" }));
    expect(
      new Set(
        variantsSelector(store.getState()).map((v) => JSON.stringify(v.layout))
      ).size
    ).toBe(1);
    // moving the job to its own template changes the wording
    act(() => {
      store.dispatch(addTemplate({ id: "own", name: "Own" }));
      store.dispatch(setJobTemplate({ jobId: "acme", templateId: "own" }));
    });
    expect(
      screen.getByText("Changes template “Own”, used by 1 job.")
    ).toBeTruthy();
  });

  it("with an item selected, the controls change only the job", () => {
    const store = setup(<Inspector />);
    addJob(store, "acme");
    const section = file.vault.sections.find((s) => s.type === "experience")!;
    act(() => {
      store.dispatch(
        setSelectedBlock({
          sectionId: section.id,
          itemId: section.items[0].id,
        })
      );
    });
    expect(screen.getByRole("tab", { name: "This job" })).toBeTruthy();
    expect(
      screen.getByText(/Item controls change only the job “acme”/)
    ).toBeTruthy();
    expect(screen.queryByText(/Changes template/)).toBeNull();

    fireEvent.click(screen.getByRole("button", { name: "Shown" }));
    const [first, second] = variantsSelector(store.getState());
    expect(first.selection[section.items[0].id]).toBeUndefined();
    expect(second.selection[section.items[0].id].isVisible).toBe(false);
  });

  it("a selected skills section says its display belongs to the template", () => {
    const store = setup(<Inspector />);
    addJob(store, "acme");
    const skills = file.vault.sections.find((s) => s.type === "skills")!;
    act(() => {
      store.dispatch(setSelectedBlock({ sectionId: skills.id }));
    });
    expect(
      screen.getByText(
        "Skill display changes template “Template 1”, used by 2 jobs."
      )
    ).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Bars" }));
    expect(
      variantsSelector(store.getState()).map((v) => v.skillDisplay)
    ).toEqual(["bars", "bars"]);
    expect(activeVariantSelector(store.getState()).skillDisplay).toBe("bars");
  });

  it("a style change on the Style Settings page reaches every job on the template", () => {
    const store = setup(<TemplateDesignPage templateId="t1" />);
    addJob(store, "acme");
    // Typography is a group of the Design tab; one text style is open at a time
    fireEvent.click(screen.getByRole("button", { name: /^Typography/ }));
    const row = document.querySelector<HTMLElement>(
      '[data-style-row="bodyMd"]'
    );
    fireEvent.click(within(row!).getAllByRole("button")[0]);
    fireEvent.click(screen.getByLabelText("Increase bodyMd size"));
    const sizes = variantsSelector(store.getState()).map(
      (v) => v.style.typography.bodyMd.fontSize
    );
    expect(sizes).toEqual(["11pt", "11pt"]);
  });
});
