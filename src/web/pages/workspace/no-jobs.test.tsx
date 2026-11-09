// @vitest-environment jsdom
import { afterEach, describe, expect, it } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { Provider } from "react-redux";
import { configureStore } from "@reduxjs/toolkit";
import { NoJobs } from "@pages/workspace/no-jobs";
import { rootReducer } from "@store/store";

afterEach(cleanup);

function show(tool: string): void {
  render(
    <Provider store={configureStore({ reducer: rootReducer })}>
      <NoJobs tool={tool} />
    </Provider>
  );
}

describe("NoJobs", () => {
  it("says no job is added and offers to add one", () => {
    show("jobs");
    expect(screen.getByText("No job added yet")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Add a job" }));
    expect(screen.getByRole("dialog")).toBeTruthy();
  });

  it("says no template on the Templates tool", () => {
    show("templates");
    expect(screen.getByText("No template yet")).toBeTruthy();
  });
});
