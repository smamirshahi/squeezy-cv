import { styleSelector } from "@store/cv-data/cv-data-slice";
import { useAppSelector } from "@store/store-helper";
import { useMemo } from "react";

interface ReturnProps {
  paperMarginForPrinting: string;
}

export function useStyleHelper(): ReturnProps {
  const { paperMargin } = useAppSelector(styleSelector);

  const paperMarginForPrinting: string = useMemo(() => {
    switch (paperMargin) {
      case "narrow":
        return "48px";
      case "normal":
        return "96px";
    }
  }, [paperMargin]);

  return { paperMarginForPrinting };
}
