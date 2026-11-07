import { describe, expect, it } from "vitest";
import sample from "@fixtures/sample-cv.json";
import { Proposal } from "@custom-types/tailor-types";
import {
  AppliedProposal,
  Decisions,
  applyProposal,
  buildTailorRecord,
  createTailoredJob,
  defaultDecisions,
  describeItemChange,
  describeSectionMoves,
  numberChanges,
  reorderLayoutSections,
} from "@shared/ai/apply-proposal";
import { render } from "@shared/variant/render";
import { exportChecks } from "@shared/export/export-checks";
import { documentText } from "@shared/variant/document-text";
import { splitVariant, resolveVariant } from "@shared/variant/template-job";
import {
  createVariant,
  updateItemSelection,
} from "@shared/variant/variant-utils";
import { migrateCvFile } from "@shared/vault/migrate-vault";

const file = migrateCvFile(sample);
const { vault } = file;
const base = createVariant(vault, file.style, "base", "Base");

const experience = vault.sections.find((s) => s.type === "experience")!;
const [job1, job2, job3] = experience.items;

function proposal(over: Partial<Proposal> = {}): Proposal {
  return {
    items: [
      {
        itemId: job1.id,
        relevance: 0.4,
        isIncluded: true,
        isHighlighted: false,
        reason: "r",
      },
      {
        itemId: job2.id,
        relevance: 0.9,
        isIncluded: true,
        isHighlighted: true,
        reason: "r",
      },
      {
        itemId: job3.id,
        relevance: 0.1,
        isIncluded: false,
        isHighlighted: false,
        reason: "r",
      },
    ],
    bullets: [
      {
        itemId: job1.id,
        bulletId: job1.bullets[0].id,
        isIncluded: true,
        rewrite: { wording: "short", text: "Led a React dashboard" },
        reason: "r",
        flags: [],
      },
      {
        itemId: job1.id,
        bulletId: job1.bullets[1].id,
        isIncluded: false,
        reason: "r",
        flags: [],
      },
    ],
    statement: "",
    statementFlags: [],
    gaps: [],
    ...over,
  };
}

function apply(p: Proposal, d: Decisions): AppliedProposal {
  return applyProposal(vault, base, p, d, { id: "new", name: "For Acme" });
}

describe("defaultDecisions", () => {
  it("accepts everything, except a flagged rewording", () => {
    const flagged = proposal({
      bullets: [
        {
          ...proposal().bullets[0],
          flags: ['name "Kubernetes" is not in your CV'],
        },
        { ...proposal().bullets[1] },
      ],
    });
    const d = defaultDecisions(flagged);

    expect(Object.values(d.items).every((i) => i.isAccepted)).toBe(true);
    expect(d.bullets[job1.bullets[0].id]).toEqual({
      isAccepted: true,
      isRewriteAccepted: false,
    });
    expect(d.bullets[job1.bullets[1].id]).toEqual({
      isAccepted: true,
      isRewriteAccepted: true,
    });
  });
});

describe("describeItemChange", () => {
  it("shows what differs from the current variant", () => {
    const hiddenNow = updateItemSelection(base, job2.id, { isVisible: false });
    const [, second] = proposal().items;
    expect(describeItemChange(hiddenNow, second)).toEqual({
      wasVisible: false,
      isVisible: true,
      wasHighlighted: false,
      isHighlighted: true,
      hasChange: true,
    });
    expect(
      describeItemChange(base, { ...second, isHighlighted: false }).hasChange
    ).toBe(false);
  });
});

