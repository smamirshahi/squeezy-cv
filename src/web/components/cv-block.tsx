import { Box } from "@components/ui";

interface Props {
  /** Keep this block on the same page as the one after it (e.g. an item header and its first bullet) */
  shouldKeepWithNext?: boolean;

  children: React.ReactNode;
}

/**
 * A part of the CV that must not be split across two pages. The attributes let the
 * preview measure it to show where the pages break; the CSS does the same when printing.
 */
export function CvBlock({
  shouldKeepWithNext = false,
  children,
}: Props): JSX.Element {
  return (
    <Box
      data-cv-block=""
      data-cv-keep={shouldKeepWithNext ? "" : undefined}
      sx={{
        width: "100%",
        breakInside: "avoid",
        ...(shouldKeepWithNext ? { breakAfter: "avoid" } : {}),
      }}
    >
      {children}
    </Box>
  );
}
