// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { Provider } from "react-redux";
import { TailorAll } from "@pages/workspace/tailor-all";
import {
  bodyOf,
  sampleStore,
  stubAiServer,
} from "@pages/workspace/ai-test-helpers";
import {
  activeJobSelector,
  setItemSelection,
  setJobAnalysis,
} from "@store/jobs/jobs-slice";
import { setVault, vaultSelector } from "@store/vault/vault-slice";
import { JOB_TITLES_SECTION } from "@shared/vault/job-titles";
import { AppStore } from "@store/store-helper";

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

function setup(withTitles: boolean): { store: AppStore; asked: string[] } {
  const asked: string[] = [];
  stubAiServer((url, init) => {
    if (url === "/api/ai/score-section") {
      asked.push(bodyOf<{ sectionId: string }>(init).sectionId);
      return new Response(JSON.stringify({ scores: [], warnings: [] }));
    }
    return undefined;
  });
  const store = sampleStore();
  const vault = vaultSelector(store.getState());
  store.dispatch(
    setVault({
      ...vault,
      profile: {
        ...vault.profile,
        headline: "Software Developer",
        headlineOptions: withTitles ? ["Frontend developer"] : [],
      },
    })
  );
  store.dispatch(
    setJobAnalysis({
      jobId: activeJobSelector(store.getState()).id,
      jobAd: "ad",
      analysis,
    })
  );
  render(
    <Provider store={store}>
      <TailorAll isEmbedded />
    </Provider>
  );
  return { store, asked };
}

describe("TailorAll (Score all sections)", () => {
  it("is an AI button, and says 'again' once the job has scores", async () => {
    const { store } = setup(true);
    const first = await screen.findByRole("button", {
      name: "Score all sections",
    });
    expect(
      first.querySelector('[data-testid="AutoAwesomeOutlinedIcon"]')
    ).toBeTruthy();
    expect(first.className).toMatch(/contained/);
    const item = vaultSelector(store.getState()).sections.flatMap(
      (s) => s.items
    )[0];
    act(() => {
      store.dispatch(
        setItemSelection({
          jobId: activeJobSelector(store.getState()).id,
          itemId: item.id,
          change: { relevance: 60 },
        })
      );
    });
    const again = await screen.findByRole("button", {
      name: "Score all sections again",
    });
    expect(again.className).toMatch(/outlined/);
  });

  it("scores the job titles first, then every section, and shows a success line", async () => {
    const { asked } = setup(true);
    fireEvent.click(
      await screen.findByRole("button", { name: "Score all sections" })
    );
    const done = await screen.findByText(
      /^Scored 0 entries in \d+ sections\.$/
    );
    expect(done.getAttribute("role")).toBe("status");
    expect(
      done.querySelector('[data-testid="CheckCircleOutlinedIcon"]')
    ).toBeTruthy();
    expect(asked[0]).toBe(JOB_TITLES_SECTION);
    expect(asked.length).toBeGreaterThan(1);
    await waitFor(() =>
      expect(
        screen.getByRole("button", { name: "Score all sections" })
      ).toBeTruthy()
    );
  });

  it("does not score job titles when there is no choice of title", async () => {
    const { asked } = setup(false);
    fireEvent.click(
      await screen.findByRole("button", { name: "Score all sections" })
    );
    await screen.findByText(/^Scored 0 entries/);
    expect(asked).not.toContain(JOB_TITLES_SECTION);
  });
});
