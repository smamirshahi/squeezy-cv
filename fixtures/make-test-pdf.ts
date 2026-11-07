/**
 * Builds a tiny valid PDF in memory for tests. `lines` are drawn as text (a text layer);
 * with no lines the page is blank, like a scan without text.
 */
export function makeTestPdf(lines: string[], pages = 1): Buffer {
  const escape = (value: string): string =>
    value.replace(/[\\()]/g, (char) => `\\${char}`);
  const objects: string[] = [];
  const pageIds: number[] = [];
  // 1 catalog, 2 page tree, 3 font, then a page + content stream per page
  objects.push("<< /Type /Catalog /Pages 2 0 R >>");
  objects.push("PAGES");
  objects.push("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>");
  for (let index = 0; index < pages; index++) {
    const pageId = objects.length + 1;
    pageIds.push(pageId);
    const text = lines
      .map(
        (line, row) =>
          `BT /F1 12 Tf 50 ${780 - row * 16} Td (${escape(line)}) Tj ET`
      )
      .join("\n");
    objects.push(
      `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 3 0 R >> >> /Contents ${pageId + 1} 0 R >>`
    );
    objects.push(`<< /Length ${text.length} >>\nstream\n${text}\nendstream`);
  }
  objects[1] = `<< /Type /Pages /Kids [${pageIds.map((id) => `${id} 0 R`).join(" ")}] /Count ${pages} >>`;

  let out = "%PDF-1.4\n";
  const offsets: number[] = [];
  objects.forEach((body, index) => {
    offsets.push(out.length);
    out += `${index + 1} 0 obj\n${body}\nendobj\n`;
  });
  const xref = out.length;
  out += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  for (const offset of offsets) {
    out += `${String(offset).padStart(10, "0")} 00000 n \n`;
  }
  out += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF\n`;
  return Buffer.from(out, "latin1");
}
