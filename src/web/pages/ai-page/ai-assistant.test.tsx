// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
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
import { AiAssistant } from "@pages/ai-page/ai-assistant";
import { rootReducer } from "@store/store";
import { AppStore } from "@store/store-helper";
import { setSavedState } from "@store/persistence/persistence-slice";
import { toSavedState } from "@store/persistence/persistence-logic";
import { setStyle } from "@store/cv-data/cv-data-slice";
import {
  addTemplate,
  setVariants,
  variantsSelector,
} from "@store/variants/variants-slice";
import { setVault } from "@store/vault/vault-slice";
import { createDefaultVariant } from "@shared/variant/variant-utils";
import { migrateCvFile } from "@shared/vault/migrate-vault";
import { TailorResult } from "@custom-types/tailor-types";

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

const file = migrateCvFile(sample);
const experience = file.vault.sections.find((s) => s.type === "experience")!;
const [job1, job2] = experience.items;

const FLAGGED = ['name "Kubernetes" is not in your CV'];

function result(): TailorResult {
  return {
    requirements: {
      jobTitle: "Senior Front-End Developer",
      seniority: "senior",
      mustHave: ["React"],
      niceToHave: ["Redux Toolkit"],
      keywords: ["React"],
    },
    proposal: {
      items: [
        {
          itemId: job1.id,
          relevance: 0.5,
          isIncluded: true,
          isHighlighted: false,
          reason: "Some React.",
        },
        {
          itemId: job2.id,
          relevance: 0.95,
          isIncluded: true,
          isHighlighted: true,
          reason: "Core React work.",
        },
      ],
      bullets: [
        {
          itemId: job1.id,
          bulletId: job1.bullets[0].id,
          isIncluded: true,
          rewrite: { wording: "short", text: "Led a React dashboard" },
          reason: "r",
          flags: [],
        },
        {
          itemId: job1.id,
          bulletId: job1.bullets[1].id,
          isIncluded: true,
          rewrite: { wording: "formal", text: "Used Kubernetes for state" },
          reason: "r",
          flags: FLAGGED,
        },
      ],
      statement: "Front-end developer with six years of experience.",
      statementFlags: [],
      gaps: ["WCAG 2.2"],
    },
    warnings: ["A rewording needs your check."],
  };
}

