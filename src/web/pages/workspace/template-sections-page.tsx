import { ReactNode, useEffect, useState } from "react";
import {
  Box,
  Button,
  IconButton,
  MenuItem,
  Switch,
  TextField,
  Typography,
} from "@components/ui";
import {
  ArrowDownwardOutlined as ArrowDownwardIcon,
  ArrowUpwardOutlined as ArrowUpwardIcon,
  DeleteOutlined as DeleteIcon,
} from "@components/ui/icons";
import { useViewport } from "@hooks/use-viewport";
import { AddToTemplateButton } from "@pages/editor-page/section-placement/add-to-template-button";
import { SectionPlacement } from "@pages/editor-page/section-placement/section-placement";
import {
  moveToColumn,
  moveWithinColumn,
} from "@pages/editor-page/section-placement/section-placement-utils";
import { PageStructureSlider } from "@pages/editor-page/sections/editor-page-structure/page-structure-slider";
import { SectionProperties } from "@pages/workspace/template-section-properties";
import { TemplateSample } from "@pages/workspace/template-section-styles";
import {
  MIDDLE_AREA_SX,
  WORKSPACE_COLORS,
} from "@pages/workspace/workspace-tokens";
import { Side } from "@custom-types/styles-types";
import {
  singleColumnLayout,
  twoColumnLayout,
} from "@shared/vault/page-structure";
import { HEADER_IDS } from "@shared/vault/default-vault";
import { appSelector, updatePageStructure } from "@store/app/app-slice";
import { useAppDispatch, useAppSelector } from "@store/store-helper";
import { getPreviewPartLabel } from "@store/vault/section-labels";
import { sectionsSelector } from "@store/vault/vault-slice";

const AREA_LABELS: Record<Side, string> = {
  fullWidth: "Full width",
  left: "Left column",
  right: "Right column",
};

/** One page layout for the whole template: single column (UK) or two columns */
function LayoutSelect(): JSX.Element {
  const dispatch = useAppDispatch();
  const sections = useAppSelector(sectionsSelector);
  const { structure } = useAppSelector(appSelector);
  const hasColumns = structure.left.length > 0 || structure.right.length > 0;
  return (
    <TextField
      select
      size="small"
      label="Page layout"
      value={hasColumns ? "two" : "one"}
      onChange={(event) =>
        dispatch(
          updatePageStructure(
            event.target.value === "two"
              ? twoColumnLayout(sections)
              : singleColumnLayout(sections)
          )
        )
      }
    >
      <MenuItem value="one">Single column (UK)</MenuItem>
      <MenuItem value="two">Two columns</MenuItem>
    </TextField>
  );
}

/** The ids of the parts the template places, in the order they appear on the CV */
function placedPartIds(structure: {
  fullWidth: string[];
  left: string[];
  right: string[];
}): string[] {
  return [...structure.fullWidth, ...structure.left, ...structure.right];
}

/**
 * Templates > Sections: the sections of a template in a list, the sample CV with the chosen one
 * outlined, and its settings. The list (or, below a desktop, the dropdown in the settings header)
 * and a click on the paper choose the section; Back and Next walk through them in CV order.
 */
