import { describe, expect, it } from "vitest";
import sample from "@fixtures/sample-cv.json";
import { TemplateSchema } from "@custom-types/template-types";
import { Variant } from "@custom-types/variant-types";
import { migrateCvFile } from "@shared/vault/migrate-vault";
import { render } from "@shared/variant/render";
import { changeSectionStyle } from "@shared/variant/section-style";
import { createVariant } from "@shared/variant/variant-utils";
import { resolveVariant, splitVariant } from "@shared/variant/template-job";

const file = migrateCvFile(sample);

function variantWith(sectionStyles?: Variant["sectionStyles"]): Variant {
  return {
    ...createVariant(file.vault, file.style, "v", "V"),
    ...(sectionStyles ? { sectionStyles } : {}),
  };
}

function sectionIdOf(type: string): string {
  const section = file.vault.sections.find((s) => s.type === type);
  if (!section) {
    throw new Error(`no ${type} section in the sample`);
  }
  return section.id;
}

describe("changeSectionStyle", () => {
  it("sets, rounds and clamps numbers", () => {
    expect(changeSectionStyle(undefined, { headingSize: 14.4 })).toEqual({
      headingSize: 14,
    });
    expect(changeSectionStyle(undefined, { headingSize: 100 })).toEqual({
      headingSize: 24,
    });
    expect(changeSectionStyle(undefined, { spaceAbove: -5 })).toEqual({
      spaceAbove: 0,
    });
  });

  it("normalises a colour and ignores an invalid one", () => {
    expect(changeSectionStyle(undefined, { headingColor: "ABC" })).toEqual({
      headingColor: "#aabbcc",
    });
    expect(
      changeSectionStyle({ headingColor: "#112233" }, { headingColor: "zzz" })
    ).toEqual({ headingColor: "#112233" });
  });

  it("null goes back to the global style and an empty result is undefined", () => {
    const style = { headingSize: 12, showDivider: false };
    expect(changeSectionStyle(style, { headingSize: null })).toEqual({
      showDivider: false,
    });
    expect(
      changeSectionStyle(style, { headingSize: null, showDivider: null })
    ).toBeUndefined();
    expect(
      changeSectionStyle({ headingColor: "#112233" }, { headingColor: "" })
    ).toBeUndefined();
  });

  it("does not change its input", () => {
    const style = { headingSize: 12 };
    changeSectionStyle(style, { headingSize: 16 });
    expect(style).toEqual({ headingSize: 12 });
  });
});

describe("section styles in templates and render", () => {
  const experienceId = sectionIdOf("experience");
  const educationId = sectionIdOf("education");

  it("an old template without sectionStyles still loads", () => {
    const { template } = splitVariant(variantWith(), "t1");
    expect(template.sectionStyles).toBeUndefined();
    expect(TemplateSchema.guard(template)).toBe(true);
  });

  it("a template with section styles is valid; a wrong shape is not", () => {
    const { template } = splitVariant(
      variantWith({ [experienceId]: { headingSize: 16 } }),
      "t1"
    );
    expect(TemplateSchema.guard(template)).toBe(true);
    expect(
      TemplateSchema.guard({
        ...template,
        sectionStyles: { x: { headingSize: "big" } },
      })
    ).toBe(false);
  });

  it("split and resolve keep the section styles", () => {
    const variant = variantWith({ [experienceId]: { showDivider: false } });
    const { template, job } = splitVariant(variant, "t1");
    expect(template.sectionStyles).toEqual(variant.sectionStyles);
    expect(resolveVariant(template, job).sectionStyles).toEqual(
      variant.sectionStyles
    );
  });

  it("render puts the style on that section only", () => {
    const style = { headingSize: 16, headingColor: "#112233" };
    const doc = render(file.vault, variantWith({ [experienceId]: style }));
    const parts = [
      ...doc.columns.fullWidth,
      ...doc.columns.left,
      ...doc.columns.right,
    ];
    const withStyle = parts.filter(
      (p) => p.kind === "section" && p.sectionStyle
    );
    expect(withStyle).toHaveLength(1);
    expect(withStyle[0].id).toBe(experienceId);
    expect(
      parts.find((p) => p.kind === "section" && p.id === educationId)
    ).not.toHaveProperty("sectionStyle");
  });

  it("render leaves an empty style out", () => {
    const doc = render(file.vault, variantWith({ [experienceId]: {} }));
    const all = [
      ...doc.columns.fullWidth,
      ...doc.columns.left,
      ...doc.columns.right,
    ];
    expect(
      all.some((p) => p.kind === "section" && p.sectionStyle !== undefined)
    ).toBe(false);
  });
});
