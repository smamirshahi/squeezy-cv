import { describe, expect, it } from "vitest";
import sample from "@fixtures/sample-cv.json";
import { JobSchema } from "@custom-types/job-types";
import { TemplateSchema } from "@custom-types/template-types";
import { Variant, VariantSchema } from "@custom-types/variant-types";
import { migrateCvFile } from "@shared/vault/migrate-vault";
import { render } from "@shared/variant/render";
import {
  changeJobTemplate,
  duplicateJob,
  duplicateTemplate,
  jobsUsingTemplate,
  resolveVariant,
  splitVariant,
  today,
} from "@shared/variant/template-job";
import {
  createVariant,
  updateItemSelection,
} from "@shared/variant/variant-utils";

const file = migrateCvFile(sample);
const vault = file.vault;
const firstItem = vault.sections.flatMap((s) => s.items)[0];

/** A variant with every optional field set, to prove nothing is lost */
function fullVariant(): Variant {
  const base = createVariant(vault, file.style, "job-1", "Acme");
  return {
    ...updateItemSelection(base, firstItem.id, {
      isVisible: false,
      emphasis: "high",
      relevance: 80,
    }),
    tone: "formal",
    pageLimit: 1,
    isAutoFit: true,
    fitMode: "fill",
    fitLimits: { minSpacing: 0.5, minMarginMm: 15, minBodyPt: 10 },
    tuning: { spacing: 0.9, marginMm: 16, fontScale: 0.95 },
    skillDisplay: "dots",
    skillGroupBy: "level",
    skillColumns: 2,
    skillMinLevel: 3,
    tailor: {
      at: "2026-11-07",
      jobTitle: "Dev",
      requirements: {
        jobTitle: "Dev",
        seniority: "mid",
        mustHave: ["React"],
        niceToHave: [],
        keywords: [],
      },
      gaps: ["Rust"],
      acceptedFlagged: [],
    },
  };
}

describe("splitVariant and resolveVariant", () => {
  it("round trips a variant with every field set", () => {
    const variant = fullVariant();
    const { template, job } = splitVariant(variant, "t1", "2026-11-07");
    expect(resolveVariant(template, job)).toEqual(variant);
  });

  it("round trips a minimal variant", () => {
    const variant = createVariant(vault, file.style, "v", "Plain");
    const { template, job } = splitVariant(variant, "t");
    expect(resolveVariant(template, job)).toEqual(variant);
  });

  it("gives schema-valid results", () => {
    const { template, job } = splitVariant(fullVariant(), "t1");
    expect(TemplateSchema.guard(template)).toBe(true);
    expect(JobSchema.guard(job)).toBe(true);
    expect(VariantSchema.guard(resolveVariant(template, job))).toBe(true);
  });

  it("keeps look in the template and choices in the job", () => {
    const { template, job } = splitVariant(fullVariant(), "t1");
    expect(template).not.toHaveProperty("selection");
    expect(template).not.toHaveProperty("tone");
    expect(template).not.toHaveProperty("tuning");
    expect(template).not.toHaveProperty("tailor");
    expect(job).not.toHaveProperty("layout");
    expect(job).not.toHaveProperty("style");
    // the page limit belongs to the job, not the template
    expect(template).not.toHaveProperty("pageLimit");
    expect(job.pageLimit).toBe(fullVariant().pageLimit);
    expect(job).not.toHaveProperty("skillDisplay");
    expect(job.templateId).toBe("t1");
    expect(job.id).toBe("job-1");
    expect(template.id).toBe("t1");
  });

  it("does not add keys for fields that are not set", () => {
    const { template, job } = splitVariant(
      createVariant(vault, file.style, "v", "Plain"),
      "t"
    );
    expect(Object.keys(template)).not.toContain("isAutoFit");
    expect(Object.keys(job)).not.toContain("tuning");
    expect(Object.keys(job)).not.toContain("tailor");
  });

  it("shares no references between the parts and the variant", () => {
    const variant = fullVariant();
    const { template, job } = splitVariant(variant, "t1");
    expect(template.layout).not.toBe(variant.layout);
    expect(job.selection).not.toBe(variant.selection);
    const resolved = resolveVariant(template, job);
    expect(resolved.layout).not.toBe(template.layout);
    expect(resolved.selection).not.toBe(job.selection);
  });

  it("takes the job's name and id, and the template's look", () => {
    const { template, job } = splitVariant(fullVariant(), "t1");
    const resolved = resolveVariant(
      { ...template, name: "Other" },
      { ...job, name: "Beta Ltd", pageLimit: 2 }
    );
    expect(resolved.name).toBe("Beta Ltd");
    expect(resolved.id).toBe("job-1");
    expect(resolved.pageLimit).toBe(2);
  });

  it("two jobs on one template draw the same look but different content", () => {
    const { template, job } = splitVariant(
      createVariant(vault, file.style, "a", "A"),
      "t"
    );
    const hidden = {
      ...job,
      id: "b",
      selection: { [firstItem.id]: { isVisible: false } },
    };
    const docA = render(vault, resolveVariant(template, job));
    const docB = render(vault, resolveVariant(template, hidden));
    expect(docB).not.toEqual(docA);
    expect(docB.pageLimit).toBe(docA.pageLimit);
  });
});

