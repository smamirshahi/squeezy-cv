import { Box, Button, Typography } from "@components/ui";
import { WORKSPACE_COLORS } from "@pages/workspace/workspace-tokens";
import { onAppLinkClick } from "@hooks/navigation";

interface Props {
  /** What was not found, e.g. "job" */
  what: string;

  /** Where the way back goes, and what it is called */
  backTo: { href: string; label: string };
}

/** Shown instead of a wrong or empty screen when an address names something that does not exist */
export function NotFound({ what, backTo }: Props): JSX.Element {
  return (
    <Box
      component="main"
      aria-label="Not found"
      sx={{
        flex: 1,
        minWidth: 0,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: 1.5,
        p: 3,
        textAlign: "center",
        bgcolor: WORKSPACE_COLORS.canvas,
      }}
    >
      <Typography component="h1" sx={{ fontSize: 20, fontWeight: 700 }}>
        Not found
      </Typography>
      <Typography sx={{ color: WORKSPACE_COLORS.muted }}>
        This {what} does not exist (it may have been deleted, or the link is
        wrong).
      </Typography>
      <Button
        variant="contained"
        href={backTo.href}
        onClick={(event) => onAppLinkClick(event, backTo.href)}
      >
        {backTo.label}
      </Button>
    </Box>
  );
}
