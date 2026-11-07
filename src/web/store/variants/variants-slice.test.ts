import { describe, expect, it } from "vitest";
import { Variant } from "@custom-types/variant-types";
import { createDefaultVault } from "@shared/vault/default-vault";
import { render } from "@shared/variant/render";
import { resolveVariant } from "@shared/variant/template-job";
import { initialState as cvDataState } from "@store/cv-data/cv-data-slice";
import {
  VariantsState,
  activeVariantSelector,
  addTemplate,
  addVariant,
  deleteTemplate,
  deleteVariant,
  duplicateVariant,
  initialState,
  insertTailoredJob,
  renameTemplate,
  renameVariant,
  setActiveVariant,
  setJobTemplate,
  setPageLimit,
  setSkillStyle,
  setTuning,
  setBulletOrders,
  setBulletSelection,
  setItemOrders,
  setItemSelection,
  setVariantAppearance,
  setVariants,
  variantsReducer,
  setTemplatesAndJobs,
  variantsSelector,
} from "@store/variants/variants-slice";

/** The variants (job drawn with its template) of a slice state */
function all(state: VariantsState): Variant[] {
  return variantsSelector({ variants: state });
}

const vault = createDefaultVault();
const style = cvDataState.style;

/** Two jobs; the second is on a template of its own ("template-second"), made on purpose */
function withTwo(): VariantsState {
  const withTemplate = variantsReducer(
    initialState,
    addTemplate({ name: "Second", id: "template-second" })
  );
  return variantsReducer(
    withTemplate,
    addVariant({
      vault,
      style,
      name: "Second",
      id: "second",
      templateId: "template-second",
    })
  );
}

describe("variants slice", () => {
  it("starts with one default variant that is active", () => {
    expect(all(initialState)).toHaveLength(1);
    expect(initialState.activeJobId).toBe(all(initialState)[0].id);
  });

  it("creates a variant, makes it active and gives it its own id", () => {
    const state = variantsReducer(
      initialState,
      addVariant({ vault, style, name: "Acme" })
    );

    expect(all(state)).toHaveLength(2);
    expect(all(state)[1].name).toBe("Acme");
    expect(all(state)[1].id).not.toBe(all(state)[0].id);
    expect(state.activeJobId).toBe(all(state)[1].id);
  });

  it("duplicates with new id and a default name, same render, independent data", () => {
    const state = variantsReducer(
      withTwo(),
      duplicateVariant({ sourceId: "second" })
    );
    const [, original, copy] = all(state);

    expect(copy.id).not.toBe(original.id);
    expect(copy.name).toBe("Second (copy)");
    expect(render(vault, copy)).toEqual(render(vault, original));
    expect(copy.selection).not.toBe(original.selection);
    expect(state.activeJobId).toBe(copy.id);
  });

  it("ignores duplicating an unknown variant", () => {
    const state = variantsReducer(
      initialState,
      duplicateVariant({ sourceId: "nope" })
    );
    expect(all(state)).toHaveLength(1);
  });

  it("renames a variant", () => {
    const state = variantsReducer(
      withTwo(),
      renameVariant({ id: "second", name: "Renamed" })
    );
    expect(all(state)[1].name).toBe("Renamed");
  });

  it("deletes a variant and moves the active one", () => {
    const state = variantsReducer(withTwo(), deleteVariant({ id: "second" }));
    expect(all(state).map((v) => v.id)).toEqual([all(initialState)[0].id]);
    expect(state.activeJobId).toBe(all(initialState)[0].id);
  });

  it("never deletes the last variant", () => {
    const state = variantsReducer(
      initialState,
      deleteVariant({ id: all(initialState)[0].id })
    );
    expect(all(state)).toHaveLength(1);
  });

  it("only activates variants that exist", () => {
    const state = withTwo();
    const other = all(initialState)[0].id;
    expect(
      variantsReducer(state, setActiveVariant({ id: other })).activeJobId
    ).toBe(other);
    expect(
      variantsReducer(state, setActiveVariant({ id: "nope" })).activeJobId
    ).toBe("second");
  });

  it("hiding an item in one variant leaves the other and the vault alone", () => {
    const state = variantsReducer(
      withTwo(),
      setItemSelection({
        jobId: "second",
        itemId: "item-1",
        change: { isVisible: false },
      })
    );
    expect(all(state)[1].selection["item-1"]).toEqual({ isVisible: false });
    expect(all(state)[0].selection["item-1"]).toBeUndefined();
  });

  it("replaces all variants and keeps the active one valid", () => {
    const loaded = all(withTwo());
    const state = variantsReducer(
      { ...initialState, activeJobId: "gone" },
      setVariants(loaded)
    );
    expect(state.activeJobId).toBe(loaded[0].id);
    expect(all(variantsReducer(state, setVariants([])))).toHaveLength(1);
  });

  it("selects the active variant", () => {
    const state = withTwo();
    expect(activeVariantSelector({ variants: state }).id).toBe("second");
  });
});

