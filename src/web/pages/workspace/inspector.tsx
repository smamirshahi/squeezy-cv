import { useState } from "react";
import {
  Box,
  Button,
  FormControlLabel,
  IconButton,
  Switch,
  Tab,
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
import { ItemBullets } from "@pages/editor-page/sections/variant-section-items";
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
  setItemSelection,
  setPageLimit,
} from "@store/variants/variants-slice";
import { sectionsSelector } from "@store/vault/vault-slice";
import { Side } from "@custom-types/styles-types";

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
function moveSection(
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

/** Nothing selected: page-wide settings and the list of sections */
function PageInspector(): JSX.Element {
  const dispatch = useAppDispatch();
  const variant = useAppSelector(activeVariantSelector);
  const sections = useAppSelector(sectionsSelector);
  const structure = useAppSelector((s) => s.app.structure);
  const order = SIDES.flatMap((side) => structure[side]);

  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: 1.5 }}>
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

/** One selected item (or section): what it does in this variant, and a way to the vault */
function BlockInspector(): JSX.Element | null {
  const dispatch = useAppDispatch();
  const variant = useAppSelector(activeVariantSelector);
  const sections = useAppSelector(sectionsSelector);
  const block = useAppSelector((s) => s.app.selectedBlock);
  const [tab, setTab] = useState<"variant" | "vault">("variant");

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
        <Tab value="variant" label="This variant" />
        <Tab value="vault" label="In vault" />
      </Tabs>
      {tab === "variant" && (
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
            Changes here affect only “{variant.name}”.
          </Typography>
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
                        variantId: variant.id,
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
                        variantId: variant.id,
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
              <ItemBullets item={item} />
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
            Editing the vault changes the fact itself, in every variant that
            uses it.
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
    <Box
      component="aside"
      aria-label="Inspector"
      sx={{
        width: 340,
        flex: "none",
        bgcolor: WORKSPACE_COLORS.panel,
        borderLeft: `1px solid ${WORKSPACE_COLORS.border}`,
        overflow: "auto",
        p: 2,
      }}
    >
      {block ? <BlockInspector /> : <PageInspector />}
    </Box>
  );
}
