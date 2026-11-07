// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import { Provider } from "react-redux";
import { configureStore } from "@reduxjs/toolkit";
import sample from "@fixtures/sample-cv.json";
import { PrintView } from "@pages/print-page/print-view";
import { rootReducer } from "@store/store";
import { createApiClient } from "@store/persistence/api-client";
import { migrateCvFile } from "@shared/vault/migrate-vault";
import { createDefaultVariant } from "@shared/variant/variant-utils";

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

const file = migrateCvFile(sample);

function stubServer(
  answers: Record<string, { status: number; body: unknown }>
): void {
  vi.stubGlobal(
    "fetch",
    vi.fn((url: string) => {
      const answer = answers[url];
      return Promise.resolve(
        new Response(JSON.stringify(answer?.body ?? {}), {
          status: answer?.status ?? 404,
        })
      );
    })
  );
}

function show(variantId: string): HTMLElement {
  const store = configureStore({ reducer: rootReducer });
  const { container } = render(
    <Provider store={store}>
      <PrintView variantId={variantId} />
    </Provider>
  );
  return container;
}

describe("PrintView", () => {
  it("loads the saved variant and shows only the CV, marked ready", async () => {
    const variant = createDefaultVariant(file, "main");
    stubServer({
      "/api/vault": { status: 200, body: file },
      "/api/jobs/main/resolved": { status: 200, body: variant },
    });
    const container = show("main");

    await waitFor(() =>
      expect(container.querySelector('[data-cv-ready="true"]')).not.toBeNull()
    );
    expect(screen.getByText("Jane Doe")).toBeTruthy();
    expect(screen.getByText("Senior Software Developer")).toBeTruthy();
    // no editor chrome, page count, markers or limit warnings
    expect(screen.queryByText(/limit/)).toBeNull();
    expect(container.querySelector(".cv-page-marker")).toBeNull();
    expect(screen.queryByText("Save")).toBeNull();
    // the page margin comes from the page, so each printed page has it
    expect(container.querySelector("style")?.textContent).toMatch(
      /@page \{ size: 210mm 297mm; margin: \d+(\.\d+)?mm; \}/
    );
  });

  it("uses the variant's saved auto-fit result instead of calculating it", async () => {
    const variant = {
      ...createDefaultVariant(file, "main"),
      isAutoFit: true,
      tuning: { spacing: 0.6, marginMm: 12, fontScale: 0.9 },
    };
    stubServer({
      "/api/vault": { status: 200, body: file },
      "/api/jobs/main/resolved": { status: 200, body: variant },
    });
    const container = show("main");
    await waitFor(() =>
      expect(container.querySelector('[data-cv-ready="true"]')).not.toBeNull()
    );
    expect(container.querySelector("style")?.textContent).toContain(
      "margin: 12mm"
    );
    const paper = container.querySelector(".MuiPaper-root") as HTMLElement;
    expect(paper.style.getPropertyValue("--cv-spacing")).toBe("0.6");
    expect(paper.style.getPropertyValue("--cv-font-scale")).toBe("0.9");
  });

  it("reports a variant that cannot be loaded, for the renderer to see", async () => {
    stubServer({
      "/api/vault": { status: 200, body: file },
      "/api/jobs/nope/resolved": {
        status: 404,
        body: { code: "not_found", message: "No such variant." },
      },
    });
    const container = show("nope");
    await waitFor(() =>
      expect(container.querySelector("[data-cv-error]")).not.toBeNull()
    );
    expect(container.textContent).toContain("No such variant.");
    expect(container.querySelector("[data-cv-ready]")).toBeNull();
  });
});

describe("api client: createPdf", () => {
  it("posts the job id and returns the bytes", async () => {
    const fetchMock = vi.fn(() =>
      Promise.resolve(new Response("%PDF-1.7", { status: 200 }))
    );
    const blob = await createApiClient(fetchMock).createPdf("main");

    expect(fetchMock).toHaveBeenCalledWith(
      "/api/pdf",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({ jobId: "main" }),
      })
    );
    expect(blob.size).toBe("%PDF-1.7".length);
  });

  it("turns a server error into an error with its message", async () => {
    const client = createApiClient(() =>
      Promise.resolve(
        new Response(
          JSON.stringify({
            code: "pdf_failed",
            message: "Chromium is missing",
          }),
          { status: 500 }
        )
      )
    );
    await expect(client.createPdf("main")).rejects.toMatchObject({
      code: "pdf_failed",
      message: "Chromium is missing",
    });
  });
});
