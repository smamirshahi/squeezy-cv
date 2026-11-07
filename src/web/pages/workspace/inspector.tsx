import { useState } from "react";
import {
  Box,
  Button,
  FormControlLabel,
  IconButton,
  Slider,
  Switch,
  Tab,
  TextField,
  Tabs,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
} from "@mui/material";
import ArrowUpwardIcon from "@mui/icons-material/ArrowUpward";
import ArrowDownwardIcon from "@mui/icons-material/ArrowDownward";
import FormatBoldIcon from "@mui/icons-material/FormatBold";
import VisibilityIcon from "@mui/icons-material/Visibility";
import VisibilityOffIcon from "@mui/icons-material/VisibilityOff";
import { getItemLabel } from "@shared/variant/item-label";
import {
  singleColumnLayout,
  twoColumnLayout,
} from "@shared/vault/page-structure";
import { ItemBullets } from "@pages/editor-page/sections/job-section-items";
import { SkillList } from "@pages/workspace/skill-list";
import { FitPanel } from "@pages/workspace/fit-panel";
import { TemplateScopeNote } from "@pages/workspace/template-scope";
import { ResizableAside } from "@pages/workspace/resizable-aside";
import { WORKSPACE_COLORS } from "@pages/workspace/workspace-tokens";
import {
  setSelectedBlock,
  setSelectedSectionInEditorPage,
  setTool,
  updatePageStructure,
} from "@store/app/app-slice";
import { PageStructure } from "@store/app/app-slice-types";
import { useAppDispatch, useAppSelector } from "@store/store-helper";
import {
  activeVariantSelector,
  setAutoFit,
  setFitLimits,
  setItemSelection,
  setPageLimit,
  setSkillStyle,
} from "@store/jobs/jobs-slice";
import {
  FIT_DEFAULTS,
  FIT_LIMIT_RANGES,
  clampFitLimit,
} from "@shared/layout/fit";
import { sectionsSelector } from "@store/vault/vault-slice";
import { Side } from "@custom-types/styles-types";
import {
  SkillGroupBy,
  SkillDisplay,
  Variant,
} from "@custom-types/variant-types";
import { tracksLevels } from "@shared/vault/vault-utils";
import { Section } from "@custom-types/vault-types";

const PERCENT = 100;
const SIDES: Side[] = ["fullWidth", "left", "right"];

function Heading({ children }: { children: string }): JSX.Element {
  return (
    <Typography
      sx={{
        fontSize: 11,
        fontWeight: 700,
        letterSpacing: ".07em",
        textTransform: "uppercase",
        color: WORKSPACE_COLORS.muted,
        mt: 1,
      }}
    >
      {children}
    </Typography>
  );
}

/** Moves a section one place up or down inside its column */
export function moveSection(
  structure: PageStructure,
  id: string,
  delta: -1 | 1
): PageStructure | null {
  for (const side of SIDES) {
    const column = structure[side];
    const index = column.indexOf(id);
    const target = index + delta;
    if (index >= 0 && target >= 0 && target < column.length) {
      const next = [...column];
      [next[index], next[target]] = [next[target], next[index]];
      return { ...structure, [side]: next };
    }
  }
  return null;
}

interface LimitFieldProps {
  limitKey: keyof typeof FIT_LIMIT_RANGES;
  label: string;

  /** 100 when the stored value is a ratio shown as a percentage */
  scale: number;
  stored: number;
  onCommit: (value: number) => void;
}

/**
 * One auto-fit limit. What is typed stays as typed (an empty field is not 0); a number is
 * saved clamped to its range, and when the field is left it shows the saved value.
 */
function LimitField({
  limitKey,
  label,
  scale,
  stored,
  onCommit,
}: LimitFieldProps): JSX.Element {
  const shown = String(Math.round(stored * scale * 10) / 10);
  const [text, setText] = useState<string | null>(null);
  const { min, max } = FIT_LIMIT_RANGES[limitKey];
  return (
    <TextField
      size="small"
      type="number"
      label={label}
      value={text ?? shown}
      helperText={`${Math.round(min * scale)}–${Math.round(max * scale)}`}
      onChange={(event) => {
        setText(event.target.value);
        const parsed = Number(event.target.value);
        if (event.target.value.trim() !== "" && Number.isFinite(parsed)) {
          onCommit(clampFitLimit(limitKey, parsed / scale));
        }
      }}
      onBlur={() => setText(null)}
    />
  );
}

