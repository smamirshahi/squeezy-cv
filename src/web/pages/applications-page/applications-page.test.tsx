// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import { Provider } from "react-redux";
import { configureStore } from "@reduxjs/toolkit";
import { undoableReducer } from "@store/store";
import sample from "@fixtures/sample-cv.json";
import { ApplicationSummary } from "@custom-types/application-types";
import { ApplicationsPage } from "@pages/applications-page/applications-page";
import { recallListSearch } from "@pages/applications-page/last-search";
import { createApplication } from "@shared/application/application-utils";
import { createDefaultVariant } from "@shared/variant/variant-utils";
import { splitVariant } from "@shared/variant/template-job";
import { migrateCvFile } from "@shared/vault/migrate-vault";

const file = migrateCvFile(sample);

/** The page reads the store (mark as applied), so it is rendered inside one */
function renderPage(): ReturnType<typeof render> {
  return render(
    <Provider store={configureStore({ reducer: undoableReducer })}>
      <ApplicationsPage />
    </Provider>
  );
}
const variant = createDefaultVariant(file, "v1");

beforeEach(() => {
  window.history.replaceState(null, "", "/applications");
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

function entry(
  id: string,
  company: string,
  role: string,
  status: ApplicationSummary["status"],
  appliedAt: string
): ApplicationSummary {
  return {
    id,
    company,
    role,
    status,
    appliedAt,
    jobId: "v1",
    templateId: "t1",
    jobName: "Main job",
    templateName: "Template 1",
    updatedAt: appliedAt,
    isCorrupt: false,
  };
}

interface Stub {
  applications: unknown;
  status?: number;
  jobs?: unknown[];
  templates?: { id: string; name: string; isCorrupt: boolean }[];
  /** A job by id, as `GET /api/jobs/:id` answers it */
  job?: unknown;
}

interface Call {
  url: string;
  method: string;
  body: string;
}

/** A server that answers the lists the page reads; every call is recorded */
function stubServer(stub: Stub): Call[] {
  const calls: Call[] = [];
  vi.stubGlobal(
    "fetch",
    vi.fn((url: string, init?: RequestInit) => {
      const path = String(url);
      const method = init?.method ?? "GET";
      calls.push({
        url: path,
        method,
        body: typeof init?.body === "string" ? init.body : "",
      });
      const json = (body: unknown, status = 200): Promise<Response> =>
        Promise.resolve(new Response(JSON.stringify(body), { status }));
      if (path === "/api/applications") {
        return json(stub.applications, stub.status ?? 200);
      }
      if (path === "/api/jobs") {
        return json(stub.jobs ?? []);
      }
      if (path === "/api/templates") {
        return json(stub.templates ?? []);
      }
      if (path.startsWith("/api/jobs/") && stub.job) {
        return json(stub.job);
      }
      if (path.startsWith("/api/applications/") && method === "PATCH") {
        const patch = JSON.parse(
          typeof init?.body === "string" ? init.body : "{}"
        ) as {
          status: string;
        };
        const id = path.split("/").pop();
        const summary = (stub.applications as ApplicationSummary[]).find(
          (a) => a.id === id
        )!;
        return json({
          ...createApplication(
            {
              jobId: summary.jobId,
              company: summary.company,
              role: summary.role,
            },
            file.vault,
            variant,
            summary.appliedAt,
            summary.id
          ),
          status: patch.status,
        });
      }
      // the application panel's own requests (not what these tests are about)
      return json({ code: "not_found", message: "Not found." }, 404);
    })
  );
  return calls;
}

function jobEntry(
  id: string,
  name: string,
  extra: Record<string, unknown> = {}
): Record<string, unknown> {
  return {
    id,
    name,
    templateId: "t1",
    createdAt: "2026-11-06",
    isCorrupt: false,
    ...extra,
  };
}

const list = [
  entry("a", "Acme Ltd", "Senior Dev", "rejected", "2026-10-01"),
  entry("b", "Beta Labs", "Frontend Engineer", "interview", "2026-11-05"),
  entry("c", "Core", "Tech Lead", "applied", "2026-11-02"),
];

/** The first cell of every row, in order */
function companies(): string[] {
  return screen
    .getAllByRole("row")
    .slice(1)
    .map((row) => within(row).queryAllByRole("cell")[0]?.textContent ?? "");
}

function rowOf(company: string): HTMLElement {
  return screen.getByRole("row", { name: new RegExp(company) });
}

function sidebar(): ReturnType<typeof within> {
  return within(screen.getByRole("navigation", { name: "Filter by status" }));
}

/** A real saved job, as the server would send it */
function savedJob(id: string, extra: Record<string, unknown>): unknown {
  const jobVariant = createDefaultVariant(file, id);
  return { ...splitVariant(jobVariant, "t1", "2026-11-06").job, ...extra };
}

describe("Applications page: the list", () => {
  it("lists every application, newest first, with status and date", async () => {
    stubServer({ applications: list });
    renderPage();
    await screen.findByText("Beta Labs");
    expect(companies()).toEqual(["Beta Labs", "Core", "Acme Ltd"]);
    expect(screen.getByText("5 Nov 2026")).toBeTruthy();
    expect(screen.getByText("3 jobs · 3 sent · 1 interview")).toBeTruthy();
    // the company is a link to the application
    expect(
      screen.getByRole("link", { name: "Beta Labs" }).getAttribute("href")
    ).toBe("/applications/b");
  });

  it("says '1 job' for a single job", async () => {
    stubServer({ applications: [list[0]] });
    renderPage();
    await screen.findByText("Acme Ltd");
    expect(screen.getByText("1 job · 1 sent")).toBeTruthy();
  });

  it("remembers its search for 'All applications' on an application's page", async () => {
    stubServer({ applications: list });
    renderPage();
    await screen.findByText("Beta Labs");
    fireEvent.change(
      screen.getByLabelText("Search company, role or template"),
      { target: { value: "acme" } }
    );
    expect(recallListSearch()).toBe("?q=acme");
  });

  it("has the columns Company, Role · Template, Status, Applied and an open column", async () => {
    stubServer({ applications: list });
    renderPage();
    await screen.findByText("Beta Labs");
    const headers = screen
      .getAllByRole("columnheader")
      .map((header) => header.textContent);
    expect(headers).toEqual([
      "Company",
      "Role · Template",
      "Status",
      "Applied",
      "",
    ]);
  });

  it("shows the role with its template under it", async () => {
    stubServer({ applications: list });
    renderPage();
    await screen.findByText("Beta Labs");
    const cell = within(rowOf("Beta Labs")).getAllByRole("cell")[1];
    expect(cell.textContent).toBe("Frontend EngineerTemplate 1");
  });

  it("explains the next step when there are none", async () => {
    stubServer({ applications: [] });
    renderPage();
    await screen.findByText(/No jobs yet\./);
    expect(screen.getByText(/mark it as applied/)).toBeTruthy();
  });

  it("shows an error instead of an empty list when the data cannot be read", async () => {
    stubServer({
      applications: {
        code: "corrupt",
        message: "The data could not be read.",
      },
      status: 500,
    });
    renderPage();
    await screen.findByText("The data could not be read.");
    expect(screen.queryByText(/No jobs yet\./)).toBeNull();
  });

  it("shows a damaged application as a warning, not as a missing one", async () => {
    stubServer({
      applications: [
        ...list,
        {
          id: "broken",
          company: "",
          role: "",
          status: "applied",
          appliedAt: "",
          updatedAt: "",
          isCorrupt: true,
        },
      ],
    });
    renderPage();
    await screen.findByText(/Cannot read the application/);
    sidebar()
      .getByRole("button", { name: /^Rejected/ })
      .click();
    await waitFor(() =>
      expect(screen.getByText(/Cannot read the application/)).toBeTruthy()
    );
  });
});

describe("Applications page: the Template column", () => {
  it("shows the template saved with the application", async () => {
    stubServer({
      applications: [
        {
          ...entry("a", "Acme Ltd", "Dev", "applied", "2026-11-01"),
          templateName: "Classic",
        },
      ],
    });
    renderPage();
    await screen.findByText("Acme Ltd");
    expect(within(rowOf("Acme Ltd")).getByText("Classic")).toBeTruthy();
  });

  it("falls back to the template its job uses today, for an application saved before templates", async () => {
    stubServer({
      applications: [
        {
          ...entry("a", "Acme Ltd", "Dev", "applied", "2026-11-01"),
          templateId: "",
          templateName: "",
        },
      ],
      jobs: [jobEntry("v1", "Main job", { templateId: "t9" })],
      templates: [{ id: "t9", name: "Compact", isCorrupt: false }],
    });
    renderPage();
    await screen.findByText("Acme Ltd");
    expect(await screen.findByText("Compact")).toBeTruthy();
  });

  it("shows a dash when no template can be found", async () => {
    stubServer({
      applications: [
        {
          ...entry("a", "Acme Ltd", "Dev", "applied", "2026-11-01"),
          jobId: "gone",
          templateId: "",
          templateName: "",
        },
      ],
    });
    renderPage();
    await screen.findByText("Acme Ltd");
    const cell = within(rowOf("Acme Ltd")).getAllByRole("cell")[1];
    expect(cell.textContent).toBe("Dev-");
  });

  it("shows the template of a job that was not sent", async () => {
    stubServer({
      applications: [],
      jobs: [jobEntry("j1", "Gamma", { company: "Gamma Co" })],
      templates: [{ id: "t1", name: "Single Column CV", isCorrupt: false }],
    });
    renderPage();
    await screen.findByText("Gamma Co");
    expect(await screen.findByText("Single Column CV")).toBeTruthy();
  });
});

describe("Applications page: search and sort", () => {
  it("searches company, role and template", async () => {
    stubServer({
      applications: [
        {
          ...entry("a", "Acme Ltd", "Dev", "applied", "2026-11-01"),
          templateName: "Classic",
        },
        {
          ...entry("b", "Beta", "QA Lead", "applied", "2026-11-02"),
          templateName: "Compact",
        },
      ],
    });
    renderPage();
    await screen.findByText("Beta");
    const search = screen.getByLabelText("Search company, role or template");
    fireEvent.change(search, { target: { value: "compact" } });
    expect(companies()).toEqual(["Beta"]);
    fireEvent.change(search, { target: { value: "lead" } });
    expect(companies()).toEqual(["Beta"]);
    fireEvent.change(search, { target: { value: "acme" } });
    expect(companies()).toEqual(["Acme Ltd"]);
    fireEvent.change(search, { target: { value: "zzz" } });
    expect(
      screen.getByText("No job or application matches this search.")
    ).toBeTruthy();
  });

  it("sorts newest first, and by Oldest or Company A-Z from the dropdown", async () => {
    stubServer({ applications: list });
    renderPage();
    await screen.findByText("Beta Labs");
    const sort = screen.getByRole("combobox", { name: "Sort" });
    expect(sort.textContent).toBe("Sort: Newest");
    expect(companies()).toEqual(["Beta Labs", "Core", "Acme Ltd"]);

    fireEvent.mouseDown(sort);
    fireEvent.click(screen.getByRole("option", { name: "Oldest" }));
    expect(companies()).toEqual(["Acme Ltd", "Core", "Beta Labs"]);

    fireEvent.mouseDown(screen.getByRole("combobox", { name: "Sort" }));
    fireEvent.click(screen.getByRole("option", { name: "Company A-Z" }));
    expect(companies()).toEqual(["Acme Ltd", "Beta Labs", "Core"]);
    expect(screen.getByRole("combobox", { name: "Sort" }).textContent).toBe(
      "Sort: Company A-Z"
    );
  });

  it("starts from the filters in the address (coming back from an application)", async () => {
    window.history.replaceState(null, "", "/applications?status=applied&q=co");
    stubServer({ applications: list });
    renderPage();
    await screen.findByText("Core");
    expect(companies()).toEqual(["Core"]);
    expect(
      screen.getByLabelText<HTMLInputElement>(
        "Search company, role or template"
      ).value
    ).toBe("co");
  });
});

describe("Applications page: the grouped sidebar", () => {
  it("groups the filters and shows the count of each", async () => {
    const old = entry("d", "Old Co", "Dev", "applied", "2026-01-01");
    stubServer({
      applications: [...list, old],
      jobs: [
        jobEntry("j1", "Gamma draft"),
        jobEntry("j2", "Delta ready", { stage: "ready" }),
      ],
    });
    renderPage();
    await screen.findByText("Beta Labs");
    const nav = screen.getByRole("navigation", { name: "Filter by status" });
    for (const title of ["Before sending", "Sent", "Needs a nudge"]) {
      expect(within(nav).getByText(title)).toBeTruthy();
    }
    const count = (name: RegExp): string | null =>
      sidebar().getByRole("button", { name }).textContent;
    expect(count(/^All jobs/)).toBe("All jobs6");
    expect(count(/^Draft/)).toBe("Draft1");
    expect(count(/^Ready to apply/)).toBe("Ready to apply1");
    expect(count(/^Applied/)).toBe("Applied2");
    expect(count(/^Interview/)).toBe("Interview1");
    expect(count(/^Rejected/)).toBe("Rejected1");
    expect(count(/^Withdrawn/)).toBe("Withdrawn0");
    // only the 2026-01-01 one has had no news for a month
    expect(count(/^No reply/)).toBe("No reply1");
    expect(
      sidebar()
        .getByRole("button", { name: /^All jobs/ })
        .getAttribute("aria-pressed")
    ).toBe("true");
  });

  it("leaves the 'Needs a nudge' group out when nothing needs one", async () => {
    stubServer({ applications: list });
    renderPage();
    await screen.findByText("Beta Labs");
    expect(screen.queryByText("Needs a nudge")).toBeNull();
    expect(screen.queryByRole("button", { name: /^No reply/ })).toBeNull();
  });

  it("filters by a status and keeps it in the address", async () => {
    stubServer({ applications: list });
    renderPage();
    await screen.findByText("Beta Labs");
    fireEvent.click(sidebar().getByRole("button", { name: /^Rejected/ }));
    expect(companies()).toEqual(["Acme Ltd"]);
    expect(window.location.search).toBe("?status=rejected");
    fireEvent.click(sidebar().getByRole("button", { name: /^All jobs/ }));
    expect(companies()).toHaveLength(3);
  });

  it("No reply filters the applications that had no news for a month", async () => {
    stubServer({
      applications: [
        ...list,
        entry("d", "Old Co", "Dev", "applied", "2026-01-01"),
      ],
    });
    renderPage();
    await screen.findByText("Beta Labs");
    fireEvent.click(sidebar().getByRole("button", { name: /^No reply/ }));
    expect(companies()).toEqual(["Old Co"]);
    expect(window.location.search).toBe("?status=noReply");
  });

  it("shows No reply in the row of an old Applied application", async () => {
    stubServer({
      applications: [entry("o", "Old Co", "Dev", "applied", "2020-01-01")],
    });
    renderPage();
    await screen.findByText("Old Co");
    expect(
      within(screen.getByRole("table")).getByText("No reply")
    ).toBeTruthy();
  });
});

describe("Applications page: jobs that were not sent", () => {
  const unsent = [
    jobEntry("j1", "Gamma draft"),
    jobEntry("j2", "Delta ready", { stage: "ready", company: "Delta Inc" }),
    // this job was sent already (application "a" is for job "v1"), so it is not a draft
    jobEntry("v1", "Already sent"),
  ];

  it("lists them with their stage and 'Not sent yet', named by company or, without one, by job", async () => {
    stubServer({ applications: list, jobs: unsent });
    renderPage();
    await screen.findByText("Gamma draft");
    expect(screen.getByText("Delta Inc")).toBeTruthy();
    expect(screen.queryByText("Already sent")).toBeNull();
    expect(within(rowOf("Gamma draft")).getByText("Not sent yet")).toBeTruthy();
    expect(
      within(rowOf("Gamma draft")).getByRole("combobox", {
        name: "Stage of Gamma draft",
      }).textContent
    ).toBe("Draft");
    expect(
      within(rowOf("Delta Inc")).getByRole("combobox", {
        name: "Stage of Delta ready",
      }).textContent
    ).toBe("Ready to apply");
  });

  it("filters them by Draft and Ready to apply", async () => {
    stubServer({ applications: list, jobs: unsent });
    renderPage();
    await screen.findByText("Gamma draft");
    expect(sidebar().getByRole("button", { name: /^Draft/ }).textContent).toBe(
      "Draft1"
    );
    fireEvent.click(sidebar().getByRole("button", { name: /^Ready to apply/ }));
    expect(screen.queryByText("Gamma draft")).toBeNull();
    expect(screen.getByText("Delta Inc")).toBeTruthy();
    expect(screen.queryByText("Beta Labs")).toBeNull();
  });

  it("puts jobs and applications in one list, by date", async () => {
    stubServer({
      applications: list,
      jobs: [jobEntry("j1", "Gamma draft", { createdAt: "2026-11-03" })],
    });
    renderPage();
    await screen.findByText("Gamma draft");
    // 5 Nov (Beta), 3 Nov (the draft), 2 Nov (Core), 1 Oct (Acme)
    expect(companies()).toEqual([
      "Beta Labs",
      "Gamma draft",
      "Core",
      "Acme Ltd",
    ]);
  });

  it("changes the stage of a job from the dropdown and saves it", async () => {
    const calls = stubServer({
      applications: [],
      jobs: [jobEntry("j1", "Gamma draft")],
      job: savedJob("j1", { name: "Gamma draft" }),
    });
    renderPage();
    await screen.findByText("Gamma draft");
    fireEvent.mouseDown(
      screen.getByRole("combobox", { name: "Stage of Gamma draft" })
    );
    fireEvent.click(screen.getByRole("option", { name: "Ready to apply" }));
    await waitFor(() =>
      expect(
        calls.some(
          (call) =>
            call.method === "PUT" &&
            call.url === "/api/jobs/j1" &&
            JSON.parse(call.body).stage === "ready"
        )
      ).toBe(true)
    );
    expect(
      await screen.findByRole("combobox", { name: "Stage of Gamma draft" })
    ).toBeTruthy();
    await waitFor(() =>
      expect(
        screen.getByRole("combobox", { name: "Stage of Gamma draft" })
          .textContent
      ).toBe("Ready to apply")
    );
  });
});

describe("Applications page: status, open and PDF", () => {
  it("shows the status as a pill with a dropdown of all statuses", async () => {
    stubServer({ applications: list });
    renderPage();
    await screen.findByText("Beta Labs");
    const status = within(rowOf("Beta Labs")).getByRole("combobox", {
      name: "Status of Beta Labs",
    });
    expect(status.textContent).toBe("Interview");
    fireEvent.mouseDown(status);
    const options = screen
      .getAllByRole("option")
      .map((option) => option.textContent);
    expect(options).toEqual([
      "Applied",
      "Interview",
      "Offer",
      "Accepted",
      "Rejected",
      "Withdrawn",
    ]);
  });

  it("changing the status saves it with today's date and updates the row and the counts", async () => {
    const calls = stubServer({ applications: list });
    renderPage();
    await screen.findByText("Core");
    fireEvent.mouseDown(
      within(rowOf("Core")).getByRole("combobox", { name: "Status of Core" })
    );
    fireEvent.click(screen.getByRole("option", { name: "Offer" }));
    await waitFor(() =>
      expect(
        calls.some(
          (call) =>
            call.method === "PATCH" &&
            call.url === "/api/applications/c" &&
            JSON.parse(call.body).status === "offer" &&
            /^\d{4}-\d{2}-\d{2}$/.test(JSON.parse(call.body).statusAt)
        )
      ).toBe(true)
    );
    await waitFor(() =>
      expect(
        within(rowOf("Core")).getByRole("combobox", { name: "Status of Core" })
          .textContent
      ).toBe("Offer")
    );
    expect(sidebar().getByRole("button", { name: /^Offer/ }).textContent).toBe(
      "Offer1"
    );
    // changing the status does not open the side panel
    expect(screen.queryByRole("complementary")).toBeNull();
  });

  it("has 'CV sent · View' under the date, opening the sent PDF in a new tab without opening the side panel", async () => {
    stubServer({ applications: list });
    renderPage();
    await screen.findByText("Beta Labs");
    const cell = within(rowOf("Beta Labs")).getAllByRole("cell")[3];
    expect(cell.textContent).toBe("5 Nov 2026CV sent · View");
    const view = within(cell).getByRole("link", { name: "View" });
    expect(view.getAttribute("href")).toBe("/api/applications/b/pdf");
    expect(view.getAttribute("target")).toBe("_blank");
    fireEvent.click(view);
    expect(screen.queryByRole("complementary")).toBeNull();
    // the old separate Sent CV column and its download button are gone
    expect(screen.queryByRole("columnheader", { name: "Sent CV" })).toBeNull();
    expect(screen.queryByRole("link", { name: /Download CV sent/ })).toBeNull();
  });

  it("has an open icon in the last column that opens the job in a new tab", async () => {
    stubServer({
      applications: list,
      jobs: [jobEntry("v1", "Main job"), jobEntry("j1", "Gamma draft")],
    });
    renderPage();
    await screen.findByText("Gamma draft");
    await waitFor(() =>
      expect(screen.getAllByRole("link", { name: /^Open job/ }).length).toBe(4)
    );
    const open = within(rowOf("Beta Labs")).getByRole("link", {
      name: "Open job Main job",
    });
    expect(open.getAttribute("href")).toBe("/jobs/v1?view=details");
    expect(open.getAttribute("target")).toBe("_blank");
    const last = within(rowOf("Beta Labs")).getAllByRole("cell").at(-1)!;
    expect(last.contains(open)).toBe(true);
    // the unsent job opens its own page
    expect(
      within(rowOf("Gamma draft"))
        .getByRole("link", { name: "Open job Gamma draft" })
        .getAttribute("href")
    ).toBe("/jobs/j1?view=details");
    // opening does not select the row
    fireEvent.click(open);
    expect(screen.queryByRole("complementary")).toBeNull();
  });

  it("has no open icon when the job of an application was deleted", async () => {
    stubServer({ applications: list, jobs: [] });
    renderPage();
    await screen.findByText("Beta Labs");
    expect(screen.queryByRole("link", { name: /^Open job/ })).toBeNull();
  });
});

describe("Applications page: the side panel", () => {
  it("shows an unsent job with its next step, progress and job data, and closes", async () => {
    stubServer({
      applications: [],
      jobs: [
        jobEntry("j1", "Gamma draft", {
          company: "Gamma Co",
          role: "Designer",
        }),
      ],
      templates: [{ id: "t1", name: "Single Column CV", isCorrupt: false }],
      job: savedJob("j1", {
        name: "Gamma draft",
        company: "Gamma Co",
        role: "Designer",
        url: "https://example.com/job",
        location: "London",
        workMode: "hybrid",
        employmentType: "fullTime",
        salaryMin: 50000,
        salaryMax: 60000,
        expectedSalary: 55000,
        chance: "veryHigh",
        feeling: "wantIt",
      }),
    });
    renderPage();
    await screen.findByText("Gamma Co");
    fireEvent.click(rowOf("Gamma Co"));

    const panel = within(screen.getByRole("complementary"));
    expect(panel.getByText("Next step")).toBeTruthy();
    expect(panel.getByText("Mark as applied")).toBeTruthy();
    expect(
      panel.getByRole("link", { name: "Open job" }).getAttribute("href")
    ).toBe("/jobs/j1?view=details");
    // progress: Draft done, Ready to apply not yet, Applied not sent
    expect(panel.getByText("Progress")).toBeTruthy();
    expect(panel.getByText("Created 6 Nov 2026")).toBeTruthy();
    expect(panel.getByText("Not sent yet")).toBeTruthy();
    // job data, including the template and what the list has no room for
    expect(panel.getByText("Job data")).toBeTruthy();
    expect(panel.getByText("Single Column CV")).toBeTruthy();
    expect(await panel.findByText("https://example.com/job")).toBeTruthy();
    expect(panel.getByText("London")).toBeTruthy();
    expect(panel.getByText("Hybrid")).toBeTruthy();
    expect(panel.getByText("Full time")).toBeTruthy();
    expect(panel.getByText("Very high")).toBeTruthy();
    expect(panel.getByText("I really want this job")).toBeTruthy();
    expect(panel.getByText("50,000 - 60,000")).toBeTruthy();
    expect(panel.getByText("55,000")).toBeTruthy();

    fireEvent.click(panel.getByRole("button", { name: "Close" }));
    expect(screen.queryByRole("complementary")).toBeNull();
  });

  it("leaves out the job data rows that are empty", async () => {
    stubServer({
      applications: [],
      jobs: [jobEntry("j1", "Gamma draft", { company: "Gamma Co" })],
      job: savedJob("j1", { name: "Gamma draft", company: "Gamma Co" }),
    });
    renderPage();
    await screen.findByText("Gamma Co");
    fireEvent.click(rowOf("Gamma Co"));
    const panel = within(screen.getByRole("complementary"));
    await panel.findByText("Job data");
    for (const label of ["URL", "Location", "Salary", "Expected salary"]) {
      expect(panel.queryByText(label)).toBeNull();
    }
  });

  it("changes the stage of the job from the panel", async () => {
    const calls = stubServer({
      applications: [],
      jobs: [jobEntry("j1", "Gamma draft", { company: "Gamma Co" })],
      job: savedJob("j1", { name: "Gamma draft" }),
    });
    renderPage();
    await screen.findByText("Gamma Co");
    fireEvent.click(rowOf("Gamma Co"));
    fireEvent.click(screen.getByRole("button", { name: "Mark as ready" }));
    await waitFor(() =>
      expect(
        calls.some(
          (call) =>
            call.method === "PUT" && JSON.parse(call.body).stage === "ready"
        )
      ).toBe(true)
    );
    expect(
      await screen.findByRole("button", { name: "Back to draft" })
    ).toBeTruthy();
  });

  it("shows the job data of a sent application, with the template and the job's extra fields", async () => {
    stubServer({
      applications: [
        {
          ...entry(
            "b",
            "Beta Labs",
            "Frontend Engineer",
            "interview",
            "2026-11-05"
          ),
          jobName: "Beta - Frontend",
        },
      ],
      jobs: [jobEntry("v1", "Beta - Frontend")],
      job: savedJob("v1", { location: "Leeds" }),
    });
    renderPage();
    await screen.findByText("Beta Labs");
    fireEvent.click(rowOf("Beta Labs"));
    const panel = within(screen.getByRole("complementary"));
    expect(
      panel.getByRole("heading", { name: "Frontend Engineer" })
    ).toBeTruthy();
    expect(panel.getByText("Job data")).toBeTruthy();
    expect(panel.getByText("Beta - Frontend")).toBeTruthy();
    expect(panel.getByText("Template 1")).toBeTruthy();
    expect(await panel.findByText("Leeds")).toBeTruthy();
    // the timeline is at the bottom (in the application view), not a Progress block on top
    expect(panel.queryByText("Progress")).toBeNull();
    fireEvent.click(panel.getByRole("button", { name: "Close" }));
    expect(screen.queryByRole("complementary")).toBeNull();
  });
});
