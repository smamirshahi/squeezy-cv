// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  cleanup,
  fireEvent,
  render,
  screen,
  within,
} from "@testing-library/react";
import { ApplicationSummary } from "@custom-types/application-types";
import { ApplicationsPage } from "@pages/applications-page/applications-page";

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

function stubList(body: unknown, status = 200): void {
  vi.stubGlobal(
    "fetch",
    vi.fn(() => Promise.resolve(new Response(JSON.stringify(body), { status })))
  );
}

const list = [
  entry("a", "Acme Ltd", "Senior Dev", "rejected", "2026-10-01"),
  entry("b", "Beta Labs", "Frontend Engineer", "interview", "2026-11-05"),
  entry("c", "Core", "Tech Lead", "applied", "2026-11-02"),
];

function companies(): string[] {
  return screen
    .getAllByRole("row")
    .slice(1)
    .map((row) => within(row).queryAllByRole("cell")[0]?.textContent ?? "");
}

describe("Applications page", () => {
  it("lists every application, newest first, with status and date", async () => {
    stubList(list);
    render(<ApplicationsPage />);
    await screen.findByText("Beta Labs");
    expect(companies()).toEqual(["Beta Labs", "Core", "Acme Ltd"]);
    expect(screen.getByText("5 Nov 2026")).toBeTruthy();
    expect(
      screen.getByText("3 applications: 1 waiting, 1 interview, 1 rejected")
    ).toBeTruthy();
    // the company is a link to the application
    expect(
      screen.getByRole("link", { name: "Beta Labs" }).getAttribute("href")
    ).toBe("/applications/b");
  });

  it("has a View CV and a download button per row that open the sent PDF without opening the side panel", async () => {
    stubList(list);
    render(<ApplicationsPage />);
    await screen.findByText("Beta Labs");
    const view = screen.getByRole("link", {
      name: "View CV sent to Beta Labs",
    });
    expect(view.getAttribute("href")).toBe("/api/applications/b/pdf");
    expect(view.getAttribute("target")).toBe("_blank");
    const download = screen.getByRole("link", {
      name: "Download CV sent to Beta Labs",
    });
    expect(download.getAttribute("href")).toBe("/api/applications/b/pdf");
    expect(download.hasAttribute("download")).toBe(true);
    fireEvent.click(view);
    expect(screen.queryByTitle("The CV you sent")).toBeNull();
  });

  it("shows the job and template each application was sent with, and searches them", async () => {
    stubList([
      {
        ...entry("a", "Acme Ltd", "Dev", "applied", "2026-11-01"),
        jobName: "Acme - Dev",
        templateName: "Classic",
      },
      {
        ...entry("b", "Beta", "QA", "applied", "2026-11-02"),
        jobName: "Beta - QA",
        templateName: "Compact",
      },
      {
        ...entry("c", "Old", "Ops", "applied", "2026-11-03"),
        jobName: "",
        templateName: "",
      },
    ]);
    render(<ApplicationsPage />);
    await screen.findByText("Beta");
    expect(screen.getByRole("columnheader", { name: "Job" })).toBeTruthy();
    expect(screen.getByRole("columnheader", { name: "Template" })).toBeTruthy();
    expect(screen.getByText("Acme - Dev")).toBeTruthy();
    expect(screen.getByText("Classic")).toBeTruthy();
    fireEvent.change(screen.getByLabelText("Search company or role"), {
      target: { value: "compact" },
    });
    expect(companies()).toEqual(["Beta"]);
  });

  it("searches company and role", async () => {
    stubList(list);
    render(<ApplicationsPage />);
    await screen.findByText("Beta Labs");
    fireEvent.change(screen.getByLabelText("Search company or role"), {
      target: { value: "lead" },
    });
    expect(companies()).toEqual(["Core"]);
    fireEvent.change(screen.getByLabelText("Search company or role"), {
      target: { value: "zzz" },
    });
    expect(
      screen.getByText("No application matches this search.")
    ).toBeTruthy();
  });

  it("filters by status and keeps it in the address", async () => {
    stubList(list);
    render(<ApplicationsPage />);
    await screen.findByText("Beta Labs");
    fireEvent.click(screen.getByRole("button", { name: /^Rejected/ }));
    expect(companies()).toEqual(["Acme Ltd"]);
    expect(window.location.search).toBe("?status=rejected");
    fireEvent.click(screen.getByRole("button", { name: /^All/ }));
    expect(companies()).toHaveLength(3);
  });

  it("shows a tile per status with its count, and a tile is a filter", async () => {
    const old = entry("d", "Old Co", "Dev", "applied", "2026-01-01");
    stubList([...list, old]);
    render(<ApplicationsPage />);
    await screen.findByText("Beta Labs");
    const tiles = within(
      screen.getByRole("group", { name: "Filter by status" })
    );
    const tile = (name: RegExp): HTMLElement =>
      tiles.getByRole("button", { name });
    expect(tile(/^All/).textContent).toBe("All4");
    expect(tile(/^Applied/).textContent).toBe("Applied2");
    expect(tile(/^Interview/).textContent).toBe("Interview1");
    expect(tile(/^Rejected/).textContent).toBe("Rejected1");
    expect(tile(/^Withdrawn/).textContent).toBe("Withdrawn0");
    // only the 2026-01-01 one has had no news for a month
    expect(tile(/^No reply/).textContent).toBe("No reply1");
    expect(tile(/^All/).getAttribute("aria-pressed")).toBe("true");

    fireEvent.click(tile(/^No reply/));
    expect(companies()).toEqual(["Old Co"]);
    expect(tile(/^No reply/).getAttribute("aria-pressed")).toBe("true");
    expect(window.location.search).toBe("?status=noReply");
  });

  it("starts from the filters in the address (coming back from an application)", async () => {
    window.history.replaceState(null, "", "/applications?status=applied&q=co");
    stubList(list);
    render(<ApplicationsPage />);
    await screen.findByText("Core");
    expect(companies()).toEqual(["Core"]);
    expect(
      screen.getByLabelText<HTMLInputElement>("Search company or role").value
    ).toBe("co");
  });

  it("sorts by company when the column is clicked", async () => {
    stubList(list);
    render(<ApplicationsPage />);
    await screen.findByText("Beta Labs");
    fireEvent.click(screen.getByText("Company"));
    expect(companies()).toEqual(["Acme Ltd", "Beta Labs", "Core"]);
    fireEvent.click(screen.getByText("Company"));
    expect(companies()).toEqual(["Core", "Beta Labs", "Acme Ltd"]);
  });

  it("shows No reply for an old Applied application", async () => {
    stubList([entry("o", "Old Co", "Dev", "applied", "2020-01-01")]);
    render(<ApplicationsPage />);
    await screen.findByText("Old Co");
    // the chip in the row (the tile of the same name is in the filter group)
    expect(
      within(screen.getByRole("table")).getByText("No reply")
    ).toBeTruthy();
  });

  it("explains the next step when there are none", async () => {
    stubList([]);
    render(<ApplicationsPage />);
    await screen.findByText("No applications yet.");
    expect(screen.getByText(/Mark as applied/)).toBeTruthy();
  });

  it("shows an error instead of an empty list when the data cannot be read", async () => {
    stubList({ code: "corrupt", message: "The data could not be read." }, 500);
    render(<ApplicationsPage />);
    await screen.findByText("The data could not be read.");
    expect(screen.queryByText("No applications yet.")).toBeNull();
  });

  it("shows a damaged application as a warning, not as a missing one", async () => {
    stubList([
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
    ]);
    render(<ApplicationsPage />);
    await screen.findByText(/Cannot read the application/);
    fireEvent.click(screen.getByRole("button", { name: /^Rejected/ }));
    expect(screen.getByText(/Cannot read the application/)).toBeTruthy();
  });
});