describe("variants slice: bullets, order and appearance", () => {
  it("sets a bullet selection in one variant only", () => {
    const state = variantsReducer(
      withTwo(),
      setBulletSelection({
        jobId: "second",
        itemId: "i",
        bulletId: "b",
        change: { isVisible: false },
      })
    );
    expect(all(state)[1].selection.i.bullets?.b.isVisible).toBe(false);
    expect(all(state)[0].selection.i).toBeUndefined();
  });

  it("sets several item orders at once", () => {
    const state = variantsReducer(
      withTwo(),
      setItemOrders({ jobId: "second", orders: { a: 1, b: 0 } })
    );
    expect(all(state)[1].selection.a.order).toBe(1);
    expect(all(state)[1].selection.b.order).toBe(0);
    expect(all(state)[1].selection.a.isVisible).toBe(true);
  });

  it("stores layout and style in the variant", () => {
    const layout = { fullWidth: ["personalInfo"], left: [], right: [] };
    const state = variantsReducer(
      withTwo(),
      setVariantAppearance({
        id: "second",
        layout,
        style: { ...style, paperMargin: "narrow" },
      })
    );
    expect(all(state)[1].layout).toEqual(layout);
    expect(all(state)[1].style.paperMargin).toBe("narrow");
    expect(all(state)[0].layout).not.toEqual(layout);
  });
});

describe("variants slice: bullet order", () => {
  it("sets the order of several bullets in one variant only", () => {
    const state = variantsReducer(
      withTwo(),
      setBulletOrders({
        jobId: "second",
        itemId: "i",
        orders: { a: 1, b: 0 },
      })
    );
    const bullets = all(state)[1].selection.i.bullets;
    expect(bullets?.a).toEqual({ isVisible: true, order: 1 });
    expect(bullets?.b).toEqual({ isVisible: true, order: 0 });
    expect(all(state)[0].selection.i).toBeUndefined();
  });
});

