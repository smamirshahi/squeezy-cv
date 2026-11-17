import { extractText, getDocumentProxy } from "unpdf";

export interface PdfContent {
  pageCount: number;

  /** All the text of the PDF, pages joined */
  text: string;

  /** Size of the first page in points */
  pageSize: { width: number; height: number };
}

/** Reads a PDF the way a recruiter's software would: page count and the text layer */
export async function readPdf(bytes: Buffer | Uint8Array): Promise<PdfContent> {
  const pdf = await getDocumentProxy(new Uint8Array(bytes));

  const { totalPages, text } = await extractText(pdf, { mergePages: true });
  const [, , width, height] = (await pdf.getPage(1)).view;
  return { pageCount: totalPages, text, pageSize: { width, height } };
}
