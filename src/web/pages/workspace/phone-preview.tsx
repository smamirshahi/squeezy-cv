import { useState } from "react";
import { ButtonBase } from "@components/ui";
import { ExpandMoreOutlined as ExpandMoreOutlinedIcon } from "@components/ui/icons";
import { useViewport } from "@hooks/use-viewport";
import { WORKSPACE_COLORS } from "@pages/workspace/workspace-tokens";

const TABLET_HEIGHT = "clamp(150px, 28vh, 320px)";
const CLOSED_HEIGHT = 48;
const OPEN_HEIGHT = "55vh";

/**
 * A preview panel under the content is a permanent dock on a tablet, but on a phone it would
 * leave no room to scroll: there it is a collapsed row ("Preview") that opens on tap. On every
 * other size `isCollapsed` is always false, so the panel is drawn as before.
 */
export function usePhonePreview(): {
  isPhone: boolean;
  isCollapsed: boolean;
  toggle: JSX.Element | null;
  stackedHeight: { xs: string | number; sm: string };
} {
  const isPhone = useViewport() === "phone";
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const toggle = isPhone ? (
    <ButtonBase
      aria-expanded={isOpen}
      onClick={() => setIsOpen((was) => !was)}
      sx={{
        width: "100%",
        minHeight: 44,
        justifyContent: "space-between",
        fontWeight: 700,
        color: WORKSPACE_COLORS.text,
      }}
    >
      Preview
      <ExpandMoreOutlinedIcon
        sx={{ transform: isOpen ? "rotate(180deg)" : "none" }}
      />
    </ButtonBase>
  ) : null;
  return {
    isPhone,
    isCollapsed: isPhone && !isOpen,
    toggle,
    stackedHeight: {
      xs: isPhone && !isOpen ? CLOSED_HEIGHT : OPEN_HEIGHT,
      sm: TABLET_HEIGHT,
    },
  };
}
