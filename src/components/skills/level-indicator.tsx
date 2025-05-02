import { LinearProgress, SvgIcon } from "@mui/material";
import StarIcon from "@mui/icons-material/Star";
import StarHalfIcon from "@mui/icons-material/StarHalf";
import CircleIcon from "@mui/icons-material/Circle";
import { useMemo } from "react";
import { ApplicationStyle } from "../../common/custom-types";

interface Props {
  /** How to show the skill level */
  indicatorType: ApplicationStyle["skillIndicatorType"];

  /** The percentage of the skill */
  percentage: number;
}

export function LevelIndicator({
  indicatorType,
  percentage,
}: Props): JSX.Element {
  const indicator = useMemo(() => {
    const fullIcon = Math.floor(percentage / 20);
    const halfIcon = percentage % 20 >= 10 ? 1 : 0;

    switch (indicatorType) {
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
            {[...Array(fullIcon)].map((_, index) => (
              <SvgIcon
                key={index}
                component={StarIcon}
                viewBox="0 0 24 24"
                fontSize="small"
                sx={{
                  color: "#2196f3",
                }}
              />
            ))}

            {halfIcon === 1 && (
              <SvgIcon
                component={StarHalfIcon}
                viewBox="0 0 24 24"
                fontSize="small"
                sx={{
                  color: "#2196f3",
                }}
              />
            )}
          </>
        );

      case "circle":
        return (
          <>
            {[...Array(fullIcon)].map((_, index) => (
              <SvgIcon
                key={index}
                component={CircleIcon}
                viewBox="0 0 24 24"
                fontSize="small"
                sx={{
                  color: "#2196f3",
                }}
              />
            ))}

            {halfIcon === 1 && (
              <SvgIcon viewBox="0 0 24 24" fontSize="small">
                <circle
                  cx="12"
                  cy="12"
                  r="10"
                  stroke={"#2196f3"}
                  strokeWidth="1"
                  fill="none"
                />
                <path d="M12 2a10 10 0 0 0 0 20V2z" fill={"#2196f3"} />
              </SvgIcon>
            )}
          </>
        );
    }
  }, [percentage, indicatorType]);

  return indicator;
}
