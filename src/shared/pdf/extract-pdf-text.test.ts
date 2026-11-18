import { describe, expect, it, vi } from "vitest";
import { makeTestPdf } from "@fixtures/make-test-pdf";
import { extractPdfText, PdfTextError } from "@shared/pdf/extract-pdf-text";
import {
  MAX_IMPORT_LENGTH,
  MAX_IMPORT_PDF_BYTES,
  MAX_IMPORT_PDF_PAGES,
} from "@custom-types/import-types";

async function codeOf(promise: Promise<unknown>): Promise<string> {
  try {
    await promise;
  } catch (caught) {
    expect(caught).toBeInstanceOf(PdfTextError);
    return (caught as PdfTextError).code;
  }
  throw new Error("expected a PdfTextError");
}

describe("extractPdfText", () => {
  it("reads the text layer and the page count", async () => {
    const result = await extractPdfText(
      makeTestPdf(["Alex Morgan", "Developer at Acme"], 2)
    );
    expect(result.pages).toBe(2);
    expect(result.text).toContain("Alex Morgan");
    expect(result.text).toContain("Developer at Acme");
  });

  it("refuses a file that is not a PDF, whatever it is called", async () => {
    const code = await codeOf(
      extractPdfText(new TextEncoder().encode("just some text"))
    );
    expect(code).toBe("not_pdf");
  });

  it("accepts a PDF with a few bytes before the header, as the format allows", async () => {
    const pdf = makeTestPdf(["Alex Morgan"]);
    const padded = new Uint8Array(pdf.length + 5);
    padded.set(new TextEncoder().encode("junk\n"), 0);
    padded.set(pdf, 5);
    expect((await extractPdfText(padded)).text).toContain("Alex Morgan");
  });

  it("does not look for the header past the first 1024 bytes", async () => {
    const late = new Uint8Array(1100);
    late.set(new TextEncoder().encode("%PDF-1.4"), 1050);
    expect(await codeOf(extractPdfText(late))).toBe("not_pdf");
  });

  it("works on a plain Uint8Array and leaves the caller's bytes usable", async () => {
    const bytes = new Uint8Array(makeTestPdf(["Alex Morgan"]));
    await extractPdfText(bytes);
    expect(bytes.byteLength).toBeGreaterThan(0);
    expect((await extractPdfText(bytes)).text).toContain("Alex Morgan");
  });

  it("refuses a damaged PDF", async () => {
    const code = await codeOf(
      extractPdfText(new TextEncoder().encode("%PDF-1.4\nnonsense"))
    );
    expect(code).toBe("not_pdf");
  });

  it("refuses a file over the size limit before reading it", async () => {
    const code = await codeOf(
      extractPdfText(new Uint8Array(MAX_IMPORT_PDF_BYTES + 1))
    );
    expect(code).toBe("too_large");
  });

  it("says a PDF without a text layer is not supported (no OCR)", async () => {
    const promise = extractPdfText(makeTestPdf([]));
    expect(await codeOf(promise)).toBe("no_text");
    await expect(extractPdfText(makeTestPdf([]))).rejects.toThrow(/OCR/);
  });

  it("refuses too many pages", async () => {
    const code = await codeOf(
      extractPdfText(makeTestPdf(["x"], MAX_IMPORT_PDF_PAGES + 1))
    );
    expect(code).toBe("too_many_pages");
  });

  it("refuses text longer than the import limit", async () => {
    // Every page shows the same 40 lines; 20 pages is the page limit
    const lines = Array.from(
      { length: 40 },
      (_, row) => `Line ${row} ${"word ".repeat(20)}`
    );
    const pdf = makeTestPdf(lines, MAX_IMPORT_PDF_PAGES);
    expect(lines.join(" ").length * MAX_IMPORT_PDF_PAGES).toBeGreaterThan(
      MAX_IMPORT_LENGTH
    );
    expect(await codeOf(extractPdfText(pdf))).toBe("text_too_long");
  });
});

describe("extractPdfText with a password-protected PDF", () => {
  it("says so", async () => {
    vi.resetModules();
    vi.doMock("unpdf", () => ({
      getDocumentProxy: () =>
        Promise.reject(
          Object.assign(new Error("No password given"), {
            name: "PasswordException",
          })
        ),
      extractText: vi.fn(),
    }));
    const module = await import("@shared/pdf/extract-pdf-text");
    await expect(
      module.extractPdfText(makeTestPdf(["secret"]))
    ).rejects.toMatchObject({ code: "encrypted" });
    vi.doUnmock("unpdf");
  });
});