describe("templates and jobs: who owns what", () => {
  it("starts with one default template and one default job on it", () => {
    expect(initialState.templates).toHaveLength(1);
    expect(initialState.jobs).toHaveLength(1);
    expect(initialState.jobs[0].templateId).toBe(initialState.templates[0].id);
  });

  it("hiding an item changes only the job", () => {
    const before = withTwo();
    const after = variantsReducer(
      before,
      setItemSelection({
        jobId: "second",
        itemId: "item-1",
        change: { isVisible: false },
      })
    );
    expect(after.templates).toBe(before.templates);
    expect(after.jobs[1].selection["item-1"]).toEqual({ isVisible: false });
    expect(after.jobs[0]).toBe(before.jobs[0]);
  });

  it("changing a font (style) changes only the template", () => {
    const before = withTwo();
    const after = variantsReducer(
      before,
      setVariantAppearance({
        id: "second",
        layout: before.templates[1].layout,
        style: {
          ...before.templates[1].style,
          paperMargin: "narrow",
        },
      })
    );
    expect(after.jobs).toBe(before.jobs);
    expect(after.templates[1].style.paperMargin).toBe("narrow");
    expect(after.templates[0]).toBe(before.templates[0]);
  });

  it("page limit and skill style go to the template, tone and tuning to the job", () => {
    const before = withTwo();
    const templateEdits = [
      setPageLimit({ id: "second", pageLimit: 1 }),
      setSkillStyle({ id: "second", display: "dots", columns: 2 }),
    ];
    const afterTemplate = templateEdits.reduce(variantsReducer, before);
    expect(afterTemplate.jobs).toBe(before.jobs);
    expect(afterTemplate.templates[1].pageLimit).toBe(1);
    expect(afterTemplate.templates[1].skillDisplay).toBe("dots");

    const afterJob = [
      setTuning({
        id: "second",
        tuning: { spacing: 0.5, marginMm: 15, fontScale: 1 },
      }),
    ].reduce(variantsReducer, before);
    expect(afterJob.templates).toBe(before.templates);
    expect(afterJob.jobs[1].tuning?.marginMm).toBe(15);
  });

  it("two jobs on one template see the same style change", () => {
    let state = variantsReducer(
      withTwo(),
      setJobTemplate({
        jobId: "second",
        templateId: initialState.templates[0].id,
      })
    );
    state = variantsReducer(
      state,
      setPageLimit({ id: "default", pageLimit: 1 })
    );
    state = variantsReducer(
      state,
      setVariantAppearance({
        id: "default",
        layout: state.templates[0].layout,
        style: { ...state.templates[0].style, paperMargin: "narrow" },
      })
    );
    const [first, second] = all(state);
    expect(second.pageLimit).toBe(1);
    expect(first.style).toEqual(second.style);
    expect(second.style.paperMargin).toBe("narrow");
    // still different jobs
    expect(first.id).not.toBe(second.id);
  });

  it("ignores a move to a template that does not exist", () => {
    const state = withTwo();
    expect(
      variantsReducer(
        state,
        setJobTemplate({ jobId: "second", templateId: "x" })
      )
    ).toBe(state);
  });

  it("deleting a job keeps its template: templates are reusable and deleted on their own", () => {
    const shared = variantsReducer(
      withTwo(),
      setJobTemplate({
        jobId: "second",
        templateId: initialState.templates[0].id,
      })
    );
    const afterShared = variantsReducer(
      shared,
      deleteVariant({ id: "second" })
    );
    expect(afterShared.templates.map((t) => t.id)).toContain(
      initialState.templates[0].id
    );
    const own = variantsReducer(withTwo(), deleteVariant({ id: "second" }));
    expect(own.templates.map((t) => t.id)).toContain("template-second");
  });

  it("a copy of a job shares the template of the source, so a style change reaches both", () => {
    const state = variantsReducer(
      withTwo(),
      duplicateVariant({ sourceId: "second", id: "copy" })
    );
    const copy = state.jobs.find((j) => j.id === "copy")!;
    const source = state.jobs.find((j) => j.id === "second")!;
    expect(copy.templateId).toBe(source.templateId);
    expect(state.templates).toHaveLength(2);
    const edited = variantsReducer(
      state,
      setPageLimit({ id: "copy", pageLimit: 1 })
    );
    expect(all(edited).find((v) => v.id === "second")?.pageLimit).toBe(1);
    expect(all(edited).find((v) => v.id === "copy")?.pageLimit).toBe(1);
  });

  it("a new job shares the template of the active job unless another is chosen", () => {
    const state = variantsReducer(
      withTwo(),
      addVariant({ vault, style, name: "Third", id: "third" })
    );
    expect(state.templates).toHaveLength(2);
    expect(state.jobs.find((j) => j.id === "third")?.templateId).toBe(
      "template-second"
    );
    const chosen = variantsReducer(
      withTwo(),
      addVariant({
        vault,
        style,
        name: "Third",
        id: "third",
        templateId: initialState.templates[0].id,
      })
    );
    expect(chosen.jobs.find((j) => j.id === "third")?.templateId).toBe(
      initialState.templates[0].id
    );
  });

  it("adds a template that is a copy of the active job's, without moving any job", () => {
    const state = variantsReducer(
      withTwo(),
      addTemplate({ name: "Template 3", id: "t3" })
    );
    const added = state.templates.find((t) => t.id === "t3")!;
    expect(added.name).toBe("Template 3");
    expect(added.layout).toEqual(state.templates[1].layout);
    expect(state.jobs.map((j) => j.templateId)).toEqual(
      withTwo().jobs.map((j) => j.templateId)
    );
  });

  it("renames a template", () => {
    const state = variantsReducer(
      withTwo(),
      renameTemplate({ id: "template-second", name: "Compact" })
    );
    expect(state.templates[1].name).toBe("Compact");
    expect(state.jobs.map((j) => j.name)).toEqual(["Default", "Second"]);
  });

  it("refuses to delete a template a job uses, or the last template", () => {
    const used = withTwo();
    expect(
      variantsReducer(used, deleteTemplate({ id: "template-second" }))
    ).toBe(used);
    expect(
      variantsReducer(
        initialState,
        deleteTemplate({ id: initialState.templates[0].id })
      )
    ).toBe(initialState);
  });

  it("deletes a template no job uses", () => {
    const state = variantsReducer(
      withTwo(),
      addTemplate({ name: "Spare", id: "spare" })
    );
    const after = variantsReducer(state, deleteTemplate({ id: "spare" }));
    expect(after.templates.map((t) => t.id)).not.toContain("spare");
    expect(after.templates).toHaveLength(2);
  });
});