describe("applyProposal", () => {
  it("makes a new variant from the accepted suggestions and leaves the base and the vault alone", () => {
    const vaultBefore = JSON.stringify(vault);
    const baseBefore = JSON.stringify(base);
    const { variant } = apply(proposal(), defaultDecisions(proposal()));

    expect(variant.id).toBe("new");
    expect(variant.name).toBe("For Acme");
    expect(variant.layout).toEqual(base.layout);
    expect(variant.style).toEqual(base.style);
    expect(variant.selection[job3.id].isVisible).toBe(false);
    expect(variant.selection[job2.id].emphasis).toBe("high");
    expect(JSON.stringify(vault)).toBe(vaultBefore);
    expect(JSON.stringify(base)).toBe(baseBefore);
  });

  it("orders items by relevance within their section", () => {
    const { variant } = apply(proposal(), defaultDecisions(proposal()));
    const items = render(vault, variant).columns.fullWidth.flatMap((part) =>
      part.kind === "section" && part.id === experience.id
        ? part.items.map((i) => i.id)
        : []
    );
    expect(items).toEqual([job2.id, job1.id]);
  });

  it("applies nothing that was rejected: the item stays as in the current variant", () => {
    const d = defaultDecisions(proposal());
    d.items[job3.id] = { isAccepted: false };
    d.items[job2.id] = { isAccepted: false };
    const { variant } = apply(proposal(), d);

    // both stay as they were in the base variant
    expect(variant.selection[job3.id]).toEqual(base.selection[job3.id]);
    expect(variant.selection[job2.id]).toBeUndefined();
    expect(variant.selection[job1.id].isVisible).toBe(true);
  });

  it("hides a rejected-bullet suggestion's effect: nothing changes for that bullet", () => {
    const d = defaultDecisions(proposal());
    d.bullets[job1.bullets[1].id] = {
      isAccepted: false,
      isRewriteAccepted: false,
    };
    const { variant } = apply(proposal(), d);
    expect(
      variant.selection[job1.id].bullets?.[job1.bullets[1].id]
    ).toBeUndefined();
  });

  it("uses a rewording as an alternative wording, only when accepted", () => {
    const accepted = apply(proposal(), defaultDecisions(proposal()));
    expect(accepted.altUpdates).toEqual([
      {
        sectionId: experience.id,
        itemId: job1.id,
        bulletId: job1.bullets[0].id,
        wording: "short",
        text: "Led a React dashboard",
      },
    ]);
    expect(
      accepted.variant.selection[job1.id].bullets?.[job1.bullets[0].id].wording
    ).toBe("short");

    const d = defaultDecisions(proposal());
    d.bullets[job1.bullets[0].id].isRewriteAccepted = false;
    const rejected = apply(proposal(), d);
    expect(rejected.altUpdates).toEqual([]);
    expect(
      rejected.variant.selection[job1.id].bullets?.[job1.bullets[0].id].wording
    ).toBeUndefined();
  });

  it("renders the accepted wording once the alternative is in the vault", () => {
    const { variant, altUpdates } = apply(
      proposal(),
      defaultDecisions(proposal())
    );
    const withAlt = structuredClone(vault);
    for (const update of altUpdates) {
      const bullet = withAlt.sections
        .find((s) => s.id === update.sectionId)!
        .items.find((i) => i.id === update.itemId)!
        .bullets.find((b) => b.id === update.bulletId)!;
      bullet.alt = { ...bullet.alt, [update.wording]: update.text };
    }
    const part = render(withAlt, variant)
      .columns.fullWidth.flatMap((p) => (p.kind === "section" ? [p] : []))
      .find((p) => p.id === experience.id)!;
    const texts = part.items
      .find((i) => i.id === job1.id)!
      .bullets.map((b) => b.text);
    // first bullet reworded, second hidden, third untouched
    expect(texts).toEqual(["Led a React dashboard", job1.bullets[2].text]);
  });

  it("does not carry over the base's saved auto-fit result", () => {
    const fitted = {
      ...base,
      tuning: { spacing: 0.5, marginMm: 12, fontScale: 0.9 },
    };
    const { variant } = applyProposal(
      vault,
      fitted,
      proposal(),
      defaultDecisions(proposal()),
      {
        id: "n",
        name: "n",
      }
    );
    expect(variant.tuning).toBeUndefined();
  });
});

