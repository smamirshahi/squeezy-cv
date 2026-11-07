// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, render, screen } from "@testing-library/react";
import { Provider } from "react-redux";
import { configureStore } from "@reduxjs/toolkit";
import sample from "@fixtures/sample-cv.json";
import { Inspector } from "@pages/workspace/inspector";
import { JobSwitcher } from "@pages/workspace/job-switcher";
import { TemplatesPage } from "@pages/workspace/templates-page";
import { Outline } from "@pages/workspace/outline";
import { rootReducer } from "@store/store";
import { AppStore } from "@store/store-helper";
import {
  activeVariantSelector,
  createJob,
  deleteJob,
  renameJob,
  setPageLimit,
} from "@store/jobs/jobs-slice";
import { setVault } from "@store/vault/vault-slice";
import { migrateCvFile } from "@shared/vault/migrate-vault";

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

const file = migrateCvFile(sample);

/** The server says the active job was sent: an application with status "applied" */
function stubSentJob(jobId: string): void {
  vi.stubGlobal(
    "fetch",
    vi.fn(() =>
      Promise.resolve(
        new Response(
          JSON.stringify([
            {
              id: "app1",
              company: "Acme",
              role: "Dev",
              status: "applied",
              appliedAt: "2026-01-01",
              jobId,
              templateId: "t",
              jobName: "x",
              templateName: "y",
              updatedAt: "2026-01-01",
              isCorrupt: false,
            },
          ]),
          { status: 200 }
        )
      )
    )
  );
}

describe("a job that was sent is not locked", () => {
  function setup(content: JSX.Element): { store: AppStore; root: HTMLElement } {
    const store: AppStore = configureStore({ reducer: rootReducer });
    store.dispatch(setVault(file.vault));
    stubSentJob(activeVariantSelector(store.getState()).id);
    const { container } = render(<Provider store={store}>{content}</Provider>);
    return { store, root: container };
  }

  it("keeps the template select and the editing panels enabled and shows no lock text", async () => {
    const { root } = setup(
      <>
        <JobSwitcher />
        <Inspector />
        <TemplatesPage />
        <Outline onClose={() => undefined} />
      </>
    );
    await act(async () => {
      await Promise.resolve();
    });
    expect(
      screen
        .getByLabelText("Template of this job")
        .getAttribute("aria-disabled")
    ).not.toBe("true");
    expect(root.querySelector("fieldset[disabled]")).toBeNull();
    expect(document.body.textContent).not.toMatch(/locked|unlock/i);
    expect(screen.queryByLabelText(/locked|sent to/i)).toBeNull();
    const disabledInInspector = Array.from(
      document.querySelectorAll("button:disabled")
    ).filter((button) => /unlock|copy/i.test(button.textContent ?? ""));
    expect(disabledInInspector).toHaveLength(0);
  });

  it("lets the job and template be changed and the job deleted", () => {
    const { store } = setup(<JobSwitcher />);
    const id = activeVariantSelector(store.getState()).id;
    act(() => {
      store.dispatch(renameJob({ id, name: "Renamed" }));
      store.dispatch(setPageLimit({ id, pageLimit: 1 }));
    });
    const variant = activeVariantSelector(store.getState());
    expect(variant.name).toBe("Renamed");
    expect(variant.pageLimit).toBe(1);
    act(() => {
      store.dispatch(
        createJob({
          vault: store.getState().vault,
          style: store.getState().cvData.style,
          name: "Other",
          id: "other",
        })
      );
      store.dispatch(deleteJob({ id }));
    });
    expect(store.getState().jobs.jobs.map((j) => j.id)).toEqual(["other"]);
  });
});
