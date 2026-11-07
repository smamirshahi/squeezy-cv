import { Box, Typography } from "@mui/material";
import { WORKSPACE_COLORS } from "@pages/workspace/workspace-tokens";
import { STYLE_TOKENS } from "@pages/editor-page/sections/editor-style-settings/style-tokens";

/** Right panel of the Style settings page: where each style shows up on the CV */
export function StyleUsagePanel(): JSX.Element {
  return (
    <Box
      component="aside"
      aria-label="Where styles are used"
      sx={{
        width: 300,
        flex: "none",
        bgcolor: WORKSPACE_COLORS.panel,
        borderLeft: `1px solid ${WORKSPACE_COLORS.border}`,
        p: 2,
        overflow: "auto",
      }}
    >
      <Typography sx={{ fontWeight: 700, mb: 1.5 }}>
        Where each style is used
      </Typography>
      <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
        {STYLE_TOKENS.map(({ variant, where }) => (
          <Box key={variant} sx={{ display: "flex", gap: 1 }}>
            <Typography sx={{ width: 86, flex: "none", fontWeight: 700 }}>
              {variant}
            </Typography>
            <Typography sx={{ flex: 1, color: WORKSPACE_COLORS.muted }}>
              {where}
            </Typography>
          </Box>
        ))}
      </Box>
      <Typography
        variant="body2"
        sx={{
          mt: 2,
          p: 1.25,
          borderRadius: 0.5,
          bgcolor: WORKSPACE_COLORS.panelAlt,
        }}
      >
        Changes here affect all variants. A variant can still override the page
        limit and layout in its own inspector.
      </Typography>
    </Box>
  );
}
