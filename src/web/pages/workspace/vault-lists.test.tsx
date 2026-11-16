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

describe("award dates are month pickers", () => {
  const openFirst = (): void => {
    fireEvent.click(
      within(screen.getByRole("list", { name: "Items" })).getAllByRole(
        "link"
      )[0]
    );
  };

  it("lists a stored date in the template's date format", () => {
    setup([], "/vault/awards", [{ title: "Poster", date: "2024-03-01" }]);
    expect(rows()[0]).toContain("Mar 2024");
    expect(rows()[0]).not.toContain("2024-03-01");
  });

  it("edits the date with a month input and stores the first day of the month", () => {
    const store = setup([], "/vault/awards", [
      { title: "Poster", date: "2024-03-01" },
    ]);
    openFirst();
    const date = screen.getByLabelText<HTMLInputElement>("Date");
    expect(date.type).toBe("month");
    expect(date.value).toBe("2024-03");
    fireEvent.change(date, { target: { value: "2024-05" } });
    fireEvent.click(screen.getByRole("button", { name: "Apply" }));
    expect(
      store.getState().vault.sections.find((x) => x.id === "awards")!.items[0]
        .fields.date
    ).toBe("2024-05-01");
  });

  it("keeps an older text date and shows it as a note instead of losing it", () => {
    const store = setup([], "/vault/awards", [
      { title: "Poster", date: "2015" },
    ]);
    expect(rows()[0]).toContain("2015");
    openFirst();
    expect(screen.getByLabelText<HTMLInputElement>("Date").value).toBe("");
    expect(screen.getByText("Saved before as text: “2015”")).toBeTruthy();
    expect(
      store.getState().vault.sections.find((x) => x.id === "awards")!.items[0]
        .fields.date
    ).toBe("2015");
  });
});

describe("Add new item", () => {
  it("focuses the first input of a new item, and starts a job with Current unchecked", () => {
    const store = setup([], "/vault/experience");
    fireEvent.click(screen.getByRole("button", { name: "Add new experience" }));
    expect(document.activeElement).toBe(screen.getByLabelText("Job title"));
    expect(
      screen.getByRole<HTMLInputElement>("checkbox", { name: "Current" })
        .checked
    ).toBe(false);
    expect(screen.getByLabelText<HTMLInputElement>("End").disabled).toBe(false);
    const created = store
      .getState()
      .vault.sections.find((x) => x.id === "experience")!.items[0];
    expect(created.fields.endDate).toMatch(/^\d{4}-\d{2}-01$/);
  });

  it("starts education with Current unchecked and focuses its first input", () => {
    setup([], "/vault/education");
    fireEvent.click(screen.getByRole("button", { name: "Add new education" }));
    expect(document.activeElement).toBe(screen.getByLabelText("Degree"));
    expect(
      screen.getByRole<HTMLInputElement>("checkbox", { name: "Current" })
        .checked
    ).toBe(false);
  });

  it("still opens only one empty job: Add again reopens it and focuses it", () => {
    const store = setup([], "/vault/experience");
    const add = (): void => {
      fireEvent.click(
        screen.getByRole("button", { name: "Add new experience" })
      );
    };
    add();
    (document.activeElement as HTMLElement).blur();
    add();
    expect(
      store.getState().vault.sections.find((x) => x.id === "experience")!.items
    ).toHaveLength(1);
    expect(document.activeElement).toBe(screen.getByLabelText("Job title"));
  });

  it("does not give other sections an end date", () => {
    const store = setup([], "/vault/awards");
    fireEvent.click(screen.getByRole("button", { name: "Add new item" }));
    expect(
      store.getState().vault.sections.find((x) => x.id === "awards")!.items[0]
        .fields.endDate
    ).toBeUndefined();
  });
});

describe("pasted BibTeX stays in its box", () => {
  const ENTRY =
    "@article{key, title = {A paper}, author = {Doe, Jane}, journal = {Nature}, year = {2024}}";

  it("keeps the text after it parsed, and the fields are filled from it", () => {
    setup([{ title: "Existing", year: "2020" }]);
    fireEvent.click(
      within(screen.getByRole("list", { name: "Items" })).getAllByRole(
        "link"
      )[0]
    );
    const box = screen.getByLabelText<HTMLTextAreaElement>(
      "Paste BibTeX or LaTeX entry"
    );
    fireEvent.change(box, { target: { value: ENTRY } });
    expect(box.value).toBe(ENTRY);
    expect(screen.getByLabelText<HTMLInputElement>("Title").value).toBe(
      "A paper"
    );
  });

  it("keeps text that is not an entry, with the message, and a new item starts empty", () => {
    setup([{ title: "Existing", year: "2020" }]);
    fireEvent.click(
      within(screen.getByRole("list", { name: "Items" })).getAllByRole(
        "link"
      )[0]
    );
    const box = screen.getByLabelText<HTMLTextAreaElement>(
      "Paste BibTeX or LaTeX entry"
    );
    fireEvent.change(box, { target: { value: "not an entry" } });
    expect(box.value).toBe("not an entry");
    expect(
      screen.getByText("No BibTeX entry found in this text.")
    ).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Add new item" }));
    expect(
      screen.getByLabelText<HTMLTextAreaElement>("Paste BibTeX or LaTeX entry")
        .value
    ).toBe("");
  });

  it("focuses the paste box when a new publication is added", () => {
    setup([{ title: "Existing", year: "2020" }]);
    fireEvent.click(screen.getByRole("button", { name: "Add new item" }));
    expect(document.activeElement).toBe(
      screen.getByLabelText("Paste BibTeX or LaTeX entry")
    );
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
