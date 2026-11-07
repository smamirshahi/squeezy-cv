import { mkdtemp, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { configureStore } from "@reduxjs/toolkit";
import { FastifyInstance } from "fastify";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import sample from "@fixtures/sample-cv.json";
import { buildServer } from "@server/app";
import { FileCvStorage } from "@server/storage/file-cv-storage";
import { migrateCvFile } from "@shared/vault/migrate-vault";
import {
  ApiClient,
  ApiError,
  createApiClient,
} from "@store/persistence/api-client";
import {
  loadCvFileIntoStore,
  loadFromServer,
  saveToServer,
} from "@store/persistence/persistence-actions";
import {
  isDirty,
  planSave,
  toSavedState,
} from "@store/persistence/persistence-logic";
import { rootReducer } from "@store/store";
import { AppStore } from "@store/store-helper";
import {
  addVariant,
  deleteVariant,
  setItemSelection,
  variantsSelector,
} from "@store/variants/variants-slice";
import { updateProfile } from "@store/vault/vault-slice";

let dir: string;
let app: FastifyInstance;

beforeEach(async () => {
  dir = await mkdtemp(path.join(os.tmpdir(), "cv-persist-"));
  app = buildServer({ storage: new FileCvStorage(dir) });
});

afterEach(async () => {
  await app.close();
  await rm(dir, { recursive: true, force: true });
});

/** An api client that talks to the real server code, without a network */
function clientFor(server: FastifyInstance): ApiClient {
  return createApiClient(async (url, init) => {
    const response = await server.inject({
      method: (init?.method ?? "GET") as "GET" | "PUT" | "DELETE",
      url,
      payload: init?.body as string | undefined,
      headers: init?.body ? { "content-type": "application/json" } : {},
    });
    return new Response(response.body, { status: response.statusCode });
  });
}

function newStore(): AppStore {
  return configureStore({ reducer: rootReducer });
}

const file = migrateCvFile(sample);

describe("planSave / isDirty", () => {
  const current = toSavedState(file.vault, file.metaData, file.style, [], []);

  it("plans everything when nothing is saved yet", () => {
    expect(planSave(null, current).shouldSaveVault).toBe(true);
    expect(isDirty(null, current)).toBe(true);
  });

  it("is clean when equal, and lists changed, new and removed jobs", () => {
    const saved = {
      vault: current.vault,
      templates: {},
      jobs: { a: "1", b: "2" },
    };
    expect(isDirty(saved, { ...current, jobs: { a: "1", b: "2" } })).toBe(
      false
    );
    expect(
      planSave(saved, { ...current, jobs: { a: "changed", c: "3" } })
    ).toEqual({
      shouldSaveVault: false,
      templatesToSave: [],
      templatesToDelete: [],
      jobsToSave: ["a", "c"],
      jobsToDelete: ["b"],
    });
  });
});

describe("api client", () => {
  it("reports an unreachable server", async () => {
    const api = createApiClient(() => Promise.reject(new TypeError("fail")));
    await expect(api.loadVault()).rejects.toMatchObject({
      code: "unreachable",
    });
  });

  it("passes on the server's error code", async () => {
    await expect(clientFor(app).loadVault()).rejects.toMatchObject({
      code: "not_found",
    });
  });
});

describe("load and save through the server", () => {
  it("shows nothing-saved-yet as ready and unsaved, using the fallback", async () => {
    const store = newStore();
    await loadFromServer(clientFor(app), store.dispatch, store.getState, () =>
      Promise.resolve(file)
    );
    const state = store.getState();
    expect(state.persistence.status).toBe("ready");
    expect(state.persistence.saved).toBeNull();
    expect(state.vault.profile.fullName).toBe(file.vault.profile.fullName);
  });

  it("keeps vault and variant edits across a restart of server and browser", async () => {
    const first = newStore();
    const api = clientFor(app);
    await loadFromServer(api, first.dispatch, first.getState, () =>
      Promise.resolve(file)
    );
    first.dispatch(updateProfile({ fullName: "Changed Name" }));
    first.dispatch(
      addVariant({
        vault: first.getState().vault,
        style: first.getState().cvData.style,
        name: "Acme",
        id: "acme",
      })
    );
    first.dispatch(
      setItemSelection({
        variantId: "acme",
        itemId: "exp-1",
        change: { isVisible: false },
      })
    );
    await saveToServer(api, first.dispatch, first.getState);
    expect(first.getState().persistence.saveError).toBe("");

    // "restart": a new server on the same folder, a new store
    await app.close();
    app = buildServer({ storage: new FileCvStorage(dir) });
    const second = newStore();
    await loadFromServer(clientFor(app), second.dispatch, second.getState);

    const state = second.getState();
    expect(state.persistence.status).toBe("ready");
    expect(state.vault.profile.fullName).toBe("Changed Name");
    const acme = variantsSelector(state).find((v) => v.id === "acme");
    expect(acme?.selection["exp-1"]?.isVisible).toBe(false);
    // loaded state is clean: nothing to save
    expect(
      isDirty(
        state.persistence.saved,
        toSavedState(
          state.vault,
          state.cvData.metaData,
          state.cvData.style,
          state.variants.templates,
          state.variants.jobs
        )
      )
    ).toBe(false);
  });

  it("deletes a removed variant on the server on the next save", async () => {
    const store = newStore();
    const api = clientFor(app);
    await loadFromServer(api, store.dispatch, store.getState, () =>
      Promise.resolve(file)
    );
    store.dispatch(
      addVariant({
        vault: store.getState().vault,
        style: store.getState().cvData.style,
        name: "Extra",
        id: "extra",
      })
    );
    await saveToServer(api, store.dispatch, store.getState);
    expect((await api.listJobs()).map((v) => v.id)).toContain("extra");

    store.dispatch(deleteVariant({ id: "extra" }));
    await saveToServer(api, store.dispatch, store.getState);
    expect((await api.listJobs()).map((v) => v.id)).not.toContain("extra");
  });

  it("blocks saving and does not overwrite when the saved vault cannot be read", async () => {
    const api = clientFor(app);
    await api.saveVault(file);
    const { writeFile } = await import("node:fs/promises");
    await writeFile(path.join(dir, "vault.json"), "{{{ broken");

    const store = newStore();
    await loadFromServer(api, store.dispatch, store.getState, () =>
      Promise.resolve(file)
    );
    expect(store.getState().persistence.status).toBe("error");

    await saveToServer(api, store.dispatch, store.getState);
    const { readFile } = await import("node:fs/promises");
    expect(await readFile(path.join(dir, "vault.json"), "utf8")).toBe(
      "{{{ broken"
    );
  });

  it("blocks saving when a saved job cannot be read", async () => {
    const api = clientFor(app);
    await api.saveVault(file);
    const { writeFile, mkdir } = await import("node:fs/promises");
    await mkdir(path.join(dir, "jobs"), { recursive: true });
    await writeFile(path.join(dir, "jobs", "bad.json"), "{{{");

    const store = newStore();
    await loadFromServer(api, store.dispatch, store.getState);
    expect(store.getState().persistence.status).toBe("error");
    expect(store.getState().persistence.message).toContain("bad");
  });

  it("goes offline when the server cannot be reached, and does not save", async () => {
    const api = createApiClient(() => Promise.reject(new TypeError("down")));
    const store = newStore();
    await loadFromServer(api, store.dispatch, store.getState, () =>
      Promise.resolve(file)
    );
    expect(store.getState().persistence.status).toBe("offline");
    expect(store.getState().vault.profile.fullName).toBe(
      file.vault.profile.fullName
    );

    let calls = 0;
    const counting: ApiClient = {
      ...api,
      saveVault: () => {
        calls += 1;
        return Promise.resolve();
      },
    };
    await saveToServer(counting, store.dispatch, store.getState);
    expect(calls).toBe(0);
  });

  it("reports a failed save and stays unsaved", async () => {
    const store = newStore();
    const api = clientFor(app);
    await loadFromServer(api, store.dispatch, store.getState, () =>
      Promise.resolve(file)
    );
    const failing: ApiClient = {
      ...api,
      saveVault: () => Promise.reject(new ApiError("internal", "Disk full")),
    };
    await saveToServer(failing, store.dispatch, store.getState);

    const { persistence } = store.getState();
    expect(persistence.saveError).toBe("Disk full");
    expect(persistence.saved).toBeNull();
    expect(persistence.isSaving).toBe(false);
  });

  it("loads an imported file as one default variant", () => {
    const store = newStore();
    loadCvFileIntoStore(store.dispatch, file);
    expect(variantsSelector(store.getState())).toHaveLength(1);
    expect(store.getState().variants.activeJobId).toBe(
      variantsSelector(store.getState())[0].id
    );
  });
});