/** Nothing selected: page-wide settings and the list of sections */
function PageInspector(): JSX.Element {
  const dispatch = useAppDispatch();
  const variant = useAppSelector(activeVariantSelector);
  const sections = useAppSelector(sectionsSelector);
  const structure = useAppSelector((s) => s.app.structure);
  const order = SIDES.flatMap((side) => structure[side]);

  function setLimit(key: keyof typeof FIT_LIMIT_RANGES, value: number): void {
    dispatch(
      setFitLimits({
        id: variant.id,
        limits: { ...variant.fitLimits, [key]: value },
      })
    );
  }

  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: 1.5 }}>
      <TemplateScopeNote />
      <FitPanel />
      <Heading>Page limit</Heading>
      <ToggleButtonGroup
        exclusive
        size="small"
        value={variant.pageLimit}
        onChange={(_event, value: number | null) => {
          if (value) {
            dispatch(setPageLimit({ id: variant.id, pageLimit: value }));
          }
        }}
      >
        <ToggleButton value={1}>1 page</ToggleButton>
        <ToggleButton value={2}>2 pages</ToggleButton>
      </ToggleButtonGroup>
      <Heading>Layout</Heading>
      <Box sx={{ display: "flex", gap: 1 }}>
        <Button
          size="small"
          variant="outlined"
          onClick={() =>
            dispatch(updatePageStructure(singleColumnLayout(sections)))
          }
        >
          Single column
        </Button>
        <Button
          size="small"
          variant="outlined"
          onClick={() =>
            dispatch(updatePageStructure(twoColumnLayout(sections)))
          }
        >
          Two columns
        </Button>
      </Box>
      <FormControlLabel
        control={
          <Switch
            size="small"
            checked={variant.isAutoFit ?? false}
            onChange={(event) =>
              dispatch(
                setAutoFit({ id: variant.id, isAutoFit: event.target.checked })
              )
            }
          />
        }
        label="Auto-fit to the page limit"
      />
      <Heading>Auto-fit limits</Heading>
      <Box sx={{ display: "flex", gap: 1 }}>
        <LimitField
          limitKey="minSpacing"
          label="Spacing ≥ %"
          scale={PERCENT}
          stored={variant.fitLimits?.minSpacing ?? FIT_DEFAULTS.minSpacing}
          onCommit={(value) => setLimit("minSpacing", value)}
        />
        <LimitField
          limitKey="minMarginMm"
          label="Margins ≥ mm"
          scale={1}
          stored={variant.fitLimits?.minMarginMm ?? FIT_DEFAULTS.minMarginMm}
          onCommit={(value) => setLimit("minMarginMm", value)}
        />
        <LimitField
          limitKey="minBodyPt"
          label="Text ≥ pt"
          scale={1}
          stored={variant.fitLimits?.minBodyPt ?? FIT_DEFAULTS.minBodyPt}
          onCommit={(value) => setLimit("minBodyPt", value)}
        />
      </Box>
      <Heading>Sections</Heading>
      {order.map((id) => {
        const section = sections.find((s) => s.id === id);
        const label =
          section?.title ?? (id === "personalInfo" ? "Name" : "Contact");
        return (
          <Box
            key={id}
            sx={{
              display: "flex",
              alignItems: "center",
              gap: 0.5,
              borderBottom: `1px solid ${WORKSPACE_COLORS.border}`,
            }}
          >
            <Typography sx={{ flex: 1, fontSize: 13 }}>{label}</Typography>
            {(["up", "down"] as const).map((direction) => (
              <IconButton
                key={direction}
                size="small"
                aria-label={`Move ${label} ${direction}`}
                onClick={() => {
                  const next = moveSection(
                    structure,
                    id,
                    direction === "up" ? -1 : 1
                  );
                  if (next) {
                    dispatch(updatePageStructure(next));
                  }
                }}
              >
                {direction === "up" ? (
                  <ArrowUpwardIcon fontSize="inherit" />
                ) : (
                  <ArrowDownwardIcon fontSize="inherit" />
                )}
              </IconButton>
            ))}
          </Box>
        );
      })}
    </Box>
  );
}