export function TemplateSectionsPage({
  templateSwitcher,
}: {
  /** The "which template" control, drawn above the sample */
  templateSwitcher: ReactNode;
}): JSX.Element {
  const dispatch = useAppDispatch();
  const viewport = useViewport();
  const isDesktop = viewport === "desktop";
  const sections = useAppSelector(sectionsSelector);
  const { structure } = useAppSelector(appSelector);
  const [selected, setSelected] = useState<string>("personalInfo");
  const [isHighlighted, setIsHighlighted] = useState<boolean>(true);

  const known = new Set<string>([
    ...HEADER_IDS,
    ...sections.map((section) => section.id),
  ]);
  const ids = placedPartIds(structure).filter((id) => known.has(id));
  const current = ids.includes(selected) ? selected : (ids[0] ?? "");
  useEffect(() => {
    if (current !== "" && current !== selected) {
      setSelected(current);
    }
  }, [current, selected]);

  const index = ids.indexOf(current);
  const isHeaderPart = (HEADER_IDS as readonly string[]).includes(current);
  const side: Side =
    (["fullWidth", "left", "right"] as const).find((candidate) =>
      structure[candidate].includes(current)
    ) ?? "fullWidth";
  const hasColumns = structure.left.length > 0 || structure.right.length > 0;
  const label = (id: string): string => getPreviewPartLabel(id, sections);
  const section = sections.find((entry) => entry.id === current);

  function move(delta: -1 | 1): void {
    dispatch(updatePageStructure(moveWithinColumn(structure, current, delta)));
  }
  function remove(): void {
    const next = {
      fullWidth: structure.fullWidth.filter((id) => id !== current),
      left: structure.left.filter((id) => id !== current),
      right: structure.right.filter((id) => id !== current),
    };
    dispatch(updatePageStructure(next));
  }

  if (ids.length === 0) {
    return (
      <Box
        component="main"
        aria-label="Template sections"
        sx={{ flex: 1, p: 3, ...MIDDLE_AREA_SX }}
      >
        <Typography sx={{ mb: 1.5 }}>
          This template has no sections yet.
        </Typography>
        <AddToTemplateButton />
      </Box>
    );
  }

  const list = (
    <Box
      component="aside"
      aria-label="Sections"
      sx={{
        width: { lg: 300 },
        flex: "none",
        bgcolor: WORKSPACE_COLORS.panel,
        borderRight: { lg: `1px solid ${WORKSPACE_COLORS.border}` },
        overflow: "auto",
        p: 1.5,
        display: "flex",
        flexDirection: "column",
        gap: 1.5,
      }}
    >
      <LayoutSelect />
      {hasColumns && <PageStructureSlider />}
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
        Sections · {ids.length}
      </Typography>
      <SectionPlacement
        selection={{ selectedId: current, onSelect: setSelected }}
      />
      <AddToTemplateButton />
      <Typography sx={{ fontSize: 12.5, color: WORKSPACE_COLORS.muted }}>
        Click a section, or click it on the paper. Drag to reorder. Your name
        and contact details always stay at the top. New sections are made in the
        Vault.
      </Typography>
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
        aria-label="Template sections"
        sx={{
          flex: 1,
          minWidth: 0,
          overflow: "auto",
          p: { xs: 1.5, md: 2.5 },
          ...MIDDLE_AREA_SX,
        }}
      >
        <Box sx={{ maxWidth: 760, mx: "auto" }}>
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              flexWrap: "wrap",
              gap: 1.5,
              mb: 1.5,
            }}
          >
            <Box sx={{ flex: 1, minWidth: 220 }}>{templateSwitcher}</Box>
            <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
              <Switch
                checked={isHighlighted}
                onChange={(event) => setIsHighlighted(event.target.checked)}
                slotProps={{ input: { "aria-label": "Highlight section" } }}
              />
              <Typography sx={{ fontSize: 13 }}>Highlight section</Typography>
            </Box>
          </Box>
          <TemplateSample
            isFullLength
            selectedPartId={isHighlighted ? current : undefined}
            onSelectPart={(id) => ids.includes(id) && setSelected(id)}
          />
        </Box>
      </Box>
      <Box
        component="aside"
        aria-label="Section properties"
        sx={{
          width: { lg: 340 },
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
            Section {index + 1} of {ids.length}
          </Typography>
          <Box
            sx={{ display: "flex", alignItems: "center", gap: 0.5, mt: 0.5 }}
          >
            {isDesktop ? (
              <Typography
                component="h1"
                noWrap
                sx={{ flex: 1, fontSize: 18, fontWeight: 700 }}
              >
                {label(current)}
              </Typography>
            ) : (
              <TextField
                select
                size="small"
                value={current}
                onChange={(event) => setSelected(event.target.value)}
                slotProps={{ htmlInput: { "aria-label": "Section" } }}
                sx={{ flex: 1, minWidth: 0 }}
              >
                {ids.map((id) => (
                  <MenuItem key={id} value={id}>
                    {label(id)}
                  </MenuItem>
                ))}
              </TextField>
            )}
            {!isHeaderPart && (
              <>
                <IconButton
                  aria-label={`Move ${label(current)} up`}
                  disabled={structure[side].indexOf(current) <= 0}
                  onClick={() => move(-1)}
                  sx={{ p: { xs: "11px", lg: "8px" } }}
                >
                  <ArrowUpwardIcon fontSize="small" />
                </IconButton>
                <IconButton
                  aria-label={`Move ${label(current)} down`}
                  disabled={
                    structure[side].indexOf(current) ===
                    structure[side].length - 1
                  }
                  onClick={() => move(1)}
                  sx={{ p: { xs: "11px", lg: "8px" } }}
                >
                  <ArrowDownwardIcon fontSize="small" />
                </IconButton>
                <IconButton
                  aria-label={`Remove ${label(current)} from the template`}
                  title="Remove from this template (your vault keeps it)"
                  onClick={remove}
                  sx={{ p: { xs: "11px", lg: "8px" } }}
                >
                  <DeleteIcon fontSize="small" />
                </IconButton>
              </>
            )}
          </Box>
          {isHeaderPart && (
            <Typography
              sx={{ fontSize: 12.5, color: WORKSPACE_COLORS.muted, mt: 0.5 }}
            >
              Always at the top
            </Typography>
          )}
          <Box sx={{ display: "flex", gap: 0.5, mt: 1 }} aria-hidden="true">
            {ids.map((id, position) => (
              <Box
                key={id}
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
          {hasColumns && !isHeaderPart && (
            <TextField
              select
              size="small"
              label="Area on the page"
              value={side}
              onChange={(event) =>
                dispatch(
                  updatePageStructure(
                    moveToColumn(structure, current, event.target.value as Side)
                  )
                )
              }
            >
              {(Object.keys(AREA_LABELS) as Side[]).map((key) => (
                <MenuItem key={key} value={key}>
                  {AREA_LABELS[key]}
                </MenuItem>
              ))}
            </TextField>
          )}
          <SectionProperties id={current} section={section} />
          {!isDesktop && (
            <Box
              sx={{
                mt: 1,
                pt: 1.5,
                borderTop: `1px solid ${WORKSPACE_COLORS.border}`,
              }}
            >
              <Typography sx={{ fontWeight: 600, fontSize: 14, mb: 1 }}>
                Page layout and sections
              </Typography>
              <Box sx={{ mb: 1.5 }}>
                <LayoutSelect />
              </Box>
              {hasColumns && (
                <Box sx={{ mb: 1.5 }}>
                  <PageStructureSlider />
                </Box>
              )}
              <SectionPlacement
                selection={{ selectedId: current, onSelect: setSelected }}
              />
              <AddToTemplateButton />
            </Box>
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
            onClick={() => setSelected(ids[index - 1])}
            sx={{ minHeight: { xs: 44, lg: 36 } }}
          >
            Back
          </Button>
          <Button
            variant="contained"
            disabled={index >= ids.length - 1}
            onClick={() => setSelected(ids[index + 1])}
            sx={{ minHeight: { xs: 44, lg: 36 } }}
          >
            {index < ids.length - 1 ? `Next: ${label(ids[index + 1])}` : "Next"}
          </Button>
        </Box>
      </Box>
    </Box>
  );
}
