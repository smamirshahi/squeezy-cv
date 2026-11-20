// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import { AiSettingsHost } from "@pages/workspace/ai-settings-dialog";
import { openAiSettings } from "@pages/workspace/ai-settings-event";

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

const PROVIDERS = ["claude", "gemini", "groq", "ollama"].map((id) => ({
  id,
  label: id[0].toUpperCase() + id.slice(1),
  isOnline: id !== "ollama",
  recipient: id,
  detail: "detail",
  isConfigured: id === "claude" || id === "gemini",
  defaultModel: `${id}-default`,
}));

/** A stand-in server that keeps the choice and models it is given */
function server(): { puts: unknown[] } {
  const choice: Record<string, string> = {
    tailor: "claude",
    import: "claude",
    hide: "claude",
    chat: "claude",
    place: "claude",
  };
  const models: Record<string, string> = {};
  const puts: unknown[] = [];
  vi.stubGlobal(
    "fetch",
    vi.fn((_url: string, init?: RequestInit) => {
      const json = (body: unknown) =>
        Promise.resolve(new Response(JSON.stringify(body)));
      if (init?.method === "PUT") {
        const body = JSON.parse(init.body as string) as {
          models?: Record<string, string>;
        } & Record<string, string>;
        puts.push(body);
        const { models: newModels, ...providers } = body;
        for (const [task, provider] of Object.entries(providers)) {
          if (choice[task] !== provider) {
            delete models[task];
          }
          choice[task] = provider;
        }
        for (const [task, model] of Object.entries(newModels ?? {})) {
          if (model) {
            models[task] = model;
          } else {
            delete models[task];
          }
        }
        return json({ choice, models });
      }
      return json({
        isConfigured: true,
        provider: "claude",
        providers: PROVIDERS,
        choice,
        models,
      });
    })
  );
  return { puts };
}

async function openFor(task: string): Promise<void> {
  render(<AiSettingsHost />);
  act(() => openAiSettings(task as never));
  await screen.findByRole("heading", { name: "Pick what to hide" });
}

describe("AI settings: a model for one task", () => {
  it("offers a model field for a task, with the provider's default as the hint, and none for All tasks", async () => {
    server();
    await openFor("hide");
    const field = await screen.findByLabelText<HTMLInputElement>(
      "Model for this task"
    );
    expect(field.placeholder).toBe("Provider default (claude-default)");
    fireEvent.click(screen.getByRole("button", { name: /All tasks/ }));
    await waitFor(() =>
      expect(screen.queryByLabelText("Model for this task")).toBeNull()
    );
  });

  it("saves the model when leaving the field, shows it in the list, and can go back to the default", async () => {
    const { puts } = server();
    await openFor("hide");
    const field = await screen.findByLabelText<HTMLInputElement>(
      "Model for this task"
    );
    fireEvent.change(field, { target: { value: " claude-small " } });
    fireEvent.blur(field);
    await waitFor(() =>
      expect(puts).toContainEqual({ models: { hide: " claude-small " } })
    );
    const list = screen.getByRole("navigation", { name: "AI settings list" });
    await waitFor(() =>
      expect(within(list).getByText(/Claude · claude-small/)).toBeTruthy()
    );
    fireEvent.click(
      screen.getByRole("button", { name: "Use the provider default" })
    );
    await waitFor(() => expect(puts).toContainEqual({ models: { hide: "" } }));
    await waitFor(() =>
      expect(within(list).queryByText(/claude-small/)).toBeNull()
    );
  });

  it("does not save when the field did not change", async () => {
    const { puts } = server();
    await openFor("hide");
    const field = await screen.findByLabelText("Model for this task");
    fireEvent.blur(field);
    expect(puts).toEqual([]);
  });

  it("forgets the model when the task switches provider", async () => {
    server();
    await openFor("hide");
    const field = await screen.findByLabelText<HTMLInputElement>(
      "Model for this task"
    );
    fireEvent.change(field, { target: { value: "claude-small" } });
    fireEvent.blur(field);
    await waitFor(() =>
      expect(
        screen.getByRole("button", { name: "Use the provider default" })
      ).toBeTruthy()
    );
    fireEvent.click(screen.getByRole("radio", { name: /Gemini/ }));
    await waitFor(() =>
      expect(
        screen.queryByRole("button", { name: "Use the provider default" })
      ).toBeNull()
    );
    expect(
      screen.getByLabelText<HTMLInputElement>("Model for this task").value
    ).toBe("");
  });
});
