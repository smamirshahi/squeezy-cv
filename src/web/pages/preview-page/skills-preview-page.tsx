import { Box, Grid, Rating } from "@mui/material";
import { RenderedSection } from "@shared/variant/render";
import React from "react";
import { CvTypography } from "@components/cv-typography";
import { useRatingIcon } from "@hooks/use-rating-icon";
import { SkillDisplay } from "@custom-types/variant-types";
import { levelLabel } from "@shared/vault/vault-utils";
import { styleSelector } from "@store/cv-data/cv-data-slice";
import { useAppSelector } from "@store/store-helper";

interface Props {
  section: RenderedSection;
}

const LEVELS = 5;

/** The level as a whole number of 0-5 (half steps round up) */
function levelOf(rating: number | undefined): number {
  return Math.min(LEVELS, Math.max(0, Math.round(rating ?? 0)));
}

/** Dots and stars are text symbols (so they are in the PDF text layer); the name is always text */
const SYMBOLS: Record<"dots" | "stars", { full: string; empty: string }> = {
  dots: { full: "●", empty: "○" },
  stars: { full: "★", empty: "☆" },
};

interface LevelProps {
  display: SkillDisplay;
  rating: number | undefined;
}

function Level({ display, rating }: LevelProps): JSX.Element | null {
  const { fontSize, color } = useAppSelector(styleSelector).typography.icon;
  const level = levelOf(rating);
  if (display === "none" || level === 0) {
    return null;
  }
  if (display === "bars") {
    // drawn shapes: a parser has nothing to read, the name already says what it is
    return (
      <span
        aria-hidden="true"
        data-cv-level="bars"
        style={{
          display: "inline-flex",
          gap: "0.15em",
          marginLeft: "0.6em",
          fontSize,
          color,
        }}
      >
        {Array.from({ length: LEVELS }, (_, index) => (
          <span
            key={index}
            style={{
              width: "0.8em",
              height: "0.45em",
              border: "1px solid currentColor",
              background: index < level ? "currentColor" : "transparent",
            }}
          />
        ))}
      </span>
    );
  }
  const { full, empty } = SYMBOLS[display];
  return (
    <span
      data-cv-level={display}
      style={{
        marginLeft: "0.6em",
        letterSpacing: "0.1em",
        fontSize,
        color,
      }}
    >
      {full.repeat(level)}
      {empty.repeat(LEVELS - level)}
    </span>
  );
}

/** Skills section (Areas of Expertise) */
export function SkillsPreviewPage({ section }: Props): JSX.Element | null {
  const RatingIcon = useRatingIcon();
  const { ratingIcon, typography } = useAppSelector(styleSelector);
  const display = section.skillStyle?.display;
  const columns = section.skillStyle?.columns ?? 1;

  if (section.items.length === 0) {
    return null;
  }

  return (
    <div data-cv-section={section.id}>
      <CvTypography
        variant="headingMd"
        pageBreak="keep-with-next"
        text={section.title}
      />
      {section.items.map((group) => (
        <React.Fragment key={group.id}>
          {group.fields.category !== undefined && (
            <CvTypography
              variant="headingSm"
              pageBreak="keep-with-next"
              isEmphasised={group.emphasis === "high"}
              text={group.fields.category}
            />
          )}
          <Grid
            container
            direction="row"
            sx={{
              alignItems: "flex-start",
            }}
          >
            {group.bullets.map((skill) => (
              <Grid
                key={skill.id}
                data-cv-block=""
                size={columns === 2 ? 6 : 12}
                container
                direction="row"
                sx={{
                  alignItems: "center",
                  breakInside: "avoid",
                }}
              >
                <CvTypography variant="bulletText" text={skill.text} />
                {display === undefined && ratingIcon === "text" ? (
                  skill.rating ? (
                    <Box component="span" data-cv-level="text" sx={{ ml: 1 }}>
                      <CvTypography
                        variant="bodySm"
                        text={levelLabel(skill.rating)}
                      />
                    </Box>
                  ) : null
                ) : display === undefined ? (
                  <Rating
                    value={skill.rating ?? 0}
                    precision={0.5}
                    readOnly
                    sx={{
                      fontSize: typography.icon.fontSize,
                      color: typography.icon.color,
                      ml: 1,
                    }}
                    icon={RatingIcon.icon}
                    emptyIcon={RatingIcon.emptyIcon}
                  />
                ) : (
                  <Level display={display} rating={skill.rating} />
                )}
              </Grid>
            ))}
          </Grid>
        </React.Fragment>
      ))}
    </div>
  );
}
