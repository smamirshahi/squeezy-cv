import { ReactNode, useState } from "react";
import {
  Box,
  Button,
  ButtonBase,
  MenuItem,
  TextField,
  Typography,
} from "@components/ui";
import { useViewport } from "@hooks/use-viewport";
import { ColoursCard } from "@pages/editor-page/sections/editor-style-settings/colours-card";
import {
  PageSettings,
  ResetStyleButton,
} from "@pages/editor-page/sections/editor-style-settings/editor-style-settings";
import { TypographyTable } from "@pages/editor-page/sections/editor-style-settings/typography-table";
import { ResizableAside } from "@pages/workspace/resizable-aside";
import { TemplateSample } from "@pages/workspace/template-section-styles";
import {
  MIDDLE_AREA_SX,
  WORKSPACE_COLORS,
} from "@pages/workspace/workspace-tokens";

type DesignGroup = "page" | "colours" | "typography";

const GROUPS: { id: DesignGroup; label: string; hint: string }[] = [
  {
    id: "page",
    label: "Page",
    hint: "Margin, dates, spacing, icons and bullets",
  },
  {
    id: "colours",
    label: "Colours",
    hint: "Text, secondary and accent colours",
  },
  {
    id: "typography",
    label: "Typography",
    hint: "Size and weight of each text style",
  },
];

/** A white card, like the ones the Sections settings sit in, so the panel is not bare grey */
function DesignCard({ children }: { children: ReactNode }): JSX.Element {
  return (
    <Box
      sx={{
        p: 2,
        border: `1px solid ${WORKSPACE_COLORS.border}`,
        borderRadius: 1.5,
        bgcolor: WORKSPACE_COLORS.panel,
      }}
    >
      {children}
    </Box>
  );
}

/**
 * The Design tab, laid out like Sections: the groups on the left, the live preview in the
 * middle and the settings of the chosen group on the right, so the preview never moves when
 * switching between Sections and Design.
 */
