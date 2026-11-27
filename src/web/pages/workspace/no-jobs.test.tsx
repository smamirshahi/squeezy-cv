// @vitest-environment jsdom
import { afterEach, describe, expect, it } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { NoJobs } from "@pages/workspace/no-jobs";

afterEach(cleanup);

describe("NoJobs", () => {
  it("sends the user to the job application first, without a dialog", () => {
    render(<NoJobs />);
    expect(screen.getByText("Start with the job application")).toBeTruthy();
    const link = screen.getByRole("link", { name: "Go to Apply" });
    expect(link.getAttribute("href")).toBe("/jobs?view=details");
    expect(screen.queryByRole("dialog")).toBeNull();
  });
});
