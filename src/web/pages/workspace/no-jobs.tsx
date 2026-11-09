import { useState } from "react";
import { Box, Button, Typography } from "@mui/material";
import { NewJobDialog } from "@pages/workspace/new-job-dialog";
import {
  MIDDLE_AREA_SX,
  WORKSPACE_COLORS,
} from "@pages/workspace/workspace-tokens";

/** What the Jobs, Templates and Chat tools show until the first job is added */
export function NoJobs({ tool }: { tool: string }): JSX.Element {
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const what = tool === "templates" ? "No template yet" : "No job added yet";
  return (
    <Box
      component="main"
      aria-label={what}
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
      <Typography sx={{ fontSize: 18, fontWeight: 700 }}>{what}</Typography>
      <Typography sx={{ color: WORKSPACE_COLORS.muted, textAlign: "center" }}>
        {tool === "templates"
          ? "You can create a template based on the Vault."
          : "Add a job to build a CV for one application from your vault."}
      </Typography>
      <Button variant="contained" onClick={() => setIsOpen(true)}>
        Add a job
      </Button>
      <NewJobDialog isOpen={isOpen} onClose={() => setIsOpen(false)} />
    </Box>
  );
}
