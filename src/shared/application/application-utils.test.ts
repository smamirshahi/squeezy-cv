import { describe, expect, it } from "vitest";
import sample from "@fixtures/sample-cv.json";
import {
  Application,
  ApplicationSchema,
} from "@custom-types/application-types";
import {
  ApplicationInputError,
  createApplication,
  createApplicationId,
  daysBetween,
  formatDay,
  isIsoDay,
  isNoReply,
  lastUpdateDay,
  summariseApplication,
  updateApplication,
} from "@shared/application/application-utils";
import { createVariant } from "@shared/variant/variant-utils";
import { migrateCvFile } from "@shared/vault/migrate-vault";

const file = migrateCvFile(sample);
const variant = createVariant(file.vault, file.style, "v1", "Acme");
const input = { jobId: "v1", company: " Acme Ltd ", role: "Senior Dev" };

function make(overrides = {}): Application {
  return createApplication(
    { ...input, ...overrides },
    file.vault,
    variant,
    "2026-11-06",
    "x7k2"
  );
}

describe("createApplication", () => {
  it("freezes the CV and starts as applied today", () => {
    const application = make();
    expect(ApplicationSchema.guard(application)).toBe(true);
    expect(application).toMatchObject({
      company: "Acme Ltd",
      role: "Senior Dev",
      appliedAt: "2026-11-06",
      status: "applied",
      history: [{ status: "applied", at: "2026-11-06" }],
    });
    expect(application.id).toBe("2026-11-06-acme-ltd-senior-dev-x7k2");
    expect(application.submitted?.variant).toEqual(variant);
  });

  it("records an application without a CV: how it was sent, nothing frozen", () => {
    const application = createApplication(
      {
        company: "Acme Ltd",
        role: "Senior Dev",
        withoutCv: true,
        via: " LinkedIn ",
      },
      undefined,
      undefined,
      "2026-11-06",
      "x7k2"
    );
    expect(ApplicationSchema.guard(application)).toBe(true);
    expect(application.submitted).toBeUndefined();
    expect(application.appliedVia).toBe("LinkedIn");
    expect(application.status).toBe("applied");
    expect(summariseApplication(application)).toMatchObject({
      jobId: "",
      jobName: "",
    });
  });

  it("accepts a long job link (a LinkedIn search link is far over 200 characters)", () => {
    const jobUrl = `https://www.linkedin.com/jobs/search-results/?currentJobId=1&${"x=1&".repeat(100)}`;
    expect(jobUrl.length).toBeGreaterThan(200);
    expect(make({ jobUrl }).jobUrl).toBe(jobUrl);
    expect(() => make({ jobUrl: "h".repeat(2001) })).toThrow();
  });

  it("is not changed by later edits to the vault or the variant", () => {
    const vault = structuredClone(file.vault);
    const mutable = structuredClone(variant);
    const application = createApplication(
      input,
      vault,
      mutable,
      "2026-11-06",
      "x7k2"
    );
    const before = JSON.stringify(application);
    vault.profile.fullName = "Someone Else";
    vault.sections[0].title = "Changed";
    mutable.name = "Renamed";
    mutable.selection = {};
    expect(JSON.stringify(application)).toBe(before);
  });

  it("uses the given date and drops empty optional text", () => {
    const application = make({
      appliedAt: "2026-10-01",
      notes: "  ",
      jobUrl: "",
    });
    expect(application.appliedAt).toBe("2026-10-01");
    expect(application).not.toHaveProperty("notes");
    expect(application).not.toHaveProperty("jobUrl");
  });

  it("requires company, role and a real date", () => {
    expect(() => make({ company: " " })).toThrow(ApplicationInputError);
    expect(() => make({ role: "" })).toThrow(ApplicationInputError);
    expect(() => make({ appliedAt: "2026-02-30" })).toThrow(
      ApplicationInputError
    );
    expect(() => make({ appliedAt: "yesterday" })).toThrow(
      ApplicationInputError
    );
  });
});

describe("createApplicationId", () => {
  it("is always a valid, short id", () => {
    const id = createApplicationId(
      "Zoë & Söhne GmbH ★★★",
      "x".repeat(300),
      "2026-11-06",
      "abcd1234"
    );
    expect(id).toMatch(/^[A-Za-z0-9_-]{1,64}$/);
    expect(id.startsWith("2026-11-06-zoe-sohne-gmbh")).toBe(true);
    expect(createApplicationId("★", "★", "2026-11-06", "ab12")).toBe(
      "2026-11-06-ab12"
    );
  });
});