describe("section moves", () => {
  const ids = vault.sections.map((s) => s.id);
  const reversed = [...ids].reverse();

  it("reorders the sections inside each column and leaves the header parts", () => {
    const layout = {
      fullWidth: ["personalInfo", ...ids.slice(0, 2)],
      left: ids.slice(2),
      right: [],
    };
    const result = reorderLayoutSections(layout, reversed);
    expect(result.fullWidth[0]).toBe("personalInfo");
    expect(result.fullWidth.slice(1)).toEqual([ids[1], ids[0]]);
    expect(result.left).toEqual(ids.slice(2).reverse());
  });

  it("describes which sections move where (1-based)", () => {
    const moves = describeSectionMoves(vault, reversed);
    expect(moves[0]).toMatchObject({
      sectionId: ids[0],
      from: 1,
      to: ids.length,
    });
    expect(describeSectionMoves(vault, undefined)).toEqual([]);
  });

  it("applies the order to the new variant only when accepted", () => {
    const p = proposal({ sectionOrder: reversed });
    const accepted = applyProposal(
      vault,
      base,
      p,
      { ...defaultDecisions(p), isSectionOrderAccepted: true },
      { id: "n", name: "N" }
    );
    const declined = applyProposal(
      vault,
      base,
      p,
      { ...defaultDecisions(p), isSectionOrderAccepted: false },
      { id: "n", name: "N" }
    );
    const sectionIds = (v: { layout: typeof base.layout }): string[] =>
      [...v.layout.fullWidth, ...v.layout.left, ...v.layout.right].filter(
        (id) => ids.includes(id)
      );
    expect(sectionIds(declined.variant)).toEqual(sectionIds(base));
    expect(sectionIds(accepted.variant)).toEqual(
      [...sectionIds(base)].sort(
        (a, b) => reversed.indexOf(a) - reversed.indexOf(b)
      )
    );
    expect(defaultDecisions(p).isSectionOrderAccepted).toBe(true);
    expect(defaultDecisions(proposal()).isSectionOrderAccepted).toBeUndefined();
  });
});

describe("numberChanges", () => {
  it("numbers items that propose something, most relevant first, and skips the rest", () => {
    const p = proposal();
    const numbers = numberChanges(base, p);
    // job2 (0.9, highlighted) = 1, job1 (0.4, has bullet proposals) = 2
    expect(numbers.get(job2.id)).toBe(1);
    expect(numbers.get(job1.id)).toBe(2);
    expect([...numbers.values()].sort()).toEqual(
      [...numbers.values()].map((_n, i) => i + 1)
    );
    const quiet = proposal({
      items: [
        {
          itemId: job1.id,
          relevance: 0.4,
          isIncluded: true,
          isHighlighted: false,
          reason: "r",
        },
      ],
      bullets: [],
    });
    expect(numberChanges(base, quiet).size).toBe(0);
  });
});

describe("buildTailorRecord", () => {
  const requirements = {
    jobTitle: "Dev",
    seniority: "",
    mustHave: ["React"],
    niceToHave: [],
    keywords: [],
  };
  const FLAG = 'name "Kubernetes" is not in your CV';

  it("keeps only rewordings that were flagged AND accepted by hand", () => {
    const clean = proposal();
    const p = proposal({
      bullets: [{ ...clean.bullets[0], flags: [FLAG] }, clean.bullets[1]],
    });
    const decisions = defaultDecisions(p);
    // by default a flagged rewording is not accepted, so nothing is recorded
    expect(
      buildTailorRecord(requirements, p, decisions, "2026-11-06")
        .acceptedFlagged
    ).toEqual([]);
    const byHand = structuredClone(decisions);
    byHand.bullets[job1.bullets[0].id].isRewriteAccepted = true;
    const record = buildTailorRecord(requirements, p, byHand, "2026-11-06");
    expect(record.acceptedFlagged).toEqual([
      {
        bulletId: job1.bullets[0].id,
        wording: "short",
        text: "Led a React dashboard",
        flags: [FLAG],
      },
    ]);
    expect(record).toMatchObject({
      at: "2026-11-06",
      jobTitle: "Dev",
      gaps: p.gaps,
    });
    // a clean accepted rewording is never recorded
    expect(
      buildTailorRecord(requirements, clean, defaultDecisions(clean), "x")
        .acceptedFlagged
    ).toEqual([]);
  });
});

