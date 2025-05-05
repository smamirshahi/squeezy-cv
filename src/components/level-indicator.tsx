import { Box, SvgIcon } from "@mui/material";
import StarIcon from "@mui/icons-material/Star";
import StarHalfIcon from "@mui/icons-material/StarHalf";
import CircleIcon from "@mui/icons-material/Circle";
import { ApplicationStyle } from "../common/custom-types";
import { customColors } from "../common/custom-styles";

interface Props {
  /** How to show the skill level */
  indicatorType: ApplicationStyle["skillIndicatorType"];

  /** The percentage of the skill */
  percentage: number;
}

/** Determine the number of icons to be shown as full, half or empty */
export function LevelIndicator({
  indicatorType,
  percentage,
}: Props): JSX.Element {
  const numberOfFullIcons = Math.floor(percentage / 20);
  const numberOfHalfIcon = percentage % 20 >= 10 ? 1 : 0;
  const numberOfEmptyIcons = 5 - numberOfFullIcons - numberOfHalfIcon;

  let fullIconComponent: React.ReactNode;
  let halfIconComponent: React.ReactNode;

  switch (indicatorType) {
    case "star":
      fullIconComponent = <StarIcon />;
      halfIconComponent = <StarHalfIcon />;
      break;
    case "circle":
      fullIconComponent = <CircleIcon />;
      halfIconComponent = (
        <>
          <circle
            cx="12"
            cy="12"
            r="10"
            stroke={"#2196f3"}
            strokeWidth="1"
            fill="none"
          />
          <path d="M12 2a10 10 0 0 0 0 20V2z" fill={"#2196f3"} />
        </>
      );
      break;
  }

  return (
    <Box component="div">
      {[...Array(numberOfFullIcons)].map((_, index) => (
        <SvgIcon
          key={index}
          viewBox="0 0 24 24"
          fontSize="small"
          sx={{
            stroke: customColors.lightBlue,
            color: customColors.lightBlue,
          }}
        >
          {fullIconComponent}
        </SvgIcon>
      ))}

      {numberOfHalfIcon === 1 && (
        <SvgIcon
          viewBox="0 0 24 24"
          fontSize="small"
          sx={{
            stroke: customColors.lightBlue,
            color: customColors.lightBlue,
          }}
        >
          {halfIconComponent}
        </SvgIcon>
      )}
      {[...Array(numberOfEmptyIcons)].map((_, index) => (
        <SvgIcon
          key={index}
          viewBox="0 0 24 24"
          fontSize="small"
          sx={{
            stroke: customColors.lightBlue,
            color: "transparent",
          }}
        >
          {fullIconComponent}
        </SvgIcon>
      ))}
    </Box>
  );
}
