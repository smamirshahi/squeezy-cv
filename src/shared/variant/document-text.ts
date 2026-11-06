import { RenderedDocument } from "@shared/variant/render";

/** All the words of a rendered CV (fields and bullets of every section), one piece per line */
export function documentText(document: RenderedDocument): string {
  return (["fullWidth", "left", "right"] as const)
    .flatMap((side) => document.columns[side])
    .flatMap((part) =>
      part.kind === "section"
        ? [
            part.title,
            ...part.items.flatMap((item) => [
              ...Object.values(item.fields),
              ...item.bullets.map((bullet) => bullet.text),
            ]),
          ]
        : []
    )
    .join("\n");
}
