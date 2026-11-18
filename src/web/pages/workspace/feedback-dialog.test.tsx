// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import { FeedbackDialog } from "@pages/workspace/feedback-dialog";

interface Sent {
  kind: string;
  mood?: string;
  note: string;
  appInfo?: string;
}

let sent: Sent[];
let respond: () => Response;

beforeEach(() => {
  sent = [];
  respond = () =>
    new Response(
      JSON.stringify({ number: 431, url: "https://github.com/x/y/431" }),
      { status: 200 }
    );
  window.history.replaceState(null, "", "/jobs");
  vi.stubGlobal(
    "fetch",
    vi.fn((_url: string, init: RequestInit) => {
      sent.push(JSON.parse(init.body as string) as Sent);
      return Promise.resolve(respond());
    })
  );
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

function open(): void {
  render(<FeedbackDialog isOpen onClose={() => undefined} />);
}

const note = (): HTMLTextAreaElement =>
  screen.getByLabelText<HTMLTextAreaElement>("Your note");
const sendButton = (): HTMLButtonElement =>
  screen.getByRole<HTMLButtonElement>("button", { name: "Send" });
const appInfoBox = (): HTMLInputElement =>
  screen.getByRole("checkbox", { name: /Include app info/ });

function write(text: string): void {
  fireEvent.change(note(), { target: { value: text } });
}

describe("the feedback dialog", () => {
  it("offers Feedback, Bug and Feature, with Feedback chosen", () => {
    open();
    const kinds = screen.getByRole("group", {
      name: "What do you want to send?",
    });
    expect(kinds.textContent).toContain("Feedback");
    expect(kinds.textContent).toContain("Bug");
    expect(kinds.textContent).toContain("Feature");
    expect(
      screen
        .getByRole("button", { name: "Feedback" })
        .getAttribute("aria-pressed")
    ).toBe("true");
  });

  it("shows the faces only for feedback", () => {
    open();
    expect(screen.getByRole("button", { name: "Happy" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "No feeling" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Sad" })).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Bug" }));
    expect(screen.queryByRole("button", { name: "Happy" })).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Feature" }));
    expect(screen.queryByRole("button", { name: "Sad" })).toBeNull();
  });

  it("asks different things in the note for each kind", () => {
    open();
    expect(note().placeholder).toMatch(/what you like/i);
    fireEvent.click(screen.getByRole("button", { name: "Bug" }));
    expect(note().placeholder).toMatch(/What happened/);
    expect(note().placeholder).toMatch(/expect/);
    fireEvent.click(screen.getByRole("button", { name: "Feature" }));
    expect(note().placeholder).toMatch(/What problem does it solve/);
  });

  it("cannot send an empty or blank note", () => {
    open();
    expect(sendButton().disabled).toBe(true);
    write("   ");
    expect(sendButton().disabled).toBe(true);
    write("Nice");
    expect(sendButton().disabled).toBe(false);
  });

  it.each(["Bug", "Feature"])(
    "needs a few words for a %s and says why",
    (kind) => {
      open();
      fireEvent.click(screen.getByRole("button", { name: kind }));
      write("broken");
      expect(sendButton().disabled).toBe(true);
      expect(screen.getByText(/at least 10 characters/)).toBeTruthy();
      write("It is broken when I save");
      expect(sendButton().disabled).toBe(false);
      expect(screen.queryByText(/at least 10 characters/)).toBeNull();
    }
  );

  it("lets feedback be short", () => {
    open();
    write("Nice");
    expect(sendButton().disabled).toBe(false);
    expect(screen.queryByText(/at least 10 characters/)).toBeNull();
  });

  it("sends feedback with the chosen face, and a chosen face can be cleared", async () => {
    open();
    write("  Easy to use  ");
    fireEvent.click(screen.getByRole("button", { name: "Happy" }));
    fireEvent.click(sendButton());
    await screen.findByText("Thanks, your note is #431");
    expect(sent).toEqual([
      { kind: "feedback", mood: "happy", note: "Easy to use" },
    ]);

    fireEvent.click(screen.getByRole("button", { name: "Send another" }));
    write("Again");
    fireEvent.click(screen.getByRole("button", { name: "Sad" }));
    fireEvent.click(screen.getByRole("button", { name: "Sad" }));
    fireEvent.click(sendButton());
    await waitFor(() => expect(sent).toHaveLength(2));
    expect(sent[1].mood).toBeUndefined();
  });

  it("does not send the face with a bug", async () => {
    open();
    fireEvent.click(screen.getByRole("button", { name: "Sad" }));
    fireEvent.click(screen.getByRole("button", { name: "Bug" }));
    write("Save does nothing at all");
    fireEvent.click(sendButton());
    await screen.findByText(/Thanks, your note is/);
    expect(sent[0].kind).toBe("bug");
    expect(sent[0].mood).toBeUndefined();
  });

  describe("app info", () => {
    it("says what it holds, without showing the data", () => {
      open();
      expect(screen.getByText("(app version, browser and page)")).toBeTruthy();
      expect(document.body.textContent).not.toContain("Mozilla");
    });

    it("starts off for feedback and feature and on for a bug", () => {
      open();
      expect(appInfoBox().checked).toBe(false);
      fireEvent.click(screen.getByRole("button", { name: "Bug" }));
      expect(appInfoBox().checked).toBe(true);
      fireEvent.click(screen.getByRole("button", { name: "Feature" }));
      expect(appInfoBox().checked).toBe(false);
    });

    it("sends the version, the browser and the page name when on", async () => {
      open();
      fireEvent.click(screen.getByRole("button", { name: "Bug" }));
      write("Save does nothing at all");
      fireEvent.click(sendButton());
      await screen.findByText(/Thanks, your note is/);
      expect(sent[0].appInfo).toMatch(
        /^Squeezy CV \d+\.\d+\.\d+ · .+ · jobs page$/
      );
      expect(sent[0].appInfo).not.toContain("Mozilla");
    });

    it("sends nothing extra when off", async () => {
      open();
      fireEvent.click(screen.getByRole("button", { name: "Bug" }));
      fireEvent.click(appInfoBox());
      write("Save does nothing at all");
      fireEvent.click(sendButton());
      await screen.findByText(/Thanks, your note is/);
      expect(sent[0].appInfo).toBeUndefined();
    });
  });

  describe("after sending", () => {
    it("shows the issue number and a link, and can start again with an empty note", async () => {
      open();
      write("Nice");
      fireEvent.click(sendButton());
      await screen.findByText("Thanks, your note is #431");
      const link = screen.getByRole("link", { name: /View it on GitHub/ });
      expect(link.getAttribute("href")).toBe("https://github.com/x/y/431");
      fireEvent.click(screen.getByRole("button", { name: "Send another" }));
      expect(note().value).toBe("");
    });

    it.each([0, 1])("closes with either Close button (%i)", async (which) => {
      const onClose = vi.fn();
      render(<FeedbackDialog isOpen onClose={onClose} />);
      write("Nice");
      fireEvent.click(sendButton());
      await screen.findByText(/Thanks, your note is/);
      const closers = screen.getAllByRole("button", { name: "Close" });
      expect(closers).toHaveLength(2);
      fireEvent.click(closers[which]);
      expect(onClose).toHaveBeenCalledTimes(1);
    });
  });

  describe("when sending fails", () => {
    beforeEach(() => {
      respond = () =>
        new Response(
          JSON.stringify({
            code: "feedback_unavailable",
            message: "Sending is not set up on this computer.",
          }),
          { status: 503 }
        );
    });

    it("keeps the text, says why and offers three ways forward", async () => {
      open();
      write("It is broken when I save");
      fireEvent.click(screen.getByRole("button", { name: "Bug" }));
      fireEvent.click(sendButton());
      const alert = await screen.findByRole("alert");
      expect(alert.textContent).toContain("Could not send.");
      expect(alert.textContent).toContain(
        "Sending is not set up on this computer."
      );
      expect(alert.textContent).toContain("Your text is still here");
      expect(note().value).toBe("It is broken when I save");

      const github = screen.getByRole("link", { name: /Open on GitHub/ });
      const url = new URL(github.getAttribute("href") ?? "");
      expect(url.pathname).toMatch(/\/issues\/new$/);
      expect(url.searchParams.get("labels")).toBe("customer-created,bug");
      expect(url.searchParams.get("body")).toContain(
        "It is broken when I save"
      );
      expect(screen.getByRole("button", { name: "Try again" })).toBeTruthy();
      expect(
        screen.getByRole("button", { name: /Copy the text/ })
      ).toBeTruthy();
    });

    it("tries again, and shows the thanks screen when it works", async () => {
      open();
      write("Nice");
      fireEvent.click(sendButton());
      await screen.findByRole("alert");
      respond = () =>
        new Response(
          JSON.stringify({ number: 9, url: "https://github.com/x/y/9" }),
          { status: 200 }
        );
      fireEvent.click(screen.getByRole("button", { name: "Try again" }));
      await screen.findByText("Thanks, your note is #9");
      expect(sent).toHaveLength(2);
    });

    it("copies the text", async () => {
      const writeText = vi.fn(() => Promise.resolve());
      Object.defineProperty(navigator, "clipboard", {
        value: { writeText },
        configurable: true,
      });
      open();
      write("Nice  ");
      fireEvent.click(sendButton());
      await screen.findByRole("alert");
      fireEvent.click(screen.getByRole("button", { name: /Copy the text/ }));
      await screen.findByText("Copied");
      expect(writeText).toHaveBeenCalledWith("Nice");
    });

    it("also handles a server that cannot be reached", async () => {
      vi.stubGlobal(
        "fetch",
        vi.fn(() => Promise.reject(new Error("offline")))
      );
      open();
      write("Nice");
      fireEvent.click(sendButton());
      const alert = await screen.findByRole("alert");
      expect(alert.textContent).toContain("could not be reached");
      expect(note().value).toBe("Nice");
    });
  });
});

describe("the feedback dialog in the browser version (no server)", () => {
  let openWindow: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.stubEnv("VITE_STORAGE_MODE", "browser");
    openWindow = vi.fn();
    vi.stubGlobal("open", openWindow);
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  const githubButton = (): HTMLButtonElement =>
    screen.getByRole<HTMLButtonElement>("button", { name: "Open on GitHub" });

  it("offers Open on GitHub instead of Send, and says what it does", () => {
    open();
    expect(screen.queryByRole("button", { name: "Send" })).toBeNull();
    expect(githubButton().disabled).toBe(true);
    expect(screen.getByText(/you need a GitHub account/)).toBeTruthy();
    expect(screen.getByRole("button", { name: /Copy the text/ })).toBeTruthy();
  });

  it("never calls the server", () => {
    open();
    write("Nice");
    fireEvent.click(githubButton());
    expect(fetch).not.toHaveBeenCalled();
    expect(sent).toEqual([]);
  });

  it("opens a prefilled new issue in a new tab, without giving the page to GitHub", () => {
    open();
    fireEvent.click(screen.getByRole("button", { name: "Happy" }));
    write("  Easy to use  ");
    fireEvent.click(githubButton());
    expect(openWindow).toHaveBeenCalledOnce();
    const [address, target, features] = openWindow.mock.calls[0] as [
      string,
      string,
      string,
    ];
    const url = new URL(address);
    expect(url.origin + url.pathname).toBe(
      "https://github.com/smamirshahi/squeezy-cv/issues/new"
    );
    expect(url.searchParams.get("title")).toBe("[Feedback] Easy to use");
    expect(url.searchParams.get("body")).toContain("Easy to use");
    expect(url.searchParams.get("body")).toContain("Happy");
    expect(url.searchParams.get("labels")).toBe("customer-created,feedback");
    expect(target).toBe("_blank");
    expect(features).toContain("noopener");
  });

  it("includes the app info only when it is switched on", () => {
    open();
    fireEvent.click(screen.getByRole("button", { name: "Bug" }));
    write("It broke when I saved");
    fireEvent.click(githubButton());
    const withInfo = new URL(openWindow.mock.calls[0][0] as string);
    expect(withInfo.searchParams.get("body")).toContain("App info");

    fireEvent.click(screen.getByRole("button", { name: "Write another" }));
    fireEvent.click(screen.getByRole("button", { name: "Bug" }));
    write("It broke again when I saved");
    fireEvent.click(appInfoBox());
    fireEvent.click(githubButton());
    const without = new URL(openWindow.mock.calls[1][0] as string);
    expect(without.searchParams.get("body")).not.toContain("App info");
  });

  it("never puts anything but the note, the mood and the app info in the address", () => {
    open();
    write("Plain note");
    fireEvent.click(githubButton());
    const address = decodeURIComponent(openWindow.mock.calls[0][0] as string);
    expect(address).not.toMatch(/vault|template|secret|key/i);
  });

  it("explains the next step, and can open the address again", () => {
    open();
    write("Nice");
    fireEvent.click(githubButton());
    expect(screen.getByText("GitHub opened in a new tab")).toBeTruthy();
    expect(screen.getByText(/Submit new issue/)).toBeTruthy();
    const again = screen.getByRole("link", { name: /Open it again/ });
    expect(again.getAttribute("href")).toBe(openWindow.mock.calls[0][0]);
    expect(again.getAttribute("rel")).toContain("noopener");
  });

  it("starts empty again for another note", () => {
    open();
    write("First");
    fireEvent.click(screen.getByRole("button", { name: "Happy" }));
    fireEvent.click(githubButton());
    fireEvent.click(screen.getByRole("button", { name: "Write another" }));
    expect(note().value).toBe("");
    expect(githubButton().disabled).toBe(true);
  });

  it("does not open a link for a note that is too long, and keeps the text to copy", async () => {
    const writeText = vi.fn(() => Promise.resolve());
    Object.defineProperty(navigator, "clipboard", {
      value: { writeText },
      configurable: true,
    });
    open();
    write("é & ".repeat(1000));
    fireEvent.click(githubButton());
    const alert = await screen.findByRole("alert");
    expect(alert.textContent).toContain("too long to put in a link");
    expect(alert.textContent).not.toContain("Could not send");
    expect(openWindow).not.toHaveBeenCalled();
    expect(note().value).not.toBe("");
    // No server to retry, and no second GitHub button that would hit the same limit
    expect(
      within(alert).queryByRole("button", { name: "Try again" })
    ).toBeNull();
    expect(
      within(alert).queryByRole("link", { name: /Open on GitHub/ })
    ).toBeNull();
    fireEvent.click(
      within(alert).getByRole("button", { name: /Copy the text/ })
    );
    // Both copy buttons (in the notice and next to Open on GitHub) show it
    expect((await screen.findAllByText("Copied")).length).toBeGreaterThan(0);
    expect(writeText).toHaveBeenCalled();
  });

  it("copies the text without opening anything", async () => {
    const writeText = vi.fn(() => Promise.resolve());
    Object.defineProperty(navigator, "clipboard", {
      value: { writeText },
      configurable: true,
    });
    open();
    write("Nice  ");
    fireEvent.click(screen.getByRole("button", { name: /Copy the text/ }));
    await screen.findByText("Copied");
    expect(writeText).toHaveBeenCalledWith("Nice");
    expect(openWindow).not.toHaveBeenCalled();
  });

  it("keeps the same rules for the length of a bug note", () => {
    open();
    fireEvent.click(screen.getByRole("button", { name: "Bug" }));
    write("broken");
    expect(githubButton().disabled).toBe(true);
    write("It is broken when I save");
    expect(githubButton().disabled).toBe(false);
  });
});
