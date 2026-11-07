// @vitest-environment jsdom
import { afterEach, describe, expect, it } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { Provider } from "react-redux";
import { configureStore } from "@reduxjs/toolkit";
import sample from "@fixtures/sample-cv.json";
import {
  AppThemeProvider,
  THEME_TOKENS,
  useThemeMode,
} from "@custom-styles/theme";
import { ItemBullets } from "@pages/editor-page/sections/job-section-items";
import { migrateCvFile } from "@shared/vault/migrate-vault";
import { rootReducer } from "@store/store";
import { setVault } from "@store/vault/vault-slice";
import { Item } from "@custom-types/vault-types";

afterEach(() => {
  cleanup();
  window.localStorage.clear();
});

function ThemeProbe(): JSX.Element {
  const { mode, toggle } = useThemeMode();
  return <button onClick={toggle}>mode: {mode}</button>;
}

describe("theme", () => {
  it("sets the design tokens as CSS variables and switches to dark", () => {
    render(
      <AppThemeProvider>
        <ThemeProbe />
      </AppThemeProvider>
    );
    fireEvent.click(screen.getByRole("button"));
    expect(screen.getByRole("button").textContent).toBe("mode: dark");
    expect(window.localStorage.getItem("cv-builder-theme")).toBe("dark");
    const css = [...document.querySelectorAll("style")]
      .map((style) => style.textContent)
      .join("");
    expect(css).toContain(`--bar:${THEME_TOKENS.dark.bar}`);
  });
});

describe("bullet cards", () => {
  it("shows Canon./Short/Long per bullet; only the wordings that exist are enabled", () => {
    const store = configureStore({ reducer: rootReducer });
    store.dispatch(setVault(migrateCvFile(sample).vault));
    const base = store
      .getState()
      .vault.sections.flatMap((s) => s.items)
      .find((i) => i.bullets.length > 0) as Item;
    const item: Item = {
      ...base,
      bullets: [
        { ...base.bullets[0], alt: { short: "Short version" } },
        ...base.bullets.slice(1),
      ],
    };
    render(
      <Provider store={store}>
        <ItemBullets item={item} isCard />
      </Provider>
    );
    const group = screen.getAllByRole("group", { name: "Wording" })[0];
    const buttons = group.querySelectorAll("button");
    expect([...buttons].map((b) => [b.textContent, b.disabled])).toEqual([
      ["Canon.", false],
      ["Short", false],
      ["Long", true],
    ]);
  });
});
