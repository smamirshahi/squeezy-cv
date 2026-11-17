import { styleSelector } from "@store/cv-data/cv-data-slice";
import { useAppSelector } from "@store/store-helper";
import {
  CircleOutlined as CircleIcon,
  CircleOutlined as CircleOutlinedIcon,
  StarBorderOutlined as StarBorderIcon,
  StarBorderOutlined as StarBorderOutlinedIcon,
} from "@components/ui/icons";
import { useMemo } from "react";

interface ReturnProps {
  icon: JSX.Element;
  emptyIcon: JSX.Element;
}

export function useRatingIcon(): ReturnProps {
  const { ratingIcon } = useAppSelector(styleSelector);

  const ratingIconComponent = useMemo(() => {
    switch (ratingIcon) {
      case "circle":
        return {
          icon: <CircleIcon fontSize="inherit" />,
          emptyIcon: <CircleOutlinedIcon fontSize="inherit" />,
        };

      // "text" shows the level as a word instead (the skills page); these are not drawn
      case "none":
      case "text":
      case "star":
        return {
          icon: <StarBorderIcon fontSize="inherit" />,
          emptyIcon: <StarBorderOutlinedIcon fontSize="inherit" />,
        };
    }
  }, [ratingIcon]);

  return ratingIconComponent;
}
