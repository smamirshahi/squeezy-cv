// @vitest-environment jsdom
import { afterEach, describe, expect, it } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { Provider } from "react-redux";
import { configureStore } from "@reduxjs/toolkit";
import { NoJobs } from "@pages/workspace/no-jobs";
import { rootReducer } from "@store/store";

afterEach(cleanup);

function show(): void {
  render(
    <Provider store={configureStore({ reducer: rootReducer })}>
      <NoJobs />
    </Provider>
  );
}

describe("NoJobs", () => {
  it("says no job is added and offers to add one", () => {
    show();
    expect(screen.getByText("No job added yet")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Add a job" }));
    expect(screen.getByRole("dialog")).toBeTruthy();
  });
});
