import { describe, expect, it } from "vitest";
import { JobSchema } from "@custom-types/job-types";
import { TemplateSchema } from "@custom-types/template-types";
import { CvFileSchema } from "@custom-types/vault-types";
import { buildDemo } from "@shared/demo/demo-data";
import { isVaultEmpty } from "@shared/vault/is-vault-empty";

describe("buildDemo", () => {
  it("is a filled, valid vault with two templates and a job on the first", () => {
    const demo = buildDemo();
    expect(CvFileSchema.guard(demo.file)).toBe(true);
    expect(isVaultEmpty(demo.file.vault)).toBe(false);
    expect(demo.templates).toHaveLength(2);
    demo.templates.forEach((t) => expect(TemplateSchema.guard(t)).toBe(true));
    expect(demo.jobs).toHaveLength(1);
    expect(JobSchema.guard(demo.jobs[0])).toBe(true);
    expect(demo.jobs[0].templateId).toBe(demo.templates[0].id);
  });

  it("gives a fresh copy each time, so Reset demo starts clean", () => {
    const first = buildDemo();
    first.file.vault.profile.fullName = "Changed";
    expect(buildDemo().file.vault.profile.fullName).not.toBe("Changed");
  });
});
