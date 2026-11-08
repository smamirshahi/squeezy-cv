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
import { sampleFileWithBullets } from "@fixtures/sample-with-bullets";
import { ChatPanel } from "@pages/workspace/chat-panel";
import { undoableReducer } from "@store/store";
import { AppStore } from "@store/store-helper";
import { clearHistory } from "@store/history/history";
import { setSavedState } from "@store/persistence/persistence-slice";
import { toSavedState } from "@store/persistence/persistence-logic";
import { activeVariantSelector, setVariants } from "@store/jobs/jobs-slice";
import { setVault } from "@store/vault/vault-slice";
import { AI_PROVIDER_INFO } from "@shared/ai/providers";
import { createDefaultVariant } from "@shared/variant/variant-utils";
import { ChatResponse } from "@custom-types/chat-types";

afterEach(() => {
  cleanup();
  localStorage.clear();
  vi.unstubAllGlobals();
});

const file = sampleFileWithBullets();
const jobs = file.vault.sections.find((s) => s.type === "experience")!.items;
const bullet = jobs[0].bullets[0];

const answer: ChatResponse = {
  reply: "Hiding the oldest job and shortening a bullet.",
  operations: [
    { op: "hideItem", itemId: jobs[1].id, isHidden: true },
    { op: "setTone", tone: "formal" },
    {
      op: "rewriteBullet",
      itemId: jobs[0].id,
      bulletId: bullet.id,
      wording: "short",
      text: "Led a dashboard",
      flags: ['name "Redux" is not in your CV'],
    },
  ],
  warnings: ["A rewording needs your check."],
};

