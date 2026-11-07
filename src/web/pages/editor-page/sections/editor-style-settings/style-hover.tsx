import { createContext, ReactNode, useContext, useMemo, useState } from "react";
import { AvailableFonts } from "@custom-types/styles-types";

interface StyleHover {
  /** The style the pointer or keyboard is on in the table, if any */
  hovered: AvailableFonts | null;
  setHovered: (variant: AvailableFonts | null) => void;
}

const StyleHoverContext = createContext<StyleHover>({
  hovered: null,
  // eslint-disable-next-line @typescript-eslint/no-empty-function -- no provider: nothing to tell
  setHovered: () => {},
});

/** Lets the style table tell the live preview which style to light up */
export function StyleHoverProvider({
  children,
}: {
  children: ReactNode;
}): JSX.Element {
  const [hovered, setHovered] = useState<AvailableFonts | null>(null);
  const value = useMemo(() => ({ hovered, setHovered }), [hovered]);
  return (
    <StyleHoverContext.Provider value={value}>
      {children}
    </StyleHoverContext.Provider>
  );
}

export function useStyleHover(): StyleHover {
  return useContext(StyleHoverContext);
}
