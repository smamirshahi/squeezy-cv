import { vi } from "vitest";
import { configureStore } from "@reduxjs/toolkit";
import sample from "@fixtures/sample-cv.json";
import { undoableReducer } from "@store/store";
import { AppStore } from "@store/store-helper";
import { clearHistory } from "@store/history/history";
import { setVariants } from "@store/jobs/jobs-slice";
import { setVault } from "@store/vault/vault-slice";
import { AI_PROVIDER_INFO, AI_TASKS } from "@shared/ai/providers";
import { createDefaultVariant } from "@shared/variant/variant-utils";
import { migrateCvFile } from "@shared/vault/migrate-vault";

/** The AI status the server would give: Groq (online) and Ollama (local) are set up, Claude is not */
const AI_STATUS = {
  isConfigured: true,
  provider: "groq",
  providers: [
    { ...AI_PROVIDER_INFO.claude, isConfigured: false },
    { ...AI_PROVIDER_INFO.groq, isConfigured: true },
    { ...AI_PROVIDER_INFO.ollama, isConfigured: true },
  ],
  choice: Object.fromEntries(AI_TASKS.map((task) => [task, "groq"])),
};

/** Answers GET /api/ai/status; every other request is passed to `others` (default: 404) */
export function stubAiServer(
  others: (url: string, init?: RequestInit) => Response | undefined = () =>
    undefined
): ReturnType<typeof vi.fn> {
  const fetchMock = vi.fn((url: string, init?: RequestInit) => {
    if (url === "/api/ai/status") {
      return Promise.resolve(new Response(JSON.stringify(AI_STATUS)));
    }
    return Promise.resolve(
      others(url, init) ?? new Response("{}", { status: 404 })
    );
  });
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

/** A store with the sample CV and one job (id "main"), with an empty undo history */
export function sampleStore(): AppStore {
  const file = migrateCvFile(sample);
  const store: AppStore = configureStore({ reducer: undoableReducer });
  store.dispatch(setVault(file.vault));
  store.dispatch(setVariants([createDefaultVariant(file, "main")]));
  store.dispatch(clearHistory());
  return store;
}

/** The JSON body of a request made by the app */
export function bodyOf<T>(init: RequestInit | undefined): T {
  return JSON.parse(typeof init?.body === "string" ? init.body : "{}") as T;
}
