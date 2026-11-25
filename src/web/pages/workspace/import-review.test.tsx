// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { CURRENT_VAULT_VERSION, Item, Vault } from "@custom-types/vault-types";
import { ImportReview } from "@pages/workspace/import-review";
import { MergePlan, planImports } from "@shared/vault/merge-imports";

afterEach(cleanup);

let counter = 0;
const newId = (): string => `id-${++counter}`;

function job(fields: Record<string, string>): Item {
  return {
    id: newId(),
    fields: {
      jobTitle: "Software Developer",
      company: "Northwind Labs",
      startDate: "2019-01-01",
      endDate: "2021-12-01",
      ...fields,
    },
    bullets: [],
    tags: [],
    shouldShow: true,
  };
}

function vaultWith(items: Item[]): Vault {
  return {
    version: CURRENT_VAULT_VERSION,
    profile: { fullName: "Alex Morgan" },
    links: [],
    sections: [{ id: newId(), type: "experience", title: "Experience", items }],
  };
}

function plan(existing: Item, incoming: Item): MergePlan {
  return planImports(
    vaultWith([existing]),
    [{ fileName: "new.pdf", vault: vaultWith([incoming]) }],
    newId
  );
}

function show(value: MergePlan): void {
  render(
    <ImportReview
      plan={value}
      checked={new Set(value.proposals.map((proposal) => proposal.id))}
      onToggle={vi.fn()}
      onChoose={vi.fn()}
      onAddOthers={vi.fn()}
      onLines={vi.fn()}
    />
  );
}

describe("ImportReview item view", () => {
  it("shows the value chosen for a conflict as the change", () => {
    const value = plan(job({}), job({ endDate: "2022-06-01" }));
    const conflict = value.proposals[0].conflicts[0];
    expect(conflict.field).toBe("endDate");
    conflict.chosen = "2022-06-01";
    show(value);
    fireEvent.click(screen.getByText(/Northwind Labs/, { selector: "*" }));
    expect(screen.queryByText(/No field changes/)).toBeNull();
    expect(screen.getAllByText(/2022/).length).toBeGreaterThan(0);
  });

  it("says when nothing changes and offers all fields", () => {
    const value = plan(job({}), job({}));
    show(value);
    fireEvent.click(screen.getByText(/Northwind Labs/, { selector: "*" }));
    expect(screen.getByText(/No field changes/)).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "All fields" }));
    expect(screen.queryByText(/No field changes/)).toBeNull();
    expect(screen.getAllByText(/\(no change\)/).length).toBeGreaterThan(0);
  });

  it("labels the update checkbox and the two views in plain words", () => {
    const value = plan(job({}), job({ endDate: "2022-06-01" }));
    show(value);
    fireEvent.click(screen.getByRole("button", { name: "Go to the first" }));
    expect(
      screen.getByRole("checkbox", {
        name: /Update this item in my vault/,
      })
    ).toBeTruthy();
    expect(
      screen.getByRole("button", { name: "Only what changes" })
    ).toBeTruthy();
    expect(screen.getByRole("button", { name: "All fields" })).toBeTruthy();
  });

  it("labels the checkbox of a new item 'Add this item to my vault'", () => {
    const value = planImports(
      vaultWith([]),
      [{ fileName: "new.pdf", vault: vaultWith([job({})]) }],
      newId
    );
    show(value);
    fireEvent.click(screen.getByText(/Northwind Labs/, { selector: "*" }));
    expect(
      screen.getByRole("checkbox", { name: "Add this item to my vault" })
    ).toBeTruthy();
  });
});