function stub(
  over: { isConfigured?: boolean; chat?: unknown; status?: number } = {}
): ReturnType<typeof vi.fn> {
  const fetchMock = vi.fn((url: string) => {
    if (url === "/api/ai/status") {
      return Promise.resolve(
        new Response(
          JSON.stringify({
            isConfigured: over.isConfigured ?? true,
            provider: "claude",
            providers: [
              {
                ...AI_PROVIDER_INFO.claude,
                isConfigured: over.isConfigured ?? true,
              },
              { ...AI_PROVIDER_INFO.ollama, isConfigured: true },
            ],
            choice: {
              tailor: "claude",
              import: "claude",
              hide: "claude",
              chat: "claude",
            },
          })
        )
      );
    }
    return Promise.resolve(
      new Response(JSON.stringify(over.chat ?? answer), {
        status: over.status ?? 200,
      })
    );
  });
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

function setup(isSaved = true): ReturnType<typeof makeStore> {
  const store = makeStore();
  if (isSaved) {
    const s = store.getState();
    store.dispatch(
      setSavedState(
        toSavedState(
          s.vault,
          s.cvData.metaData,
          s.cvData.style,
          s.jobs.templates,
          s.jobs.jobs
        )
      )
    );
  }
  render(
    <Provider store={store}>
      <ChatPanel />
    </Provider>
  );
  return store;
}

function makeStore(): AppStore {
  const store = configureStore({ reducer: undoableReducer });
  store.dispatch(setVault(file.vault));
  store.dispatch(setVariants([createDefaultVariant(file, "main")]));
  store.dispatch(clearHistory());
  return store;
}

async function ask(text: string): Promise<void> {
  const box = await screen.findByLabelText<HTMLInputElement>("Message");
  await waitFor(() => expect(box.disabled).toBe(false));
  fireEvent.change(box, { target: { value: text } });
  fireEvent.click(screen.getByRole("button", { name: "Send" }));
  await screen.findByText(answer.reply);
}

describe("ChatPanel", () => {
  it("says where the text goes", async () => {
    stub();
    setup();
    expect(
      await screen.findByText(
        /not your name or contact details\) go to Anthropic/
      )
    ).toBeTruthy();
  });

  it("sends the message with the variant's state and the recent turns", async () => {
    const fetchMock = stub();
    setup();
    await ask("Hide the oldest job");
    const call = fetchMock.mock.calls.find(([url]) => url === "/api/ai/chat")!;
    const body = JSON.parse(call[1].body);
    expect(body.message).toBe("Hide the oldest job");
    expect(body.context).toMatchObject({ tone: "neutral", pageLimit: 2 });
    expect(JSON.stringify(body)).not.toContain("jane.doe");
  });

  it("lists the changes in words, with a flagged rewording unticked", async () => {
    stub();
    setup();
    await ask("do things");
    expect(screen.getByText(/Hide “Software Developer”/)).toBeTruthy();
    expect(screen.getByText("Set the tone to formal")).toBeTruthy();
    const boxes = screen.getAllByRole<HTMLInputElement>("checkbox");
    expect(boxes.map((b) => b.checked)).toEqual([true, true, false]);
    expect(
      screen.getByText(/Check this one, not ticked automatically/)
    ).toBeTruthy();
    expect(screen.getByText("A rewording needs your check.")).toBeTruthy();
  });

  it("applies only the ticked changes, as one undoable step, and Undo takes them back", async () => {
    stub();
    const store = setup();
    await ask("do things");
    expect(activeVariantSelector(store.getState()).tone).toBe("neutral");
    fireEvent.click(screen.getByRole("button", { name: "Apply 2 selected" }));
    const variant = activeVariantSelector(store.getState());
    expect(variant.tone).toBe("formal");
    expect(variant.selection[jobs[1].id].isVisible).toBe(false);
    // the flagged rewording was not ticked, so nothing was added to the vault
    expect(variant.selection[jobs[0].id]).toBeUndefined();
    expect(store.getState().history.past).toHaveLength(1);
    await screen.findByText("Applied 2 changes.");

    fireEvent.click(screen.getByRole("button", { name: "Undo" }));
    expect(activeVariantSelector(store.getState()).tone).toBe("neutral");
    expect(
      activeVariantSelector(store.getState()).selection[jobs[1].id]
    ).toBeUndefined();
  });

  it("applies a flagged rewording only when the user ticks it", async () => {
    stub();
    const store = setup();
    await ask("do things");
    fireEvent.click(screen.getAllByRole("checkbox")[2]);
    fireEvent.click(screen.getByRole("button", { name: "Apply 3 selected" }));
    const stored = store
      .getState()
      .vault.sections.flatMap((s) => s.items)
      .find((i) => i.id === jobs[0].id)!.bullets[0];
    expect(stored.alt?.short).toBe("Led a dashboard");
    expect(stored.text).toBe(bullet.text);
  });

  it("shows an error from the server and changes nothing", async () => {
    stub({
      chat: { code: "ai_failed", message: "The AI did not answer." },
      status: 502,
    });
    const store = setup();
    const box = await screen.findByLabelText<HTMLInputElement>("Message");
    await waitFor(() => expect(box.disabled).toBe(false));
    fireEvent.change(box, { target: { value: "hi" } });
    fireEvent.click(screen.getByRole("button", { name: "Send" }));
    await screen.findByText("The AI did not answer.");
    expect(store.getState().history.past).toHaveLength(0);
  });

  it("cannot be used without AI or with unsaved changes", async () => {
    stub({ isConfigured: false });
    setup();
    await screen.findByText(/No AI is set up for chat/);
    expect(screen.getByLabelText<HTMLInputElement>("Message").disabled).toBe(
      true
    );
    cleanup();

    stub();
    setup(false);
    await screen.findByText(/Save your changes first/);
    expect(screen.getByLabelText<HTMLInputElement>("Message").disabled).toBe(
      true
    );
  });

  it("remembers the conversation per variant after the panel is closed and reopened, and can clear it", async () => {
    stub();
    setup();
    await ask("Hide the oldest job");
    cleanup();

    // a new visit (e.g. after a reload): the same variant shows the same conversation
    setup();
    expect(await screen.findByText("Hide the oldest job")).toBeTruthy();
    expect(screen.getByText(answer.reply)).toBeTruthy();
    // applied/undo state of an earlier visit is not offered, the choices still are
    expect(screen.queryByRole("button", { name: "Undo" })).toBeNull();

    fireEvent.click(screen.getByRole("button", { name: "Clear conversation" }));
    expect(screen.queryByText("Hide the oldest job")).toBeNull();
    cleanup();
    setup();
    await screen.findByLabelText("Message");
    expect(screen.queryByText("Hide the oldest job")).toBeNull();
  });
});
