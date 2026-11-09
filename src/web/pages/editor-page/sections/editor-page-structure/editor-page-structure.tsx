import { Box, ButtonBase, Chip, Typography } from "@mui/material";
import { WORKSPACE_COLORS } from "@pages/workspace/workspace-tokens";
import { SectionPlacement } from "@pages/editor-page/section-placement/section-placement";
import { IncludeSectionButton } from "@pages/editor-page/section-placement/include-section-button";
import { PageStructureSlider } from "@pages/editor-page/sections/editor-page-structure/page-structure-slider";
import { appSelector, updatePageStructure } from "@store/app/app-slice";
import { useAppDispatch, useAppSelector } from "@store/store-helper";
import { sectionsSelector } from "@store/vault/vault-slice";
import {
  singleColumnLayout,
  twoColumnLayout,
} from "@shared/vault/page-structure";

interface LayoutCardProps {
  title: string;
  description: string;
  isRecommended?: boolean;
  isSelected: boolean;
  isTwoColumns: boolean;
  onPick: () => void;
}

const LINE_COLOR = "#C9CCD1";

/** A thumbnail of the page: a heading and lines, in one or two columns */
function Thumbnail({ isTwoColumns }: { isTwoColumns: boolean }): JSX.Element {
  const line = (key: number): JSX.Element => (
    <Box key={key} sx={{ height: 4, bgcolor: LINE_COLOR }} />
  );
  return (
    <Box
      aria-hidden="true"
      sx={{
        width: 58,
        height: 78,
        flex: "none",
        p: "6px",
        display: "flex",
        flexDirection: "column",
        gap: "4px",
        border: "1px solid #B9BCC2",
        bgcolor: "#fff",
      }}
    >
      <Box sx={{ height: 8, width: "60%", bgcolor: "#8B9098" }} />
      {isTwoColumns ? (
        <Box sx={{ display: "flex", gap: "4px", flex: 1 }}>
          <Box
            sx={{
              flex: 1,
              display: "flex",
              flexDirection: "column",
              gap: "4px",
            }}
          >
            {[0, 1, 2].map(line)}
          </Box>
          <Box
            sx={{
              flex: 1.3,
              display: "flex",
              flexDirection: "column",
              gap: "4px",
            }}
          >
            {[0, 1, 2, 3].map(line)}
          </Box>
        </Box>
      ) : (
        [0, 1, 2, 3, 4, 5].map(line)
      )}
    </Box>
  );
}

function LayoutCard({
  title,
  description,
  isRecommended,
  isSelected,
  isTwoColumns,
  onPick,
}: LayoutCardProps): JSX.Element {
  return (
    <ButtonBase
      role="radio"
      aria-checked={isSelected}
      onClick={onPick}
      sx={{
        display: "flex",
        alignItems: "flex-start",
        justifyContent: "flex-start",
        gap: 2,
        p: isSelected ? "13px" : "14px",
        textAlign: "left",
        borderRadius: 1.5,
        border: isSelected
          ? `2px solid ${WORKSPACE_COLORS.accent}`
          : `1px solid ${WORKSPACE_COLORS.borderStrong}`,
        bgcolor: isSelected
          ? WORKSPACE_COLORS.accentSoft
          : WORKSPACE_COLORS.panel,
      }}
    >
      <Thumbnail isTwoColumns={isTwoColumns} />
      <Box sx={{ minWidth: 0 }}>
        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
          <Typography sx={{ fontWeight: 600, fontSize: 14 }}>
            {title}
          </Typography>
          {isRecommended && (
            <Chip size="small" color="success" label="Recommended" />
          )}
        </Box>
        <Typography sx={{ fontSize: 12.5, mt: 0.25 }}>{description}</Typography>
      </Box>
    </ButtonBase>
  );
}

/**
 * The "Sections & layout" tab: pick a page layout, then tick, order and place the
 * sections. Layout and order belong to the template of the job; which sections this job
 * includes belongs to the job.
 */
export function EditorPageStructure(): JSX.Element {
  const dispatch = useAppDispatch();
  const sections = useAppSelector(sectionsSelector);
  const { structure } = useAppSelector(appSelector);
  const hasColumns = structure.left.length > 0 || structure.right.length > 0;

  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
      <Box
        component="section"
        sx={{
          p: 2.5,
          display: "flex",
          flexDirection: "column",
          gap: 1.75,
          border: `1px solid ${WORKSPACE_COLORS.border}`,
          borderRadius: 1.5,
          bgcolor: WORKSPACE_COLORS.panel,
        }}
      >
        <Box>
          <Typography sx={{ fontWeight: 600, fontSize: 15 }}>
            1 · Pick a page layout
          </Typography>
          <Typography sx={{ fontSize: 12.5, color: WORKSPACE_COLORS.muted }}>
            A starting point. You can still move every section afterwards.
          </Typography>
        </Box>
        <Box
          role="radiogroup"
          aria-label="Page layout"
          sx={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
            gap: 1.5,
          }}
        >
          <LayoutCard
            title="Single column (UK)"
            description="One column, easiest for recruiter software to read. A good default for UK applications."
            isRecommended
            isSelected={!hasColumns}
            isTwoColumns={false}
            onPick={() =>
              dispatch(updatePageStructure(singleColumnLayout(sections)))
            }
          />
          <LayoutCard
            title="Two columns"
            description="Side by side. Saves space for skills-heavy CVs, but some recruiter software reads it less reliably."
            isSelected={hasColumns}
            isTwoColumns
            onPick={() =>
              dispatch(updatePageStructure(twoColumnLayout(sections)))
            }
          />
        </Box>
      </Box>

      <Box
        component="section"
        sx={{
          p: 2.5,
          display: "flex",
          flexDirection: "column",
          gap: 1.75,
          border: `1px solid ${WORKSPACE_COLORS.border}`,
          borderRadius: 1.5,
          bgcolor: WORKSPACE_COLORS.panel,
        }}
      >
        <Box>
          <Typography sx={{ fontWeight: 600, fontSize: 15 }}>
            2 · Arrange sections
          </Typography>
          <Typography sx={{ fontSize: 12.5, color: WORKSPACE_COLORS.muted }}>
            Drag the sections (or use the arrows) to set their order and place.
            The bin removes a section from this job; Add section brings back one
            you removed. New sections are made in the Vault. Which entries
            appear inside a section is set on the Content tab. Your name and
            contact details always stay at the top.
          </Typography>
        </Box>
        {hasColumns && <PageStructureSlider />}
        <SectionPlacement />
        <IncludeSectionButton />
      </Box>
    </Box>
  );
}
