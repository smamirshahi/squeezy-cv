import { describe, expect, it } from "vitest";
import { Block, paginate } from "@shared/layout/paginate";

const PAGE = 100;

function block(top: number, height: number, keep = false): Block {
  return { top, height, shouldKeepWithNext: keep };
}

describe("paginate", () => {
  it.each<[string, Block[], number, number, number[]]>([
    ["empty content is one page", [], 0, 1, []],
    ["short content is one page", [block(0, 40), block(40, 40)], 80, 1, []],
    ["exactly one page is one page", [block(0, 100)], 100, 1, []],
    [
      "blocks that fit break naturally at the page end",
      [block(0, 50), block(50, 50), block(100, 50)],
      150,
      2,
      [100],
    ],
    [
      "a block crossing the page end moves to the next page",
      [block(0, 70), block(70, 60)],
      130,
      2,
      [70],
    ],
    [
      "the push makes room for a third page",
      [block(0, 70), block(70, 60), block(130, 60)],
      190,
      // second page: 60 + 60 = 120 > 100, so the last block moves again
      3,
      [70, 130],
    ],
    [
      "a heading stays with the block after it",
      [block(0, 80), block(80, 10, true), block(90, 30)],
      120,
      2,
      [80],
    ],
    [
      "a block taller than a page is allowed to split",
      [block(0, 250)],
      250,
      3,
      [100, 200],
    ],
    [
      "a heading chain stays together",
      [block(0, 60), block(60, 10, true), block(70, 10, true), block(80, 30)],
      110,
      2,
      [60],
    ],
  ])("%s", (_name, blocks, contentHeight, pageCount, breaks) => {
    expect(paginate(blocks, contentHeight, PAGE)).toMatchObject({
      pageCount,
      breaks,
    });
  });

  it("does not depend on the order the blocks are given in", () => {
    const blocks = [block(70, 60), block(0, 70)];
    expect(paginate(blocks, 130, PAGE)).toEqual(
      paginate([...blocks].reverse(), 130, PAGE)
    );
  });

  it("does not change its input", () => {
    const blocks = [block(70, 60), block(0, 70)];
    const copy = structuredClone(blocks);
    paginate(blocks, 130, PAGE);
    expect(blocks).toEqual(copy);
  });

  it("always reports pageCount - 1 breaks, in increasing order", () => {
    const blocks = Array.from({ length: 12 }, (_v, i) => block(i * 37, 37));
    const result = paginate(blocks, 12 * 37, PAGE);
    expect(result.breaks).toHaveLength(result.pageCount - 1);
    expect([...result.breaks].sort((a, b) => a - b)).toEqual(result.breaks);
  });
});
