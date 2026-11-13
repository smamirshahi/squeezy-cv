// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  cleanup,
  fireEvent,
  render,
  screen,
  within,
} from "@testing-library/react";
import { Provider } from "react-redux";
import { configureStore } from "@reduxjs/toolkit";
import { VaultPage } from "@pages/workspace/vault-page";
import { rootReducer } from "@store/store";
import { AppStore } from "@store/store-helper";
import { addItem, setVault } from "@store/vault/vault-slice";
import { createDefaultVault } from "@shared/vault/default-vault";

afterEach(cleanup);
beforeEach(() => window.history.replaceState(null, "", "/vault/publications"));

function setup(
  publications: { title: string; year: string }[],
  path = "/vault/publications",
  awards: { title: string; date: string }[] = []
): AppStore {
  window.history.replaceState(null, "", path);
  const store: AppStore = configureStore({ reducer: rootReducer });
  store.dispatch(setVault(createDefaultVault()));
  for (const fields of publications) {
    store.dispatch(addItem({ sectionId: "publications", fields }));
  }
  for (const fields of awards) {
    store.dispatch(addItem({ sectionId: "awards", fields }));
  }
  render(
    <Provider store={store}>
      <VaultPage />
    </Provider>
  );
  return store;
}

function rows(): string[] {
  return within(screen.getByRole("list", { name: "Items" }))
    .getAllByRole("listitem")
    .map((row) => row.textContent ?? "");
}

const PAPERS = [
  { title: "Old paper", year: "2016" },
  { title: "New paper", year: "2022" },
  { title: "Middle paper", year: "2018" },
];

describe("publication list", () => {
  it("shows newest year first with the year on the right and no arrows", () => {
    setup(PAPERS);
    const shown = rows();
    expect(shown[0]).toContain("New paper");
    expect(shown[0]).toContain("2022");
    expect(shown[1]).toContain("Middle paper");
    expect(shown[2]).toContain("Old paper");
    expect(screen.queryByTestId("ArrowUpwardIcon")).toBeNull();
    expect(screen.queryByLabelText(/Move .* up/)).toBeNull();
  });

  it("reverses the order by clicking the active column and sorts by title from its header", () => {
    setup(PAPERS);
    // the column headers are the sort controls; Year is active (newest first)
    fireEvent.click(
      screen.getByRole("button", { name: "Sort by Year (now newest first)" })
    );
    expect(rows()[0]).toContain("Old paper");

    fireEvent.click(
      screen.getByRole("button", { name: /^Sort by Publication/ })
    );
    expect(
      screen.getByRole("button", { name: "Sort by Publication (now A to Z)" })
    ).toBeTruthy();
    expect(rows().map((row) => row.split("20")[0].trim())).toEqual([
      "Middle paper",
      "New paper",
      "Old paper",
    ]);
  });

  it("has no sort control with fewer than two items", () => {
    setup([PAPERS[0]]);
    expect(screen.queryByRole("button", { name: /Sort by/ })).toBeNull();
  });

  it("shows full titles, not cut at 60 characters", () => {
    const title =
      "Mesh-free SPH modeling of sediment scouring and flushing in a long channel";
    setup([{ title, year: "2016" }]);
    expect(rows()[0]).toContain(title);
  });

  it("Add new item opens the existing empty item instead of adding another", () => {
    const store = setup(PAPERS);
    const count = () =>
      store.getState().vault.sections.find((s) => s.id === "publications")!
        .items.length;
    fireEvent.click(screen.getByRole("button", { name: "Add new item" }));
    expect(count()).toBe(4);
    fireEvent.click(screen.getByRole("button", { name: "Add new item" }));
    expect(count()).toBe(4);
  });

  it("shows what you type in the row before Apply", () => {
    const store = setup([{ title: "Saved title", year: "2020" }]);
    fireEvent.click(
      within(screen.getByRole("list", { name: "Items" })).getByRole("link")
    );
    fireEvent.change(screen.getByLabelText("Title"), {
      target: { value: "Typing a new title" },
    });
    expect(rows()[0]).toContain("Typing a new title");
    expect(
      store.getState().vault.sections.find((s) => s.id === "publications")!
        .items[0].fields.title
    ).toBe("Saved title");
  });
});

describe("awards list", () => {
  it("is sorted by its date and shows it on the right", () => {
    setup([], "/vault/awards", [
      { title: "Award 2015", date: "2015" },
      { title: "Award 2024", date: "2024" },
    ]);
    const shown = rows();
    expect(shown[0]).toContain("Award 2024");
    expect(shown[0]).toContain("2024");
    expect(shown[1]).toContain("Award 2015");
  });
});

describe("Unsorted entry", () => {
  it("shows as Unsorted and can be opened while empty (no more 'AI sorting' placeholder)", () => {
    setup(PAPERS);
    const tree = screen.getByRole("complementary", { name: "Vault tree" });
    expect(within(tree).getByText("Unsorted")).toBeTruthy();
    expect(within(tree).queryByText("AI sorting")).toBeNull();
    expect(
      within(tree).getByText("Unsorted").closest("[aria-disabled='true']")
    ).toBeNull();
  });
});
