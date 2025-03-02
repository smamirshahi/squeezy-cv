import { JSX, useMemo } from "react";
import { BodyText } from "./custom-typography";
import { Grid2, LinearProgress, SvgIcon } from "@mui/material";
import StarIcon from "@mui/icons-material/Star";
import StarHalfIcon from "@mui/icons-material/StarHalf";

interface Props {
  /** The name of skill */
  skillName: string;

  /** The percentage of the skill */
  percentage: number;

  /** How to show the skill */
  type: "linear" | "star";
}

export function SkillWithLevel({
  skillName,
  percentage,
  type,
}: Props): JSX.Element {
  const levelIndicator = useMemo(() => {
    const mainStar = Math.floor(percentage / 20);
    const halfStar = percentage % 20 >= 10 ? 1 : 0;

    switch (type) {
      case "linear":
        return (
          <LinearProgress
            variant="determinate"
            value={percentage}
            sx={{ width: "200px" }}
          />
        );
      case "star":
        return (
          <>
            {[...Array(mainStar)].map((_, index) => (
              <SvgIcon
                key={index}
                color="primary"
                component={StarIcon}
                viewBox="0 0 24 24"
                fontSize="small"
              />
            ))}

            {halfStar === 1 && (
              <SvgIcon
                color="primary"
                component={StarHalfIcon}
                viewBox="0 0 24 24"
                fontSize="small"
              />
            )}
          </>
        );
    }
  }, [percentage, type]);

  return (
    <Grid2 container direction="row" alignItems="center">
      <BodyText text={skillName} />
      {levelIndicator}
    </Grid2>
  );
}
