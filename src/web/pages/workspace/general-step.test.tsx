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
import { GeneralStep } from "@pages/workspace/general-step";
import { stubAiServer, sampleStore } from "@pages/workspace/ai-test-helpers";
import { setFit } from "@store/app/app-slice";
import { activeVariantSelector } from "@store/jobs/jobs-slice";
import { AppStore } from "@store/store-helper";

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

function setup(): AppStore {
  stubAiServer();
  const store = sampleStore();
  render(
    <Provider store={store}>
      <GeneralStep />
    </Provider>
  );
  return store;
}

const limit = (store: AppStore): number =>
  activeVariantSelector(store.getState()).pageLimit;

describe("General step: page limit", () => {
  it("starts at 1 page and the buttons set the limit of this job", () => {
    const store = setup();
    expect(limit(store)).toBe(1);
    expect(
      screen
        .getByRole("button", { name: "1 page" })
        .getAttribute("aria-pressed")
    ).toBe("true");
    fireEvent.click(screen.getByRole("button", { name: "2 pages" }));
    expect(limit(store)).toBe(2);
  });

  it("has no 3 pages button; Custom opens a number field that starts at 3", () => {
    const store = setup();
    expect(screen.queryByRole("button", { name: "3 pages" })).toBeNull();
    expect(screen.queryByLabelText("Pages")).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Custom" }));
    expect(limit(store)).toBe(3);
    const field = screen.getByLabelText<HTMLInputElement>("Pages");
    expect(field.value).toBe("3");
    expect(field.min).toBe("3");
    fireEvent.change(field, { target: { value: "5" } });
    expect(limit(store)).toBe(5);
    // below 3 is ignored: 1 and 2 have their own buttons
    fireEvent.change(field, { target: { value: "1" } });
    expect(limit(store)).toBe(5);
    fireEvent.click(screen.getByRole("button", { name: "2 pages" }));
    expect(screen.queryByLabelText("Pages")).toBeNull();
  });

  it("explains the limit with a tooltip icon", () => {
    setup();
    expect(
      screen.getByLabelText("Recruiters usually expect 1 page, 2 at most.")
    ).toBeTruthy();
  });

  it("shows the result when the CV is over the limit, and the ways out", () => {
    const store = setup();
    fireEvent.click(screen.getByRole("button", { name: "2 pages" }));
    act(() => {
      store.dispatch(
        setFit({
          pageCount: 3,
          usedPercent: 140,
          linesOver: 31,
          lineHeightPx: 14,
          overflowStartsWith: "Projects",
        })
      );
    });
    expect(screen.getByText("Over by 31 lines")).toBeTruthy();
    expect(screen.getByText("3 pages now, limit is 2")).toBeTruthy();
    expect(screen.getByText("Page 3 starts at “Projects”.")).toBeTruthy();
    expect(
      screen.getByRole("switch", { name: "Auto-fit to the page limit" })
    ).toBeTruthy();
    expect(
      screen.getByRole("button", { name: "Choose items to hide" })
    ).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Custom" }));
    expect(limit(store)).toBe(3);
    // 3 is a Custom value now
    expect(screen.getByLabelText<HTMLInputElement>("Pages").value).toBe("3");
  });

  it("says it fits when it does", () => {
    const store = setup();
    act(() => {
      store.dispatch(
        setFit({
          pageCount: 1,
          usedPercent: 80,
          linesOver: 0,
          lineHeightPx: 14,
          overflowStartsWith: "",
        })
      );
    });
    expect(screen.getByText("Fits")).toBeTruthy();
    expect(screen.getByText("1 page, limit is 1")).toBeTruthy();
    expect(screen.queryByText(/^Over by/)).toBeNull();
  });

  it("the auto-fit switch changes the template's auto-fit", () => {
    const store = setup();
    const toggle = screen.getByRole("switch", {
      name: "Auto-fit to the page limit",
    });
    fireEvent.click(toggle);
    expect(activeVariantSelector(store.getState()).isAutoFit).toBe(true);
  });
});

describe("General step: AI assist card", () => {
  it("lets the user choose the AI for each action, and saves the choice", async () => {
    const fetchMock = stubAiServer((url, init) =>
      url === "/api/ai/choice" && init?.method === "PUT"
        ? new Response(
            JSON.stringify({
              tailor: "groq",
              import: "groq",
              hide: "ollama",
              chat: "groq",
              place: "groq",
            })
          )
        : undefined
    );
    const store = sampleStore();
    render(
      <Provider store={store}>
        <GeneralStep />
      </Provider>
    );
    const pickers = await screen.findAllByRole("combobox", {
      name: /AI to use/,
    });
    expect(pickers).toHaveLength(2);
    fireEvent.mouseDown(pickers[1]);
    // a provider that is not set up is listed but cannot be picked
    expect(
      screen
        .getByRole("option", { name: /Claude.*not set up/ })
        .getAttribute("aria-disabled")
    ).toBe("true");
    fireEvent.click(screen.getByRole("option", { name: /Ollama · local/ }));
    await waitFor(() =>
      expect(
        fetchMock.mock.calls.some(
          ([url, init]) =>
            url === "/api/ai/choice" &&
            (init as RequestInit).body === JSON.stringify({ hide: "ollama" })
        )
      ).toBe(true)
    );
    // each picker has its own AI settings button
    expect(
      screen.getAllByRole("button", { name: "AI settings" }).length
    ).toBeGreaterThan(0);
  });

  it("asking the AI to pick what to hide needs the CV to be over its limit", async () => {
    const store = setup();
    const ask = await screen.findByRole("button", {
      name: "Ask AI to pick what to hide",
    });
    expect((ask as HTMLButtonElement).disabled).toBe(true);
    act(() => {
      store.dispatch(
        setFit({
          pageCount: 2,
          usedPercent: 130,
          linesOver: 12,
          lineHeightPx: 14,
          overflowStartsWith: "Education",
        })
      );
    });
    await waitFor(() =>
      expect((ask as HTMLButtonElement).disabled).toBe(false)
    );
    // the AI action carries the AI icon
    expect(
      ask.querySelector('[data-testid="AutoAwesomeOutlinedIcon"]')
    ).toBeTruthy();
  });
});