describe("createTailoredJob", () => {
  const { template, job: baseJob } = splitVariant(base, "t1", "2026-01-01");
  const record = buildTailorRecord(
    {
      jobTitle: "Dev",
      seniority: "",
      mustHave: ["React"],
      niceToHave: [],
      keywords: [],
    },
    proposal(),
    defaultDecisions(proposal()),
    "2026-02-02"
  );
  const input = {
    id: "j2",
    name: "Dev at Acme",
    copyTemplateId: "t2",
    tailor: record,
    createdAt: "2026-02-02",
  };
  function tailored(
    p: Proposal,
    d: Decisions,
    extra: Partial<typeof input & { pageLimit: number; tone: "formal" }> = {}
  ): ReturnType<typeof createTailoredJob> {
    return createTailoredJob(vault, template, baseJob, p, d, {
      ...input,
      ...extra,
    });
  }

  it("makes a job that shares the template and carries selection, relevance and the tailor record", () => {
    const before = structuredClone({ template, baseJob, vault });
    const result = tailored(proposal(), defaultDecisions(proposal()), {
      pageLimit: template.pageLimit,
      tone: "formal",
    });
    expect(result.template).toBeUndefined();
    expect(result.job.templateId).toBe("t1");
    expect(result.job.id).toBe("j2");
    expect(result.job.name).toBe("Dev at Acme");
    expect(result.job.tone).toBe("formal");
    expect(result.job.selection[job2.id].emphasis).toBe("high");
    expect(result.job.selection[job2.id].relevance).toBe(0.9);
    expect(result.job.selection[job3.id].isVisible).toBe(false);
    expect(result.job.tailor).toEqual(record);
    expect(result.job.createdAt).toBe("2026-02-02");
    expect({ template, baseJob, vault }).toEqual(before);
  });

  it("puts an accepted section order on a copy of the template and leaves the source alone", () => {
    // the sections in the reverse of the layout's order, so the layout really changes
    const ids = [
      ...template.layout.fullWidth,
      ...template.layout.left,
      ...template.layout.right,
    ]
      .filter((id) => vault.sections.some((x) => x.id === id))
      .reverse();
    const reordered = proposal({ sectionOrder: ids });
    const before = structuredClone(template);
    const result = tailored(reordered, defaultDecisions(reordered));
    expect(result.template?.id).toBe("t2");
    expect(result.template?.name).toBe(`${template.name} (tailored)`);
    expect(result.job.templateId).toBe("t2");
    expect(result.template?.layout).not.toEqual(template.layout);
    expect(result.template?.style).toEqual(template.style);
    expect(template).toEqual(before);
  });

  it("does not copy the template when the section order is not accepted", () => {
    const ids = [
      ...template.layout.fullWidth,
      ...template.layout.left,
      ...template.layout.right,
    ]
      .filter((id) => vault.sections.some((x) => x.id === id))
      .reverse();
    const reordered = proposal({ sectionOrder: ids });
    const decisions = {
      ...defaultDecisions(reordered),
      isSectionOrderAccepted: false,
    };
    const result = tailored(reordered, decisions);
    expect(result.template).toBeUndefined();
    expect(result.job.templateId).toBe("t1");
  });

  it("copies the template for a page limit that differs, and only then", () => {
    const d = defaultDecisions(proposal());
    expect(
      tailored(proposal(), d, { pageLimit: template.pageLimit }).template
    ).toBeUndefined();
    const other = template.pageLimit === 1 ? 2 : 1;
    const result = tailored(proposal(), d, { pageLimit: other });
    expect(result.template?.pageLimit).toBe(other);
    expect(result.job.templateId).toBe("t2");
    expect(template.pageLimit).not.toBe(other);
  });

  it("returns the alternative wordings for the vault and the export checks still use the tailor record", () => {
    const p = proposal();
    const d = defaultDecisions(p);
    const result = tailored(p, d);
    expect(result.altUpdates.map((u) => u.text)).toContain(
      "Led a React dashboard"
    );
    const variant = resolveVariant(template, result.job);
    expect(variant.tailor).toEqual(record);
    const checks = exportChecks({
      profile: vault.profile,
      pageCount: 1,
      pageLimit: variant.pageLimit,
      usedPercent: 50,
      linesOver: 0,
      hiddenItemCount: 0,
      tailor: variant.tailor,
      cvText: documentText(render(vault, variant)),
    });
    // "React" (the record's must-have) is looked up in the CV, so the tailor check is present
    expect(checks.length).toBeGreaterThan(0);
    expect(
      exportChecks({
        profile: vault.profile,
        pageCount: 1,
        pageLimit: 1,
        usedPercent: 50,
        linesOver: 0,
        hiddenItemCount: 0,
        tailor: {
          ...record,
          requirements: { ...record.requirements, mustHave: ["Zzyzx"] },
        },
        cvText: documentText(render(vault, variant)),
      }).some((c) => /Zzyzx|must-have/i.test(c.title + c.detail))
    ).toBe(true);
  });
});
