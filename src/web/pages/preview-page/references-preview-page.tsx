import { Grid } from "@components/ui";
import { GAP_PX, spaced } from "@custom-styles/custom-styles";
import { RenderedSection } from "@shared/variant/render";
import { styleSelector } from "@store/cv-data/cv-data-slice";
import { useAppSelector } from "@store/store-helper";
import { CvBlock } from "@components/cv-block";
import { CvTypography } from "@components/cv-typography";
import { SectionFrame } from "@pages/preview-page/awards-interests-preview-page";

interface Props {
  section: RenderedSection;
}

/** The non-empty parts of a field list, joined into one line */
function joined(parts: (string | undefined)[], separator: string): string {
  return parts
    .map((part) => part?.trim())
    .filter(Boolean)
    .join(separator);
}

/**
 * References: each person as a name, then "Position, Organisation", their relationship, and (only
 * when the template turns it on) email and phone. The template can also replace the whole list
 * with the line "Available on request".
 */
export function ReferencesPreviewPage({ section }: Props): JSX.Element | null {
  const { shouldShowReferenceContacts, isReferencesOnRequest } =
    useAppSelector(styleSelector);
  if (isReferencesOnRequest) {
    return (
      <SectionFrame section={section}>
        <CvBlock>
          <CvTypography variant="bulletText" text="Available on request" />
        </CvBlock>
      </SectionFrame>
    );
  }
  if (section.items.length === 0) {
    return null;
  }
  return (
    <SectionFrame section={section}>
      {section.items.map((item) => {
        const role = joined(
          [item.fields.position, item.fields.organisation],
          ", "
        );
        const contact = shouldShowReferenceContacts
          ? joined([item.fields.email, item.fields.phone], " | ")
          : "";
        return (
          <Grid
            container
            key={item.id}
            data-cv-item={item.id}
            sx={{ flexDirection: "column", mb: spaced(GAP_PX.item) }}
          >
            <CvBlock shouldKeepWithNext>
              <CvTypography
                variant="headingSm"
                isEmphasised={item.emphasis === "high"}
                text={item.fields.name?.trim() ?? ""}
              />
              {role && <CvTypography variant="bulletText" text={role} />}
              {item.fields.relationship?.trim() && (
                <CvTypography
                  variant="bulletText"
                  text={item.fields.relationship}
                />
              )}
              {contact && <CvTypography variant="bulletText" text={contact} />}
            </CvBlock>
          </Grid>
        );
      })}
    </SectionFrame>
  );
}
