/**
 * Splits "React, TypeScript, AI (online: Claude, local: Ollama)" into its entries. Commas
 * (and semicolons) inside brackets do not split, empty entries are dropped.
 */
export function splitList(text: string | undefined): string[] {
  const entries: string[] = [];
  let depth = 0;
  let current = "";
  for (const char of text ?? "") {
    if (char === "(") {
      depth += 1;
    } else if (char === ")" && depth > 0) {
      depth -= 1;
    }
    if ((char === "," || char === ";") && depth === 0) {
      entries.push(current);
      current = "";
    } else {
      current += char;
    }
  }
  entries.push(current);
  return entries.map((entry) => entry.trim()).filter(Boolean);
}