describe("updateApplication", () => {
  it("adds a dated timeline entry for a new status", () => {
    const application = make();
    const next = updateApplication(
      application,
      {
        status: "interview",
        statusAt: "2026-11-14",
        statusNote: "Phone screen",
      },
      "2026-11-20"
    );
    expect(next.status).toBe("interview");
    expect(next.history).toEqual([
      { status: "applied", at: "2026-11-06" },
      { status: "interview", at: "2026-11-14", note: "Phone screen" },
    ]);
    expect(lastUpdateDay(next)).toBe("2026-11-14");
  });

  it("dates the change today by default and ignores an unchanged status", () => {
    const application = make();
    const same = updateApplication(
      application,
      { status: "applied" },
      "2026-11-20"
    );
    expect(same.history).toHaveLength(1);
    const rejected = updateApplication(
      application,
      { status: "rejected" },
      "2026-11-20"
    );
    expect(rejected.history[1]).toEqual({
      status: "rejected",
      at: "2026-11-20",
    });
  });

  it("edits text, can clear it, and never touches the submitted CV", () => {
    const application = make({ notes: "first" });
    const next = updateApplication(
      application,
      { company: "Acme Inc", notes: "", jobDescription: "Build things" },
      "2026-11-20"
    );
    expect(next.company).toBe("Acme Inc");
    expect(next).not.toHaveProperty("notes");
    expect(next.jobDescription).toBe("Build things");
    expect(next.submitted).toBe(application.submitted);
  });

  it("moves the first timeline entry with the applied date", () => {
    const next = updateApplication(
      make(),
      { appliedAt: "2026-11-01" },
      "2026-11-06"
    );
    expect(next.appliedAt).toBe("2026-11-01");
    expect(next.history[0].at).toBe("2026-11-01");
  });

  it("rejects bad input", () => {
    expect(() =>
      updateApplication(make(), { company: " " }, "2026-11-06")
    ).toThrow(ApplicationInputError);
    expect(() =>
      updateApplication(
        make(),
        { status: "offer", statusAt: "soon" },
        "2026-11-06"
      )
    ).toThrow(ApplicationInputError);
  });
});

describe("no reply", () => {
  it("counts whole days", () => {
    expect(daysBetween("2026-11-01", "2026-11-06")).toBe(5);
    expect(daysBetween("2026-02-01", "2026-03-01")).toBe(28);
  });

  it("is shown for Applied after 30 quiet days only", () => {
    const summary = summariseApplication(make({ appliedAt: "2026-10-01" }));
    expect(isNoReply(summary, "2026-10-31")).toBe(true);
    expect(isNoReply(summary, "2026-10-30")).toBe(false);
    expect(isNoReply({ ...summary, status: "interview" }, "2027-01-01")).toBe(
      false
    );
    expect(isNoReply({ ...summary, status: "rejected" }, "2027-01-01")).toBe(
      false
    );
  });

  it("restarts from the latest timeline entry", () => {
    const application = updateApplication(
      make({ appliedAt: "2026-09-01" }),
      { status: "interview", statusAt: "2026-10-20" },
      "2026-10-20"
    );
    const back = {
      ...summariseApplication(application),
      status: "applied" as const,
    };
    expect(isNoReply(back, "2026-11-06")).toBe(false);
  });
});

describe("isIsoDay", () => {
  it("accepts real days only", () => {
    expect(isIsoDay("2026-11-06")).toBe(true);
    expect(isIsoDay("2024-02-29")).toBe(true);
    expect(isIsoDay("2026-02-29")).toBe(false);
    expect(isIsoDay("2026-13-01")).toBe(false);
    expect(isIsoDay("6 Nov 2026")).toBe(false);
  });
});

describe("formatDay", () => {
  it("writes a day out in words", () => {
    expect(formatDay("2026-11-06")).toBe("6 Nov 2026");
    expect(formatDay("2026-01-31")).toBe("31 Jan 2026");
    expect(formatDay("")).toBe("");
  });
});

describe("job and template of an application", () => {
  const source = {
    jobId: "job1",
    templateId: "tpl1",
    jobName: "Acme - Dev",
    templateName: "Classic",
  };

  it("records the job and template ids and names, and lists them", () => {
    const application = createApplication(
      input,
      file.vault,
      variant,
      "2026-11-06",
      "x7k2",
      source
    );
    expect(ApplicationSchema.guard(application)).toBe(true);
    expect(application).toMatchObject(source);
    expect(summariseApplication(application)).toMatchObject(source);
  });

  it("without a source the job id is the variant id", () => {
    const application = make();
    expect(application.jobId).toBe("v1");
    expect(application.templateId).toBeUndefined();
  });

  it("an older file without jobId and names is still valid; its variant is the job", () => {
    const old: Record<string, unknown> = structuredClone(make());
    for (const key of ["jobId", "templateId", "jobName", "templateName"]) {
      delete old[key];
    }
    expect(ApplicationSchema.guard(old)).toBe(true);
    expect(summariseApplication(old as Application)).toMatchObject({
      jobId: "v1",
      jobName: variant.name,
      templateId: "",
      templateName: "",
    });
  });

  it("the frozen CV does not change when the source names change later", () => {
    const application = createApplication(
      input,
      file.vault,
      variant,
      "2026-11-06",
      "x7k2",
      source
    );
    const before = JSON.stringify(application);
    source.jobName = "Renamed";
    expect(JSON.stringify(application)).toBe(before);
    source.jobName = "Acme - Dev";
  });
});