export function TemplateDesignPage({
  templateId,
}: {
  /** The template being designed */
  templateId: string;
}): JSX.Element {
  const isDesktop = useViewport() === "desktop";
  const [group, setGroup] = useState<DesignGroup>("page");
  const index = GROUPS.findIndex((entry) => entry.id === group);
  const current = GROUPS[index];

  const list = (
    <Box
      component="aside"
      aria-label="Design groups"
      sx={{
        width: { lg: 300 },
        flex: "none",
        bgcolor: WORKSPACE_COLORS.panel,
        borderRight: { lg: `1px solid ${WORKSPACE_COLORS.border}` },
        overflow: "auto",
        p: 1.5,
        display: "flex",
        flexDirection: "column",
        gap: 1,
      }}
    >
      <Typography
        component="h2"
        sx={{
          fontSize: 11,
          fontWeight: 700,
          letterSpacing: ".07em",
          textTransform: "uppercase",
          color: WORKSPACE_COLORS.muted,
        }}
      >
        Design
      </Typography>
      {GROUPS.map((entry) => {
        const isSelected = entry.id === group;
        return (
          <ButtonBase
            key={entry.id}
            aria-pressed={isSelected}
            onClick={() => setGroup(entry.id)}
            sx={{
              display: "block",
              textAlign: "left",
              p: 1.5,
              borderRadius: 1,
              border: `1px solid ${
                isSelected ? WORKSPACE_COLORS.accent : WORKSPACE_COLORS.border
              }`,
              bgcolor: isSelected
                ? WORKSPACE_COLORS.accentSoft
                : WORKSPACE_COLORS.panel,
            }}
          >
            <Typography sx={{ fontWeight: 600, fontSize: 14 }}>
              {entry.label}
            </Typography>
            <Typography sx={{ fontSize: 12, color: WORKSPACE_COLORS.muted }}>
              {entry.hint}
            </Typography>
          </ButtonBase>
        );
      })}
      <Typography
        sx={{ fontSize: 12.5, color: WORKSPACE_COLORS.muted, mt: 0.5 }}
      >
        Settings of one section (the header, publications, skills ...) are in
        Sections.
      </Typography>
    </Box>
  );

  const properties = (
    <Box
      component="aside"
      aria-label="Design settings"
      sx={{
        width: { lg: "100%" },
        flex: "none",
        bgcolor: WORKSPACE_COLORS.canvas,
        borderLeft: { lg: `1px solid ${WORKSPACE_COLORS.border}` },
        borderTop: { xs: `1px solid ${WORKSPACE_COLORS.border}`, lg: 0 },
        display: "flex",
        flexDirection: "column",
        minHeight: 0,
      }}
    >
      <Box
        sx={{
          p: 1.5,
          bgcolor: WORKSPACE_COLORS.panel,
          borderBottom: `1px solid ${WORKSPACE_COLORS.border}`,
        }}
      >
        <Typography sx={{ fontSize: 12.5, color: WORKSPACE_COLORS.muted }}>
          Group {index + 1} of {GROUPS.length}
        </Typography>
        {isDesktop ? (
          <Typography
            component="h1"
            sx={{ fontSize: 18, fontWeight: 700, mt: 0.5 }}
          >
            {current.label}
          </Typography>
        ) : (
          <TextField
            select
            size="small"
            fullWidth
            value={group}
            onChange={(event) => setGroup(event.target.value as DesignGroup)}
            slotProps={{ htmlInput: { "aria-label": "Design group" } }}
            sx={{ mt: 0.5 }}
          >
            {GROUPS.map((entry) => (
              <MenuItem key={entry.id} value={entry.id}>
                {entry.label}
              </MenuItem>
            ))}
          </TextField>
        )}
        <Box sx={{ display: "flex", gap: 0.5, mt: 1 }} aria-hidden="true">
          {GROUPS.map((entry, position) => (
            <Box
              key={entry.id}
              sx={{
                flex: 1,
                height: 4,
                borderRadius: 2,
                bgcolor:
                  position <= index
                    ? WORKSPACE_COLORS.accent
                    : WORKSPACE_COLORS.border,
              }}
            />
          ))}
        </Box>
      </Box>
      <Box
        sx={{
          flex: 1,
          minHeight: 0,
          overflow: "auto",
          p: 1.5,
          display: "flex",
          flexDirection: "column",
          gap: 1.5,
        }}
      >
        {group === "page" && (
          <DesignCard>
            <PageSettings />
          </DesignCard>
        )}
        {group === "colours" && (
          <>
            <DesignCard>
              <ColoursCard />
            </DesignCard>
            <ResetStyleButton />
          </>
        )}
        {group === "typography" && (
          <>
            <TypographyTable />
            <ResetStyleButton />
          </>
        )}
      </Box>
      <Box
        sx={{
          display: "flex",
          justifyContent: "space-between",
          gap: 1,
          p: 1.5,
          bgcolor: WORKSPACE_COLORS.panel,
          borderTop: `1px solid ${WORKSPACE_COLORS.border}`,
        }}
      >
        <Button
          disabled={index <= 0}
          onClick={() => setGroup(GROUPS[index - 1].id)}
          sx={{ minHeight: { xs: 44, lg: 36 } }}
        >
          Back
        </Button>
        <Button
          variant="contained"
          disabled={index >= GROUPS.length - 1}
          onClick={() => setGroup(GROUPS[index + 1].id)}
          sx={{ minHeight: { xs: 44, lg: 36 } }}
        >
          {index < GROUPS.length - 1
            ? `Next: ${GROUPS[index + 1].label}`
            : "Next"}
        </Button>
      </Box>
    </Box>
  );

  return (
    <Box
      sx={{
        flex: 1,
        minWidth: 0,
        minHeight: 0,
        display: "flex",
        flexDirection: { xs: "column", lg: "row" },
        overflow: "auto",
      }}
    >
      {isDesktop && list}
      <Box
        component="main"
        aria-label="Template design"
        sx={{
          flex: 1,
          minWidth: 0,
          overflow: "auto",
          p: { xs: 1.5, md: 2.5 },
          ...MIDDLE_AREA_SX,
        }}
      >
        <Box sx={{ maxWidth: 760, mx: "auto" }}>
          <TemplateSample templateId={templateId} isFullLength />
        </Box>
      </Box>
      {isDesktop ? (
        <ResizableAside
          side="right"
          label="the design settings"
          defaultWidth={340}
        >
          {properties}
        </ResizableAside>
      ) : (
        properties
      )}
    </Box>
  );
}