describe("duplicates and helpers", () => {
  it("duplicates a template without sharing anything", () => {
    const { template } = splitVariant(fullVariant(), "t1");
    const copy = duplicateTemplate(template, "t2", "Template 2");
    expect(copy.id).toBe("t2");
    expect(copy.name).toBe("Template 2");
    expect(copy.layout).toEqual(template.layout);
    expect(copy.layout).not.toBe(template.layout);
  });

  it("duplicates a job without the tailor record and keeps the template", () => {
    const { job } = splitVariant(fullVariant(), "t1");
    const copy = duplicateJob(job, "job-2", "Beta", {
      createdAt: "2026-12-01",
    });
    expect(copy.tailor).toBeUndefined();
    expect(copy.templateId).toBe("t1");
    expect(copy.createdAt).toBe("2026-12-01");
    expect(copy.selection).toEqual(job.selection);
    expect(copy.selection).not.toBe(job.selection);
    expect(job.tailor).toBeDefined();
  });

  it("duplicates a job onto another template", () => {
    const { job } = splitVariant(fullVariant(), "t1");
    expect(duplicateJob(job, "j", "n", { templateId: "t9" }).templateId).toBe(
      "t9"
    );
  });

  it("moves a job to another template and keeps its choices", () => {
    const { job } = splitVariant(fullVariant(), "t1");
    const moved = changeJobTemplate(job, "t2");
    expect(moved.templateId).toBe("t2");
    expect(moved.selection).toEqual(job.selection);
    expect(job.templateId).toBe("t1");
  });

  it("finds the jobs that use a template", () => {
    const { job } = splitVariant(fullVariant(), "t1");
    const other = { ...job, id: "x", templateId: "t2" };
    expect(jobsUsingTemplate([job, other], "t1")).toEqual([job]);
    expect(jobsUsingTemplate([job, other], "none")).toEqual([]);
  });

  it("formats today as a day", () => {
    expect(today(new Date("2026-11-07T23:59:00Z"))).toBe("2026-11-07");
  });
});

describe("schemas", () => {
  it("reject a template or job with missing or wrong fields", () => {
    const { template, job } = splitVariant(fullVariant(), "t1");
    expect(JobSchema.guard({ ...job, pageLimit: "2" })).toBe(false);
    expect(
      TemplateSchema.guard(Object.assign({}, template, { layout: null }))
    ).toBe(false);
    expect(JobSchema.guard(Object.assign({}, job, { templateId: null }))).toBe(
      false
    );
    expect(JobSchema.guard({ ...job, tone: "loud" })).toBe(false);
    expect(
      JobSchema.guard({ ...job, selection: { a: { isVisible: 1 } } })
    ).toBe(false);
  });
});

describe("hidden sections", () => {
  it("belong to the job: split and resolve keep them", () => {
    const variant: Variant = {
      ...createVariant(vault, file.style, "job-h", "Hide"),
      hiddenSections: ["education"],
    };
    const { template, job } = splitVariant(variant, "template-h");
    expect(JobSchema.guard(job)).toBe(true);
    expect(job.hiddenSections).toEqual(["education"]);
    expect("hiddenSections" in template).toBe(false);
    expect(resolveVariant(template, job).hiddenSections).toEqual(["education"]);
  });
});

describe("the page limit belongs to the job", () => {
  it("is 1 page for a job that has none", () => {
    const { template, job } = splitVariant(fullVariant(), "t1");
    const { pageLimit: _unused, ...withoutLimit } = job;
    expect(resolveVariant(template, withoutLimit).pageLimit).toBe(1);
  });

  it("comes from the job, whatever template it uses", () => {
    const { template, job } = splitVariant(fullVariant(), "t1");
    const resolved = resolveVariant(
      { ...template, name: "Other" },
      { ...job, pageLimit: 3 }
    );
    expect(resolved.pageLimit).toBe(3);
  });

  it("two jobs on one template can have different limits", () => {
    const { template, job } = splitVariant(fullVariant(), "t1");
    expect(resolveVariant(template, { ...job, pageLimit: 1 }).pageLimit).toBe(
      1
    );
    expect(resolveVariant(template, { ...job, pageLimit: 2 }).pageLimit).toBe(
      2
    );
  });
});
