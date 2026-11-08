import { describe, expect, it } from "vitest";
import { datedTitle } from "@shared/variant/item-label";

const format = (day: string): string => `<${day}>`;

describe("datedTitle", () => {
  it("closes the parenthesis and has no stray space", () => {
    expect(datedTitle("Dev", "2022-03-01", "", format)).toBe(
      "Dev (<2022-03-01> - Present)"
    );
    expect(datedTitle("Dev", "2018-01-01", "2018-06-01", format)).toBe(
      "Dev (<2018-01-01> - <2018-06-01>)"
    );
  });

  it("leaves the dates out without a start date", () => {
    expect(datedTitle("Dev", "", "", format)).toBe("Dev");
    expect(datedTitle("Dev", undefined, "2020-01-01", format)).toBe("Dev");
  });
});
