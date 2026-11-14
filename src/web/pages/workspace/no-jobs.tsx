import { Box, Button, Typography } from "@components/ui";
import {
  MIDDLE_AREA_SX,
  WORKSPACE_COLORS,
} from "@pages/workspace/workspace-tokens";
import { onAppLinkClick } from "@hooks/navigation";
import { formatRoute } from "@shared/routing/routes";

const DETAILS = { kind: "jobs", view: "details" } as const;

/** What the pages of a job show until the first job application has been started */
export function NoJobs(): JSX.Element {
  return (
    <Box
      component="main"
      aria-label="No job added yet"
      sx={{
        ...MIDDLE_AREA_SX,
        flex: 1,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: 1.5,
        p: 4,
      }}
    >
      <Typography sx={{ fontSize: 18, fontWeight: 700 }}>
        Start with the job application
      </Typography>
      <Typography sx={{ color: WORKSPACE_COLORS.muted, textAlign: "center" }}>
        Fill in the job (company, role, advert) first. This page then works on
        that job.
      </Typography>
      <Button
        variant="contained"
        href={formatRoute(DETAILS)}
        onClick={(event) => onAppLinkClick(event, DETAILS)}
      >
        Go to Job application
      </Button>
    </Box>
  );
}
