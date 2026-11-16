// @vitest-environment jsdom
import { afterEach, describe, expect, it } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { Provider } from "react-redux";
import { configureStore } from "@reduxjs/toolkit";
import sample from "@fixtures/sample-cv.json";
import { TemplateSectionsPage } from "@pages/workspace/template-sections-page";
import { updatePageStructure } from "@store/app/app-slice";
import { rootReducer } from "@store/store";
import { AppStore } from "@store/store-helper";
import { sectionsSelector, setVault } from "@store/vault/vault-slice";
import { migrateCvFile } from "@shared/vault/migrate-vault";
import { singleColumnLayout } from "@shared/vault/page-structure";

afterEach(cleanup);

function setup(): AppStore {
  const store: AppStore = configureStore({ reducer: rootReducer });
  const file = migrateCvFile(sample);
  store.dispatch(setVault(file.vault));
  store.dispatch(updatePageStructure(singleColumnLayout(file.vault.sections)));
  render(
    <Provider store={store}>
      <TemplateSectionsPage templateSwitcher={<span>Template switcher</span>} />
    </Provider>
  );
  return store;
}

function open(name: string): void {
  fireEvent.click(screen.getByRole("button", { name: `Edit ${name}` }));
}

const style = (store: AppStore) => store.getState().cvData.style;

describe("Templates > Sections", () => {
  it("starts on Personal Info and walks through the sections with Next and Back", () => {
    setup();
    const properties = screen.getByLabelText("Section properties");
    expect(properties.textContent).toContain("Section 1 of");
    expect(properties.textContent).toContain("Personal Info");
    fireEvent.click(screen.getByRole("button", { name: /^Next: / }));
    expect(properties.textContent).toContain("Section 2 of");
    expect(properties.textContent).toContain("Contact Info");
    fireEvent.click(screen.getByRole("button", { name: "Back" }));
    expect(properties.textContent).toContain("Section 1 of");
  });

  it("outlines the chosen section on the paper and only then", () => {
    setup();
    const sampleCv = screen.getByTestId("sample-cv");
    expect(
      sampleCv.querySelector('[data-cv-header="personalInfo"]')
    ).toBeTruthy();
    // the outline is a style rule on the paper; the switch turns it off
    const cssBefore = document.head.innerHTML;
    fireEvent.click(screen.getByRole("switch", { name: "Highlight section" }));
    expect(document.head.innerHTML).not.toBe(cssBefore);
  });

  it("selects a section when it is clicked on the paper", () => {
    setup();
    const education = screen
      .getByTestId("sample-cv")
      .querySelector<HTMLElement>("[data-cv-section]");
    expect(education).toBeTruthy();
    const title = education!.textContent ?? "";
    fireEvent.click(education!);
    expect(screen.getByLabelText("Section properties").textContent).toContain(
      "Section 3 of"
    );
    expect(title.length).toBeGreaterThan(0);
  });

  it("Personal Info holds the header options and saves each choice", () => {
    const store = setup();
    fireEvent.click(screen.getByRole("switch", { name: "Nationality" }));
    fireEvent.click(screen.getByRole("switch", { name: "Right to work" }));
    fireEvent.click(screen.getByRole("switch", { name: "Profile photo" }));
    expect(style(store).shouldShowNationality).toBe(true);
    expect(style(store).shouldShowRightToWork).toBe(true);
    expect(style(store).shouldShowPhoto).toBe(false);
  });

  it("Contact Info holds the links switch", () => {
    const store = setup();
    fireEvent.click(screen.getByRole("button", { name: /^Next: / }));
    fireEvent.click(
      screen.getByRole("switch", { name: "Links (LinkedIn, GitHub, ...)" })
    );
    expect(style(store).shouldShowLinks).toBe(false);
  });

  it("Work Experience and Education each have an order of their own", () => {
    const store = setup();
    const work = sectionsSelector(store.getState()).find(
      (section) => section.type === "experience"
    )!;
    const education = sectionsSelector(store.getState()).find(
      (section) => section.type === "education"
    )!;
    open(work.title);
    fireEvent.click(screen.getByRole("button", { name: "Oldest first" }));
    expect(style(store).experienceOrder).toBe("oldest");
    expect(style(store).educationOrder).toBeUndefined();
    open(education.title);
    fireEvent.click(screen.getByRole("button", { name: "Oldest first" }));
    expect(style(store).educationOrder).toBe("oldest");
    fireEvent.click(screen.getByRole("button", { name: "Newest first" }));
    expect(style(store).educationOrder).toBe("newest");
    expect(style(store).experienceOrder).toBe("oldest");
  });

  it("Skills holds the skill icon", () => {
    const store = setup();
    const skills = sectionsSelector(store.getState()).find(
      (section) => section.type === "skills"
    )!;
    open(skills.title);
    expect(screen.getAllByText("Skill Icon").length).toBeGreaterThan(0);
  });

  it("moves a section with the arrows in the header and removes it from the template", () => {
    const store = setup();
    const work = sectionsSelector(store.getState()).find(
      (section) => section.type === "experience"
    )!;
    open(work.title);
    const before = store.getState().app.structure.fullWidth;
    const at = before.indexOf(work.id);
    fireEvent.click(
      screen.getByRole("button", { name: `Move ${work.title} up` })
    );
    expect(store.getState().app.structure.fullWidth.indexOf(work.id)).toBe(
      at - 1
    );
    fireEvent.click(
      screen.getByRole("button", {
        name: `Remove ${work.title} from the template`,
      })
    );
    expect(store.getState().app.structure.fullWidth).not.toContain(work.id);
  });
});