describe("selectors", () => {
  it("the active variant is the active job drawn with its template", () => {
    const state = withTwo();
    const active = activeVariantSelector({ variants: state });
    expect(active).toEqual(resolveVariant(state.templates[1], state.jobs[1]));
  });

  it("is memoised: the same object until the job or its template changes", () => {
    const state = withTwo();
    const first = activeVariantSelector({ variants: state });
    expect(activeVariantSelector({ variants: { ...state } })).toBe(first);

    // editing another job keeps the active variant's identity
    const otherEdited = variantsReducer(
      state,
      setItemSelection({
        jobId: "default",
        itemId: "i",
        change: { isVisible: false },
      })
    );
    expect(activeVariantSelector({ variants: otherEdited })).toBe(first);

    // editing the active job or its template gives a new one
    const jobEdited = variantsReducer(
      state,
      setItemSelection({
        jobId: "second",
        itemId: "i",
        change: { isVisible: false },
      })
    );
    expect(activeVariantSelector({ variants: jobEdited })).not.toBe(first);
    const templateEdited = variantsReducer(
      state,
      setPageLimit({ id: "second", pageLimit: 1 })
    );
    expect(activeVariantSelector({ variants: templateEdited })).not.toBe(first);
  });

  it("the list of variants is memoised too", () => {
    const state = withTwo();
    const list = variantsSelector({ variants: state });
    expect(variantsSelector({ variants: { ...state } })).toBe(list);
    expect(
      variantsSelector({
        variants: variantsReducer(state, setActiveVariant({ id: "default" })),
      })
    ).toBe(list);
  });
});

describe("loading templates and jobs", () => {
  it("moves a job whose template is missing to the first template", () => {
    const state = variantsReducer(
      initialState,
      setTemplatesAndJobs({
        templates: initialState.templates,
        jobs: [{ ...initialState.jobs[0], templateId: "gone" }],
      })
    );
    expect(state.jobs[0].templateId).toBe(initialState.templates[0].id);
  });

  it("gives the defaults for an empty load and keeps a valid active job", () => {
    const empty = variantsReducer(
      withTwo(),
      setTemplatesAndJobs({ templates: [], jobs: [] })
    );
    expect(empty.templates).toHaveLength(1);
    expect(empty.jobs).toHaveLength(1);
    const kept = variantsReducer(
      withTwo(),
      setTemplatesAndJobs({
        templates: withTwo().templates,
        jobs: withTwo().jobs,
      })
    );
    expect(kept.activeJobId).toBe("second");
  });
});

describe("insertTailoredJob", () => {
  const first = initialState.jobs[0];

  it("adds a job on an existing template, makes it active and changes nothing else", () => {
    const job = { ...first, id: "tailored", templateId: first.templateId };
    const next = variantsReducer(initialState, insertTailoredJob({ job }));
    expect(next.jobs.map((j) => j.id)).toEqual([first.id, "tailored"]);
    expect(next.activeJobId).toBe("tailored");
    expect(next.templates).toBe(initialState.templates);
  });

  it("adds the template copy together with the job", () => {
    const template = {
      ...initialState.templates[0],
      id: "copy",
      name: "T (tailored)",
    };
    const job = { ...first, id: "tailored", templateId: "copy" };
    const next = variantsReducer(
      initialState,
      insertTailoredJob({ job, template })
    );
    expect(next.templates.map((t) => t.id)).toEqual([
      initialState.templates[0].id,
      "copy",
    ]);
    expect(next.jobs[1].templateId).toBe("copy");
  });

  it("ignores a job whose template does not exist", () => {
    const job = { ...first, id: "x", templateId: "nope" };
    expect(
      variantsReducer(initialState, insertTailoredJob({ job })).jobs
    ).toHaveLength(1);
  });
});