function stubServer(over: {
  isConfigured?: boolean;
  provider?: "claude" | "ollama";
  tailor?: { status: number; body: unknown };
}): ReturnType<typeof vi.fn> {
  const fetchMock = vi.fn((url: string) => {
    if (url === "/api/ai/status") {
      return Promise.resolve(
        new Response(
          JSON.stringify({
            isConfigured: over.isConfigured ?? true,
            provider: over.provider ?? "claude",
          })
        )
      );
    }
    const answer = over.tailor ?? { status: 200, body: result() };
    return Promise.resolve(
      new Response(JSON.stringify(answer.body), { status: answer.status })
    );
  });
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

function makeStore({ isSaved = true } = {}): AppStore {
  const store = configureStore({ reducer: rootReducer });
  store.dispatch(setVault(file.vault));
  store.dispatch(setStyle(file.style));
  store.dispatch(setVariants([createDefaultVariant(file, "base")]));
  if (isSaved) {
    const s = store.getState();
    store.dispatch(
      setSavedState(
        toSavedState(
          s.vault,
          s.cvData.metaData,
          s.cvData.style,
          s.variants.templates,
          s.variants.jobs
        )
      )
    );
  }
  return store;
}

function show(store: AppStore): void {
  render(
    <Provider store={store}>
      <AiAssistant />
    </Provider>
  );
}

async function analyse(store: AppStore): Promise<void> {
  show(store);
  fireEvent.change(screen.getByLabelText("Job advert"), {
    target: { value: "A senior front-end job" },
  });
  const button = screen.getByRole("button", { name: "Analyse" });
  await waitFor(() => expect(button.hasAttribute("disabled")).toBe(false));
  fireEvent.click(button);
  await screen.findByText("What the job asks for");
}

describe("AiAssistant: before analysing", () => {
  it("tells you what is sent to Anthropic, and what is not", async () => {
    stubServer({});
    show(makeStore());
    expect(
      await screen.findByText(/without your name and contact details/)
    ).toBeTruthy();
  });

  it("says the CV stays on this computer when the local model is used", async () => {
    stubServer({ provider: "ollama" });
    show(makeStore());
    expect(await screen.findByText(/stay on this computer/)).toBeTruthy();
    expect(screen.queryByText(/sent to Anthropic/)).toBeNull();
  });

  it("cannot analyse without an API key, and says how to set one", async () => {
    stubServer({ isConfigured: false });
    show(makeStore());
    await screen.findByText(/AI is not set up/);
    fireEvent.change(screen.getByLabelText("Job advert"), {
      target: { value: "x" },
    });
    expect(
      screen.getByRole("button", { name: "Analyse" }).hasAttribute("disabled")
    ).toBe(true);
  });

  it("asks you to save first, because the AI works on the saved CV", async () => {
    stubServer({});
    show(makeStore({ isSaved: false }));
    expect(await screen.findByText(/Save your changes first/)).toBeTruthy();
    expect(
      screen.getByRole("button", { name: "Analyse" }).hasAttribute("disabled")
    ).toBe(true);
  });

  it("sends the advert and tone to the server", async () => {
    const fetchMock = stubServer({});
    await analyse(makeStore());
    const call = fetchMock.mock.calls.find(
      ([url]) => url === "/api/ai/tailor"
    )!;
    expect(JSON.parse(call[1].body)).toEqual({
      jobAd: "A senior front-end job",
      tone: "neutral",
    });
  });
});

describe("AiAssistant: the review", () => {
  it("shows requirements, gaps, warnings, the draft statement and the changes", async () => {
    stubServer({});
    await analyse(makeStore());

    expect(screen.getByText(/Senior Front-End Developer/)).toBeTruthy();
    expect(screen.getAllByText("React").length).toBeGreaterThan(0);
    expect(screen.getByText(/Not shown in your CV:/)).toBeTruthy();
    expect(screen.getByText(/WCAG 2.2/)).toBeTruthy();
    expect(screen.getByText("A rewording needs your check.")).toBeTruthy();
    expect(
      screen.getByText("Front-end developer with six years of experience.")
    ).toBeTruthy();
    expect(screen.getByText("Core React work.")).toBeTruthy();
    expect(screen.getAllByText("Led a React dashboard").length).toBeGreaterThan(
      0
    );
  });

  it("flags a suspicious rewording and does not accept it automatically", async () => {
    stubServer({});
    await analyse(makeStore());

    expect(
      screen.getByText(/Check this one, not accepted automatically/)
    ).toBeTruthy();
    const boxes = screen.getAllByLabelText("Use this wording");
    // first (clean) is accepted, second (flagged) is not
    expect(boxes.map((b) => (b as HTMLInputElement).checked)).toEqual([
      true,
      false,
    ]);
  });

  it("changes nothing until Create variant is pressed", async () => {
    stubServer({});
    const store = makeStore();
    const before = JSON.stringify([
      store.getState().vault,
      store.getState().variants,
    ]);
    await analyse(store);
    expect(
      JSON.stringify([store.getState().vault, store.getState().variants])
    ).toBe(before);
  });

  it("creates a new job from what was accepted and leaves the old one alone", async () => {
    stubServer({});
    const store = makeStore();
    await analyse(store);
    const baseBefore = JSON.stringify(variantsSelector(store.getState())[0]);

    fireEvent.click(
      screen.getByRole("button", {
        name: /Create job from the accepted changes/,
      })
    );

    const variants = variantsSelector(store.getState());
    const activeId = store.getState().variants.activeJobId;
    expect(variants).toHaveLength(2);
    expect(JSON.stringify(variants[0])).toBe(baseBefore);
    const created = variants[1];
    expect(created.name).toBe("Senior Front-End Developer");
    expect(activeId).toBe(created.id);
    expect(created.selection[job2.id].emphasis).toBe("high");

    // the clean rewording became an alternative wording; the flagged one did not
    const bullets = store
      .getState()
      .vault.sections.find((s) => s.id === experience.id)!
      .items.find((i) => i.id === job1.id)!.bullets;
    expect(bullets[0].alt?.short).toBe("Led a React dashboard");
    expect(bullets[1].alt?.formal).toBeUndefined();
    // and the original text is untouched
    expect(bullets[0].text).toBe(job1.bullets[0].text);
    await screen.findByText(/Created the job/);
  });

  it("shares the chosen template, never modifies it, and fills the job name from the advert", async () => {
    stubServer({});
    const store = makeStore();
    store.dispatch(addTemplate({ id: "tpl-b", name: "Template B" }));
    await analyse(store);
    expect(screen.getByLabelText<HTMLInputElement>("Job name").value).toBe(
      "Senior Front-End Developer"
    );
    fireEvent.change(screen.getByLabelText("Job name"), {
      target: { value: "Acme - Senior" },
    });
    fireEvent.mouseDown(screen.getByRole("combobox", { name: "Template" }));
    fireEvent.click(await screen.findByRole("option", { name: "Template B" }));
    const templatesBefore = JSON.stringify(store.getState().variants.templates);
    fireEvent.click(
      screen.getByRole("button", {
        name: /Create job from the accepted changes/,
      })
    );
    const { jobs, templates, activeJobId } = store.getState().variants;
    const created = jobs.find((j) => j.id === activeJobId)!;
    expect(created.name).toBe("Acme - Senior");
    expect(created.templateId).toBe("tpl-b");
    // tone is written to the job; the tailor record is on it too
    expect(created.tailor?.jobTitle).toBe("Senior Front-End Developer");
    expect(templates).toHaveLength(2);
    expect(JSON.stringify(templates)).toBe(templatesBefore);
  });

  it("makes a tailored template copy only when the page limit differs from the template", async () => {
    stubServer({});
    const store = makeStore();
    await analyse(store);
    const templateBefore = JSON.stringify(
      store.getState().variants.templates[0]
    );
    const limit = store.getState().variants.templates[0].pageLimit;
    fireEvent.mouseDown(screen.getByRole("combobox", { name: "Page limit" }));
    fireEvent.click(
      await screen.findByRole("option", {
        name: limit === 1 ? "2 pages" : "1 page",
      })
    );
    fireEvent.click(
      screen.getByRole("button", {
        name: /Create job from the accepted changes/,
      })
    );
    const { jobs, templates, activeJobId } = store.getState().variants;
    const created = jobs.find((j) => j.id === activeJobId)!;
    expect(templates).toHaveLength(2);
    const copy = templates.find((t) => t.id === created.templateId)!;
    expect(copy.name).toMatch(/\(tailored\)$/);
    expect(copy.pageLimit).not.toBe(limit);
    expect(JSON.stringify(templates[0])).toBe(templateBefore);
  });

  it("applies a flagged rewording only if you tick it yourself", async () => {
    stubServer({});
    const store = makeStore();
    await analyse(store);
    fireEvent.click(screen.getAllByLabelText("Use this wording")[1]);
    fireEvent.click(
      screen.getByRole("button", {
        name: /Create job from the accepted changes/,
      })
    );
    const bullets = store
      .getState()
      .vault.sections.find((s) => s.id === experience.id)!
      .items.find((i) => i.id === job1.id)!.bullets;
    expect(bullets[1].alt?.formal).toBe("Used Kubernetes for state");
    // the flagged wording that was ticked by hand is remembered on the variant for the export check
    const record = variantsSelector(store.getState())[1].tailor;
    expect(record?.jobTitle).toBe("Senior Front-End Developer");
    expect(record?.acceptedFlagged.map((f) => f.text)).toEqual([
      "Used Kubernetes for state",
    ]);
  });

  it("does not apply an item you un-tick", async () => {
    stubServer({});
    const store = makeStore();
    await analyse(store);
    // job2 is listed first (most relevant): untick its checkbox
    const itemBoxes = screen
      .getAllByRole("checkbox")
      .filter((box) => box.closest("label")?.textContent?.includes("relevant"));
    fireEvent.click(itemBoxes[0]);
    fireEvent.click(
      screen.getByRole("button", {
        name: /Create job from the accepted changes/,
      })
    );
    expect(
      variantsSelector(store.getState())[1].selection[job2.id]?.emphasis
    ).not.toBe("high");
  });

  it("shows the server's error", async () => {
    stubServer({
      tailor: {
        status: 502,
        body: {
          code: "ai_invalid_output",
          message: "The model did not return valid output.",
        },
      },
    });
    show(makeStore());
    fireEvent.change(screen.getByLabelText("Job advert"), {
      target: { value: "x" },
    });
    const button = screen.getByRole("button", { name: "Analyse" });
    await waitFor(() => expect(button.hasAttribute("disabled")).toBe(false));
    fireEvent.click(button);
    expect(await screen.findByText(/did not return valid output/)).toBeTruthy();
  });
});

describe("AiAssistant: pins and diff", () => {
  it("numbers the changes on the paper and in the list with the same numbers, and links them", async () => {
    stubServer({});
    await analyse(makeStore());
    // job2 is the most relevant (highlighted), so it is change 1; job1 has bullet proposals: 2
    const pin = await screen.findByRole("button", { name: "Change 1" });
    expect(screen.getByRole("button", { name: "Change 2" })).toBeTruthy();
    const listButton = screen.getByRole("button", {
      name: "Show change 1 on the page",
    });
    fireEvent.click(pin);
    expect(
      document.getElementById(`review-${job2.id}`)?.getAttribute("id")
    ).toBeTruthy();
    fireEvent.click(listButton);
  });

  it("shows the differences word by word in the Diff view", async () => {
    stubServer({});
    await analyse(makeStore());
    fireEvent.click(screen.getByRole("button", { name: "Diff" }));
    const region = screen.getByRole("region", { name: "Differences" });
    // the short wording only removes words: they are struck through
    expect(region.querySelector("del")?.textContent).toContain("development");
    expect(region.querySelector("ins")).toBeNull();
    expect(region.textContent).toContain("highlighted");
  });

  it("offers a section reorder, and the Proposed view follows the checkbox", async () => {
    const withOrder = result();
    const sectionIds = file.vault.sections.map((s) => s.id);
    withOrder.proposal.sectionOrder = [...sectionIds].reverse();
    withOrder.proposal.sectionOrderReason = "Skills matter most here.";
    stubServer({ tailor: { status: 200, body: withOrder } });
    await analyse(makeStore());
    const box = screen.getByRole("checkbox", { name: /Reorder the sections/ });
    expect((box as HTMLInputElement).checked).toBe(true);
    expect(screen.getByText("Skills matter most here.")).toBeTruthy();
    fireEvent.click(box);
    expect((box as HTMLInputElement).checked).toBe(false);
  });
});
