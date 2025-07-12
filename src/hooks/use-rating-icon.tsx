import { styleSelector } from "@store/cv-data/cv-data-slice";
import { useAppSelector } from "@store/store-helper";
import CircleIcon from "@mui/icons-material/Circle";
import StarBorderIcon from "@mui/icons-material/StarBorder";
import CircleOutlinedIcon from "@mui/icons-material/CircleOutlined";
import StarBorderOutlinedIcon from "@mui/icons-material/StarBorderOutlined";
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

      case "star":
        return {
          icon: <StarBorderIcon fontSize="inherit" />,
          emptyIcon: <StarBorderOutlinedIcon fontSize="inherit" />,
        };
    }
  }, [ratingIcon]);

  return ratingIconComponent;
}
