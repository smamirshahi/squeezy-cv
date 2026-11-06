import { describe, expect, it } from "vitest";
import sample from "@fixtures/sample-cv.json";
import { documentText } from "@shared/variant/document-text";
import { render } from "@shared/variant/render";
import { createDefaultVariant } from "@shared/variant/variant-utils";
import { migrateCvFile } from "@shared/vault/migrate-vault";

describe("documentText", () => {
  const file = migrateCvFile(sample);
  const variant = createDefaultVariant(file, "v");

  it("contains section titles, fields and bullets", () => {
    const text = documentText(render(file.vault, variant));
    expect(text).toContain("Work Experience");
    expect(text).toContain("Senior Software Developer");
    expect(text).toContain("Introduced Redux Toolkit");
  });

  it("leaves out what the variant hides", () => {
    const job = file.vault.sections
      .find((s) => s.type === "experience")!
      .items.find((i) => i.fields.company === "Sample Systems")!;
    const hidden = {
      ...variant,
      selection: { [job.id]: { isVisible: false } },
    };
    expect(documentText(render(file.vault, hidden))).not.toContain(
      "Sample Systems"
    );
  });
});