const SKILL_DISPLAYS: { value: SkillDisplay; label: string }[] = [
  { value: "none", label: "None" },
  { value: "dots", label: "Dots" },
  { value: "bars", label: "Bars" },
  { value: "stars", label: "Stars" },
];

const MAX_LEVEL = 5;

interface SkillStyleProps {
  variant: Variant;
  section: Section;
}

/** How this job's template shows the levels of a skills section (the levels live in the vault) */
function SkillStyleControls({
  variant,
  section,
}: SkillStyleProps): JSX.Element {
  const dispatch = useAppDispatch();
  const hasLevels = tracksLevels(section);
  // a template without a choice keeps the earlier look, which is stars
  const display = variant.skillDisplay ?? "stars";
  const columns = variant.skillColumns ?? 1;
  const minLevel = variant.skillMinLevel ?? 0;

  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: 1.5 }}>
      <TemplateScopeNote verb="Skill display changes" />
      <Heading>Show levels as</Heading>
      {!hasLevels && (
        <Typography sx={{ fontSize: 12, color: WORKSPACE_COLORS.muted }}>
          Levels are turned off in the vault (Track my level), so the page shows
          names only.
        </Typography>
      )}
      <ToggleButtonGroup
        exclusive
        fullWidth
        size="small"
        aria-label="Skill display"
        value={display}
        disabled={!hasLevels}
        onChange={(_event, value: SkillDisplay | null) =>
          value && dispatch(setSkillStyle({ id: variant.id, display: value }))
        }
      >
        {SKILL_DISPLAYS.map(({ value, label }) => (
          <ToggleButton key={value} value={value}>
            {label}
          </ToggleButton>
        ))}
      </ToggleButtonGroup>
      <Heading>Group by</Heading>
      <ToggleButtonGroup
        exclusive
        fullWidth
        size="small"
        aria-label="Skill grouping"
        value={variant.skillGroupBy ?? "group"}
        onChange={(_event, value: SkillGroupBy | null) =>
          value && dispatch(setSkillStyle({ id: variant.id, groupBy: value }))
        }
      >
        <ToggleButton value="group">Vault groups</ToggleButton>
        <ToggleButton value="level">Flat, highest level first</ToggleButton>
      </ToggleButtonGroup>
      <Heading>Layout</Heading>
      <ToggleButtonGroup
        exclusive
        fullWidth
        size="small"
        aria-label="Skill columns"
        value={columns}
        onChange={(_event, value: 1 | 2 | null) =>
          value && dispatch(setSkillStyle({ id: variant.id, columns: value }))
        }
      >
        <ToggleButton value={1}>1 column</ToggleButton>
        <ToggleButton value={2}>2 columns</ToggleButton>
      </ToggleButtonGroup>
      {hasLevels && (
        <>
          <Heading>Minimum level</Heading>
          <Box sx={{ display: "flex", alignItems: "center", gap: 2, px: 1 }}>
            <Slider
              min={0}
              max={MAX_LEVEL}
              step={1}
              marks
              value={minLevel}
              aria-label="Minimum level"
              onChange={(_event, value) =>
                dispatch(setSkillStyle({ id: variant.id, minLevel: value }))
              }
            />
            <Typography sx={{ fontWeight: 700, width: 56 }}>
              {minLevel === 0 ? "Any" : minLevel}
            </Typography>
          </Box>
        </>
      )}
      <SkillList section={section} variant={variant} />
      <Typography
        sx={{
          fontSize: 12,
          p: 1,
          borderRadius: 1,
          bgcolor: WORKSPACE_COLORS.panelAlt,
        }}
      >
        <b>ATS note.</b> Skill names always stay real text. Dots and stars are
        text symbols; bars are drawn shapes that a parser can ignore. Some
        recruiters prefer no ratings.
      </Typography>
    </Box>
  );
}

