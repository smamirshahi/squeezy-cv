// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, render, screen, waitFor } from "@testing-library/react";
import { Provider } from "react-redux";
import { SectionTailor } from "@pages/workspace/section-tailor";
import { sampleStore, stubAiServer } from "@pages/workspace/ai-test-helpers";
import {
  activeJobSelector,
  setItemSelection,
  setJobAnalysis,
  setTitleScores,
} from "@store/jobs/jobs-slice";
import { sectionsSelector } from "@store/vault/vault-slice";
import { AppStore } from "@store/store-helper";
import { JOB_TITLES_SECTION } from "@shared/vault/job-titles";

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

const analysis = {
  jobTitle: "Dev",
  seniority: "",
  mustHave: [],
  niceToHave: [],
  keywords: [],
};

function setup(sectionId: string): AppStore {
  stubAiServer();
  const store = sampleStore();
  store.dispatch(
    setJobAnalysis({
      jobId: activeJobSelector(store.getState()).id,
      jobAd: "ad",
      analysis,
    })
  );
  render(
    <Provider store={store}>
      <SectionTailor sectionId={sectionId} />
    </Provider>
  );
  return store;
}

describe("SectionTailor button", () => {
  it("says Score entries until the section has a score, then Score entries again", async () => {
    const store = setup(sectionsSelector(sampleStore().getState())[0].id);
    const section = sectionsSelector(store.getState())[0];
    const first = await screen.findByRole("button", { name: "Score entries" });
    expect(first.className).toMatch(/contained/);
    act(() => {
      store.dispatch(
        setItemSelection({
          jobId: activeJobSelector(store.getState()).id,
          itemId: section.items[0].id,
          change: { relevance: 80 },
        })
      );
    });
    const again = await screen.findByRole("button", {
      name: "Score entries again",
    });
    // done: outlined instead of filled
    expect(again.className).toMatch(/outlined/);
  });

  it("is an AI button: sparkle icon and the AI colour", async () => {
    setup(sectionsSelector(sampleStore().getState())[0].id);
    const button = await screen.findByRole("button", { name: "Score entries" });
    expect(
      button.querySelector('[data-testid="AutoAwesomeOutlinedIcon"]')
    ).toBeTruthy();
    expect(button.className).toMatch(/colorSecondary/);
  });

  it("scores job titles with its own wording, and remembers them", async () => {
    const store = setup(JOB_TITLES_SECTION);
    await screen.findByRole("button", { name: "Score job titles" });
    expect(
      screen.getByText(/Scores each job title against the job description/)
    ).toBeTruthy();
    act(() => {
      store.dispatch(
        setTitleScores({
          jobId: activeJobSelector(store.getState()).id,
          scores: [{ title: "Dev", relevance: 70, reason: "ok" }],
        })
      );
    });
    await waitFor(() =>
      expect(
        screen.getByRole("button", { name: "Score job titles again" })
      ).toBeTruthy()
    );
  });
});
