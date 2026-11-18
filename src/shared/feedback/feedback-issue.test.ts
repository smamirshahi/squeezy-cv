import { describe, expect, it } from "vitest";
import {
  buildAppInfo,
  buildFeedbackIssue,
  buildNewIssueUrl,
  FEEDBACK_REPO,
  fitsInNewIssueUrl,
} from "@shared/feedback/feedback-issue";

describe("buildFeedbackIssue", () => {
  it("labels every kind with customer-created and its own label", () => {
    for (const kind of ["feedback", "bug", "feature"] as const) {
      expect(buildFeedbackIssue({ kind, note: "Something" }).labels).toEqual([
        "customer-created",
        kind,
      ]);
    }
  });

  it("titles the issue with the kind and the first line of the note", () => {
    const issue = buildFeedbackIssue({
      kind: "bug",
      note: "  Save does nothing\nI clicked it twice  ",
    });
    expect(issue.title).toBe("[Bug] Save does nothing");
    expect(issue.body).toBe("Save does nothing\nI clicked it twice");
  });

  it("cuts a long first line in the title", () => {
    const { title } = buildFeedbackIssue({
      kind: "feature",
      note: "x".repeat(200),
    });
    expect(title.startsWith("[Feature] ")).toBe(true);
    expect(title.endsWith("…")).toBe(true);
    expect(title.length).toBeLessThan(90);
  });

  it("puts the mood in the body of feedback", () => {
    const issue = buildFeedbackIssue({
      kind: "feedback",
      mood: "neutral",
      note: "Fine",
    });
    expect(issue.body).toBe("**Mood:** No feeling\n\nFine");
  });

  it("ignores a mood on a bug or a feature", () => {
    const issue = buildFeedbackIssue({
      kind: "bug",
      mood: "sad",
      note: "Broken",
    });
    expect(issue.body).toBe("Broken");
  });

  it("adds the app info at the end only when given", () => {
    const withInfo = buildFeedbackIssue({
      kind: "bug",
      note: "Broken",
      appInfo: "Squeezy CV 1.0.0 · Chrome 1 on macOS · jobs page",
    });
    expect(withInfo.body).toBe(
      "Broken\n\n---\n**App info:** Squeezy CV 1.0.0 · Chrome 1 on macOS · jobs page"
    );
    expect(
      buildFeedbackIssue({ kind: "bug", note: "Broken", appInfo: "  " }).body
    ).toBe("Broken");
  });
});

describe("buildNewIssueUrl", () => {
  it("opens a prefilled new issue with the title, body and labels", () => {
    const url = new URL(
      buildNewIssueUrl({ kind: "feature", note: "Dark mode & more" })
    );
    expect(url.origin + url.pathname).toBe(
      `https://github.com/${FEEDBACK_REPO}/issues/new`
    );
    expect(url.searchParams.get("title")).toBe("[Feature] Dark mode & more");
    expect(url.searchParams.get("body")).toBe("Dark mode & more");
    expect(url.searchParams.get("labels")).toBe("customer-created,feature");
  });
});

describe("fitsInNewIssueUrl", () => {
  it("accepts a normal note", () => {
    expect(
      fitsInNewIssueUrl({ kind: "bug", note: "It broke when I saved" })
    ).toBe(true);
  });

  it("accepts the longest plain-text note the dialog allows", () => {
    expect(
      fitsInNewIssueUrl({ kind: "feedback", note: "a".repeat(4000) })
    ).toBe(true);
  });

  it("refuses a note whose address would be too long once special characters are encoded", () => {
    expect(
      fitsInNewIssueUrl({ kind: "feedback", note: "é & ".repeat(1000) })
    ).toBe(false);
  });

  it("counts the app info too", () => {
    const note = "a".repeat(4000);
    expect(fitsInNewIssueUrl({ kind: "bug", note })).toBe(true);
    expect(
      fitsInNewIssueUrl({ kind: "bug", note, appInfo: "é".repeat(500) })
    ).toBe(false);
  });
});

describe("buildAppInfo", () => {
  const info = (userAgent: string): string =>
    buildAppInfo({ version: "0.7.0", userAgent, page: "jobs" });

  it("describes Chrome on a Mac in a few words", () => {
    expect(
      info(
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/157.0.0.0 Safari/537.36"
      )
    ).toBe("Squeezy CV 0.7.0 · Chrome 157 on macOS · jobs page");
  });

  it.each([
    [
      "Safari",
      "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Safari/605.1.15",
      "Safari 17 on macOS",
    ],
    [
      "Edge (also says Chrome)",
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/130.0.0.0 Safari/537.36 Edg/130.0.0.0",
      "Edge 130 on Windows",
    ],
    [
      "Opera (also says Chrome)",
      "Mozilla/5.0 (Windows NT 10.0) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36 OPR/106.0.0.0",
      "Opera 106 on Windows",
    ],
    [
      "Firefox on Linux",
      "Mozilla/5.0 (X11; Linux x86_64; rv:130.0) Gecko/20100101 Firefox/130.0",
      "Firefox 130 on Linux",
    ],
    [
      "Chrome on Android",
      "Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 Chrome/130.0.0.0 Mobile Safari/537.36",
      "Chrome 130 on Android",
    ],
    [
      "Safari on an iPhone",
      "Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1",
      "Safari 17 on iOS",
    ],
  ])("%s", (_name, userAgent, expected) => {
    expect(info(userAgent)).toContain(` · ${expected} · `);
  });

  it("says so when the browser is not known", () => {
    expect(info("curl/8.0")).toContain(" · Unknown browser · ");
    expect(info("")).toContain(" · Unknown browser · ");
  });

  it("never holds more than the version, the browser and the page", () => {
    const text = info("Mozilla/5.0 (Macintosh) Chrome/157.0.0.0 Safari/537.36");
    expect(text.split(" · ")).toHaveLength(3);
    expect(text).not.toContain("Mozilla");
  });
});
