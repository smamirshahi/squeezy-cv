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
import { AtsPanel } from "@pages/workspace/ats/ats-panel";
import { sampleStore, stubAiServer } from "@pages/workspace/ai-test-helpers";
import {
  activeJobSelector,
  activeVariantSelector,
  setJobAnalysis,
  markPlaceholder,
} from "@store/jobs/jobs-slice";
import { AppStore } from "@store/store-helper";

beforeEach(() => {
  localStorage.clear();
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

const analysis = {
  jobTitle: "Frontend Engineer",
  seniority: "senior",
  mustHave: ["React", "GraphQL"],
  niceToHave: ["Jest"],
  keywords: ["React.js"],
};

function setup(withJob = true, jobAnalysis?: typeof analysis): AppStore {
  const store = sampleStore();
  if (jobAnalysis) {
    store.dispatch(
      setJobAnalysis({
        jobId: activeJobSelector(store.getState()).id,
        jobAd: "5+ years. Strong communication.",
        analysis: jobAnalysis,
      })
    );
  }
  if (!withJob) {
    store.dispatch(markPlaceholder());
  }
  render(
    <Provider store={store}>
      <AtsPanel />
    </Provider>
  );
  return store;
}

describe("AtsPanel", () => {
  it("asks for a job first while there is none", () => {
    setup(false);
    expect(screen.getByText(/Start a job application first/)).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Analyse CV" })).toBeNull();
  });

  it("shows nothing scored before the first analysis", () => {
    setup();
    expect(
      screen.getByRole("img", { name: "ATS score: not analysed yet" })
    ).toBeTruthy();
    expect(screen.getByText("not analysed")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Analyse CV" })).toBeTruthy();
    // the match needs an analysed advert, and the panel says where to get it
    expect(screen.getByRole("link", { name: "Job application" })).toBeTruthy();
    expect(screen.getByText(/A guide, not a target/)).toBeTruthy();
    expect(screen.getByText(/Real ATS systems differ/)).toBeTruthy();
  });

  it("is not an AI button (it runs on this computer)", () => {
    setup();
    const button = screen.getByRole("button", { name: "Analyse CV" });
    expect(button.className).not.toMatch(/colorSecondary/);
    expect(
      button.querySelector('[data-testid="AutoAwesomeOutlinedIcon"]')
    ).toBe(null);
  });

  it("scores the CV and shows the numbers as text, with issue counts", () => {
    setup();
    fireEvent.click(screen.getByRole("button", { name: "Analyse CV" }));
    const ring = screen.getByRole("img", {
      name: /^ATS score \d+ out of 100$/,
    });
    expect(ring).toBeTruthy();
    const formatting = screen.getByTestId("ats-category-formatting");
    expect(formatting.textContent).toMatch(/\d+ · (No issues|\d+ issues?)/);
    expect(screen.getByRole("button", { name: "Analyse again" })).toBeTruthy();
    expect(screen.getByText(/First scan · just now/)).toBeTruthy();
    // kept in this browser for the job
    expect(localStorage.getItem("cvb.ats.main")).toContain('"first"');
  });

  it("scores the match when the job has requirements, with covered and missing words", () => {
    setup(true, analysis);
    fireEvent.click(screen.getByRole("button", { name: "Analyse CV" }));
    expect(screen.getByTestId("ats-category-hardSkills")).toBeTruthy();
    expect(screen.getByText(/On the CV:/).parentElement?.textContent).toContain(
      "React"
    );
    const missing = screen.getByText(/Not on the CV:/).parentElement;
    expect(missing?.textContent).toContain("GraphQL");
    expect(missing?.textContent).toContain("Jest");
    expect(
      screen.getByText(/Add the keywords .* where they are true/)
    ).toBeTruthy();
  });

  it("says the CV changed after the scan, and compares a second scan with the first", () => {
    const store = setup(true, analysis);
    fireEvent.click(screen.getByRole("button", { name: "Analyse CV" }));
    expect(screen.queryByRole("status")).toBeNull();
    const jobId = activeJobSelector(store.getState()).id;
    // the advert now asks for fewer things: the scored words change
    act(() => {
      store.dispatch(
        setJobAnalysis({
          jobId,
          jobAd: "5+ years. Strong communication.",
          analysis: { ...analysis, mustHave: ["React"], niceToHave: [] },
        })
      );
    });
    expect(screen.getByRole("status").textContent).toMatch(/CV changed/);
    fireEvent.click(screen.getByRole("button", { name: "Analyse again" }));
    expect(screen.queryByRole("status")).toBeNull();
    expect(screen.getByText(/^First scan \d+$/)).toBeTruthy();
    expect(screen.getByText(/^Now \d+ · [+-]?\d+$/)).toBeTruthy();
    expect(screen.getByText("Since the first scan")).toBeTruthy();
    expect(
      screen.getByRole("img", { name: /from the first scan of/ })
    ).toBeTruthy();
    // a category that changed says by how much, in words and not only colour
    const hard = screen.getByTestId("ats-category-hardSkills");
    expect(within(hard).getByLabelText(/since the first scan/)).toBeTruthy();
    // a new baseline starts the comparison again
    fireEvent.click(
      screen.getByRole("button", {
        name: "Use this scan as the new first scan",
      })
    );
    expect(screen.queryByText("Since the first scan")).toBeNull();
  });

  it("shows a saved scan again when the page is opened later", () => {
    setup();
    fireEvent.click(screen.getByRole("button", { name: "Analyse CV" }));
    cleanup();
    setup();
    expect(screen.getByRole("button", { name: "Analyse again" })).toBeTruthy();
  });

  it("explains how the score is calculated", () => {
    setup();
    // every category has its own (i) hint
    expect(
      screen.getByRole("button", { name: "What Formatting checks" })
    ).toBeTruthy();
    fireEvent.click(
      screen.getByRole("button", { name: "How is this score calculated?" })
    );
    const dialog = screen.getByRole("dialog");
    expect(within(dialog).getByText(/weight 40% of your CV/)).toBeTruthy();
    expect(within(dialog).getByText(/uses no AI/)).toBeTruthy();
    expect(within(dialog).getByText(/Real ATS systems differ/)).toBeTruthy();
  });
});

describe("Suggest natural wording (AI)", () => {
  const suggestion = {
    itemId: "exp-1",
    field: "description",
    label: "Senior Software Developer",
    original: "Built a React dashboard",
    text: "Built a React.js dashboard",
    flags: [] as string[],
  };

  function answer(result: unknown): ReturnType<typeof stubAiServer> {
    return stubAiServer((url) =>
      url === "/api/ai/ats-wording"
        ? new Response(JSON.stringify(result))
        : undefined
    );
  }

  async function open(): Promise<void> {
    fireEvent.click(screen.getByRole("button", { name: "Analyse CV" }));
    fireEvent.click(
      await screen.findByRole("button", { name: "Suggest natural wording" })
    );
  }

  it("is marked as AI: purple card, sparkle icon and AI colour", () => {
    answer({ suggestions: [], unplaced: [] });
    setup(true, analysis);
    fireEvent.click(screen.getByRole("button", { name: "Analyse CV" }));
    const button = screen.getByRole("button", {
      name: "Suggest natural wording",
    });
    expect(
      button.querySelector('[data-testid="AutoAwesomeOutlinedIcon"]')
    ).toBeTruthy();
    expect(button.className).toMatch(/colorSecondary/);
    expect(screen.getByText("AI assist")).toBeTruthy();
  });

  it("is not offered without an advert to take words from", () => {
    answer({ suggestions: [], unplaced: [] });
    setup();
    fireEvent.click(screen.getByRole("button", { name: "Analyse CV" }));
    expect(
      screen.queryByRole("button", { name: "Suggest natural wording" })
    ).toBeNull();
  });

  it("sends the missing and the differently worded keywords", async () => {
    const fetchMock = answer({ suggestions: [], unplaced: [] });
    setup(true, analysis);
    await open();
    await waitFor(() =>
      expect(
        fetchMock.mock.calls.some(([url]) => url === "/api/ai/ats-wording")
      ).toBe(true)
    );
    const call = fetchMock.mock.calls.find(
      ([url]) => url === "/api/ai/ats-wording"
    );
    const body = JSON.parse(call?.[1]?.body as string);
    expect(body.terms).toEqual(
      expect.arrayContaining(["GraphQL", "Jest", "React.js"])
    );
    expect(body.reworded).toEqual(["React.js"]);
    expect(await screen.findByText(/nothing it could reword/)).toBeTruthy();
  });

  it("applies the ticked suggestions to this job's wording, not the vault, in one undo step", async () => {
    answer({
      suggestions: [
        suggestion,
        {
          ...suggestion,
          itemId: "exp-2",
          label: "Developer",
          text: "Added GraphQL and Kubernetes",
          flags: ['name "Kubernetes" is not in your CV'],
        },
      ],
      unplaced: ["Jest"],
    });
    const store = setup(true, analysis);
    await open();
    const dialog = await screen.findByRole("dialog");
    const boxes = within(dialog).getAllByRole("checkbox");
    // a suggestion that adds something the CV does not say starts unticked
    expect((boxes[0] as HTMLInputElement).checked).toBe(true);
    expect((boxes[1] as HTMLInputElement).checked).toBe(false);
    expect(within(dialog).getByText(/is not in your text/)).toBeTruthy();
    expect(
      within(dialog).getByText(/Left out, your texts do not say it/)
    ).toBeTruthy();
    // the proposal is marked as written by AI
    expect(
      within(dialog).getAllByRole("img", { name: /AI/ }).length
    ).toBeGreaterThan(0);
    const vaultBefore = JSON.stringify(store.getState().vault);
    fireEvent.click(within(dialog).getByRole("button", { name: "Use these" }));
    const selection = activeVariantSelector(store.getState()).selection;
    expect(selection["exp-1"]?.fieldText?.description).toBe(
      "Built a React.js dashboard"
    );
    expect(selection["exp-2"]).toBeUndefined();
    expect(JSON.stringify(store.getState().vault)).toBe(vaultBefore);
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
  });

  it("shows why it failed", async () => {
    stubAiServer((url) =>
      url === "/api/ai/ats-wording"
        ? new Response(
            JSON.stringify({
              code: "ai_not_configured",
              message: "AI is not set up.",
            }),
            { status: 503 }
          )
        : undefined
    );
    setup(true, analysis);
    await open();
    expect(await screen.findByText("AI is not set up.")).toBeTruthy();
  });
});
