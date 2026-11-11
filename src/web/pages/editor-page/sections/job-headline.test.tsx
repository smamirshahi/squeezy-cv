// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
  within,
} from "@testing-library/react";
import { Provider } from "react-redux";
import { JobHeadline } from "@pages/editor-page/sections/job-headline";
import { sampleStore, stubAiServer } from "@pages/workspace/ai-test-helpers";
import {
  activeJobSelector,
  activeVariantSelector,
  setTitleScores,
} from "@store/jobs/jobs-slice";
import { setVault, vaultSelector } from "@store/vault/vault-slice";
import { AppStore } from "@store/store-helper";

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

function setup(
  options: string[] = ["Frontend developer", "Designer"]
): AppStore {
  stubAiServer();
  const store = sampleStore();
  const vault = vaultSelector(store.getState());
  store.dispatch(
    setVault({
      ...vault,
      profile: {
        ...vault.profile,
        headline: "Software Developer",
        headlineOptions: options,
      },
    })
  );
  render(
    <Provider store={store}>
      <JobHeadline />
    </Provider>
  );
  return store;
}

function titles(): string[] {
  return within(screen.getByRole("table", { name: "Job titles for this job" }))
    .getAllByRole("row")
    .slice(1)
    .map((row) => within(row).getAllByRole("cell")[1].textContent ?? "");
}

describe("JobHeadline table", () => {
  it("lists the titles in the vault order with 'Not scored' before scoring", () => {
    setup();
    expect(titles()).toEqual([
      "Software Developer",
      "Frontend developer",
      "Designer",
    ]);
    expect(screen.getAllByText("Not scored").length).toBe(3);
    expect(
      screen.getByRole("button", { name: "Score job titles" })
    ).toBeTruthy();
  });

  it("shows the AI relevance with its reason and puts the best title first", () => {
    const store = setup();
    act(() => {
      store.dispatch(
        setTitleScores({
          jobId: activeJobSelector(store.getState()).id,
          scores: [
            { title: "Software Developer", relevance: 55, reason: "Broad" },
            {
              title: "Frontend developer",
              relevance: 92,
              reason: "Exact match",
            },
            { title: "Designer", relevance: 12, reason: "Other field" },
          ],
        })
      );
    });
    expect(titles()[0]).toContain("Frontend developer");
    expect(titles()[0]).toContain("Exact match");
    expect(titles()[2]).toContain("Designer");
    expect(screen.getByText("Relevancy 92%")).toBeTruthy();
    expect(
      screen.getByRole("button", { name: "Score job titles again" })
    ).toBeTruthy();
  });

  it("picking a row sets the title this job shows; the vault's own title is the default", () => {
    const store = setup();
    const headline = (): string | undefined =>
      activeVariantSelector(store.getState()).headline;
    expect(
      screen.getByLabelText<HTMLInputElement>("Show Software Developer").checked
    ).toBe(true);
    fireEvent.click(screen.getByLabelText("Show Frontend developer"));
    expect(headline()).toBe("Frontend developer");
    expect(
      screen.getByLabelText<HTMLInputElement>("Show Frontend developer").checked
    ).toBe(true);
    fireEvent.click(screen.getByLabelText("Show Software Developer"));
    expect(headline()).toBeUndefined();
  });

  it("is not shown when there is nothing to choose between", () => {
    setup([]);
    expect(screen.queryByRole("table")).toBeNull();
  });
});
