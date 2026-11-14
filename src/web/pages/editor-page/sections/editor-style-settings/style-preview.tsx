import { Box, Typography } from "@components/ui";
import { usePhonePreview } from "@pages/workspace/phone-preview";
import { ResizableAside } from "@pages/workspace/resizable-aside";
import { TemplateSample } from "@pages/workspace/template-section-styles";
import { WORKSPACE_COLORS } from "@pages/workspace/workspace-tokens";

/**
 * Right panel of the Style settings page: the user's own vault drawn with the template's styles,
 * so every change in the table or the page card shows at once.
 */
export function StylePreviewPanel({
  templateId,
}: {
  /** The template whose look is being edited; missing = the active job's */
  templateId?: string;
}): JSX.Element {
  const phone = usePhonePreview();
  return (
    <ResizableAside
      side="right"
      label="the live preview"
      defaultWidth={420}
      stackBelow="md"
      stackedHeight={phone.stackedHeight}
    >
      <Box
        component="aside"
        aria-label="Live preview"
        sx={{
          width: "100%",
          flex: "none",
          bgcolor: WORKSPACE_COLORS.panel,
          borderLeft: { md: `1px solid ${WORKSPACE_COLORS.border}` },
          borderTop: { xs: `1px solid ${WORKSPACE_COLORS.border}`, md: 0 },
          p: 2,
          py: phone.isPhone ? 0 : 2,
          overflow: "auto",
        }}
      >
        {phone.toggle}
        {!phone.isCollapsed && (
          <>
            <Typography sx={{ fontWeight: 700 }}>Live preview</Typography>
            <Typography
              variant="body2"
              sx={{ color: WORKSPACE_COLORS.muted, mb: 1.5 }}
            >
              Your vault with everything shown, drawn with these styles.
            </Typography>
            <TemplateSample templateId={templateId} />
          </>
        )}
      </Box>
    </ResizableAside>
  );
}
