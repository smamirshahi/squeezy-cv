import { extractText, getDocumentProxy } from "unpdf";
import {
  MAX_IMPORT_LENGTH,
  MAX_IMPORT_PDF_BYTES,
  MAX_IMPORT_PDF_PAGES,
} from "@custom-types/import-types";

export type PdfTextErrorCode =
  | "not_pdf"
  | "too_large"
  | "too_many_pages"
  | "encrypted"
  | "no_text"
  | "text_too_long";

/** A PDF that cannot be turned into text, with a message for the user */
export class PdfTextError extends Error {
  constructor(
    readonly code: PdfTextErrorCode,
    message: string
  ) {
    super(message);
    this.name = "PdfTextError";
  }
}

const PDF_MAGIC = "%PDF-";

/** True when the bytes start like a PDF (checks the content, not the file name) */
function looksLikePdf(bytes: Uint8Array): boolean {
  // Some writers put a few bytes before the header; the spec allows 1024
  const head = Buffer.from(bytes.subarray(0, 1024)).toString("latin1");
  return head.includes(PDF_MAGIC);
}

/**
 * Takes the text layer out of a PDF in memory. The bytes are never written anywhere.
 * Scanned PDFs (images only) have no text layer: OCR is not supported.
 */
export async function extractPdfText(
  bytes: Uint8Array
): Promise<{ text: string; pages: number }> {
  if (bytes.byteLength > MAX_IMPORT_PDF_BYTES) {
    throw new PdfTextError(
      "too_large",
      `The PDF is larger than ${MAX_IMPORT_PDF_BYTES / (1024 * 1024)} MB.`
    );
  }
  if (!looksLikePdf(bytes)) {
    throw new PdfTextError("not_pdf", "This file is not a PDF.");
  }

  let pdf;
  try {
    pdf = await getDocumentProxy(new Uint8Array(bytes));
  } catch (caught) {
    if ((caught as { name?: string }).name === "PasswordException") {
      throw new PdfTextError(
        "encrypted",
        "This PDF is password-protected. Remove the password and try again."
      );
    }
    throw new PdfTextError("not_pdf", "This file is not a readable PDF.");
  }
  if (pdf.numPages > MAX_IMPORT_PDF_PAGES) {
    throw new PdfTextError(
      "too_many_pages",
      `The PDF has ${pdf.numPages} pages; the limit is ${MAX_IMPORT_PDF_PAGES}.`
    );
  }

  const { totalPages, text } = await extractText(pdf, { mergePages: true });
  const clean = text.trim();
  if (clean.length === 0) {
    throw new PdfTextError(
      "no_text",
      "This PDF has no text layer (it is probably a scan). OCR is not supported: paste the text instead."
    );
  }
  if (clean.length > MAX_IMPORT_LENGTH) {
    throw new PdfTextError(
      "text_too_long",
      `The text of this PDF has ${clean.length} characters; the limit is ${MAX_IMPORT_LENGTH}.`
    );
  }
  return { text: clean, pages: totalPages };
}