/** One selected item (or section): what it does in this job, and a way to the vault */
function BlockInspector(): JSX.Element | null {
  const dispatch = useAppDispatch();
  const variant = useAppSelector(activeVariantSelector);
  const sections = useAppSelector(sectionsSelector);
  const block = useAppSelector((s) => s.app.selectedBlock);
  const [tab, setTab] = useState<"job" | "vault">("job");

  const section = sections.find((s) => s.id === block?.sectionId);
  const item = section?.items.find((i) => i.id === block?.itemId);
  if (!block || !section) {
    return null;
  }
  const choice = item ? variant.selection[item.id] : undefined;
  const isShown = choice?.isVisible !== false;
  const isEmphasised = choice?.emphasis === "high";

  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: 1.5 }}>
      <Box>
        <Typography sx={{ fontSize: 12, color: WORKSPACE_COLORS.muted }}>
          {section.title}
        </Typography>
        <Typography sx={{ fontSize: 15, fontWeight: 700 }}>
          {item ? getItemLabel(item) : section.title}
        </Typography>
      </Box>
      <Tabs value={tab} onChange={(_event, value) => setTab(value)}>
        <Tab value="job" label="This job" />
        <Tab value="vault" label="In vault" />
      </Tabs>
      {tab === "job" && (
        <>
          <Typography
            sx={{
              fontSize: 12,
              p: 1,
              borderRadius: 1,
              bgcolor: WORKSPACE_COLORS.accentSoft,
              color: WORKSPACE_COLORS.accentText,
            }}
          >
            Item controls change only the job “{variant.name}”.
          </Typography>
          {section.type === "skills" && (
            <SkillStyleControls variant={variant} section={section} />
          )}
          {item ? (
            <>
              <Box sx={{ display: "flex", gap: 1 }}>
                <Button
                  fullWidth
                  size="small"
                  variant={isShown ? "contained" : "outlined"}
                  startIcon={
                    isShown ? <VisibilityIcon /> : <VisibilityOffIcon />
                  }
                  onClick={() =>
                    dispatch(
                      setItemSelection({
                        jobId: variant.id,
                        itemId: item.id,
                        change: { isVisible: !isShown },
                      })
                    )
                  }
                >
                  {isShown ? "Shown" : "Hidden"}
                </Button>
                <Button
                  fullWidth
                  size="small"
                  variant={isEmphasised ? "contained" : "outlined"}
                  startIcon={<FormatBoldIcon />}
                  onClick={() =>
                    dispatch(
                      setItemSelection({
                        jobId: variant.id,
                        itemId: item.id,
                        change: {
                          emphasis: isEmphasised ? "normal" : "high",
                        },
                      })
                    )
                  }
                >
                  Emphasise
                </Button>
              </Box>
              {item.bullets.length > 0 && <Heading>Bullets</Heading>}
              <ItemBullets item={item} isCard />
            </>
          ) : (
            <Typography sx={{ fontSize: 13 }}>
              Click an item in this section to edit how it appears.
            </Typography>
          )}
        </>
      )}
      {tab === "vault" && (
        <>
          <Typography sx={{ fontSize: 13 }}>
            Editing the vault changes the fact itself, in every job that uses
            it.
          </Typography>
          <Button
            variant="outlined"
            onClick={() => {
              dispatch(setSelectedSectionInEditorPage(section.id));
              dispatch(setTool("vault"));
            }}
          >
            Edit “{section.title}” in the vault
          </Button>
        </>
      )}
      <Button size="small" onClick={() => dispatch(setSelectedBlock(null))}>
        Back to page settings
      </Button>
    </Box>
  );
}

/** The right panel: follows what is selected on the canvas */
export function Inspector(): JSX.Element {
  const block = useAppSelector((s) => s.app.selectedBlock);
  return (
    <ResizableAside side="right" label="the inspector" defaultWidth={340}>
      <Box
        component="aside"
        aria-label="Inspector"
        sx={{
          width: "100%",
          flex: "none",
          bgcolor: WORKSPACE_COLORS.panel,
          borderLeft: `1px solid ${WORKSPACE_COLORS.border}`,
          overflow: "auto",
          p: 2,
        }}
      >
        <>{block ? <BlockInspector /> : <PageInspector />}</>
      </Box>
    </ResizableAside>
  );
}
