// @vitest-environment jsdom
import { afterEach, describe, expect, it } from "vitest";
import { cleanup, render, screen, within } from "@testing-library/react";
import { ApplicationSummary } from "@custom-types/application-types";
import { Job } from "@custom-types/job-types";
import { TemplateJobsTable } from "@pages/workspace/template-jobs-table";
import { buildDemo } from "@shared/demo/demo-data";

afterEach(cleanup);

const [baseJob] = buildDemo().jobs;
const jobs: Job[] = [
  { ...baseJob, id: "j1", name: "Acme dev", createdAt: "2026-11-01" },
  { ...baseJob, id: "j2", name: "Beta dev", createdAt: "2026-11-05" },
];
const application: ApplicationSummary = {
  id: "a1",
  company: "Acme",
  role: "Dev",
  status: "interview",
  appliedAt: "2026-11-02",
  jobId: "j1",
  templateId: "t",
  jobName: "Acme dev",
  templateName: "T",
  updatedAt: "2026-11-03",
  isCorrupt: false,
};

describe("TemplateJobsTable", () => {
  it("links each job, shows the application status and a sent PDF", () => {
    render(<TemplateJobsTable jobs={jobs} applications={[application]} />);
    const link = screen.getByRole("link", { name: "Acme dev" });
    expect(link.getAttribute("href")).toContain("/jobs/j1");
    expect(link.getAttribute("target")).toBe("_blank");
    expect(screen.getByText("interview")).toBeTruthy();
    expect(screen.getByText("Not sent")).toBeTruthy();
    expect(
      screen
        .getByRole("link", { name: "Open the sent PDF of Acme dev" })
        .getAttribute("href")
    ).toBe("/api/applications/a1/pdf");
    // a sent job has one PDF button (the sent one); only the job that was not sent can make one
    expect(
      screen.queryByRole("button", { name: "Make a PDF of Acme dev" })
    ).toBeNull();
    expect(
      screen.getAllByRole("button", { name: /Make a PDF of/ })
    ).toHaveLength(1);
  });

  it("shows exactly one PDF button for every job", () => {
    render(<TemplateJobsTable jobs={jobs} applications={[application]} />);
    for (const row of screen.getAllByRole("row").slice(1)) {
      const pdfButtons = within(row)
        .queryAllByRole("button", { name: /PDF/ })
        .concat(within(row).queryAllByRole("link", { name: /PDF/ }));
      expect(pdfButtons).toHaveLength(1);
    }
  });

  it("lists the newest job first", () => {
    render(<TemplateJobsTable jobs={jobs} applications={[]} />);
    const names = screen.getAllByRole("link").map((l) => l.textContent);
    expect(names[0]).toContain("Beta dev");
  });

  it("shows an empty state", () => {
    render(<TemplateJobsTable jobs={[]} applications={[]} />);
    expect(screen.getByText(/No jobs prepared/)).toBeTruthy();
  });
});
