import { CvBlock } from "@components/cv-block";
import { CvTypography } from "@components/cv-typography";

interface Props {
  /** The free text of an item (`fields.description`) */
  text: string | undefined;
}

/** The lines of a free-text description, without empty ones */
export function descriptionLines(text: string | undefined): string[] {
  return (text ?? "")
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line !== "");
}

/** Draws an item's free-text description: one block per line, so a page break can fall between lines */
export function ItemDescription({ text }: Props): JSX.Element | null {
  const lines = descriptionLines(text);

  if (lines.length === 0) {
    return null;
  }
  return (
    <>
      {lines.map((line, index) => (
        <CvBlock key={index}>
          <CvTypography variant="bulletText" text={line} />
        </CvBlock>
      ))}
    </>
  );
}
