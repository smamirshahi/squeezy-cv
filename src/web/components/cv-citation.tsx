import { CitationSegment } from "@shared/vault/citation";
import { CvTypography } from "@components/cv-typography";

/** The runs of a citation: the user's name bold, the journal in italics, a link as a real link */
export function CitationRuns({
  segments,
}: {
  segments: CitationSegment[];
}): JSX.Element {
  return (
    <>
      {segments.map((segment, index) => {
        const key = `${index}-${segment.text}`;
        const style = {
          ...(segment.bold ? { fontWeight: 700 } : {}),
          ...(segment.italic ? { fontStyle: "italic" } : {}),
        };
        return segment.href ? (
          <a
            key={key}
            href={segment.href}
            target="_blank"
            rel="noopener noreferrer"
            style={{ ...style, color: "inherit", textDecoration: "underline" }}
          >
            {segment.text}
          </a>
        ) : (
          <span key={key} style={style}>
            {segment.text}
          </span>
        );
      })}
    </>
  );
}

interface Props {
  segments: CitationSegment[];
  isEmphasised?: boolean;
}

/** One publication line on the CV */
export function CvCitation({
  segments,
  isEmphasised = false,
}: Props): JSX.Element {
  return (
    <CvTypography variant="bulletText" isEmphasised={isEmphasised}>
      <CitationRuns segments={segments} />
    </CvTypography>
  );
}
