import { describe, expect, it } from "vitest";
import {
  MAX_REMEMBERED_TURNS,
  Turn,
  loadChat,
  saveChat,
} from "@pages/workspace/chat-memory";

function fakeStorage(): Storage {
  const data = new Map<string, string>();
  return {
    getItem: (key: string) => data.get(key) ?? null,
    setItem: (key: string, value: string) => void data.set(key, value),
    removeItem: (key: string) => void data.delete(key),
  } as unknown as Storage;
}

const turn = (id: number, over: Partial<Turn> = {}): Turn => ({
  id,
  role: id % 2 ? "user" : "assistant",
  content: `message ${id}`,
  ...over,
});

describe("chat memory", () => {
  it("remembers a conversation per variant", () => {
    const storage = fakeStorage();
    saveChat("a", [turn(1), turn(2)], storage);
    saveChat("b", [turn(3)], storage);
    expect(loadChat("a", storage).map((t) => t.content)).toEqual([
      "message 1",
      "message 2",
    ]);
    expect(loadChat("b", storage)).toHaveLength(1);
    expect(loadChat("c", storage)).toEqual([]);
  });

  it("forgets an emptied chat and keeps only the newest turns", () => {
    const storage = fakeStorage();
    saveChat("a", [turn(1)], storage);
    saveChat("a", [], storage);
    expect(loadChat("a", storage)).toEqual([]);

    const many = Array.from({ length: MAX_REMEMBERED_TURNS + 5 }, (_v, i) =>
      turn(i + 1)
    );
    saveChat("a", many, storage);
    const loaded = loadChat("a", storage);
    expect(loaded).toHaveLength(MAX_REMEMBERED_TURNS);
    expect(loaded[loaded.length - 1].id).toBe(many[many.length - 1].id);
  });

  it("ignores damaged data and drops operations that are no longer valid", () => {
    const storage = fakeStorage();
    storage.setItem("squeezy-cv-chat:a", "{not json");
    expect(loadChat("a", storage)).toEqual([]);

    storage.setItem(
      "squeezy-cv-chat:a",
      JSON.stringify([
        { id: "x", role: "user", content: "bad id" },
        turn(2, {
          operations: [
            { op: "setTone", tone: "formal" },
            { op: "launchRocket" } as never,
          ],
          selected: [true, true],
          appliedAtStep: 3,
          appliedCount: 1,
        }),
      ])
    );
    const loaded = loadChat("a", storage);
    expect(loaded).toHaveLength(1);
    expect(loaded[0].operations).toEqual([{ op: "setTone", tone: "formal" }]);
    expect(loaded[0].selected).toEqual([false]);
    // applied turns never offer Undo after a reload
    expect(loaded[0].appliedAtStep).toBe(-1);
  });

  it("survives a storage that throws", () => {
    const broken = {
      getItem: () => {
        throw new Error("blocked");
      },
      setItem: () => {
        throw new Error("full");
      },
      removeItem: () => {
        throw new Error("blocked");
      },
    } as unknown as Storage;
    expect(() => saveChat("a", [turn(1)], broken)).not.toThrow();
    expect(loadChat("a", broken)).toEqual([]);
  });
});
